import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLATFORM_REFRESH_TYPES: Record<string, string> = {
  google: "oauth2", youtube: "oauth2", twitter: "oauth2",
  linkedin: "oauth2", tiktok: "oauth2",
  facebook: "fb_exchange", instagram: "fb_exchange",
  pinterest: "oauth2", snapchat: "oauth2",
};

// Backoff dinâmico baseado no tempo de vida do token da plataforma
function getBackoffHours(platform: string, expiresIn: number): number {
  if (platform === "twitter" || platform === "youtube" || platform === "google") return 0.5;
  if (platform === "tiktok") return 6;
  return 12; // LinkedIn, Facebook, Instagram: renovar antes de expirar
}

serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[TOKEN-CRON] Scanning for expiring tokens...");

    const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Busca TODOS os tokens que expiram em até 14 dias (sem backoff fixo)
    const { data: expiring, error } = await supabase
      .from("social_connections")
      .select("*")
      .eq("is_connected", true)
      .not("token_expires_at", "is", null)
      .lte("token_expires_at", fourteenDaysFromNow)
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
    const linkedinClientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    const linkedinClientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
    const tiktokClientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
    const tiktokClientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");

    let refreshed = 0;
    let skipped = 0;
    let failed = 0;

    for (const conn of expiring) {
      const platform = conn.platform;
      const refreshType = PLATFORM_REFRESH_TYPES[platform] || "none";

      // Pular se já foi renovado recentemente (janela dinâmica por plataforma)
      if (conn.last_refresh_attempt) {
        const defaultExpiry = conn.token_expires_at
          ? (new Date(conn.token_expires_at).getTime() - Date.now()) / 1000
          : 86400;
        const backoffH = getBackoffHours(platform, defaultExpiry);
        const cutoff = new Date(Date.now() - backoffH * 60 * 60 * 1000).toISOString();
        if (conn.last_refresh_attempt >= cutoff) {
          skipped++;
          continue;
        }
      }

      // Mark refresh attempt timestamp
      await supabase.from("social_connections").update({
        last_refresh_attempt: new Date().toISOString()
      }).eq("id", conn.id);

      try {
        let newAccessToken = "";
        let newExpiresIn = 5184000;
        let newRefreshToken: string | undefined;

        if (refreshType === "oauth2") {
          if (!conn.refresh_token) {
            console.warn(`[TOKEN-CRON] ${platform} ${conn.id}: No refresh_token.`);
            skipped++;
            continue;
          }

          let tokenUrl = "";
          let bodyParams: Record<string, string> = {};
          let authHeader: Record<string, string> = {};

          if (platform === "twitter") {
            if (!twitterKey || !twitterSecret) throw new Error("Twitter env vars not configured");
            tokenUrl = "https://api.x.com/2/oauth2/token";
            authHeader = { Authorization: `Basic ${btoa(`${twitterKey}:${twitterSecret}`)}` };
            bodyParams = { refresh_token: conn.refresh_token, grant_type: "refresh_token" };
            newExpiresIn = 7200;
          } else if (platform === "google" || platform === "youtube") {
            if (!googleClientId || !googleClientSecret) throw new Error("Google env vars not configured");
            tokenUrl = "https://oauth2.googleapis.com/token";
            bodyParams = {
              client_id: googleClientId, client_secret: googleClientSecret,
              refresh_token: conn.refresh_token, grant_type: "refresh_token",
            };
            newExpiresIn = 3600;
          } else if (platform === "linkedin") {
            if (!linkedinClientId || !linkedinClientSecret) throw new Error("LinkedIn env vars not configured");
            tokenUrl = "https://api.linkedin.com/v2/accessToken";
            bodyParams = {
              client_id: linkedinClientId, client_secret: linkedinClientSecret,
              refresh_token: conn.refresh_token, grant_type: "refresh_token",
            };
            newExpiresIn = 5184000;
          } else if (platform === "tiktok") {
            if (!tiktokClientKey || !tiktokClientSecret) throw new Error("TikTok env vars not configured");
            tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";
            bodyParams = {
              client_key: tiktokClientKey, client_secret: tiktokClientSecret,
              grant_type: "refresh_token", refresh_token: conn.refresh_token,
            };
            newExpiresIn = 86400;
          } else {
            // Fallback: try generic Google-style OAuth
            tokenUrl = "https://oauth2.googleapis.com/token";
            bodyParams = {
              client_id: googleClientId || "", client_secret: googleClientSecret || "",
              refresh_token: conn.refresh_token, grant_type: "refresh_token",
            };
            newExpiresIn = 3600;
          }

          const res = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", ...authHeader },
            body: new URLSearchParams(bodyParams),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error_description || data.error || data.message);
          newAccessToken = data.access_token;
          if (data.expires_in) newExpiresIn = data.expires_in;
          newRefreshToken = data.refresh_token;

        } else if (refreshType === "fb_exchange") {
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
          console.log(`[TOKEN-CRON] Threads ${conn.id}: No refresh available. Skipping.`);
          skipped++;
          continue;
        } else {
          skipped++;
          continue;
        }

        const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

        const updateData: Record<string, any> = {
          access_token: newAccessToken,
          token_expires_at: newExpiresAt,
          refresh_error: null,
          updated_at: new Date().toISOString(),
        };
        if (newRefreshToken) updateData.refresh_token = newRefreshToken;

        await supabase.from("social_connections").update(updateData).eq("id", conn.id);

        console.log(`[TOKEN-CRON] Refreshed ${platform} ${conn.id}. Expires: ${newExpiresAt}`);
        refreshed++;

      } catch (err: any) {
        console.error(`[TOKEN-CRON] Failed to refresh ${platform} ${conn.id}:`, err.message);
        failed++;

        await supabase.from("social_connections").update({
          refresh_error: err.message?.substring(0, 500),
          updated_at: new Date().toISOString(),
        }).eq("id", conn.id);

        // Only disconnect if the refresh token is permanently invalid
        const permanentErrors = ["token", "expired", "invalid", "revoked", "unauthorized", "not found"];
        const isPermanent = permanentErrors.some(e => 
          err.message?.toLowerCase().includes(e)
        );
        if (isPermanent) {
          await supabase.from("social_connections").update({
            is_connected: false,
            updated_at: new Date().toISOString(),
          }).eq("id", conn.id);
          console.log(`[TOKEN-CRON] Marked ${platform} ${conn.id} as disconnected (permanent failure).`);
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