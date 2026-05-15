// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheProfileImage } from "../_shared/media.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

async function getCredentials(supabase: any, userId: string, platform: string): Promise<Record<string, any>> {
  try {
    const { data } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", platform)
      .maybeSingle();
    return data?.credentials || {};
  } catch {
    return {};
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || req.headers.get("X-Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    
    let userId: string | undefined;
    let bodyPayload: any = {};
    const urlParams = new URL(req.url).searchParams;

    try {
       bodyPayload = await req.json();
    } catch {}

    // Support both URL params (legacy) and body params (current frontend)
    const targetPlatform = urlParams.get("platform") || bodyPayload?.platform || null;
    const targetPageId = urlParams.get("pageId") || bodyPayload?.pageId || null;

    // --- AUTH LOGIC ---
    if (token) {
      if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
        // Authorized as SYSTEM
      } else {
        const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
        if (authErr) console.warn("[COLLECT] Auth error:", authErr.message);
        if (user) userId = user.id;
      }
    }

    // Fallback to bodyPayload.userId if authorized as system
    if (!userId && bodyPayload?.userId) {
       userId = bodyPayload.userId;
    }

    if (!userId && !token?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "!!")) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), { 
         status: 401, headers: corsHeaders 
       });
    }

    // --- TARGET USERS ---
    let usersToSync = userId ? [userId] : [];
    if (bodyPayload?.sync_all === true || !userId) {
      const { data: allUsers } = await adminClient
        .from("social_connections")
        .select("user_id")
        .eq("is_connected", true);
      
      // Manually unique user_ids to avoid PostgREST 'distinct' issues
      usersToSync = Array.from(new Set((allUsers || []).map((u: any) => u.user_id)));
    }

    const globalResults: any[] = [];
    console.log(`[COLLECT] Starting sync for ${usersToSync.length} users. Target: ${targetPlatform || 'ALL'}`);

    for (const uid of usersToSync) {
      try {
        const { data: connections, error: connErr } = await adminClient
          .from("social_connections")
          .select("*")
          .eq("user_id", uid)
          .eq("is_connected", true);

        if (connErr) throw connErr;
        if (!connections || connections.length === 0) continue;

        // Parallelize connections processing for this user
        const connectionsToProcess = [...(connections || [])];
        
        // --- X/TWITTER SYNTHETIC INJECTION ---
        // Ensure users with manual Twitter credentials but no OAuth link are processed
        const twitterCreds = await getCredentials(adminClient, uid, "twitter");
        const twToken = twitterCreds?.access_token || twitterCreds?.bearer_token || twitterCreds?.token;
        const hasTwitterConnection = connectionsToProcess.some(c => c.platform === "twitter");
        
        if (twToken && !hasTwitterConnection) {
          console.log(`[COLLECT] Injecting synthetic Twitter connection for user ${uid}`);
          connectionsToProcess.push({
            platform: "twitter",
            user_id: uid,
            access_token: twToken,
            is_connected: true,
            username: twitterCreds.username || twitterCreds.platform_user_id || "twitter_user",
            id: `tw_syn_${uid}`
          });
        }

        const syncPromises = connectionsToProcess.map(async (conn) => {
          // Fast-path filtering
          if (targetPlatform && conn.platform !== targetPlatform) return { platform: conn.platform, status: "skipped_filter" };
          if (targetPageId && (conn.page_id !== targetPageId && conn.platform_user_id !== targetPageId)) return { platform: conn.platform, status: "skipped_page_filter" };

          console.log(`[COLLECT] Syncing ${conn.platform} for user ${uid} (ID: ${conn.id})`);

          let metrics: any = null;
          let fetchedPosts: any[] = [];

          try {
            switch (conn.platform) {
              case "telegram": {
                // Telegram logic: Fetch bot info if token exists, otherwise fallback to messaging_channels
                const tgCreds = await getCredentials(adminClient, uid, "telegram");
                const botToken = tgCreds?.bot_token || tgCreds?.token;
                
                let botInfo: any = null;
                if (botToken) {
                  try {
                    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
                    if (meRes.ok) {
                      const meData = await meRes.json();
                      if (meData.ok) {
                        botInfo = meData.result;
                        // Try to get photo
                        const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${botInfo.id}&limit=1`);
                        if (photoRes.ok) {
                          const photoData = await photoRes.json();
                          if (photoData.ok && photoData.result.total_count > 0) {
                            const fileId = photoData.result.photos[0][0].file_id;
                            const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
                            if (fileRes.ok) {
                              const fileData = await fileRes.json();
                              if (fileData.ok) {
                                botInfo.profile_picture = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                              }
                            }
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.warn(`[COLLECT] Telegram API error for user ${uid}:`, e);
                  }
                }

                const [channelsData, postsData] = await Promise.all([
                  adminClient.from("messaging_channels").select("members_count").eq("user_id", uid).eq("platform", "telegram"),
                  adminClient.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("user_id", uid).contains("platforms", ["telegram"]).eq("status", "published")
                ]);
                
                const totalMembers = (channelsData.data || []).reduce((sum: number, ch: any) => sum + (ch.members_count || 0), 0);
                metrics = {
                  followers: totalMembers,
                  posts_count: postsData.count || 0,
                  username: botInfo?.username || conn.username || conn.page_name,
                  profile_picture: botInfo?.profile_picture || null
                };
                break;
              }
              case "facebook": {
                if (!conn.access_token) break;
                const pageId = conn.page_id || conn.platform_user_id;
                if (!pageId) break;
                // Use limit=5 to save memory, summary(true) gives the true total count of posts
                const fields = "name,followers_count,fan_count,picture.type(large),cover,posts.limit(5).summary(true).fields(id,message,created_time,shares,comments.summary(true),likes.summary(true))";
                const resp = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${conn.access_token}`);
                if (resp.ok) {
                  const data = await resp.json();
                  const fbPosts = data.posts?.data || [];
                  fbPosts.forEach((p: any) => {
                    fetchedPosts.push({
                      external_id: p.id,
                      content: p.message || "",
                      published_at: p.created_time,
                      likes: p.likes?.summary?.total_count || 0,
                      comments: p.comments?.summary?.total_count || 0,
                      shares: p.shares?.count || 0,
                      performance_score: (p.likes?.summary?.total_count || 0) + (p.comments?.summary?.total_count || 0)
                    });
                  });
                  metrics = {
                    followers: Math.max(data.fan_count || 0, data.followers_count || 0),
                    posts_count: data.posts?.summary?.total_count || fbPosts.length, // True total posts!
                    username: data.name || conn.page_name,
                    profile_picture: data.picture?.data?.url
                  };
                } else {
                  console.error(`[COLLECT] FB API Error: ${resp.status} ${await resp.text()}`);
                }
                break;
              }
              case "instagram": {
                if (!conn.access_token) break;
                const igUserId = conn.platform_user_id || conn.page_id;
                if (!igUserId) break;
                // Use limit=5 to save memory
                const fields = "followers_count,media_count,username,profile_picture_url,media.limit(5).fields(id,caption,media_type,media_url,timestamp,like_count,comments_count)";
                const resp = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=${fields}&access_token=${conn.access_token}`);
                if (resp.ok) {
                  const data = await resp.json();
                  const media = data.media?.data || [];
                  media.forEach((m: any) => {
                    fetchedPosts.push({
                      external_id: m.id, content: m.caption || "", published_at: m.timestamp,
                      media_url: m.media_url, media_type: m.media_type,
                      likes: m.like_count || 0, comments: m.comments_count || 0,
                      performance_score: (m.like_count || 0) + (m.comments_count * 2)
                    });
                  });
                  metrics = {
                    followers: data.followers_count || 0,
                    posts_count: data.media_count || media.length, // True total media count!
                    username: data.username,
                    profile_picture: data.profile_picture_url
                  };
                } else {
                  console.error(`[COLLECT] IG API Error: ${resp.status} ${await resp.text()}`);
                }
                break;
              }
              case "twitter": {
                const twTokenToUse = conn.access_token || twToken;
                if (!twTokenToUse) {
                  console.warn(`[COLLECT] No Twitter token found for user ${uid}`);
                  break;
                }
                let handle = conn.username || twitterCreds?.username || twitterCreds?.platform_user_id;
                if (!handle) {
                  console.warn(`[COLLECT] No Twitter handle found for user ${uid}`);
                  break;
                }
                const userUrl = /^\d+$/.test(handle)
                  ? `https://api.twitter.com/2/users/${handle}?user.fields=public_metrics,profile_image_url,name,username`
                  : `https://api.twitter.com/2/users/by/username/${handle}?user.fields=public_metrics,profile_image_url,name,username`;
                
                console.log(`[COLLECT] Fetching Twitter data for ${handle} via ${userUrl}`);
                const userRes = await fetch(userUrl, { headers: { Authorization: `Bearer ${twTokenToUse}` } });
                if (userRes.ok) {
                  const userData = await userRes.json();
                  const u = userData.data || {};
                  const m = u.public_metrics || {};
                  console.log(`[COLLECT] Twitter metrics received: Followers=${m.followers_count}, Tweets=${m.tweet_count}`);
                  metrics = {
                    followers: m.followers_count || 0,
                    posts_count: m.tweet_count || 0,
                    username: u.username || u.name || handle,
                    profile_picture: u.profile_image_url?.replace('_normal', '_400x400')
                  };
                } else {
                  const errText = await userRes.text();
                  console.error(`[COLLECT] Twitter API Error (${userRes.status}): ${errText}`);
                }
                break;
              }
              case "youtube": {
                if (!conn.access_token) break;
                const channelId = conn.platform_user_id || conn.page_id;
                const resp = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`, { headers: { Authorization: `Bearer ${conn.access_token}` } });
                if (resp.ok) {
                  const data = await resp.json();
                  const ch = data.items?.[0];
                  if (ch) {
                    metrics = {
                      followers: parseInt(ch.statistics?.subscriberCount || "0"),
                      posts_count: parseInt(ch.statistics?.videoCount || "0"),
                      views: parseInt(ch.statistics?.viewCount || "0"),
                      profile_picture: ch.snippet?.thumbnails?.high?.url
                    };
                  }
                }
                break;
              }
              case "whatsapp": {
                const [officialMsgs, scheduledCount] = await Promise.all([
                  adminClient.from("messages").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("platform", "whatsapp"),
                  adminClient.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("user_id", uid).contains("platforms", ["whatsapp"]).eq("status", "published")
                ]);
                metrics = {
                  followers: conn.followers_count || 0,
                  posts_count: (officialMsgs.count || 0) + (scheduledCount.count || 0),
                  username: conn.page_name
                };
                break;
              }
            }

            if (metrics) {
              if (metrics.profile_picture) {
                try {
                  metrics.profile_picture = await cacheProfileImage(
                    adminClient, uid, conn.platform, metrics.profile_picture,
                    conn.page_id || conn.platform_user_id || metrics.username || uid
                  );
                } catch (imgErr) {
                  console.warn(`[COLLECT] Image cache fail for ${conn.platform}:`, imgErr);
                }
              }

              const actualId = conn.platform === 'facebook' || conn.platform === 'instagram' 
                ? (conn.page_id || conn.platform_user_id) 
                : (conn.platform_user_id || conn.page_id);

              const totalLikes = fetchedPosts.reduce((s, p) => s + (p.likes || 0), 0);
              const totalShares = fetchedPosts.reduce((s, p) => s + (p.shares || 0), 0);
              const totalComments = fetchedPosts.reduce((s, p) => s + (p.comments || 0), 0);
              const engagementSum = totalLikes + totalShares + totalComments;
              
              const engagementRate = (metrics.followers > 0 && !isNaN(engagementSum))
                ? parseFloat(((engagementSum / metrics.followers) * 100).toFixed(2))
                : 0;

              const upsertPayload = {
                user_id: uid, platform: conn.platform,
                platform_user_id: actualId || `man_${conn.platform}_${uid}`,
                username: metrics.username || conn.username || "",
                page_name: conn.page_name || metrics.username || "",
                profile_picture: metrics.profile_picture || null,
                followers: metrics.followers || 0,
                followers_count: metrics.followers || 0,
                posts_count: metrics.posts_count || 0,
                views: metrics.views || 0,
                likes: totalLikes,
                shares: totalShares,
                comments: totalComments,
                engagement_rate: isNaN(engagementRate) ? 0 : engagementRate,
                last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString()
              };

              const { data: account, error: upsertErr } = await adminClient.from("social_accounts").upsert(upsertPayload, { onConflict: "user_id,platform,platform_user_id" }).select("id").maybeSingle();
              if (upsertErr) console.error(`[COLLECT] Account upsert fail:`, upsertErr.message);

              // SYNC social_connections with new metrics
              try {
                await adminClient.from("social_connections").update({
                  followers_count: upsertPayload.followers_count,
                  posts_count: upsertPayload.posts_count,
                  updated_at: new Date().toISOString()
                }).eq("user_id", uid).eq("platform", conn.platform).eq("platform_user_id", actualId);
              } catch (connSyncErr) {
                console.warn(`[COLLECT] social_connections sync failed:`, connSyncErr.message);
              }

              if (account && fetchedPosts.length > 0) {
                const postPayload = fetchedPosts.map(p => ({
                  user_id: uid, platform: conn.platform, external_id: p.external_id,
                  content: p.content, published_at: p.published_at, media_url: p.media_url || null,
                  media_type: p.media_type || null, likes: p.likes || 0, comments: p.comments || 0,
                  shares: p.shares || 0, performance_score: p.performance_score || 0,
                  collected_at: new Date().toISOString()
                }));
                const { error: postMetricsErr } = await adminClient.from("post_metrics").upsert(postPayload, { onConflict: "user_id,platform,external_id" });
                if (postMetricsErr) console.warn(`[COLLECT] Post metrics fail:`, postMetricsErr.message);
              }
              return { platform: conn.platform, status: "ok" };
            }
          } catch (e) {
            console.error(`[COLLECT] Fail user ${uid} platform ${conn.platform}:`, e);
            return { platform: conn.platform, status: "error", error: String(e) };
          }
          return { platform: conn.platform, status: "no_metrics" };
        });

        const results = await Promise.allSettled(syncPromises);
        globalResults.push(...results.map((r: any) => r.value || { status: "promise_failed", error: String(r.reason) }));

      } catch (e) {
        console.error(`[COLLECT] Fail user ${uid}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, count: globalResults.length, results: globalResults }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error(`[COLLECT] FATAL ERROR:`, error.message);
    return new Response(JSON.stringify({ error: error?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
