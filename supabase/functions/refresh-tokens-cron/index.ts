import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OAUTH_REFRESH_PLATFORMS = ["google", "youtube", "twitter"];
const FB_EXCHANGE_PLATFORMS = ["facebook", "instagram"];

serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[TOKEN-CRON] Scanning for expiring tokens...");

    // Buscar todas as conexões com token expirando em até 7 dias
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: expiring, error } = await supabase
      .from("social_connections")
      .select("*")
      .eq("is_connected", true)
      .not("token_expires_at", "is", null)
      .lte("token_expires_at", sevenDaysFromNow)
      .gte("token_expires_at", now)  // Ainda não expirou, mas vai expirar
      .order("token_expires_at", { ascending: true });

    if (error) {
      console.error("[TOKEN-CRON] Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!expiring || expiring.length === 0) {
      console.log("[TOKEN-CRON] No expiring tokens found.");
      return new Response(JSON.stringify({ refreshed: 0, skipped: 0 }));
    }

    console.log(`[TOKEN-CRON] Found ${expiring.length} expiring token(s).`);

    const metaAppId = Deno.env.get("META_APP_ID");
    const metaAppSecret = Deno.env.get("META_APP_SECRET");
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const twitterKey = Deno.env.get("TWITTER_CONSUMER_KEY");
    const twitterSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");

    let refreshed = 0;
    let skipped = 0;
    let failed = 0;

    for (const conn of expiring) {
      const platform = conn.platform;

      try {
        let newAccessToken = "";
        let newExpiresIn = 5184000; // default 60 days

        if (OAUTH_REFRESH_PLATFORMS.includes(platform)) {
          if (!conn.refresh_token) {
            console.warn(`[TOKEN-CRON] ${platform} ${conn.id}: No refresh_token.`);
            skipped++;
            continue;
          }

          if (platform === "twitter") {
            if (!twitterKey || !twitterSecret) throw new Error("Twitter env vars not configured");
            const res = await fetch("https://api.x.com/2/oauth2/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${twitterKey}:${twitterSecret}`)}`,
              },
              body: new URLSearchParams({
                refresh_token: conn.refresh_token,
                grant_type: "refresh_token",
              }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error_description || data.error);
            newAccessToken = data.access_token;
            newExpiresIn = data.expires_in || 7200;
          } else {
            // google / youtube
            if (!googleClientId || !googleClientSecret) throw new Error("Google env vars not configured");
            const res = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: googleClientId,
                client_secret: googleClientSecret,
                refresh_token: conn.refresh_token,
                grant_type: "refresh_token",
              }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error_description || data.error);
            newAccessToken = data.access_token;
            newExpiresIn = data.expires_in || 3600;
            if (data.refresh_token) {
              await supabase.from("social_connections").update({ refresh_token: data.refresh_token }).eq("id", conn.id);
            }
          }
        } else if (FB_EXCHANGE_PLATFORMS.includes(platform)) {
          if (!metaAppId || !metaAppSecret) {
            console.warn(`[TOKEN-CRON] ${platform}: META_APP_ID/ SECRET not configured.`);
            skipped++;
            continue;
          }
          if (!conn.access_token) {
            console.warn(`[TOKEN-CRON] ${platform} ${conn.id}: No access_token.`);
            skipped++;
            continue;
          }
          const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?` +
            `grant_type=fb_exchange_token&client_id=${metaAppId}&client_secret=${metaAppSecret}&fb_exchange_token=${conn.access_token}`;
          const res = await fetch(exchangeUrl);
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Facebook token exchange failed");
          newAccessToken = data.access_token;
          newExpiresIn = data.expires_in || 5184000;
        } else if (platform === "threads") {
          // Threads não tem refresh — avisar usuário (pula no cron)
          console.log(`[TOKEN-CRON] Threads ${conn.id}: No refresh available. Skipping.`);
          skipped++;
          continue;
        } else {
          skipped++;
          continue;
        }

        const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

        await supabase
          .from("social_connections")
          .update({
            access_token: newAccessToken,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id);

        console.log(`[TOKEN-CRON] Refreshed ${platform} ${conn.id}. Expires: ${newExpiresAt}`);
        refreshed++;

      } catch (err: any) {
        console.error(`[TOKEN-CRON] Failed to refresh ${platform} ${conn.id}:`, err.message);
        failed++;

        // Se o refresh falhou, podemos marcar como desconectado
        // (evita continuar tentando em vão a cada execução)
        if (err.message?.includes("token") || err.message?.includes("expired") || err.message?.includes("invalid")) {
          await supabase
            .from("social_connections")
            .update({
              is_connected: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conn.id);
          console.log(`[TOKEN-CRON] Marked ${platform} ${conn.id} as disconnected due to refresh failure.`);
        }
      }
    }

    console.log(`[TOKEN-CRON] Done. Refreshed: ${refreshed}, Skipped: ${skipped}, Failed: ${failed}`);

    return new Response(JSON.stringify({ refreshed, skipped, failed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TOKEN-CRON] Global error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});