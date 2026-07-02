import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' query parameter" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

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
      "ui-avatars.com"
    ];

    try {
      const targetUrlObj = new URL(targetUrl);
      const isAllowed = allowedDomains.some(domain =>
        targetUrlObj.hostname === domain || targetUrlObj.hostname.endsWith("." + domain)
      );

      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Domain not allowed for proxy" }), {
          status: 403,
          headers: { ...CORS, "Content-Type": "application/json" }
        });
      }
    } catch (_e) {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
    };

    const targetHostname = new URL(targetUrl).hostname;
    if (targetHostname.includes("whatsapp.net")) {
      fetchHeaders["Referer"] = "https://web.whatsapp.com/";
    } else if (targetHostname.includes("twimg.com") || targetHostname.includes("twitter.com")) {
      fetchHeaders["Referer"] = "https://twitter.com/";
    } else if (targetHostname.includes("facebook.com") || targetHostname.includes("fbcdn.net") || targetHostname.includes("instagram.com")) {
      fetchHeaders["Referer"] = "https://www.facebook.com/";
    } else if (targetHostname.includes("tiktok.com")) {
      fetchHeaders["Referer"] = "https://www.tiktok.com/";
    } else if (targetHostname.includes("api.telegram.org") || targetHostname.includes("t.me")) {
      fetchHeaders["Referer"] = "https://telegram.org/";
      fetchHeaders["Origin"] = "https://telegram.org";
    }

    console.log(`[PROXY] Fetching: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: fetchHeaders
    });

    const resHeaders = { ...CORS, "Cache-Control": "public, max-age=86400, s-maxage=86400" };

    if (!response.ok) {
      console.error(`[PROXY] Failed to fetch ${targetUrl}. Status: ${response.status}`);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#1e293b" width="100" height="100"/><text fill="#64748b" font-size="12" text-anchor="middle" x="50" y="55">${response.status}</text></svg>`;
      return new Response(svg, {
        status: 200,
        headers: { ...resHeaders, "Content-Type": "image/svg+xml" }
      });
    }

    const contentType = response.headers.get("content-type");
    if (contentType) {
      resHeaders["Content-Type"] = contentType;
    }

    const body = await response.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: resHeaders
    });

  } catch (error: any) {
    console.error(`[PROXY] Global Exception:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
});
