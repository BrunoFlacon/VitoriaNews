import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-authorization",
});

// Platforms that use OAuth2 refresh_token (have a refresh_token column)
const OAUTH_REFRESH_PLATFORMS = ["google", "youtube", "twitter"];
// Platforms that use Facebook Page Token exchange (no refresh_token, use fb_exchange_token)
const FB_EXCHANGE_PLATFORMS = ["facebook", "instagram"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const platform = body.platform as string;
    const connectionId = body.connectionId as string | undefined;

    // Get connection with tokens (server-side)
    // Use connectionId if provided, otherwise fall back to first match by platform
    let query = supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", platform);

    if (connectionId) {
      query = query.eq("id", connectionId);
    }
    query = query.order("token_expires_at", { ascending: true, nullsLast: true }).limit(1);

    const { data: connections, error: connError } = await query;
    const connection = connections?.[0];

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: `No connection found for ${platform}` }),
        { status: 404, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Check refresh_token requirement per platform
    if (OAUTH_REFRESH_PLATFORMS.includes(platform) && !connection.refresh_token) {
      return new Response(
        JSON.stringify({ error: "No refresh token available. Please reconnect." }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    let newAccessToken = "";
    let newExpiresIn = 3600;

    switch (platform) {
      case "google":
      case "youtube": {
        const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
        const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
        
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: connection.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error_description || data.error);
        newAccessToken = data.access_token;
        newExpiresIn = data.expires_in || 3600;
        // Google sometimes returns a new refresh_token
        if (data.refresh_token) {
          await supabase
            .from("social_connections")
            .update({ refresh_token: data.refresh_token })
            .eq("id", connection.id);
        }
        break;
      }
      case "facebook":
      case "instagram": {
        // Facebook Page Tokens can be extended via fb_exchange_token
        // Use META_APP_ID and META_APP_SECRET from env vars
        const metaAppId = Deno.env.get("META_APP_ID");
        const metaAppSecret = Deno.env.get("META_APP_SECRET");

        if (!metaAppId || !metaAppSecret) {
          return new Response(
            JSON.stringify({ 
              error: "META_APP_ID and META_APP_SECRET not configured. Configure them in Supabase Environment Variables.",
              needsReconnect: true 
            }),
            { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const currentToken = connection.access_token;
        if (!currentToken) {
          return new Response(
            JSON.stringify({ error: "No access token to exchange.", needsReconnect: true }),
            { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
          );
        }

        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&client_id=${metaAppId}&client_secret=${metaAppSecret}&fb_exchange_token=${currentToken}`;
        
        const res = await fetch(exchangeUrl);
        const data = await res.json();

        if (data.error) {
          console.error(`[REFRESH] Facebook exchange failed:`, data.error);
          // If exchange fails, try getting a fresh page token using the stored page credentials
          throw new Error(data.error.message || "Token exchange failed. Reconnect required.");
        }

        newAccessToken = data.access_token;
        newExpiresIn = data.expires_in || 5184000; // 60 days default
        break;
      }
      case "threads":
        return new Response(
          JSON.stringify({ error: "Threads tokens expiram após 60 dias e não possuem refresh. Reconecte a conta pelo painel.", needsReconnect: true }),
          { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
      case "twitter": {
        const twitterKey = Deno.env.get("TWITTER_CONSUMER_KEY")!;
        const twitterSecret = Deno.env.get("TWITTER_CONSUMER_SECRET")!;
        
        const res = await fetch("https://api.x.com/2/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${twitterKey}:${twitterSecret}`)}`,
          },
          body: new URLSearchParams({
            refresh_token: connection.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error_description || data.error);
        newAccessToken = data.access_token;
        newExpiresIn = data.expires_in || 7200;
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: `Token refresh not supported for ${platform}` }),
          { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
    }

    const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

    await supabase
      .from("social_connections")
      .update({
        access_token: newAccessToken,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return new Response(JSON.stringify({ success: true, expiresAt: newExpiresAt }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

