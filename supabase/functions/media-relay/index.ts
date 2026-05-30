import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': '*',
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-authorization, x-supabase-auth, x-client-version, x-my-custom-header",
  "Access-Control-Max-Age": "86400",
});

async function fetchWithTimeout(url: string | URL, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}


async function cacheImageToStorage(
  adminClient: any,
  platform: string,
  platformUserId: string,
  imageUrl: string,
  fetchHeaders: any
): Promise<string | null> {
  try {
    console.log(`[PROXY-CACHE] Caching image for ${platform}:${platformUserId} from ${imageUrl}`);
    const response = await fetchWithTimeout(imageUrl, { headers: fetchHeaders }, 4000);
    if (!response.ok) {
      console.warn(`[PROXY-CACHE] Fetch failed (status ${response.status})`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const extension = contentType.split("/")[1] || "jpg";
    const fileName = `${platformUserId}.${extension}`;
    const filePath = `profiles/${platform}/${fileName}`;

    const buffer = await response.arrayBuffer();

    const { error } = await adminClient.storage
      .from('media')
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error(`[PROXY-CACHE] Upload error:`, error);
      return null;
    }

    const { data: urlData } = adminClient.storage.from('media').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    await adminClient
      .from("social_connections")
      .update({ profile_image_url: publicUrl, profile_picture: publicUrl })
      .eq("platform", platform)
      .eq("platform_user_id", platformUserId);

    console.log(`[PROXY-CACHE] Successfully saved and cached image: ${publicUrl}`);
    return publicUrl;
  } catch (err: any) {
    console.error(`[PROXY-CACHE] Exception:`, err.message);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' query parameter" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Domínios permitidos para evitar abuso
    const allowedDomains = [
      "whatsapp.net",
      "googleusercontent.com",
      "fbsbx.com",
      "fbcdn.net",
      "facebook.com",
      "instagram.com",
      "cdninstagram.com",
      "threads.net",
      "twimg.com",
      "twitter.com",
      "api.telegram.org",
      "newsapi.org",
      "tiktok.com",
      "tiktokv.com",
      "tiktokcdn.com",
      "tiktokcdn-us.com",
      "p16-common-sign.tiktokcdn.com",
      "p16-sign.tiktokcdn-us.com",
      "p16-amd-va.tiktokcdn.com",
      "p77-sign.tiktokcdn-us.com",
      "ui-avatars.com"
    ];

    let targetUrlObj: URL;
    try {
      targetUrlObj = new URL(targetUrl);
      const isAllowed = allowedDomains.some(domain =>
        targetUrlObj.hostname === domain || targetUrlObj.hostname.endsWith("." + domain)
      );

      if (!isAllowed) {
        console.warn(`[PROXY] Domain not allowed: ${targetUrlObj.hostname}`);
        return new Response(JSON.stringify({ error: "Domain not allowed for proxy" }), {
          status: 403,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" }
        });
      }
    } catch (_e) {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Configura Headers para a requisição de saída
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site"
    };

    // Referer específico por plataforma para burlar bloqueios de hotlinking
    if (targetUrlObj.hostname.includes("twimg.com") || targetUrlObj.hostname.includes("twitter.com")) {
      fetchHeaders["Referer"] = "https://twitter.com/";
    } else if (targetUrlObj.hostname.includes("fbcdn.net") || targetUrlObj.hostname.includes("instagram.com") || targetUrlObj.hostname.includes("cdninstagram.com")) {
      fetchHeaders["Referer"] = "https://www.instagram.com/";
    } else if (targetUrlObj.hostname.includes("whatsapp.net")) {
      fetchHeaders["Referer"] = "https://web.whatsapp.com/";
    } else if (
      targetUrlObj.hostname.includes("tiktok.com") ||
      targetUrlObj.hostname.includes("tiktokcdn.com") ||
      targetUrlObj.hostname.includes("tiktokcdn-us.com") ||
      targetUrlObj.hostname.includes("tiktokv.com")
    ) {
      fetchHeaders["Referer"] = "https://www.tiktok.com/";
    } else if (targetUrlObj.hostname.includes("facebook.com")) {
      fetchHeaders["Referer"] = "https://www.facebook.com/";
    }

    // 1. Rewrite Facebook lookaside URLs to Graph API URLs immediately (stable, non-expiring)
    let finalTargetUrl = targetUrl;
    if (targetUrlObj.hostname.includes("platform-lookaside.fbsbx.com") && targetUrlObj.searchParams.has("asid")) {
      const asid = targetUrlObj.searchParams.get("asid");
      finalTargetUrl = `https://graph.facebook.com/${asid}/picture?type=large`;
      console.log(`[PROXY] Rewriting lookaside URL to stable Graph API URL: ${finalTargetUrl}`);
    }

    // 2. graph.facebook.com requires a redirect follow — fetch with redirect support
    const isGraphFacebook = new URL(finalTargetUrl).hostname === "graph.facebook.com";

    console.log(`[PROXY] Fetching: ${finalTargetUrl}`);
    let response: Response;
    try {
      response = await fetchWithTimeout(finalTargetUrl, {
        method: "GET",
        headers: fetchHeaders,
        redirect: isGraphFacebook ? "follow" : "follow"
      }, 3000);
    } catch (e: any) {
      console.warn(`[PROXY] Initial fetch failed or timed out:`, e.message);
      response = new Response(null, { status: 504 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // 3. Telegram Expiry Recovery
    if (!response.ok && targetUrlObj.hostname === "api.telegram.org" && targetUrlObj.pathname.includes("/file/bot")) {
      console.log(`[PROXY] Telegram file expired (status ${response.status}). Attempting dynamic recovery...`);
      try {
        const matches = targetUrlObj.pathname.match(/\/file\/bot([^/]+)\/(.+)/);
        if (matches) {
          const botToken = matches[1];
          const botId = botToken.split(":")[0];

          const chatResp = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${botId}`, {}, 2500);
          if (chatResp.ok) {
            const chatData = await chatResp.json();
            if (chatData.ok && chatData.result.photo) {
              const fileId = chatData.result.photo.big_file_id || chatData.result.photo.small_file_id;
              const fileResp = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`, {}, 2500);
              if (fileResp.ok) {
                const fileData = await fileResp.json();
                if (fileData.ok && fileData.result.file_path) {
                  const freshUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                  console.log(`[PROXY] Recovered Telegram URL: ${freshUrl}`);

                  response = await fetchWithTimeout(freshUrl, { method: "GET", headers: fetchHeaders }, 3000);

                  if (response.ok && supabaseUrl && supabaseKey) {
                    const adminClient = createClient(supabaseUrl, supabaseKey);
                    await cacheImageToStorage(adminClient, "telegram", botId, freshUrl, fetchHeaders);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(`[PROXY] Telegram recovery failed:`, e.message);
      }
    }

    // 4. WhatsApp pps.whatsapp.net Expiry Recovery
    if (!response.ok && targetUrlObj.hostname.includes("whatsapp.net")) {
      console.log(`[PROXY] WhatsApp image expired (status ${response.status}). Attempting dynamic recovery...`);
      try {
        const matches = targetUrl.match(/([^/?]+_n\.(jpg|png|jpeg))/i);
        const fileName = matches ? matches[1] : null;
        if (fileName && supabaseUrl && supabaseKey) {
          const adminClient = createClient(supabaseUrl, supabaseKey);

          const { data: conn } = await adminClient
            .from("social_connections")
            .select("user_id, access_token, platform_user_id, page_id")
            .eq("platform", "whatsapp")
            .or(`profile_image_url.ilike.%${fileName}%,profile_picture.ilike.%${fileName}%`)
            .maybeSingle();

          if (conn && conn.platform_user_id) {
            let token = conn.access_token;
            if (!token) {
              const { data: credsData } = await adminClient
                .from("api_credentials")
                .select("credentials")
                .eq("user_id", conn.user_id)
                .eq("platform", "whatsapp")
                .maybeSingle();
              token = credsData?.credentials?.access_token;
            }
            if (token) {
              console.log(`[PROXY] Querying Meta API for Phone Number ID ${conn.platform_user_id}...`);
              const metaResp = await fetchWithTimeout(`https://graph.facebook.com/v21.0/${conn.platform_user_id}/whatsapp_business_profile?fields=profile_picture_url`, {
                headers: { "Authorization": `Bearer ${token}` }
              }, 2500);
              if (metaResp.ok) {
                const metaData = await metaResp.json();
                const freshUrl = metaData.profile_picture_url;
                if (freshUrl) {
                  console.log(`[PROXY] Recovered WhatsApp URL: ${freshUrl}`);
                  response = await fetchWithTimeout(freshUrl, { method: "GET", headers: fetchHeaders }, 3000);
                  if (response.ok) {
                    await cacheImageToStorage(adminClient, "whatsapp", conn.platform_user_id, freshUrl, fetchHeaders);
                  }
                }
              } else {
                console.warn(`[PROXY] Meta API returned ${metaResp.status}: ${await metaResp.text()}`);
              }
            }
          }
        }
      } catch (e) {
        console.error(`[PROXY] WhatsApp recovery failed:`, e.message);
      }
    }

    // 5. Instagram / Threads Expiry Recovery
    if (!response.ok && (targetUrlObj.hostname.includes("cdninstagram.com") || targetUrlObj.hostname.includes("instagram.com") || targetUrlObj.hostname.includes("threads.net"))) {
      console.log(`[PROXY] Instagram/Threads image expired (status ${response.status}). Attempting dynamic recovery...`);
      try {
        // Robust filename extraction for Instagram URLs
        // Handles: .../v/t51.2885-19/357995434_..._n.jpg?stp=...
        const fileName = targetUrl.split('/').pop()?.split('?')[0] || null;
        const stem = fileName?.split('_')[0] || fileName; // Try matching by the first ID part
        
        if (supabaseUrl && supabaseKey) {
          const adminClient = createClient(supabaseUrl, supabaseKey);
          
          // Search for any connection (Threads or Instagram) that might own this image or at least use this platform
          let { data: conns } = await adminClient
            .from("social_connections")
            .select("user_id, access_token, platform_user_id, platform")
            .in("platform", ["instagram", "threads"])
            .or(`profile_image_url.ilike.%${stem || '___'}%,profile_picture.ilike.%${stem || '___'}%`);

          // Fallback: If no direct filename match, try finding the most recent Instagram/Threads connection
          if (!conns || conns.length === 0) {
            const { data: recentConns } = await adminClient
              .from("social_connections")
              .select("user_id, access_token, platform_user_id, platform")
              .in("platform", ["instagram", "threads"])
              .order('updated_at', { ascending: false })
              .limit(5);
            conns = recentConns;
          }

          const conn = conns?.[0];
          if (conn && conn.platform_user_id) {
            let token = conn.access_token;
            if (!token) {
              const { data: credsData } = await adminClient
                .from("api_credentials")
                .select("credentials")
                .eq("user_id", conn.user_id)
                .eq("platform", conn.platform)
                .maybeSingle();
              token = credsData?.credentials?.access_token;
            }

            if (token) {
              let freshUrl = null;

              // Attempt 1: Platform-specific Graph API for profile picture URL
              if (conn.platform === 'threads') {
                console.log(`[PROXY] Querying Threads API for ${conn.platform_user_id}...`);
                const metaResp = await fetchWithTimeout(
                  `https://graph.threads.net/v1.0/me?fields=threads_profile_picture_url`,
                  { headers: { "Authorization": `Bearer ${token}` } },
                  2500
                );
                if (metaResp.ok) {
                  const metaData = await metaResp.json();
                  freshUrl = metaData.threads_profile_picture_url;
                }
              } else {
                // Instagram: try Graph API with user-specific endpoint (supports Business/Creator accounts)
                console.log(`[PROXY] Querying Instagram Graph API for ${conn.platform_user_id}...`);
                const metaResp = await fetchWithTimeout(
                  `https://graph.facebook.com/v21.0/${conn.platform_user_id}?fields=profile_picture_url`,
                  { headers: { "Authorization": `Bearer ${token}` } },
                  2500
                );
                if (metaResp.ok) {
                  const metaData = await metaResp.json();
                  freshUrl = metaData.profile_picture_url;
                }
              }

              // Attempt 2: Facebook /picture endpoint (reliable fallback, works with any valid token)
              if (!freshUrl) {
                console.log(`[PROXY] Falling back to Facebook /picture endpoint for ${conn.platform_user_id}...`);
                const picResp = await fetchWithTimeout(
                  `https://graph.facebook.com/v21.0/${conn.platform_user_id}/picture?type=large&redirect=false`,
                  { headers: { "Authorization": `Bearer ${token}` } },
                  2500
                );
                if (picResp.ok) {
                  const picData = await picResp.json();
                  freshUrl = picData.data?.url;
                }
              }

              if (freshUrl) {
                console.log(`[PROXY] Recovered ${conn.platform} URL: ${freshUrl}`);
                response = await fetchWithTimeout(freshUrl, { method: "GET", headers: fetchHeaders }, 3000);
                if (response.ok) {
                  await cacheImageToStorage(adminClient, conn.platform, conn.platform_user_id, freshUrl, fetchHeaders);
                }
              } else {
                console.warn(`[PROXY] All recovery attempts failed for ${conn.platform} ID ${conn.platform_user_id}`);
              }
            }
          }
        }
      } catch (e) {
        console.error(`[PROXY] Instagram/Threads recovery failed:`, e.message);
      }
    }

    // 6. TikTok Expiry Recovery

    if (!response.ok) {
      console.error(`[PROXY] Failed to fetch after all recovery attempts. Status: ${response.status} URL: ${finalTargetUrl}`);
      return new Response("Media not found or failed to fetch", {
        status: 404,
        headers: {
          ...corsHeaders(req),
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=60"
        }
      });
    }

    // Prepara os headers de resposta copiando o content-type original
    const responseHeaders = new Headers(corsHeaders(req));
    const contentType = response.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("Content-Type", contentType);
    } else {
      responseHeaders.set("Content-Type", "image/jpeg");
    }

    // Cache de 1 ano para performance — CDN Edge e navegador servindo instantaneamente
    responseHeaders.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");

    const body = await response.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: responseHeaders
    });

  } catch (error: any) {
    console.error(`[PROXY] Global Exception:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });
  }
});

