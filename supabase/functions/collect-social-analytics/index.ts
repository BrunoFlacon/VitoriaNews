// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-authorization',
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || req.headers.get("X-Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const adminClient = supabase;
    let userId: string | undefined;

    // --- ROBUST AUTH ---
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (decoded?.sub) userId = decoded.sub;
      }
    } catch {}

    if (!userId) {
      try {
        const { data: { user } } = await adminClient.auth.getUser(token);
        if (user) userId = user.id;
      } catch {}
    }

    // Fallback body
    let bodyPayload: any = {};
    try {
       const clone = req.clone();
       bodyPayload = await clone.json();
    } catch {}

    if (!userId && bodyPayload?.userId) {
      userId = bodyPayload.userId;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const baseUrl = `${supabaseUrl}/functions/v1`;

    // 1. Fetch Credentials
    const whatsappCreds = await getCredentials(adminClient, userId, "whatsapp");
    const metaAdsCreds = await getCredentials(adminClient, userId, "meta_ads");
    const googleCreds = await getCredentials(adminClient, userId, "google");

    const waPhoneId = whatsappCreds?.phone_number_id || whatsappCreds?.phoneNumberId;
    const waToken = whatsappCreds?.access_token || whatsappCreds?.accessToken;

    // 2. Delegate Telegram (Awaiting to ensure completion)
    try {
      await fetch(`${baseUrl}/sync-telegram-chats`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`, 
          "X-Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ userId, platform: "telegram" })
      });
      console.log("[COLLECT] Delegated Telegram sync successfully");
    } catch (e) {
      console.error("[COLLECT] Failed to delegate Telegram sync:", e);
    }

    // 3. Main Collection
    const { data: connections } = await adminClient
      .from("social_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("is_connected", true);

    const processingQueue = (connections || []).filter((c: any) => c.platform !== "telegram");
    const results: any[] = [];

    for (const conn of processingQueue) {
      try {
        let metrics: any = null;

        switch (conn.platform) {
          case "facebook": {
            if (!conn.access_token) continue;
            const pageId = conn.page_id || conn.platform_user_id;
            const fields = "followers_count,fan_count,picture.type(large),cover,posts.limit(0).summary(total_count)";
            const resp = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${conn.access_token}`);
            if (resp.ok) {
              const data = await resp.json();
              metrics = {
                followers: data.followers_count || data.fan_count || 0,
                posts_count: data.posts?.summary?.total_count || 0,
                profile_picture: data.picture?.data?.url || null,
                cover_photo: data.cover?.source || null
              };
            }
            break;
          }
          case "instagram": {
            if (!conn.access_token) continue;
            const igUserId = conn.platform_user_id;
            const fields = "followers_count,media_count,name,username,profile_picture_url";
            const resp = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=${fields}&access_token=${conn.access_token}`);
            if (resp.ok) {
              const data = await resp.json();
              metrics = {
                followers: data.followers_count || 0,
                posts_count: data.media_count || 0,
                profile_picture: data.profile_picture_url || null,
                username: data.username || null
              };
            }
            break;
          }
          case "youtube": {
            if (!conn.access_token) continue;
            const channelId = conn.platform_user_id || conn.page_id;
            const url = channelId 
              ? `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}`
              : `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&mine=true`;
            const resp = await fetch(url, { headers: { Authorization: `Bearer ${conn.access_token}` } });
            if (resp.ok) {
              const data = await resp.json();
              const ch = data.items?.[0];
              if (ch) {
                metrics = {
                  followers: parseInt(ch.statistics?.subscriberCount || "0"),
                  posts_count: parseInt(ch.statistics?.videoCount || "0"),
                  views_count: parseInt(ch.statistics?.viewCount || "0"),
                  profile_picture: ch.snippet?.thumbnails?.high?.url || null,
                };
              }
            }
            break;
          }
          case "twitter": {
            if (conn.access_token) {
              const handle = conn.username || conn.platform_user_id;
              const url = /^\d+$/.test(handle) 
                ? `https://api.twitter.com/2/users/${handle}?user.fields=public_metrics,profile_image_url`
                : `https://api.twitter.com/2/users/by/username/${handle}?user.fields=public_metrics,profile_image_url`;
              const res = await fetch(url, { headers: { Authorization: `Bearer ${conn.access_token}` } });
              if (res.ok) {
                const data = await res.json();
                const u = data.data || {};
                const m = u.public_metrics || {};
                metrics = {
                  followers: m.followers_count || 0,
                  posts_count: m.tweet_count || 0,
                  profile_picture: u.profile_image_url || null
                };
              }
            }
            break;
          }
          case "whatsapp": {
            const token = conn.access_token || waToken;
            const phoneId = conn.phone_number_id || waPhoneId;
            
            // Fetch verified info from Meta
            let verifiedName = conn.page_name;
            if (token && phoneId) {
              const resp = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=verified_name,display_phone_number&access_token=${token}`);
              if (resp.ok) {
                const data = await resp.json();
                verifiedName = data.display_phone_number || data.verified_name || conn.page_name;
              }
            }

            // Calculate internal metrics (messages + scheduled)
            // Separate Bot vs Official
            const [officialMsgs, botMsgs, botAnswers, schedCount, channelMembers] = await Promise.all([
              adminClient.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("platform", "whatsapp").or("metadata->>integration_type.eq.official,metadata.is.null"),
              adminClient.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("platform", "whatsapp").eq("metadata->>integration_type", "bot"),
              adminClient.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("platform", "whatsapp").eq("metadata->>integration_type", "bot_answer"),
              adminClient.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("user_id", userId).contains("platforms", ["whatsapp"]).eq("status", "published"),
              adminClient.from("messaging_channels").select("members_count").eq("user_id", userId).eq("platform", "whatsapp")
            ]);

            const totalChannelMembers = (channelMembers.data || []).reduce((acc: number, curr: any) => acc + (curr.members_count || 0), 0);

            metrics = {
              followers: (conn.followers_count || 0) + totalChannelMembers, 
              posts_count: (officialMsgs.count || 0) + (schedCount.count || 0),
              username: verifiedName,
              metadata: {
                bot_posts_count: botMsgs.count || 0,
                bot_answers_count: botAnswers.count || 0,
                official_posts_count: (officialMsgs.count || 0) + (schedCount.count || 0)
              }
            };
            break;
          }
          default:
            metrics = { followers: conn.followers_count || 0, posts_count: conn.posts_count || 0 };
            break;
        }

        if (metrics) {
           const { data: account } = await adminClient.from("social_accounts").upsert({
            user_id: userId,
            platform: conn.platform,
            platform_user_id: conn.platform_user_id || `manual_${conn.platform}`,
            username: metrics.username || conn.username || "",
            page_name: conn.page_name || "",
            followers: metrics.followers || 0,
            posts_count: metrics.posts_count || 0,
            profile_picture: metrics.profile_picture || conn.profile_image_url,
            is_connected: true,
            updated_at: new Date().toISOString(),
            metadata: { ...(conn.metadata || {}), ...(metrics.metadata || {}) }
           }, { onConflict: "user_id,platform,platform_user_id" }).select("id").single();

           if (account) {
             await adminClient.from("account_metrics").insert({
               user_id: userId, social_account_id: account.id, platform: conn.platform,
               followers: metrics.followers || 0,
               posts_count: metrics.posts_count || 0,
               collected_at: new Date().toISOString()
             });
           }
        }
        results.push({ platform: conn.platform, status: "ok" });
      } catch (e) {
        results.push({ platform: conn.platform, status: "error", error: String(e) });
      }
    }

    // Specialized APIs
    try {
      fetch(`${baseUrl}/discover-trends`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      }).catch(() => {});
      
      if (googleCreds?.youtube_api_key || googleCreds?.apiKey) {
        fetch(`${baseUrl}/collect-youtube-analytics`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        }).catch(() => {});
      }
    } catch {}

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
