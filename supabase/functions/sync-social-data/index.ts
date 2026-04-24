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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No Authorization header found" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    const userId = user.id;

    const { data: connections, error: connError } = await supabase
      .from("social_connections")
      .select("id, user_id, platform, access_token, platform_user_id, page_name, page_id, profile_image_url, username, followers_count")
      .eq("user_id", userId)
      .eq("is_connected", true);

    if (connError) throw connError;

    const telegramCreds = await getCredentials(supabase, userId, "telegram");
    const whatsappCreds = await getCredentials(supabase, userId, "whatsapp");

    const results: any[] = [];

    for (const conn of (connections || [])) {
      try {
        let stats: any = null;

        if (conn.platform === "facebook" || conn.platform === "instagram") {
          const fields = "name,fan_count,followers_count,picture.type(large)";
          const pageId = conn.page_id || conn.platform_user_id;
          
          if (pageId && conn.access_token) {
            const res = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${conn.access_token}`
            );
            const data = await res.json();
            
            if (!data.error) {
              const followers = data.followers_count || data.fan_count || 0;
              const profilePic = data.picture?.data?.url || conn.profile_image_url || "";
              
              let postsCount = 0;
              try {
                const postsRes = await fetch(
                  `https://graph.facebook.com/v21.0/${pageId}/posts?limit=1&summary=true&access_token=${conn.access_token}`
                );
                const postsData = await postsRes.json();
                postsCount = postsData?.summary?.total_count || 0;
              } catch {}

              let views = 0, likes = 0, shares = 0, comments = 0;
              try {
                const metric = conn.platform === "instagram" 
                  ? "impressions,reach,likes,comments,saved"
                  : "post_impressions,post_engaged_users";
                const insightsRes = await fetch(
                  `https://graph.facebook.com/v21.0/${pageId}/insights?metric=${metric}&access_token=${conn.access_token}`
                );
                const insightsData = await insightsRes.json();
                if (insightsData.data) {
                  for (const item of insightsData.data) {
                    const val = item.values?.[0]?.value || 0;
                    if (item.name === "impressions" || item.name === "post_impressions") views = val;
                    if (item.name === "likes") likes = val;
                    if (item.name === "comments") comments = val;
                  }
                }
              } catch {}
              
              const cachedProfilePic = await cacheProfileImage(supabase, conn.user_id, conn.platform, profilePic, pageId) || profilePic;
              
              stats = {
                user_id: conn.user_id,
                platform: conn.platform,
                platform_user_id: pageId,
                username: data.name || conn.page_name || "",
                page_name: data.name || conn.page_name || "",
                profile_picture: cachedProfilePic,
                followers_count: followers,
                posts_count: postsCount,
                metadata: { posts_count: postsCount },
                views,
                likes,
                shares,
                comments,
                is_connected: true,
                updated_at: new Date().toISOString(),
              };

              if (cachedProfilePic !== conn.profile_image_url) {
                await supabase.from("social_connections")
                  .update({ profile_image_url: cachedProfilePic })
                  .eq("id", conn.id);
              }
            }
          }
        } else if (conn.platform === "twitter" || conn.platform === "x") {
          if (conn.access_token) {
            const userIdParam = conn.platform_user_id;
            const res = await fetch(
              `https://api.x.com/2/users/${userIdParam}?user.fields=profile_image_url,public_metrics,name,username,description`,
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            const data = await res.json();
            if (data.data) {
              const metrics = data.data.public_metrics || {};
              stats = {
                user_id: conn.user_id, platform: "twitter", platform_user_id: conn.platform_user_id,
                username: data.data.username || "", page_name: data.data.name || "",
                profile_picture: await cacheProfileImage(supabase, conn.user_id, "twitter", data.data.profile_image_url?.replace('_normal', '_400x400'), conn.platform_user_id) || conn.profile_image_url || "",
                followers_count: metrics.followers_count || 0, 
                posts_count: metrics.tweet_count || 0,
                metadata: { posts_count: metrics.tweet_count || 0 },
                views: 0, likes: metrics.like_count || 0, shares: 0, comments: 0,
                is_connected: true, updated_at: new Date().toISOString(),
              };
            }
          }
        } else if (conn.platform === "youtube") {
          if (conn.access_token) {
            const res = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&mine=true`,
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            const data = await res.json();
            const ch = data.items?.[0];
            if (ch) {
              const coverPhoto = ch.brandingSettings?.image?.bannerExternalUrl || "";
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: ch.id,
                username: ch.snippet?.customUrl || ch.snippet?.title || "",
                page_name: ch.snippet?.title || "",
                profile_picture: await cacheProfileImage(supabase, conn.user_id, "youtube", ch.snippet?.thumbnails?.high?.url, ch.id) || conn.profile_image_url || "",
                cover_photo: await cacheProfileImage(supabase, conn.user_id, "youtube", coverPhoto, `${ch.id}_cover`) || coverPhoto,
                followers_count: parseInt(ch.statistics?.subscriberCount || "0"),
                subscribers_count: parseInt(ch.statistics?.subscriberCount || "0"),
                posts_count: parseInt(ch.statistics?.videoCount || "0"),
                metadata: { posts_count: parseInt(ch.statistics?.videoCount || "0") },
                views: parseInt(ch.statistics?.viewCount || "0"),
                likes: 0, shares: 0, comments: 0,
                is_connected: true, updated_at: new Date().toISOString(),
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
                profile_picture: await cacheProfileImage(supabase, conn.user_id, "threads", data.threads_profile_picture_url, data.id) || conn.profile_image_url || "",
                followers_count: data.followers_count || 0, 
                posts_count: 0,
                metadata: { posts_count: 0 },
                views: 0, likes: 0, shares: 0, comments: 0,
                is_connected: true, updated_at: new Date().toISOString(),
              };
            }
          }
        } else if (conn.platform === "tiktok") {
          if (conn.access_token) {
            const res = await fetch(
              `https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count,video_count,likes_count`,
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            const data = await res.json();
            if (data.data) {
              const info = data.data;
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: info.open_id,
                username: info.username || "", page_name: info.display_name || "",
                profile_picture: await cacheProfileImage(supabase, conn.user_id, "tiktok", info.avatar_url, info.open_id) || conn.profile_image_url || "",
                followers_count: info.follower_count || 0,
                posts_count: info.video_count || 0,
                metadata: { posts_count: info.video_count || 0 },
                views: 0, likes: info.likes_count || 0, shares: 0, comments: 0,
                is_connected: true, updated_at: new Date().toISOString(),
              };
            }
          }
        } else if (conn.platform === "linkedin") {
          if (conn.access_token) {
            const res = await fetch(
              `https://api.linkedin.com/v2/userinfo`,
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            const data = await res.json();
            if (data.sub) {
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: data.sub,
                username: data.email || "", page_name: data.name || "",
                profile_picture: await cacheProfileImage(supabase, conn.user_id, "linkedin", data.picture, data.sub) || conn.profile_image_url || "",
                followers_count: 0, posts_count: 0,
                metadata: { posts_count: 0 },
                views: 0, likes: 0, shares: 0, comments: 0,
                is_connected: true, updated_at: new Date().toISOString(),
              };
            }
          }
        } else if (conn.platform === "pinterest") {
          if (conn.access_token) {
            const res = await fetch(
              `https://api.pinterest.com/v5/user_account`,
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            const data = await res.json();
            if (data.username) {
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: data.username,
                username: data.username || "", page_name: data.full_name || "",
                profile_picture: await cacheProfileImage(supabase, conn.user_id, "pinterest", data.profile_image, data.username) || conn.profile_image_url || "",
                followers_count: data.follower_count || 0,
                posts_count: data.pin_count || 0,
                metadata: { posts_count: data.pin_count || 0 },
                views: 0, likes: 0, shares: 0, comments: 0,
                is_connected: true, updated_at: new Date().toISOString(),
              };
            }
          }
        }

        if (stats) {
          const { error: upsertErr } = await supabase.from("social_accounts").upsert(stats, {
            onConflict: "user_id,platform,platform_user_id"
          });
          if (upsertErr) {
            console.error("Upsert error:", upsertErr);
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

    // Process Telegram bot info
    const botToken = telegramCreds?.bot_token || telegramCreds?.botToken;
    if (botToken) {
      try {
        const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const meData = await meRes.json();
        if (meData.ok) {
          const botInfo = meData.result;
          let profilePicture = "";
          try {
            const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${botInfo.id}&limit=1`);
            const photosData = await photosRes.json();
            if (photosData.ok && photosData.result.photos?.length > 0) {
              const fileId = photosData.result.photos[0][0].file_id;
              const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
              const fileData = await fileRes.json();
              if (fileData.ok) {
                profilePicture = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
              }
            }
          } catch {}

          await supabase.from("social_accounts").upsert({
            user_id: userId,
            platform: "telegram",
            platform_user_id: botInfo.id.toString(),
            username: botInfo.username,
            page_name: botInfo.first_name,
            profile_picture: await cacheProfileImage(supabase, userId, "telegram", profilePicture, botInfo.id.toString()) || profilePicture,
            followers_count: 0,
            posts_count: 0,
            metadata: { posts_count: 0, chat_type: "bot" },
            views: 0, likes: 0, shares: 0, comments: 0,
            is_connected: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,platform,platform_user_id" });

          results.push({ platform: "telegram", page: botInfo.username, status: "synced", type: "bot" });
        }
      } catch (tgErr: any) {
        results.push({ platform: "telegram", status: "error", error: tgErr.message });
      }
    }

    // Process WhatsApp Business
    const waPhoneId = whatsappCreds?.phone_number_id || whatsappCreds?.phoneNumberId;
    const waToken = whatsappCreds?.access_token || whatsappCreds?.accessToken;
    if (waPhoneId && waToken) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${waPhoneId}?fields=verified_name,code_verification_status,quality_rating,account_mode,platform_type&access_token=${waToken}`
        );
        const data = await res.json();
        if (!data.error) {
          await supabase.from("social_accounts").upsert({
            user_id: userId,
            platform: "whatsapp",
            platform_user_id: waPhoneId,
            username: data.verified_name || "",
            page_name: data.verified_name || "WhatsApp Business",
            profile_picture: "",
            followers_count: 0,
            posts_count: 0,
            metadata: { posts_count: 0, quality_rating: data.quality_rating, account_mode: data.account_mode },
            views: 0, likes: 0, shares: 0, comments: 0,
            is_connected: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,platform,platform_user_id" });

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
