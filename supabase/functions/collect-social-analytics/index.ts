import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all connected social accounts
    const { data: connections } = await supabase
      .from("social_connections")
      .select("*")
      .eq("is_connected", true);

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ message: "No connected accounts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, unknown>[] = [];

    for (const conn of connections) {
      try {
        let metrics = null;

        // Fetch metrics based on platform
        switch (conn.platform) {
          case "facebook":
          case "instagram": {
            if (!conn.access_token) continue;
            const endpoint = conn.platform === "facebook"
              ? `https://graph.facebook.com/v19.0/${conn.page_id}?fields=followers_count,fan_count,posts{likes.summary(true),comments.summary(true),shares}&access_token=${conn.access_token}`
              : `https://graph.facebook.com/v19.0/${conn.platform_user_id}?fields=followers_count,media_count&access_token=${conn.access_token}`;
            
            const resp = await fetch(endpoint);
            if (resp.ok) {
              metrics = await resp.json();
            }
            break;
          }
          // Additional platforms can be added here
        }

        // Upsert social_accounts with latest data
        if (metrics) {
          await supabase.from("social_accounts").upsert({
            user_id: conn.user_id,
            platform: conn.platform,
            username: conn.page_name,
            profile_picture: conn.profile_image_url,
            followers: metrics.followers_count || metrics.fan_count || 0,
            posts_count: metrics.media_count || 0,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,platform" });

          // Insert historical account metrics
          const { data: account } = await supabase
            .from("social_accounts")
            .select("id")
            .eq("user_id", conn.user_id)
            .eq("platform", conn.platform)
            .single();

          if (account) {
            await supabase.from("account_metrics").insert({
              user_id: conn.user_id,
              social_account_id: account.id,
              followers: metrics.followers_count || metrics.fan_count || 0,
              posts_count: metrics.media_count || 0,
            });
          }
        }

        results.push({ platform: conn.platform, status: "ok" });
      } catch (err) {
        results.push({ platform: conn.platform, status: "error", error: String(err) });

        await supabase.from("system_logs").insert({
          user_id: conn.user_id,
          service: "collect-social-analytics",
          level: "error",
          message: `Failed to collect analytics for ${conn.platform}`,
          metadata: { error: String(err) },
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
