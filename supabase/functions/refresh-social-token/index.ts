import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { platform } = await req.json();

    // Get connection with tokens (server-side)
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", platform)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: `No connection found for ${platform}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!connection.refresh_token) {
      return new Response(
        JSON.stringify({ error: "No refresh token available. Please reconnect." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        break;
      }
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
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      .eq("user_id", user.id)
      .eq("platform", platform);

    // console.log(`Token refreshed for ${platform}, user: ${user.id}`);

    return new Response(JSON.stringify({ success: true, expiresAt: newExpiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
