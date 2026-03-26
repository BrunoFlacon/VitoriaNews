// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
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
        let metrics: any = null;
        let recentPostsMetrics: any[] = [];

        // Fetch metrics based on platform
        switch (conn.platform) {
          case "facebook": {
            if (!conn.access_token) continue;
            const pageId = conn.page_id || conn.platform_user_id;
            const fields = "followers_count,fan_count,picture.type(large),posts.limit(10){id,created_time,message,insights.metric(post_impressions_unique,post_engaged_users,post_reactions_by_type_total)}";
            const resp = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${conn.access_token}`);
            
            if (resp.ok) {
              const data = await resp.json();
              metrics = {
                followers_count: data.followers_count || data.fan_count || 0,
                media_count: data.posts?.data?.length || 0,
                views_count: 0,
                profile_picture: data.picture?.data?.url || null
              };

              // Process recent posts
              if (data.posts?.data) {
                for (const post of data.posts.data) {
                  const insights = post.insights?.data || [];
                  const impressions = insights.find((i: any) => i.name === 'post_impressions_unique')?.values?.[0]?.value || 0;
                  const engagement = insights.find((i: any) => i.name === 'post_engaged_users')?.values?.[0]?.value || 0;
                  const reactions = insights.find((i: any) => i.name === 'post_reactions_by_type_total')?.values?.[0]?.value || {};
                  const likes = Object.values(reactions).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

                  recentPostsMetrics.push({
                    external_id: post.id,
                    platform: "facebook",
                    impressions,
                    likes,
                    comments: 0,
                    shares: 0,
                    content: post.message || null,
                    collected_at: new Date(post.created_time).toISOString()
                  });
                }
              }
            }
            break;
          }
          case "instagram": {
            if (!conn.access_token) continue;
            const igUserId = conn.platform_user_id;
            const fields = "followers_count,media_count,name,username,profile_picture_url,media.limit(10){id,media_type,like_count,comments_count,insights.metric(impressions,reach,engagement),caption,media_url}";
            const resp = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=${fields}&access_token=${conn.access_token}`);
            
            if (resp.ok) {
              const data = await resp.json();
              metrics = {
                followers_count: data.followers_count || 0,
                media_count: data.media_count || 0,
                profile_picture: data.profile_picture_url || null
              };

              if (data.media?.data) {
                for (const media of data.media.data) {
                  const insights = media.insights?.data || [];
                  const impressions = insights.find((i: any) => i.name === 'impressions')?.values?.[0]?.value || 0;
                  const reach = insights.find((i: any) => i.name === 'reach')?.values?.[0]?.value || 0;
                  const engagement = insights.find((i: any) => i.name === 'engagement')?.values?.[0]?.value || 0;
                  
                  recentPostsMetrics.push({
                    external_id: media.id,
                    platform: "instagram",
                    impressions,
                    likes: media.like_count || 0,
                    comments: media.comments_count || 0,
                    reach,
                    engagement,
                    content: media.caption || null,
                    media_url: media.media_url || null,
                    collected_at: new Date().toISOString()
                  });
                }
              }
            }
            break;
          }
          case "youtube": {
            if (!conn.access_token) continue;
            const resp = await fetch(
              "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            if (resp.ok) {
              const data = await resp.json();
              const ch = data.items?.[0];
              if (ch) {
                metrics = {
                  followers_count: parseInt(ch.statistics?.subscriberCount || "0"),
                  media_count: parseInt(ch.statistics?.videoCount || "0"),
                  views_count: parseInt(ch.statistics?.viewCount || "0"),
                  profile_picture: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url || null
                };
              }
            }
            break;
          }
          case "twitter": {
             if (conn.platform_user_id && conn.access_token) {
                const res = await fetch(
                  `https://api.x.com/2/users/${conn.platform_user_id}?user.fields=public_metrics`,
                  { headers: { Authorization: `Bearer ${conn.access_token}` } }
                );
                if (res.ok) {
                  const data = await res.json();
                  if (data.data) {
                    const m = data.data.public_metrics || {};
                    metrics = {
                      followers_count: m.followers_count || 0,
                      media_count: m.tweet_count || 0,
                      likes: 0
                    };
                  }
                }
             }
             break;
          }
          case "threads": {
            if (!conn.access_token) continue;
            const resp = await fetch(
              `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,followers_count&access_token=${conn.access_token}`
            );
            if (resp.ok) {
              const data = await resp.json();
              metrics = {
                followers_count: data.followers_count || 0,
                media_count: 0
              };
            }
            break;
          }
          // Additional platforms can be added here
        }

        // Upsert social_accounts with latest data
        if (metrics) {
          // Update social_connections as well to keep it in sync for Settings UI
          await supabase.from("social_connections").update({
             profile_image_url: metrics.profile_picture || conn.profile_image_url,
             followers_count: metrics.followers_count || conn.followers_count
          }).eq("id", conn.id);

          const { data: account, error: upsertError } = await supabase.from("social_accounts").upsert({
            user_id: conn.user_id,
            platform: conn.platform,
            platform_user_id: conn.platform_user_id,
            username: conn.page_name || conn.username || "",
            profile_picture: metrics.profile_picture || conn.profile_image_url,
            followers_count: metrics.followers_count || 0,
            views: metrics.views_count || 0,
            metadata: { posts_count: metrics.media_count || 0 },
            is_connected: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,platform,platform_user_id" }).select("id").single();

          if (account) {
            // Insert historical account metrics
            await supabase.from("account_metrics").insert({
              user_id: conn.user_id,
              social_account_id: account.id,
              platform: conn.platform,
              followers: metrics.followers_count || 0,
              posts_count: metrics.media_count || 0,
              views: metrics.views_count || 0,
              collected_at: new Date().toISOString()
            });

            // Save post metrics if any
            if (recentPostsMetrics.length > 0) {
              for (const postMetric of recentPostsMetrics) {
                await supabase.from("post_metrics").upsert({
                  ...postMetric,
                  social_account_id: account.id,
                  user_id: conn.user_id
                }, { onConflict: "external_id,platform" });
              }
            }
          }
        }

        results.push({ platform: conn.platform, id: conn.id, status: "ok" });
      } catch (err) {
        console.error(`Error collecting for ${conn.platform}:`, err);
        results.push({ platform: conn.platform, id: conn.id, status: "error", error: String(err) });

        await supabase.from("system_logs").insert({
          user_id: conn.user_id,
          service: "collect-social-analytics",
          level: "error",
          message: `Failed to collect analytics for ${conn.platform}`,
          metadata: { error: String(err) },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
