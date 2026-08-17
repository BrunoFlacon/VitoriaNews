import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { refreshConnectionToken } from "../_shared/credentials.ts";

// 🔹 CRON DE RENOVAÇÃO DE TOKENS
// - Roda a cada 30 min (agendado no pg_cron)
// - Renova tokens que expiram em até 14 dias (ou já expirados)
// - TENTA RECONECTAR automaticamente conexões desconectadas que ainda
//   possuem refresh_token (reconexão automática)
// - NUNCA desconecta por erro transitório: apenas registra refresh_error e
//   tenta de novo no próximo ciclo
// - Backoff por plataforma (coluna last_refresh_attempt) evita renovações
//   excessivas: X/YouTube a cada 30min, TikTok 6h, demais 12h

const PLATFORMS_WITH_REFRESH = [
  "google", "youtube", "twitter", "linkedin", "tiktok",
  "facebook", "instagram", "whatsapp", "threads",
];

// Tempo mínimo entre tentativas por plataforma (horas)
function getBackoffHours(platform: string): number {
  if (platform === "twitter" || platform === "youtube" || platform === "google") return 0.5; // 30 min (expira em ~1-2h)
  if (platform === "tiktok") return 6; // 24h de vida
  return 12; // LinkedIn, Facebook, Instagram, WhatsApp, Threads (dias de vida)
}

serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[TOKEN-CRON] Scanning for expiring/disconnected tokens...");

    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // 1) Tokens conectados que expiram em até 14 dias (ou já expirados)
    const { data: expiring, error } = await supabase
      .from("social_connections")
      .select("*")
      .eq("is_connected", true)
      .in("platform", PLATFORMS_WITH_REFRESH)
      .not("token_expires_at", "is", null)
      .lte("token_expires_at", fourteenDaysFromNow)
      .order("token_expires_at", { ascending: true });

    if (error) {
      console.error("[TOKEN-CRON] Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // 2) Conexões desconectadas com refresh_token → tentar reconexão automática
    const { data: disconnected, error: err2 } = await supabase
      .from("social_connections")
      .select("*")
      .eq("is_connected", false)
      .in("platform", PLATFORMS_WITH_REFRESH)
      .not("refresh_token", "is", null);

    if (err2) {
      console.error("[TOKEN-CRON] Disconnected query error:", err2);
      return new Response(JSON.stringify({ error: err2.message }), { status: 500 });
    }

    // Backoff: só processa conexões fora do intervalo mínimo entre tentativas
    const dueForRefresh = (conn: any): boolean => {
      const last = conn.last_refresh_attempt ? new Date(conn.last_refresh_attempt).getTime() : 0;
      const backoffMs = getBackoffHours(conn.platform) * 60 * 60 * 1000;
      return now.getTime() - last >= backoffMs;
    };

    const toRefresh = [...(expiring || []), ...(disconnected || [])]
      .filter(dueForRefresh);

    const seen = new Set<string>();
    const targets = toRefresh.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    if (targets.length === 0) {
      console.log("[TOKEN-CRON] No tokens due for refresh.");
      return new Response(JSON.stringify({ refreshed: 0, failed: 0, targets: 0 }));
    }

    console.log(`[TOKEN-CRON] Refreshing ${targets.length} token(s):`, targets.map((t) => `${t.platform} (${t.page_name || t.username || t.id})`));

    let refreshed = 0;
    let failed = 0;

    for (const conn of targets) {
      try {
        const result = await refreshConnectionToken(supabase, conn);
        refreshed++;
        console.log(`[TOKEN-CRON] ✅ ${conn.platform} (${conn.id}): token renovado até ${result.expiresAt}${conn.is_connected ? "" : " — CONEXÃO REATIVADA"}`);
      } catch (e: any) {
        failed++;
        // ❌ NÃO desconectar: erros transitórios (rede, rate-limit) podem se
        // resolver no próximo ciclo. Só registramos o erro para diagnóstico.
        const errMsg = String(e?.message || e).slice(0, 500);
        console.error(`[TOKEN-CRON] ⚠️ ${conn.platform} (${conn.id}): falha ao renovar → ${errMsg}`);
        const { error: updateError } = await supabase
          .from("social_connections")
          .update({
            refresh_error: errMsg,
            last_refresh_attempt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id)
          .eq("user_id", conn.user_id);
        if (updateError) {
          console.error(`[TOKEN-CRON] Erro ao salvar refresh_error: ${updateError.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ refreshed, failed, targets: targets.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[TOKEN-CRON] Fatal:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
});
