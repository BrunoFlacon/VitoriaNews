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

                  let postsCount = data.posts?.summary?.total_count || fbPosts.length;
                  if (!postsCount || postsCount === fbPosts.length) {
                    try {
                      const postsRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/published_posts?summary=total_count&limit=1&access_token=${conn.access_token}`);
                      if (postsRes.ok) {
                        const postsData = await postsRes.json();
                        postsCount = postsData?.summary?.total_count || postsCount;
                      }
                    } catch (e) {
                      console.warn(`[COLLECT] Facebook fallback posts count failed:`, e);
                    }
                  }

                  metrics = {
                    followers: Math.max(data.fan_count || 0, data.followers_count || 0),
                    posts_count: postsCount,
                    username: data.name || conn.page_name,
                    profile_picture: data.picture?.data?.url,
                    platform_user_id: pageId
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
                    profile_picture: data.profile_picture_url,
                    platform_user_id: igUserId
                  };
                } else {
                  console.error(`[COLLECT] IG API Error: ${resp.status} ${await resp.text()}`);
                }
                break;
              }
              case "threads": {
                if (!conn.access_token) break;

                const threadsUserId = conn.platform_user_id || conn.page_id;
                const node = (threadsUserId && threadsUserId !== "") ? threadsUserId : "me";

                let threadsFollowers = conn.followers_count || 0;
                let threadsTotalPosts = conn.posts_count || 0;
                let threadsUsername = conn.page_name || conn.username || "Threads User";
                let threadsPhoto = conn.profile_image_url || conn.profile_picture || null;
                let threadsRealId = threadsUserId;

                // Passo 1: Buscar Perfil Básico
                try {
                  const profileUrl = `https://graph.threads.net/v1.0/${node}?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${conn.access_token}`;
                  const profileResp = await fetch(profileUrl);

                  if (profileResp.ok) {
                    const profileData = await profileResp.json();
                    threadsUsername = profileData.username || threadsUsername;
                    threadsPhoto = profileData.threads_profile_picture_url || threadsPhoto;
                    threadsRealId = profileData.id || threadsRealId;
                    if (profileData.followers_count !== undefined && profileData.followers_count !== null) {
                      threadsFollowers = Number(profileData.followers_count);
                      console.log(`[COLLECT] Threads Followers (from basic profile): ${threadsFollowers}`);
                    }
                    if (profileData.threads_count !== undefined && profileData.threads_count !== null) {
                      threadsTotalPosts = Number(profileData.threads_count);
                      console.log(`[COLLECT] Threads Total Posts (from basic profile): ${threadsTotalPosts}`);
                    }
                    console.log(`[COLLECT] Threads profile OK: @${threadsUsername}`);
                  } else {
                    const errText = await profileResp.text();
                    console.error(`[COLLECT] Threads Profile Error ${profileResp.status}: ${errText}`);
                  }
                } catch (e) {
                  console.error(`[COLLECT] Threads profile request failed:`, e);
                }

                // Passo 1.5: Buscar Métricas de Seguidores via Insights (Método Oficial)
                try {
                  const insightsUrl = `https://graph.threads.net/v1.0/${node}/threads_insights?metric=followers_count&access_token=${conn.access_token}`;
                  const insightsResp = await fetch(insightsUrl);
                  
                  if (insightsResp.ok) {
                    const insightsData = await insightsResp.json();
                    // A API retorna um array de métricas; filtramos a contagem de seguidores
                    if (insightsData.data && insightsData.data.length > 0) {
                      const followerMetric = insightsData.data.find((m: any) => m.name === 'followers_count');
                      if (followerMetric && followerMetric.values && followerMetric.values.length > 0) {
                        threadsFollowers = followerMetric.values[0].value;
                        console.log(`[COLLECT] Threads Followers coletado (via insights): ${threadsFollowers}`);
                      }
                    }
                  } else {
                    console.warn(`[COLLECT] Threads Insights (Followers) falhou: ${await insightsResp.text()}`);
                  }
                } catch (e) {
                  console.warn(`[COLLECT] Erro ao buscar Threads Insights:`, e);
                }

                // Passo 2: Buscar e Paginar TODOS os posts para contagem e extração
                try {
                  const postsFields = "id,text,media_type,media_url,timestamp,like_count,reply_count";
                  let nextUrl: string | null = `https://graph.threads.net/v1.0/${node}/threads?fields=${postsFields}&limit=25&access_token=${conn.access_token}`;
                  
                  let totalFetched = 0;
                  let pageCount = 0;
                  const MAX_PAGES = 50; // limite de segurança (1250 posts)

                  while (nextUrl && pageCount < MAX_PAGES) {
                    const pageResp = await fetch(nextUrl);
                    if (!pageResp.ok) {
                      console.warn(`[COLLECT] Threads page ${pageCount + 1} error: ${pageResp.status} - ${await pageResp.text()}`);
                      break;
                    }

                    const pageData = await pageResp.json();
                    const pagePosts: any[] = pageData.data || [];

                    pagePosts.forEach((m: any) => {
                      fetchedPosts.push({
                        external_id: m.id,
                        content: m.text || "",
                        published_at: m.timestamp,
                        media_url: m.media_url || null,
                        media_type: m.media_type || "TEXT",
                        likes: m.like_count || 0,
                        comments: m.reply_count || 0,
                        performance_score: (m.like_count || 0) + ((m.reply_count || 0) * 2)
                      });
                    });

                    totalFetched += pagePosts.length;
                    pageCount++;

                    // FIX: Usar 'paging.next' nativo da Meta Graph API é à prova de falhas
                    if (pagePosts.length > 0 && pageData.paging && pageData.paging.next) {
                      nextUrl = pageData.paging.next;
                    } else {
                      nextUrl = null;
                    }
                  }

                  console.log(`[COLLECT] Threads posts: ${totalFetched} total em ${pageCount} página(s)`);
                  // Atualiza o total de posts com base na contagem oficial e na quantidade real varrida
                  if (pageCount > 0) {
                    threadsTotalPosts = Math.max(threadsTotalPosts, totalFetched);
                  }
                } catch (postsErr) {
                  console.warn(`[COLLECT] Threads pagination failed:`, postsErr);
                }

                // Passo 3: Fechar o objeto de métricas com os valores precisos
                metrics = {
                  followers: threadsFollowers,
                  posts_count: threadsTotalPosts,
                  username: threadsUsername,
                  profile_picture: threadsPhoto,
                  platform_user_id: threadsRealId
                };

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
              case "tiktok": {
                if (!conn.access_token) {
                  // Fallback se não tiver access token
                  metrics = {
                    followers: conn.followers_count || 0,
                    posts_count: conn.posts_count || 0,
                    username: conn.page_name || conn.username || "TikTok User",
                    profile_picture: conn.profile_image_url || conn.profile_picture || null
                  };
                  break;
                }
                const resp = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count,video_count,likes_count", {
                  headers: { Authorization: `Bearer ${conn.access_token}` }
                });
                if (resp.ok) {
                  const data = await resp.json();
                  const u = data.data?.user;
                  if (u) {
                    metrics = {
                      followers: u.follower_count || conn.followers_count || 0,
                      posts_count: u.video_count || conn.posts_count || 0,
                      likes: u.likes_count || 0,
                      username: u.display_name || u.username || conn.page_name || conn.username || "TikTok User",
                      profile_picture: u.avatar_url || conn.profile_image_url || conn.profile_picture || null
                    };
                  }
                } else {
                  console.warn(`[COLLECT] TikTok API error: ${resp.status} ${await resp.text()}`);
                  metrics = {
                    followers: conn.followers_count || 0,
                    posts_count: conn.posts_count || 0,
                    username: conn.page_name || conn.username || "TikTok User",
                    profile_picture: conn.profile_image_url || conn.profile_picture || null
                  };
                }
                break;
              }
              case "whatsapp": {
                const [officialMsgs, scheduledCount] = await Promise.all([
                  adminClient.from("messages").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("platform", "whatsapp"),
                  adminClient.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("user_id", uid).contains("platforms", ["whatsapp"]).eq("status", "published")
                ]);

                let profilePicUrl = conn.profile_picture || conn.profile_image_url || null;

                // Fetch from Meta API if we have access token
                let token = conn.access_token;
                if (!token) {
                  const { data: credsData } = await adminClient
                    .from("api_credentials")
                    .select("credentials")
                    .eq("user_id", uid)
                    .eq("platform", "whatsapp")
                    .maybeSingle();
                  token = credsData?.credentials?.access_token;
                }

                if (token && conn.platform_user_id) {
                  try {
                    const metaResp = await fetch(`https://graph.facebook.com/v21.0/${conn.platform_user_id}/whatsapp_business_profile?fields=profile_picture_url`, {
                      headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (metaResp.ok) {
                      const metaData = await metaResp.json();
                      if (metaData.profile_picture_url) {
                        profilePicUrl = metaData.profile_picture_url;
                        console.log(`[COLLECT] Fetched WhatsApp profile picture: ${profilePicUrl}`);
                      }
                    }
                  } catch (e) {
                    console.warn(`[COLLECT] Failed to fetch WhatsApp profile picture:`, e);
                  }
                }

                metrics = {
                  followers: conn.followers_count || 0,
                  posts_count: (officialMsgs.count || 0) + (scheduledCount.count || 0),
                  username: conn.page_name,
                  profile_picture: profilePicUrl
                };
                break;
              }

              // ─────────────────────────────────────────────────────────────
              // LINKEDIN  — REST API 202401 + foto hi-res + rede + posts
              // ─────────────────────────────────────────────────────────────
              case "linkedin": {
                if (!conn.access_token) break;

                const liHeaders: Record<string, string> = {
                  Authorization:               `Bearer ${conn.access_token}`,
                  "Content-Type":              "application/json",
                  "LinkedIn-Version":          "202401",
                  "X-Restli-Protocol-Version": "2.0.0",
                };

                // 1) Perfil via OIDC — retorna sub (userId), name, picture
                const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: liHeaders });
                if (!profileRes.ok) {
                  console.warn(`[COLLECT] LinkedIn userinfo failed: ${profileRes.status}`);
                  break;
                }
                const profileData = await profileRes.json();
                if (!profileData.sub) {
                  console.warn("[COLLECT] LinkedIn: sub ausente — token expirado?");
                  break;
                }

                const liUserId   = profileData.sub as string;
                const authorUrn  = `urn:li:person:${liUserId}`;
                let   picUrl     = (profileData.picture as string) || conn.profile_image_url || "";

                // 2) Foto em alta resolução via projection (v2 ainda suporta)
                try {
                  const picRes = await fetch(
                    "https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~:playableStreams))",
                    { headers: liHeaders }
                  );
                  if (picRes.ok) {
                    const picData    = await picRes.json();
                    const elements   = (picData?.profilePicture?.["displayImage~"]?.elements ?? []) as any[];
                    if (elements.length > 0) {
                      picUrl = elements[elements.length - 1]?.identifiers?.[0]?.identifier || picUrl;
                    }
                  }
                } catch { /* usa OIDC picture como fallback */ }

                // 3) Tamanho da rede (1º grau)
                let liFollowers = conn.followers_count || 0;
                try {
                  const netRes = await fetch(
                    `https://api.linkedin.com/v2/networkSizes/${encodeURIComponent(authorUrn)}?edgeType=CompanyFollowedByMember`,
                    { headers: liHeaders }
                  );
                  if (netRes.ok) {
                    const netData  = await netRes.json();
                    liFollowers    = netData?.firstDegreeSize ?? liFollowers;
                  }
                } catch {}

                // 4) Total de posts + engagement dos 5 mais recentes
                let liPostsCount = conn.posts_count || 0;
                try {
                  const postsRes = await fetch(
                    `https://api.linkedin.com/rest/posts?author=${encodeURIComponent(authorUrn)}&q=author&count=5&sortBy=LAST_MODIFIED`,
                    { headers: liHeaders }
                  );
                  if (postsRes.ok) {
                    const postsData = await postsRes.json();
                    liPostsCount    = postsData?.paging?.total ?? liPostsCount;

                    for (const post of (postsData?.elements ?? []) as any[]) {
                      let postLikes = 0, postComments = 0;
                      try {
                        const actRes = await fetch(
                          `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(post.id)}`,
                          { headers: liHeaders }
                        );
                        if (actRes.ok) {
                          const actData  = await actRes.json();
                          postLikes      = actData?.likesSummary?.totalLikes ?? 0;
                          postComments   = actData?.commentsSummary?.totalFirstLevelComments ?? 0;
                        }
                      } catch {}

                      fetchedPosts.push({
                        external_id:       post.id,
                        content:           post.commentary || "",
                        published_at:      post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
                        likes:             postLikes,
                        comments:          postComments,
                        shares:            0,
                        performance_score: postLikes + postComments * 2,
                      });
                    }
                  }
                } catch {}

                metrics = {
                  followers:       liFollowers,
                  posts_count:     liPostsCount,
                  username:        (profileData.name as string) || conn.username || conn.page_name || "",
                  profile_picture: picUrl,
                  views:           0,
                };
                break;
              }

              // ─────────────────────────────────────────────────────────────
              // PINTEREST — v5: foto, seguidores, pins, analytics 30d
              // ─────────────────────────────────────────────────────────────
              case "pinterest": {
                if (!conn.access_token) break;

                const pinHeaders: Record<string, string> = {
                  Authorization:  `Bearer ${conn.access_token}`,
                  "Content-Type": "application/json",
                };

                const pinRes  = await fetch("https://api.pinterest.com/v5/user_account", { headers: pinHeaders });
                if (!pinRes.ok) {
                  console.warn(`[COLLECT] Pinterest user_account failed: ${pinRes.status}`);
                  break;
                }
                const pinData = await pinRes.json();
                if (!pinData.username) break;

                // Analytics dos últimos 30 dias
                const pinEndDate   = new Date().toISOString().split("T")[0];
                const pinStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                let   pinImpressions = 0, pinClicks = 0, pinOutbound = 0, pinSaves = 0;
                try {
                  const analyticsRes = await fetch(
                    `https://api.pinterest.com/v5/user_account/analytics?start_date=${pinStartDate}&end_date=${pinEndDate}&metric_types=IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE`,
                    { headers: pinHeaders }
                  );
                  if (analyticsRes.ok) {
                    const analyticsData = await analyticsRes.json();
                    for (const day of (analyticsData?.all?.daily_metrics ?? []) as any[]) {
                      const m = day.metrics ?? {};
                      pinImpressions += m.IMPRESSION      || 0;
                      pinClicks      += m.PIN_CLICK       || 0;
                      pinOutbound    += m.OUTBOUND_CLICK  || 0;
                      pinSaves       += m.SAVE            || 0;
                    }
                  }
                } catch {}

                metrics = {
                  followers:       pinData.follower_count  || 0,
                  posts_count:     pinData.pin_count       || 0,
                  username:        pinData.username        || "",
                  profile_picture: pinData.profile_image  || conn.profile_image_url || "",
                  views:           pinImpressions,
                  metadata: {
                    board_count:         pinData.board_count     || 0,
                    following_count:     pinData.following_count || 0,
                    monthly_views:       pinData.monthly_views   || 0,
                    account_type:        pinData.account_type    || "PERSONAL",
                    impressions_30d:     pinImpressions,
                    pin_clicks_30d:      pinClicks,
                    outbound_clicks_30d: pinOutbound,
                    saves_30d:           pinSaves,
                  },
                };
                break;
              }

              // ─────────────────────────────────────────────────────────────
              // SNAPCHAT — Marketing API: nome, foto bitmoji, stats 30d
              // Nota: Snapchat não expõe seguidores orgânicos via API pública.
              // ─────────────────────────────────────────────────────────────
              case "snapchat": {
                // Token: OAuth connection → api_credentials
                let snapToken   = conn.access_token;
                let snapAcctId  = conn.page_id || conn.platform_user_id || null;

                if (!snapToken) {
                  const snapCreds = await getCredentials(adminClient, uid, "snapchat");
                  snapToken  = snapCreds?.access_token  || snapCreds?.accessToken  || null;
                  snapAcctId = snapAcctId || snapCreds?.ad_account_id || snapCreds?.adAccountId || null;
                }
                if (!snapToken) break;

                const snapHeaders: Record<string, string> = {
                  Authorization:  `Bearer ${snapToken}`,
                  "Content-Type": "application/json",
                };

                // 1) Usuário autenticado
                const snapMeRes  = await fetch("https://adsapi.snapchat.com/v1/me", { headers: snapHeaders });
                if (!snapMeRes.ok) {
                  console.warn(`[COLLECT] Snapchat /me failed: ${snapMeRes.status}`);
                  break;
                }
                const snapMeData = await snapMeRes.json();
                const snapMe     = snapMeData?.me;

                // 2) Estatísticas de campanhas (30 dias) — se houver ad_account_id
                let snapImpressions = 0, snapSwipes = 0, snapVideoViews = 0;
                let snapSaves = 0, snapShares = 0, snapReach = 0;

                if (snapAcctId) {
                  try {
                    const snapEndTime   = new Date().toISOString();
                    const snapStartTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

                    const snapStatsRes = await fetch(
                      `https://adsapi.snapchat.com/v1/adaccounts/${snapAcctId}/stats`,
                      {
                        method: "POST",
                        headers: snapHeaders,
                        body: JSON.stringify({
                          granularity: "TOTAL",
                          fields: ["impressions", "swipes", "video_views", "reach", "saves", "shares"],
                          start_time: snapStartTime,
                          end_time:   snapEndTime,
                        }),
                      }
                    );
                    if (snapStatsRes.ok) {
                      const snapStats = await snapStatsRes.json();
                      const s         = snapStats?.total_stats ?? {};
                      snapImpressions = s.impressions  || 0;
                      snapSwipes      = s.swipes       || 0;
                      snapVideoViews  = s.video_views  || 0;
                      snapSaves       = s.saves        || 0;
                      snapShares      = s.shares       || 0;
                      snapReach       = s.reach        || 0;
                    }
                  } catch {}
                }

                metrics = {
                  followers:       0,  // Snapchat não expõe seguidores orgânicos
                  posts_count:     0,
                  username:        snapMe?.display_name || conn.username || conn.page_name || "",
                  profile_picture: snapMe?.bitmoji?.background_url || snapMe?.bitmoji?.avatar_url || conn.profile_image_url || "",
                  views:           snapImpressions,
                  metadata: {
                    ad_account_id:   snapAcctId || "",
                    email:           snapMe?.email || "",
                    impressions_30d: snapImpressions,
                    swipes_30d:      snapSwipes,
                    video_views_30d: snapVideoViews,
                    reach_30d:       snapReach,
                    saves_30d:       snapSaves,
                    shares_30d:      snapShares,
                    note: "Snapchat não expõe seguidores orgânicos via Marketing API.",
                  },
                };
                break;
              }
              case "reddit": {
                const redditHeaders = { "Authorization": `bearer ${conn.access_token}`, "User-Agent": "SocialCanvasHub/1.0" };
                let redditFollowers = conn.followers_count || 0;
                let redditKarma = 0;
                let redditPosts = conn.posts_count || 0;
                try {
                  const meRes = await fetch("https://oauth.reddit.com/api/v1/me", { headers: redditHeaders });
                  if (meRes.ok) {
                    const me = await meRes.json();
                    redditKarma = (me.link_karma || 0) + (me.comment_karma || 0);
                  }
                  const subRes = await fetch(`https://oauth.reddit.com/user/${conn.username}/submitted?limit=10`, { headers: redditHeaders });
                  if (subRes.ok) {
                    const subData = await subRes.json();
                    redditPosts = subData.data?.dist || redditPosts;
                    fetchedPosts = (subData.data?.children || []).map((c: any) => ({
                      external_id: c.data.id,
                      content: c.data.title,
                      likes: c.data.ups || 0,
                      comments: c.data.num_comments || 0,
                      shares: 0,
                      views: c.data.view_count || 0,
                      published_at: new Date((c.data.created_utc || 0) * 1000).toISOString(),
                    }));
                  }
                } catch (e) { console.warn("[COLLECT] Reddit error:", e); }
                metrics = {
                  followers: redditFollowers,
                  posts_count: redditPosts,
                  username: conn.username || "",
                  profile_picture: conn.profile_image_url || "",
                  views: 0,
                  metadata: { karma: redditKarma },
                };
                break;
              }
              case "spotify": {
                let spotifyFollowers = conn.followers_count || 0;
                let spotifyPlaylists = conn.posts_count || 0;
                try {
                  const meRes = await fetch("https://api.spotify.com/v1/me", { headers: { "Authorization": `Bearer ${conn.access_token}` } });
                  if (meRes.ok) {
                    const me = await meRes.json();
                    spotifyFollowers = me.followers?.total || spotifyFollowers;
                  }
                  const plRes = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", { headers: { "Authorization": `Bearer ${conn.access_token}` } });
                  if (plRes.ok) {
                    const plData = await plRes.json();
                    spotifyPlaylists = plData.total || spotifyPlaylists;
                  }
                } catch (e) { console.warn("[COLLECT] Spotify error:", e); }
                metrics = {
                  followers: spotifyFollowers,
                  posts_count: spotifyPlaylists,
                  username: conn.username || "",
                  profile_picture: conn.profile_image_url || "",
                  views: 0,
                };
                break;
              }
              case "kwai": {
                // Kwai retorna dados no token exchange; sem API de coleta extra pública
                metrics = {
                  followers: conn.followers_count || 0,
                  posts_count: conn.posts_count || 0,
                  username: conn.username || "",
                  profile_picture: conn.profile_image_url || "",
                  views: 0,
                };
                break;
              }
              case "truth_social": {
                let truthFollowers = conn.followers_count || 0;
                let truthPosts = conn.posts_count || 0;
                try {
                  const meRes = await fetch("https://truthsocial.com/api/v1/accounts/verify_credentials", { headers: { "Authorization": `Bearer ${conn.access_token}` } });
                  if (meRes.ok) {
                    const me = await meRes.json();
                    truthFollowers = me.followers_count || truthFollowers;
                    truthPosts = me.statuses_count || truthPosts;
                  }
                  const timelineRes = await fetch(`https://truthsocial.com/api/v1/accounts/${conn.platform_user_id}/statuses?limit=10`, { headers: { "Authorization": `Bearer ${conn.access_token}` } });
                  if (timelineRes.ok) {
                    const posts = await timelineRes.json();
                    fetchedPosts = posts.map((p: any) => ({
                      external_id: p.id,
                      content: p.content,
                      likes: p.favourites_count || 0,
                      comments: p.replies_count || 0,
                      shares: p.reblogs_count || 0,
                      views: 0,
                      published_at: p.created_at,
                    }));
                  }
                } catch (e) { console.warn("[COLLECT] TruthSocial error:", e); }
                metrics = {
                  followers: truthFollowers,
                  posts_count: truthPosts,
                  username: conn.username || "",
                  profile_picture: conn.profile_image_url || "",
                  views: 0,
                };
                break;
              }
              case "gettr": {
                const gettrUsername = conn.username || conn.page_name || "";
                let gettrFollowers = conn.followers_count || 0;
                let gettrPosts = conn.posts_count || 0;
                try {
                  const res = await fetch(`https://api.gettr.com/u/user/${gettrUsername}/public`, { headers: { "x-app-auth": conn.access_token } });
                  if (res.ok) {
                    const data = await res.json();
                    const uinf = data.result?.aux?.uinf?.[gettrUsername];
                    if (uinf) {
                      gettrFollowers = uinf.flw || gettrFollowers;
                      gettrPosts = uinf.pst || gettrPosts;
                    }
                  }
                } catch (e) { console.warn("[COLLECT] Gettr error:", e); }
                metrics = {
                  followers: gettrFollowers,
                  posts_count: gettrPosts,
                  username: gettrUsername,
                  profile_picture: conn.profile_image_url || "",
                  views: 0,
                };
                break;
              }
              case "rumble": {
                const rumbleUsername = conn.username || conn.page_name || "";
                let rumbleVideos = conn.posts_count || 0;
                try {
                  const rssRes = await fetch(`https://rumble.com/c/${rumbleUsername}/rss`, { headers: { "User-Agent": "SocialCanvasHub/1.0" } });
                  const rssRes2 = rssRes.ok ? rssRes : await fetch(`https://rumble.com/user/${rumbleUsername}/rss`, { headers: { "User-Agent": "SocialCanvasHub/1.0" } });
                  if (rssRes2.ok) {
                    const rssText = await rssRes2.text();
                    const items = rssText.match(/<item>/g) || [];
                    rumbleVideos = items.length || rumbleVideos;
                    const videoMatches = [...rssText.matchAll(/<item>([\s\S]*?)<\/item>/g)];
                    fetchedPosts = videoMatches.slice(0, 10).map((m, i) => {
                      const title = m[1].match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || `Video ${i + 1}`;
                      const pubDate = m[1].match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
                      const link = m[1].match(/<link>(.*?)<\/link>/)?.[1] || "";
                      return { external_id: link || `rumble_${i}`, content: title, likes: 0, comments: 0, shares: 0, views: 0, published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString() };
                    });
                  }
                } catch (e) { console.warn("[COLLECT] Rumble error:", e); }
                metrics = {
                  followers: conn.followers_count || 0,
                  posts_count: rumbleVideos,
                  username: rumbleUsername,
                  profile_picture: conn.profile_image_url || "",
                  views: 0,
                };
                break;
              }
              case "giphy": {
                let giphyCount = conn.posts_count || 0;
                try {
                  const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${conn.access_token}&q=*&limit=1`);
                  if (res.ok) {
                    const data = await res.json();
                    giphyCount = data.pagination?.total_count || giphyCount;
                  }
                } catch (e) { console.warn("[COLLECT] Giphy error:", e); }
                metrics = {
                  followers: 0,
                  posts_count: giphyCount,
                  username: conn.username || "",
                  profile_picture: conn.profile_image_url || "",
                  views: 0,
                };
                break;
              }
              case "website": {
                const domain = conn.platform_user_id || conn.username || "";
                let websitePosts = conn.posts_count || 0;
                try {
                  const feedUrls = [`https://${domain}/feed`, `https://${domain}/rss`, `https://${domain}/rss.xml`, `https://${domain}/feed.xml`];
                  for (const feedUrl of feedUrls) {
                    const rssRes = await fetch(feedUrl, { headers: { "User-Agent": "SocialCanvasHub/1.0" } });
                    if (rssRes.ok) {
                      const rssText = await rssRes.text();
                      const items = rssText.match(/<item>|<entry>/gi) || [];
                      websitePosts = items.length || websitePosts;
                      const postMatches = [...rssText.matchAll(/<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g)];
                      fetchedPosts = postMatches.slice(0, 10).map((m, i) => {
                        const block = m[1] || m[2] || "";
                        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || `Post ${i+1}`;
                        const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || block.match(/<updated>(.*?)<\/updated>/)?.[1] || "";
                        const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
                        return { external_id: link || `website_post_${i}`, content: title, likes: 0, comments: 0, shares: 0, views: 0, published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString() };
                      });
                      break;
                    }
                  }
                } catch (e) { console.warn("[COLLECT] Website error:", e); }
                metrics = {
                  followers: 0,
                  posts_count: websitePosts,
                  username: domain,
                  profile_picture: conn.profile_image_url || "",
                  views: 0,
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

              const actualId = metrics.platform_user_id || 
                (conn.platform === 'facebook' || conn.platform === 'instagram' 
                  ? (conn.page_id || conn.platform_user_id) 
                  : (conn.platform_user_id || conn.page_id));

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
                ...(metrics.metadata ? { metadata: metrics.metadata } : {}),
                last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString()
              };

               const { data: account, error: upsertErr } = await adminClient.from("social_accounts").upsert(upsertPayload, { onConflict: "user_id,platform,platform_user_id" }).select("id").maybeSingle();
              if (upsertErr) console.error(`[COLLECT] Account upsert fail:`, upsertErr.message);

              // SYNC social_connections with new metrics
              try {
                await adminClient.from("social_connections").update({
                  followers_count: upsertPayload.followers_count,
                  posts_count: upsertPayload.posts_count,
                  profile_image_url: upsertPayload.profile_picture,
                  profile_picture: upsertPayload.profile_picture,
                  ...((!conn.platform_user_id || conn.platform_user_id === "") ? { platform_user_id: upsertPayload.platform_user_id } : {}),
                  updated_at: new Date().toISOString()
                }).eq("id", conn.id);
              } catch (connSyncErr: any) {
                console.warn(`[COLLECT] social_connections sync failed:`, connSyncErr.message);
              }

              // Record point-in-time snapshot in account_metrics (used by growth/follower charts)
              try {
                await adminClient.from("account_metrics").insert({
                  user_id: uid,
                  social_account_id: account?.id || null,
                  platform: conn.platform,
                  followers: upsertPayload.followers_count,
                  posts_count: upsertPayload.posts_count,
                  views: upsertPayload.views,
                  likes: upsertPayload.likes,
                  shares: upsertPayload.shares,
                  comments: upsertPayload.comments,
                  engagement_rate: upsertPayload.engagement_rate,
                  collected_at: new Date().toISOString()
                });
                console.log(`[COLLECT] account_metrics snapshot recorded for ${conn.platform}`);
              } catch (histErr: any) {
                console.warn(`[COLLECT] account_metrics snapshot failed:`, histErr.message);
              }

              if (account && fetchedPosts.length > 0) {
                // Skip rows missing external_id — NULL bypasses the unique index and causes duplicates
                const validPosts = fetchedPosts.filter((p: any) => !!p.external_id);
                if (validPosts.length > 0) {
                  const postPayload = validPosts.map(p => ({
                    user_id: uid, platform: conn.platform, external_id: p.external_id,
                    content: p.content, published_at: p.published_at, media_url: p.media_url || null,
                    media_type: p.media_type || null, likes: p.likes || 0, comments: p.comments || 0,
                    shares: p.shares || 0, performance_score: p.performance_score || 0,
                    collected_at: new Date().toISOString()
                  }));
                  const { error: postMetricsErr } = await adminClient.from("post_metrics").upsert(postPayload, { onConflict: "user_id,platform,external_id" });
                  if (postMetricsErr) console.warn(`[COLLECT] Post metrics fail:`, postMetricsErr.message);
                }
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
