// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No Authorization header found" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error in sync-social-data:", authError);
      return new Response(JSON.stringify({ 
        error: "Invalid or expired session in Edge Function", 
        authError: authError?.message || authError,
        used_key_length: supabaseKey?.length || 0 
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    const userId = user.id;

    // Fetch all connected accounts (filter by user if authenticated)
    let query = supabase
      .from("social_connections")
      .select("id, user_id, platform, access_token, platform_user_id, page_name, page_id, profile_image_url")
      .eq("user_id", userId) // Safety: always filter by userId
      .eq("is_connected", true);

    const { data: connections, error: connError } = await query;
    if (connError) throw connError;

    const results: any[] = [];

    for (const conn of (connections || [])) {
      try {
        let stats: any = null;

        if (conn.platform === "facebook" || conn.platform === "instagram") {
          // Fetch page/profile insights from Graph API
          const fields = "name,fan_count,followers_count,picture.type(large),posts.limit(1){id}";
          const pageId = conn.page_id || conn.platform_user_id;
          
          if (pageId && conn.access_token) {
            const res = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${conn.access_token}`
            );
            const data = await res.json();
            
            if (!data.error) {
              const followers = data.followers_count || data.fan_count || 0;
              const profilePic = data.picture?.data?.url || conn.profile_image_url || "";
              
              // Count posts
              let postsCount = 0;
              if (data.posts) {
                const postsRes = await fetch(
                  `https://graph.facebook.com/v21.0/${pageId}/posts?limit=1&summary=true&access_token=${conn.access_token}`
                );
                const postsData = await postsRes.json();
                postsCount = postsData?.summary?.total_count || 0;
              }
              
              stats = {
                user_id: conn.user_id,
                platform: conn.platform,
                platform_user_id: pageId,
                username: data.name || conn.page_name || "",
                page_name: data.name || conn.page_name || "",
                profile_picture: profilePic,
                followers_count: followers,
                metadata: { posts_count: postsCount },
                views: 0,
                likes: 0,
                shares: 0,
                is_connected: true,
                updated_at: new Date().toISOString(),
              };

              // Update profile_image_url in social_connections too
              if (profilePic && profilePic !== conn.profile_image_url) {
                await supabase.from("social_connections")
                  .update({ profile_image_url: profilePic })
                  .eq("id", conn.id);
              }
            }
          }
        } else if (conn.platform === "twitter") {
          if (conn.platform_user_id && conn.access_token) {
            const res = await fetch(
              `https://api.x.com/2/users/${conn.platform_user_id}?user.fields=profile_image_url,public_metrics,name,username`,
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            const data = await res.json();
            if (data.data) {
              const metrics = data.data.public_metrics || {};
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: conn.platform_user_id,
                username: data.data.username || "", page_name: data.data.name || "",
                profile_picture: data.data.profile_image_url?.replace('_normal', '') || conn.profile_image_url || "",
                followers_count: metrics.followers_count || 0, metadata: { posts_count: metrics.tweet_count || 0 },
                views: 0, likes: 0, shares: 0, is_connected: true, updated_at: new Date().toISOString(),
              };
            }
          }
        } else if (conn.platform === "youtube") {
          if (conn.access_token) {
            const res = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            const data = await res.json();
            const ch = data.items?.[0];
            if (ch) {
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: ch.id,
                username: ch.snippet?.title || "", page_name: ch.snippet?.title || "",
                profile_picture: ch.snippet?.thumbnails?.high?.url || conn.profile_image_url || "",
                followers_count: parseInt(ch.statistics?.subscriberCount || "0"),
                metadata: { posts_count: parseInt(ch.statistics?.videoCount || "0") },
                views: parseInt(ch.statistics?.viewCount || "0"),
                likes: 0, shares: 0, is_connected: true, updated_at: new Date().toISOString(),
              };
            }
          }
        } else if (conn.platform === "threads") {
          if (conn.access_token) {
            const res = await fetch(
              `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,followers_count&access_token=${conn.access_token}`
            );
            const data = await res.json();
            if (data && !data.error) {
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: data.id,
                username: data.username || "", page_name: data.username || conn.page_name || "",
                profile_picture: data.threads_profile_picture_url || conn.profile_image_url || "",
                followers_count: data.followers_count || 0, metadata: { posts_count: 0 },
                views: 0, likes: 0, shares: 0, is_connected: true, updated_at: new Date().toISOString(),
              };
            }
          }
        }

        if (stats) {
          // Upsert into social_accounts
          const { error: upsertErr } = await supabase.from("social_accounts").upsert(stats, {
            onConflict: "user_id,platform,platform_user_id"
          });
          results.push({ platform: conn.platform, page: conn.page_name, status: "synced", followers: stats.followers_count });
        } else {
          results.push({ platform: conn.platform, page: conn.page_name, status: "no_data" });
        }
      } catch (err: any) {
        results.push({ platform: conn.platform, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, synced: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
