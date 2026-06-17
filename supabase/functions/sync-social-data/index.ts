// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let user = null;
    let authError = null;

    if (authHeader) {
      const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data, error } = await authClient.auth.getUser();
      user = data.user;
      authError = error;
    }

    const isSystemAccess = apikeyHeader && (apikeyHeader === Deno.env.get('SUPABASE_ANON_KEY') || apikeyHeader === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    if (!user && !isSystemAccess) {
      return new Response(JSON.stringify({ 
          error: "Unauthorized", 
          details: authError?.message || "No valid session or apikey" 
      }), { 
          status: 200, // Clean console
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = user?.id || body.userId;
    
    if (!targetUserId) {
        throw new Error("Missing User ID for sync");
    }
    
    const userId = targetUserId;

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
              
              // Fetch latest posts engagement
              let likesCount = 0;
              let sharesCount = 0;
              let commentsCount = 0;
              let postsCount = 0;

              if (data.posts) {
                const postsRes = await fetch(
                  `https://graph.facebook.com/v21.0/${pageId}/posts?fields=likes.summary(true),comments.summary(true),shares&limit=20&access_token=${conn.access_token}`
                );
                const postsData = await postsRes.json();
                if (postsData.data) {
                  postsCount = postsData.data.length || 0;
                  postsData.data.forEach((p: any) => {
                     likesCount += p.likes?.summary?.total_count || 0;
                     commentsCount += p.comments?.summary?.total_count || 0;
                     sharesCount += p.shares?.count || 0;
                  });
                }
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
                views: likesCount + commentsCount + sharesCount, // Meta n disponibiliza views organico facil para perfil, usamos interações como alcance/views baseline
                likes: likesCount,
                shares: sharesCount,
                is_connected: true,
                updated_at: new Date().toISOString(),
              };

              // Update social_connections with latest profile info

              const updateData: any = {};
              if (profilePic) updateData.profile_image_url = profilePic;
              if (followers > 0) updateData.followers_count = followers;
              
              if (Object.keys(updateData).length > 0) {
                await supabase.from("social_connections")
                  .update(updateData)
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
              
              // Fetch tweets engagement (limit 10 for basic analytics)
              let likesCount = 0;
              let sharesCount = 0;
              let viewsCount = 0;
              try {
                const tweetsRes = await fetch(
                  `https://api.x.com/2/users/${conn.platform_user_id}/tweets?tweet.fields=public_metrics&max_results=10`,
                  { headers: { Authorization: `Bearer ${conn.access_token}` } }
                );
                const tweetsData = await tweetsRes.json();
                if (tweetsData.data) {
                  tweetsData.data.forEach((t: any) => {
                    if (t.public_metrics) {
                      likesCount += t.public_metrics.like_count || 0;
                      sharesCount += t.public_metrics.retweet_count || 0;
                      viewsCount += t.public_metrics.impression_count || 0;
                    }
                  });
                }
              } catch(e) { }

              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: conn.platform_user_id,
                username: data.data.username || "", page_name: data.data.name || "",
                profile_picture: data.data.profile_image_url?.replace('_normal', '') || conn.profile_image_url || "",
                followers_count: metrics.followers_count || 0, metadata: { posts_count: metrics.tweet_count || 0 },
                views: viewsCount, likes: likesCount, shares: sharesCount, is_connected: true, updated_at: new Date().toISOString(),
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
  } catch (error) {
    console.error("[sync-social-data] Fatal error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      success: false
    }), {
      status: 200, // Keep console clean
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
