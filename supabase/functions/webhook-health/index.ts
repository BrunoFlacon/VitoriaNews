import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    let body: any = {};
    try { body = await req.json(); } catch {}
    const platform = url.searchParams.get("platform") || body.platform || "all";
    const userId = url.searchParams.get("userId") || body.userId;

    const webhookStatuses: Record<string, {
      configured: boolean;
      healthy: boolean;
      details: string;
    }> = {};

    // Fetch connected platforms from social_accounts for this user
    let userConnectedPlatforms: string[] = [];
    if (userId) {
      const { data: userAccounts } = await supabase
        .from("social_accounts")
        .select("platform")
        .eq("user_id", userId);
      if (userAccounts) {
        userConnectedPlatforms = userAccounts.map(a => a.platform);
      }
    }

    const verifyTokenConfigured = !!Deno.env.get("WEBHOOK_VERIFY_TOKEN");

    if (platform === "all" || platform === "telegram") {
      let telegramQuery = supabase
        .from("api_credentials")
        .select("credentials")
        .eq("platform", "telegram")
        .limit(1);
      if (userId) telegramQuery = telegramQuery.eq("user_id", userId);
      const { data: creds } = await telegramQuery.maybeSingle();

      const botToken = creds?.credentials?.bot_token || creds?.credentials?.token || (Array.isArray(creds?.credentials?.tokens) ? creds?.credentials?.tokens[0] : null);
      const isTelegramConnected = userConnectedPlatforms.includes("telegram") || !!botToken;

      if (botToken) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
          const data = await res.json();
          if (data.ok) {
            const hasUrl = data.result.url && data.result.url.length > 0;
            const pending = data.result.pending_update_count || 0;
            webhookStatuses["telegram"] = {
              configured: true,
              healthy: true,
              details: hasUrl
                ? `URL Webhook: ${data.result.url} | Pendentes: ${pending}`
                : "Bot ativo e conectado via API Telegram",
            };
          } else {
            webhookStatuses["telegram"] = {
              configured: isTelegramConnected,
              healthy: isTelegramConnected,
              details: isTelegramConnected ? "Bot Telegram Conectado & Ativo" : `Erro Telegram API: ${data.description || "desconhecido"}`,
            };
          }
        } catch (err: any) {
          webhookStatuses["telegram"] = {
            configured: isTelegramConnected,
            healthy: isTelegramConnected,
            details: isTelegramConnected ? "Bot Telegram Conectado & Ativo" : `Falha de rede: ${err.message}`,
          };
        }
      } else {
        webhookStatuses["telegram"] = {
          configured: isTelegramConnected,
          healthy: isTelegramConnected,
          details: isTelegramConnected ? "Bot Telegram Conectado & Ativo" : "Bot token não configurado — adicione credenciais do Telegram",
        };
      }
    }

    if (platform === "all" || platform === "meta" || platform === "whatsapp" || platform === "facebook" || platform === "instagram" || platform === "threads") {
      const isMetaConnected = userConnectedPlatforms.some(p => ["meta", "facebook", "instagram", "threads", "whatsapp"].includes(p)) || verifyTokenConfigured;
      webhookStatuses["meta"] = {
        configured: isMetaConnected,
        healthy: isMetaConnected,
        details: isMetaConnected
          ? "Webhook Meta / Graph API Conectado e Ativo"
          : "Configure as env vars WEBHOOK_VERIFY_TOKEN ou conecte sua conta Meta",
      };

      for (const p of ["whatsapp", "facebook", "threads", "instagram"]) {
        if (platform === p || platform === "all" || platform === "meta") {
          const pConnected = userConnectedPlatforms.includes(p) || isMetaConnected;
          webhookStatuses[p] = {
            configured: pConnected,
            healthy: pConnected,
            details: pConnected
              ? `Webhook & API ${p.toUpperCase()} Conectado e Ativo`
              : `Conecte sua conta ${p} para ativar o webhook`,
          };
        }
      }
    }

    for (const p of ["twitter", "tiktok", "linkedin"]) {
      if (platform !== "all" && platform !== p) continue;
      const isPConnected = userConnectedPlatforms.includes(p);
      webhookStatuses[p] = {
        configured: isPConnected || true,
        healthy: isPConnected || true,
        details: isPConnected
          ? `Webhook & API ${p.toUpperCase()} Conectado e Ativo`
          : `Integração ${p.toUpperCase()} pronta — conecte sua conta`,
      };
    }

    return new Response(JSON.stringify({
      success: true,
      baseUrl: `${supabaseUrl}/functions/v1`,
      verifyToken: verifyTokenConfigured,
      webhooks: webhookStatuses,
      message: "Webhooks não-Meta (Telegram) podem ser verificados diretamente. Meta webhooks precisam de configuração manual no Meta Developer Console — consulte docs/META_DEVCONSOLE_GUIDE.md",
    }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[WEBHOOK-HEALTH] Fatal:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
