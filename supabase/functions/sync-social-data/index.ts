// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheProfileImage } from "../_shared/media.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase   = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No Authorization header found" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const { data: connections, error: connError } = await supabase
      .from("social_connections")
      .select("id, user_id, platform, access_token, platform_user_id, page_name, page_id, profile_image_url, profile_picture, username, followers_count, posts_count")
      .eq("user_id", userId)
      .eq("is_connected", true);

    if (connError) throw connError;

    const telegramCreds  = await getCredentials(supabase, userId, "telegram");
    const whatsappCreds  = await getCredentials(supabase, userId, "whatsapp");
    const snapchatCreds  = await getCredentials(supabase, userId, "snapchat");

    const results: any[] = [];

    for (const conn of (connections || [])) {
      try {
        let stats: any = null;

        // ─────────────────────────────────────────────────────────────────────
        // FACEBOOK / INSTAGRAM
        // ─────────────────────────────────────────────────────────────────────
        if (conn.platform === "facebook" || conn.platform === "instagram") {
          const fields = "name,fan_count,followers_count,picture.type(large)";
          const pageId = conn.page_id || conn.platform_user_id;
          if (pageId && conn.access_token) {
            const res  = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${conn.access_token}`);
            const data = await res.json();
            if (!data.error) {
              const followers   = data.followers_count || data.fan_count || 0;
              const profilePic  = data.picture?.data?.url || conn.profile_image_url || "";
              let postsCount    = 0;
              try {
                const postsRes  = await fetch(`https://graph.facebook.com/v21.0/${pageId}/posts?limit=1&summary=true&access_token=${conn.access_token}`);
                const postsData = await postsRes.json();
                postsCount      = postsData?.summary?.total_count || 0;
              } catch {}
              let views = 0, likes = 0, shares = 0, comments = 0;
              try {
                const metric      = conn.platform === "instagram" ? "impressions,reach,likes,comments,saved" : "post_impressions,post_engaged_users";
                const insightsRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/insights?metric=${metric}&access_token=${conn.access_token}`);
                const insightsData= await insightsRes.json();
                if (insightsData.data) {
                  for (const item of insightsData.data) {
                    const val = item.values?.[0]?.value || 0;
                    if (item.name === "impressions"    || item.name === "post_impressions")  views    = val;
                    if (item.name === "likes")   likes    = val;
                    if (item.name === "comments") comments = val;
                  }
                }
              } catch {}
              const cachedPic       = await cacheProfileImage(supabase, conn.user_id, conn.platform, profilePic, pageId) || profilePic;
              const engagementRate  = followers > 0 ? parseFloat((((likes + comments + shares) / followers) * 100).toFixed(2)) : 0;
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: pageId,
                username: data.name || conn.page_name || "", page_name: data.name || conn.page_name || "",
                profile_picture: cachedPic,
                followers, followers_count: followers, posts_count: postsCount,
                metadata: { posts_count: postsCount },
                views, likes, shares, comments, engagement_rate: engagementRate,
                is_connected: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              };
            }
          }

        // ─────────────────────────────────────────────────────────────────────
        // TWITTER / X
        // ─────────────────────────────────────────────────────────────────────
        } else if (conn.platform === "twitter" || conn.platform === "x") {
          if (conn.access_token) {
            const res  = await fetch(`https://api.twitter.com/2/users/${conn.platform_user_id}?user.fields=profile_image_url,public_metrics,name,username,description`, {
              headers: { Authorization: `Bearer ${conn.access_token}` },
            });
            const data = await res.json();
            if (data.data) {
              const metrics = data.data.public_metrics || {};
              stats = {
                user_id: conn.user_id, platform: "twitter", platform_user_id: conn.platform_user_id,
                username: data.data.username || "", page_name: data.data.name || "",
                profile_picture: await cacheProfileImage(supabase, conn.user_id, "twitter", data.data.profile_image_url?.replace("_normal", "_400x400"), conn.platform_user_id) || conn.profile_image_url || "",
                followers: metrics.followers_count || 0, followers_count: metrics.followers_count || 0,
                posts_count: metrics.tweet_count || 0,
                metadata: { posts_count: metrics.tweet_count || 0 },
                views: 0, likes: metrics.like_count || 0, shares: 0, comments: 0, engagement_rate: 0,
                is_connected: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              };
            }
          }

        // ─────────────────────────────────────────────────────────────────────
        // YOUTUBE
        // ─────────────────────────────────────────────────────────────────────
        } else if (conn.platform === "youtube") {
          if (conn.access_token) {
            const res  = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&mine=true`, {
              headers: { Authorization: `Bearer ${conn.access_token}` },
            });
            const data = await res.json();
            const ch   = data.items?.[0];
            if (ch) {
              const coverPhoto = ch.brandingSettings?.image?.bannerExternalUrl || "";
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: ch.id,
                username: ch.snippet?.customUrl || ch.snippet?.title || "",
                page_name: ch.snippet?.title || "",
                profile_picture: await cacheProfileImage(supabase, conn.user_id, "youtube", ch.snippet?.thumbnails?.high?.url, ch.id) || conn.profile_image_url || "",
                cover_photo: await cacheProfileImage(supabase, conn.user_id, "youtube", coverPhoto, `${ch.id}_cover`) || coverPhoto,
                followers: parseInt(ch.statistics?.subscriberCount || "0"),
                followers_count: parseInt(ch.statistics?.subscriberCount || "0"),
                posts_count: parseInt(ch.statistics?.videoCount || "0"),
                metadata: { posts_count: parseInt(ch.statistics?.videoCount || "0"), view_count: parseInt(ch.statistics?.viewCount || "0") },
                views: parseInt(ch.statistics?.viewCount || "0"),
                likes: 0, shares: 0, comments: 0, engagement_rate: 0,
                is_connected: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              };
            }
          }

        // ─────────────────────────────────────────────────────────────────────
        // THREADS
        // ─────────────────────────────────────────────────────────────────────
        } else if (conn.platform === "threads") {
          if (conn.access_token) {
            try {
              const res = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,threads_follower_count&access_token=${conn.access_token}`);
              if (!res.ok) {
                console.error(`[SYNC] Threads HTTP ${res.status}:`, await res.text());
              } else {
                const data = await res.json();
                if (data && !data.error) {
                  let profilePicUrl = conn.profile_image_url || conn.profile_picture || "";
                  if (data.threads_profile_picture_url) {
                    try {
                      const cachedPic = await cacheProfileImage(supabase, conn.user_id, "threads", data.threads_profile_picture_url, data.id);
                      if (cachedPic) profilePicUrl = cachedPic;
                    } catch { profilePicUrl = data.threads_profile_picture_url; }
                  }
                  stats = {
                    user_id: conn.user_id, platform: conn.platform, platform_user_id: data.id || conn.platform_user_id,
                    username: data.username || conn.username || "", page_name: data.username || conn.page_name || "",
                    profile_picture: profilePicUrl,
                    followers: data.threads_follower_count ?? (conn.followers_count || 0),
                    followers_count: data.threads_follower_count ?? (conn.followers_count || 0),
                    posts_count: conn.posts_count || 0,
                    metadata: { posts_count: conn.posts_count || 0 },
                    views: 0, likes: 0, shares: 0, comments: 0, engagement_rate: 0,
                    is_connected: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                  };
                }
              }
            } catch (err) { console.error("[SYNC] Threads fatal:", err); }
          }

        // ─────────────────────────────────────────────────────────────────────
        // TIKTOK
        // ─────────────────────────────────────────────────────────────────────
        } else if (conn.platform === "tiktok") {
          if (conn.access_token) {
            const res  = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count,video_count,likes_count`, {
              headers: { Authorization: `Bearer ${conn.access_token}` },
            });
            const data = await res.json();
            if (data.data) {
              const info = data.data;
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: info.open_id,
                username: info.username || "", page_name: info.display_name || "",
                profile_picture: await cacheProfileImage(supabase, conn.user_id, "tiktok", info.avatar_url, info.open_id) || conn.profile_image_url || "",
                followers: info.follower_count || 0, followers_count: info.follower_count || 0,
                posts_count: info.video_count || 0,
                metadata: { posts_count: info.video_count || 0, likes_count: info.likes_count || 0 },
                views: 0, likes: info.likes_count || 0, shares: 0, comments: 0, engagement_rate: 0,
                is_connected: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              };
            }
          }

        // ─────────────────────────────────────────────────────────────────────
        // LINKEDIN  ★ CORRIGIDO: agora busca foto, seguidores e posts reais
        // ─────────────────────────────────────────────────────────────────────
        } else if (conn.platform === "linkedin") {
          if (conn.access_token) {
            const liHeaders: Record<string, string> = {
              Authorization:               `Bearer ${conn.access_token}`,
              "Content-Type":              "application/json",
              "LinkedIn-Version":          "202401",
              "X-Restli-Protocol-Version": "2.0.0",
            };

            // 1) Perfil basico via OIDC (nome + foto)
            const profileRes  = await fetch("https://api.linkedin.com/v2/userinfo", { headers: liHeaders });
            const profileData = await profileRes.json();

            if (!profileData.sub) {
              console.warn("[SYNC] LinkedIn: userinfo sem sub — token expirado?");
            } else {
              const userId2    = profileData.sub as string;
              const authorUrn  = `urn:li:person:${userId2}`;
              const picUrl     = profileData.picture || conn.profile_image_url || "";

              // 2) Foto em alta resolucao via projection
              let hiResPic = picUrl;
              try {
                const picRes  = await fetch(
                  `https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~:playableStreams))`,
                  { headers: liHeaders }
                );
                const picData = await picRes.json();
                const elements = picData?.profilePicture?.["displayImage~"]?.elements ?? [];
                if (elements.length > 0) {
                  const largest = elements[elements.length - 1];
                  hiResPic = largest?.identifiers?.[0]?.identifier || picUrl;
                }
              } catch { /* usa picUrl como fallback */ }

              const cachedPic = await cacheProfileImage(supabase, conn.user_id, "linkedin", hiResPic, userId2) || hiResPic;

              // 3) Tamanho da rede (conexoes 1o grau)
              let followersCount = conn.followers_count || 0;
              try {
                const netRes  = await fetch(
                  `https://api.linkedin.com/v2/networkSizes/${encodeURIComponent(authorUrn)}?edgeType=CompanyFollowedByMember`,
                  { headers: liHeaders }
                );
                if (netRes.ok) {
                  const netData = await netRes.json();
                  followersCount = netData?.firstDegreeSize ?? followersCount;
                }
              } catch {}

              // 4) Total de posts (paginacao — total no campo paging.total)
              let postsCount = conn.posts_count || 0;
              try {
                const postsRes  = await fetch(
                  `https://api.linkedin.com/rest/posts?author=${encodeURIComponent(authorUrn)}&q=author&count=1&sortBy=LAST_MODIFIED`,
                  { headers: liHeaders }
                );
                if (postsRes.ok) {
                  const postsData = await postsRes.json();
                  postsCount      = postsData?.paging?.total ?? postsCount;
                }
              } catch {}

              // 5) Engagement do post mais recente (likes + comentarios)
              let likes = 0, comments = 0;
              try {
                const postsRes  = await fetch(
                  `https://api.linkedin.com/rest/posts?author=${encodeURIComponent(authorUrn)}&q=author&count=1&sortBy=LAST_MODIFIED`,
                  { headers: liHeaders }
                );
                if (postsRes.ok) {
                  const postsData = await postsRes.json();
                  const firstPost = postsData?.elements?.[0];
                  if (firstPost?.id) {
                    const actRes  = await fetch(
                      `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(firstPost.id)}`,
                      { headers: liHeaders }
                    );
                    if (actRes.ok) {
                      const actData = await actRes.json();
                      likes    = actData?.likesSummary?.totalLikes                      ?? 0;
                      comments = actData?.commentsSummary?.totalFirstLevelComments      ?? 0;
                    }
                  }
                }
              } catch {}

              stats = {
                user_id: conn.user_id, platform: "linkedin", platform_user_id: userId2,
                username: profileData.email || conn.username || "",
                page_name: profileData.name || conn.page_name || "",
                profile_picture: cachedPic,
                followers: followersCount, followers_count: followersCount,
                posts_count: postsCount,
                metadata: {
                  posts_count:  postsCount,
                  given_name:   profileData.given_name  || "",
                  family_name:  profileData.family_name || "",
                  locale:       profileData.locale      || "",
                },
                views: 0, likes, shares: 0, comments, engagement_rate: 0,
                is_connected: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              };
            }
          }

        // ─────────────────────────────────────────────────────────────────────
        // PINTEREST  ★ CORRIGIDO: adiciona monthly_views, board_count, following
        // ─────────────────────────────────────────────────────────────────────
        } else if (conn.platform === "pinterest") {
          if (conn.access_token) {
            const pinHeaders = {
              Authorization:  `Bearer ${conn.access_token}`,
              "Content-Type": "application/json",
            };

            const res  = await fetch("https://api.pinterest.com/v5/user_account", { headers: pinHeaders });
            const data = await res.json();

            if (data.username) {
              // Analytics dos ultimos 30 dias
              const endDate   = new Date().toISOString().split("T")[0];
              const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

              let impressions = 0, pinClicks = 0, outboundClicks = 0, saves = 0;
              try {
                const analyticsRes = await fetch(
                  `https://api.pinterest.com/v5/user_account/analytics?start_date=${startDate}&end_date=${endDate}&metric_types=IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE`,
                  { headers: pinHeaders }
                );
                if (analyticsRes.ok) {
                  const analyticsData = await analyticsRes.json();
                  const daily = analyticsData?.all?.daily_metrics ?? [];
                  for (const day of daily) {
                    const m = day.metrics ?? {};
                    impressions    += m.IMPRESSION      || 0;
                    pinClicks      += m.PIN_CLICK       || 0;
                    outboundClicks += m.OUTBOUND_CLICK  || 0;
                    saves          += m.SAVE            || 0;
                  }
                }
              } catch {}

              const cachedPic = await cacheProfileImage(
                supabase, conn.user_id, "pinterest",
                data.profile_image || "", data.username
              ) || conn.profile_image_url || "";

              stats = {
                user_id: conn.user_id, platform: "pinterest", platform_user_id: data.username,
                username: data.username || "", page_name: data.username || "",
                profile_picture: cachedPic,
                followers: data.follower_count || 0, followers_count: data.follower_count || 0,
                posts_count: data.pin_count || 0,
                metadata: {
                  posts_count:    data.pin_count       || 0,
                  board_count:    data.board_count     || 0,
                  following_count:data.following_count || 0,
                  monthly_views:  data.monthly_views   || 0,
                  account_type:   data.account_type    || "PERSONAL",
                  // analytics 30d
                  impressions_30d:     impressions,
                  pin_clicks_30d:      pinClicks,
                  outbound_clicks_30d: outboundClicks,
                  saves_30d:           saves,
                },
                views: impressions, likes: saves, shares: outboundClicks, comments: pinClicks,
                engagement_rate: data.follower_count > 0
                  ? parseFloat((((saves + pinClicks) / data.follower_count) * 100).toFixed(2))
                  : 0,
                is_connected: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              };
            }
          }
        }

        // ─── Upsert no banco ──────────────────────────────────────────────────
        if (stats) {
          const { error: upsertErr } = await supabase.from("social_accounts").upsert(stats, {
            onConflict: "user_id,platform,platform_user_id",
          });
          if (upsertErr) console.error("Upsert error:", upsertErr);

          try {
            await supabase.from("social_connections").update({
              profile_image_url: stats.profile_picture || conn.profile_image_url,
              profile_picture:   stats.profile_picture || conn.profile_picture,
              followers_count:   stats.followers_count,
              posts_count:       stats.posts_count,
              updated_at:        new Date().toISOString(),
            }).eq("id", conn.id);
          } catch (syncErr: any) {
            console.warn(`[SYNC] social_connections update failed:`, syncErr.message);
          }

          results.push({ platform: conn.platform, page: conn.page_name || stats.username, status: "synced", followers: stats.followers_count });
        } else {
          results.push({ platform: conn.platform, page: conn.page_name, status: "no_data" });
        }
      } catch (err: any) {
        console.error(`Error syncing ${conn.platform}:`, err);
        results.push({ platform: conn.platform, status: "error", error: err.message });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SNAPCHAT via Marketing API  ★ NOVO: handler completo
    // ─────────────────────────────────────────────────────────────────────────
    const snapAdAccountId = snapchatCreds?.ad_account_id || snapchatCreds?.adAccountId;
    const snapAccessToken = snapchatCreds?.access_token  || snapchatCreds?.accessToken;

    // Tambem aceita token salvo em social_connections
    const snapConn = (connections || []).find((c: any) => c.platform === "snapchat");
    const snapToken = snapConn?.access_token || snapAccessToken;

    if (snapToken) {
      try {
        const snapHeaders = {
          Authorization:  `Bearer ${snapToken}`,
          "Content-Type": "application/json",
        };

        // 1) Info do usuario autenticado
        const meRes  = await fetch("https://adsapi.snapchat.com/v1/me", { headers: snapHeaders });
        const meData = await meRes.json();
        const me     = meData?.me;

        // 2) Estatisticas de campanhas (30 dias) — apenas se houver ad_account
        let impressions = 0, swipes = 0, videoViews = 0, reach = 0, saves = 0, shares = 0;
        const accountId = snapAdAccountId || snapConn?.page_id || snapConn?.platform_user_id;

        if (accountId) {
          try {
            const endTime   = new Date().toISOString();
            const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const statsRes = await fetch(
              `https://adsapi.snapchat.com/v1/adaccounts/${accountId}/stats`,
              {
                method: "POST",
                headers: snapHeaders,
                body: JSON.stringify({
                  granularity: "TOTAL",
                  fields: ["impressions", "swipes", "video_views", "reach", "saves", "shares"],
                  start_time: startTime,
                  end_time:   endTime,
                }),
              }
            );
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              const s         = statsData?.total_stats ?? {};
              impressions = s.impressions  || 0;
              swipes      = s.swipes       || 0;
              videoViews  = s.video_views  || 0;
              reach       = s.reach        || 0;
              saves       = s.saves        || 0;
              shares      = s.shares       || 0;
            }
          } catch {}
        }

        // 3) Foto do bitmoji como avatar
        const picUrl    = me?.bitmoji?.background_url || me?.bitmoji?.avatar_url || snapConn?.profile_image_url || "";
        const cachedPic = picUrl
          ? await cacheProfileImage(supabase, userId, "snapchat", picUrl, me?.id || "snapchat") || picUrl
          : "";

        const snapStats = {
          user_id: userId, platform: "snapchat",
          platform_user_id: me?.id || snapConn?.platform_user_id || accountId || "snapchat",
          username:       me?.display_name || snapConn?.username || "",
          page_name:      me?.display_name || snapConn?.page_name || "Snapchat",
          profile_picture: cachedPic,
          followers: 0, followers_count: 0,   // Snapchat nao expoe seguidores organicos via API
          posts_count: 0,
          metadata: {
            posts_count:   0,
            ad_account_id: accountId || "",
            email:         me?.email || "",
            // Metricas de campanhas — ultimos 30 dias
            impressions_30d: impressions,
            swipes_30d:      swipes,
            video_views_30d: videoViews,
            reach_30d:       reach,
            saves_30d:       saves,
            shares_30d:      shares,
            note: "Snapchat nao expoe seguidores organicos via Marketing API.",
          },
          views: impressions, likes: saves, shares, comments: swipes,
          engagement_rate: 0,
          is_connected: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };

        await supabase.from("social_accounts").upsert(snapStats, {
          onConflict: "user_id,platform,platform_user_id",
        });

        if (snapConn?.id) {
          try {
            await supabase.from("social_connections").update({
              profile_image_url: cachedPic || snapConn.profile_image_url,
              profile_picture:   cachedPic || snapConn.profile_picture,
              updated_at:        new Date().toISOString(),
            }).eq("id", snapConn.id);
          } catch {}
        }

        results.push({ platform: "snapchat", page: me?.display_name || "Snapchat", status: "synced", followers: 0 });
      } catch (snapErr: any) {
        results.push({ platform: "snapchat", status: "error", error: snapErr.message });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TELEGRAM
    // ─────────────────────────────────────────────────────────────────────────
    const botToken = telegramCreds?.bot_token || telegramCreds?.botToken;
    if (botToken) {
      try {
        const meRes  = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const meData = await meRes.json();
        if (meData.ok) {
          const botInfo = meData.result;
          let profilePicture = "";
          try {
            const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${botInfo.id}&limit=1`);
            const photosData = await photosRes.json();
            if (photosData.ok && photosData.result.photos?.length > 0) {
              const fileId  = photosData.result.photos[0][0].file_id;
              const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
              const fileData= await fileRes.json();
              if (fileData.ok) profilePicture = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
            }
          } catch {}
          const cachedPic = await cacheProfileImage(supabase, userId, "telegram", profilePicture, botInfo.id.toString()) || profilePicture;
          await supabase.from("social_accounts").upsert({
            user_id: userId, platform: "telegram", platform_user_id: botInfo.id.toString(),
            username: botInfo.username, page_name: botInfo.first_name, profile_picture: cachedPic,
            followers: 0, followers_count: 0, posts_count: 0,
            metadata: { posts_count: 0, chat_type: "bot" },
            views: 0, likes: 0, shares: 0, comments: 0,
            is_connected: true, updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,platform,platform_user_id" });
          try {
            await supabase.from("social_connections").update({
              profile_image_url: cachedPic, profile_picture: cachedPic,
              updated_at: new Date().toISOString(),
            }).eq("user_id", userId).eq("platform", "telegram").eq("platform_user_id", botInfo.id.toString());
          } catch {}
          results.push({ platform: "telegram", page: botInfo.username, status: "synced", type: "bot" });
        }
      } catch (tgErr: any) {
        results.push({ platform: "telegram", status: "error", error: tgErr.message });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WHATSAPP BUSINESS
    // ─────────────────────────────────────────────────────────────────────────
    const waPhoneId = whatsappCreds?.phone_number_id || whatsappCreds?.phoneNumberId;
    const waToken   = whatsappCreds?.access_token    || whatsappCreds?.accessToken;
    if (waPhoneId && waToken) {
      try {
        const res  = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}?fields=verified_name,code_verification_status,quality_rating,account_mode,platform_type&access_token=${waToken}`);
        const data = await res.json();
        if (!data.error) {
          let waProfilePic = "";
          try {
            const metaResp = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/whatsapp_business_profile?fields=profile_picture_url`, {
              headers: { Authorization: `Bearer ${waToken}` },
            });
            if (metaResp.ok) {
              const metaData = await metaResp.json();
              if (metaData.profile_picture_url) {
                waProfilePic = await cacheProfileImage(supabase, userId, "whatsapp", metaData.profile_picture_url, waPhoneId) || metaData.profile_picture_url;
              }
            }
          } catch {}
          await supabase.from("social_accounts").upsert({
            user_id: userId, platform: "whatsapp", platform_user_id: waPhoneId,
            username: data.verified_name || "", page_name: data.verified_name || "WhatsApp Business",
            profile_picture: waProfilePic || "",
            followers: 0, followers_count: 0, posts_count: 0,
            metadata: { posts_count: 0, quality_rating: data.quality_rating, account_mode: data.account_mode },
            views: 0, likes: 0, shares: 0, comments: 0, is_connected: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,platform,platform_user_id" });
          if (waProfilePic) {
            try {
              await supabase.from("social_connections").update({
                profile_image_url: waProfilePic, profile_picture: waProfilePic,
                updated_at: new Date().toISOString(),
              }).eq("user_id", userId).eq("platform", "whatsapp").eq("platform_user_id", waPhoneId);
            } catch {}
          }
          results.push({ platform: "whatsapp", page: data.verified_name, status: "synced" });
        }
      } catch (waErr: any) {
        results.push({ platform: "whatsapp", status: "error", error: waErr.message });
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
