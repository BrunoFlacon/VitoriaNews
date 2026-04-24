// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheProfileImage } from "_shared/media.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || req.headers.get("X-Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    
    let userId: string | undefined;
    let bodyPayload: any = {};
    try {
       bodyPayload = await req.json();
    } catch {}

    // --- AUTH LOGIC ---
    if (token) {
      // Check if it's the Service Key
      if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
        // Authorized as SYSTEM
      } else {
        // Try as USER
        const { data: { user } } = await adminClient.auth.getUser(token);
        if (user) userId = user.id;
      }
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
        .select("distinct(user_id)")
        .eq("is_connected", true);
      usersToSync = (allUsers || []).map((u: any) => u.user_id);
    }

    const globalResults: any[] = [];

    for (const uid of usersToSync) {
      try {
        const { data: connections } = await adminClient
          .from("social_connections")
          .select("*")
          .eq("user_id", uid)
          .eq("is_connected", true);

        if (!connections || connections.length === 0) continue;

        const twitterCreds = await getCredentials(adminClient, uid, "twitter");
        const whatsappCreds = await getCredentials(adminClient, uid, "whatsapp");
        const twToken = twitterCreds?.bearer_token || twitterCreds?.token;
        const waToken = whatsappCreds?.access_token || whatsappCreds?.accessToken;

        for (const conn of connections) {
          if (conn.platform === "telegram") continue;

          let metrics: any = null;
          let fetchedPosts: any[] = [];

          try {
            switch (conn.platform) {
              case "facebook": {
                if (!conn.access_token) continue;
                const pageId = conn.page_id || conn.platform_user_id;
                const fields = "followers_count,fan_count,picture.type(large),cover,posts.limit(100).fields(id,message,created_time,shares,comments.summary(true),likes.summary(true))";
                const resp = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${conn.access_token}`);
                if (resp.ok) {
                  const data = await resp.json();
                  const fbPosts = data.posts?.data || [];
                  fbPosts.forEach((p: any) => {
                    const likes = p.likes?.summary?.total_count || 0;
                    const comments = p.comments?.summary?.total_count || 0;
                    const shares = p.shares?.count || 0;
                    fetchedPosts.push({
                      external_id: p.id,
                      content: p.message || "",
                      published_at: p.created_time,
                      likes, comments, shares,
                      performance_score: (likes + comments + shares)
                    });
                  });
                  metrics = {
                    followers: data.followers_count || data.fan_count || 0,
                    posts_count: data.posts?.summary?.total_count || fbPosts.length,
                    likes: fetchedPosts.reduce((s, p) => s + p.likes, 0),
                    profile_picture: data.picture?.data?.url
                  };
                }
                break;
              }
              case "instagram": {
                if (!conn.access_token) continue;
                const igUserId = conn.platform_user_id;
                const fields = "followers_count,media_count,username,profile_picture_url,media.limit(100).fields(id,caption,media_type,media_url,timestamp,like_count,comments_count)";
                const resp = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=${fields}&access_token=${conn.access_token}`);
                if (resp.ok) {
                  const data = await resp.json();
                  const media = data.media?.data || [];
                  media.forEach((m: any) => {
                    const likes = m.like_count || 0;
                    const comments = m.comments_count || 0;
                    fetchedPosts.push({
                      external_id: m.id,
                      content: m.caption || "",
                      published_at: m.timestamp,
                      media_url: m.media_url,
                      media_type: m.media_type,
                      likes, comments,
                      performance_score: (likes + (comments * 2))
                    });
                  });
                  metrics = {
                    followers: data.followers_count || 0,
                    posts_count: data.media_count || media.length,
                    username: data.username,
                    profile_picture: data.profile_picture_url
                  };
                }
                break;
              }
              case "twitter": {
                const tokenToUse = conn.access_token || twToken;
                if (!tokenToUse) continue;
                const bearerToken = decodeURIComponent(tokenToUse);
                const handle = conn.username || twitterCreds?.platform_user_id || "twitter";
                const userUrl = /^\d+$/.test(handle) 
                  ? `https://api.twitter.com/2/users/${handle}?user.fields=public_metrics,profile_image_url`
                  : `https://api.twitter.com/2/users/by/username/${handle}?user.fields=public_metrics,profile_image_url`;
                const userRes = await fetch(userUrl, { headers: { Authorization: `Bearer ${bearerToken}` } });
                if (userRes.ok) {
                  const userData = await userRes.json();
                  const u = userData.data || {};
                  const m = u.public_metrics || {};
                  metrics = {
                    followers: m.followers_count || 0,
                    posts_count: m.tweet_count || 0,
                    username: u.username,
                    profile_picture: u.profile_image_url?.replace('_normal', '')
                  };
                  const tweetsUrl = `https://api.twitter.com/2/users/${u.id}/tweets?max_results=100&tweet.fields=public_metrics,created_at,text`;
                  const tweetRes = await fetch(tweetsUrl, { headers: { Authorization: `Bearer ${bearerToken}` } });
                  if (tweetRes.ok) {
                    const tweetData = await tweetRes.json();
                    (tweetData.data || []).forEach((t: any) => {
                      const pm = t.public_metrics || {};
                      fetchedPosts.push({
                        external_id: t.id,
                        content: t.text,
                        published_at: t.created_at,
                        likes: pm.like_count || 0,
                        comments: pm.reply_count || 0,
                        shares: pm.retweet_count || 0,
                        performance_score: (pm.like_count || 0) + (pm.retweet_count || 0)
                      });
                    });
                  }
                }
                break;
              }
              case "youtube": {
                if (!conn.access_token) continue;
                const channelId = conn.platform_user_id || conn.page_id;
                const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`;
                const resp = await fetch(url, { headers: { Authorization: `Bearer ${conn.access_token}` } });
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
                    const vUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video`;
                    const vResp = await fetch(vUrl, { headers: { Authorization: `Bearer ${conn.access_token}` } });
                    if (vResp.ok) {
                      const vData = await vResp.json();
                      (vData.items || []).forEach((v: any) => {
                        fetchedPosts.push({
                          external_id: v.id.videoId,
                          content: v.snippet.title,
                          published_at: v.snippet.publishedAt,
                          media_url: v.snippet.thumbnails?.high?.url,
                          performance_score: 0
                        });
                      });
                    }
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
              // Cache profile picture in our storage
              if (metrics.profile_picture) {
                metrics.profile_picture = await cacheProfileImage(
                  adminClient,
                  uid,
                  conn.platform,
                  metrics.profile_picture,
                  conn.page_id || conn.platform_user_id || metrics.username || uid
                );
              }

              const upsertPayload = {
                user_id: uid,
                platform: conn.platform,
                platform_user_id: conn.page_id || conn.platform_user_id || `man_${conn.platform}_${uid}`,
                username: metrics.username || conn.username || "",
                page_name: conn.page_name || metrics.username || "",
                profile_picture: metrics.profile_picture || null,
                followers: metrics.followers || 0,
                followers_count: metrics.followers || 0,
                posts_count: metrics.posts_count || 0,
                updated_at: new Date().toISOString(),
                last_synced_at: new Date().toISOString()
              };

              const { data: account } = await adminClient.from("social_accounts").upsert(
                upsertPayload, { onConflict: "user_id,platform,platform_user_id" }
              ).select("id").single();

              if (account && fetchedPosts.length > 0) {
                const postPayload = fetchedPosts.map(p => ({
                  user_id: uid,
                  platform: conn.platform,
                  external_id: p.external_id,
                  content: p.content,
                  published_at: p.published_at,
                  media_url: p.media_url || null,
                  media_type: p.media_type || null,
                  likes: p.likes || 0,
                  comments: p.comments || 0,
                  shares: p.shares || 0,
                  performance_score: p.performance_score || 0,
                  collected_at: new Date().toISOString()
                }));
                await adminClient.from("post_metrics").upsert(postPayload, { onConflict: "user_id,platform,external_id" });
                
                await adminClient.from("account_metrics").insert({
                  user_id: uid, social_account_id: account.id, platform: conn.platform,
                  followers: metrics.followers || 0, posts_count: metrics.posts_count || 0,
                  collected_at: new Date().toISOString()
                });
              }
            }
            globalResults.push({ userId: uid, platform: conn.platform, status: "ok" });
          } catch (e) {
            console.error(`[COLLECT] Fail user ${uid} platform ${conn.platform}:`, e);
            globalResults.push({ userId: uid, platform: conn.platform, status: "error", error: String(e) });
          }
        }
      } catch (e) {
        console.error(`[COLLECT] Fail user ${uid}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, count: globalResults.length, results: globalResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
