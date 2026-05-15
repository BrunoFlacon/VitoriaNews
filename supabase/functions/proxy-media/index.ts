import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-authorization, x-supabase-auth, x-client-version, x-my-custom-header",
  "Access-Control-Max-Age": "86400",
  "Permissions-Policy": "browsing-topics=()",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // O erro 401 ocorre porque o Supabase exige JWT por padrão.
  // Como tags <img> não enviam Authorization Header, permitimos apikey via query param.
  // (A validação de domínio abaixo já protege contra uso indevido)

    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' query parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Only allow specific domains to prevent SSRF
    const allowedDomains = [
      "whatsapp.net",
      "googleusercontent.com",
      "fbsbx.com", 
      "fbcdn.net", 
      "facebook.com", 
      "instagram.com",
      "threads.net",
      "twimg.com",
      "twitter.com",
      "api.telegram.org",
      "newsapi.org"
    ];
    try {
      const targetUrlObj = new URL(targetUrl);
      const isAllowed = allowedDomains.some(domain => 
        targetUrlObj.hostname === domain || targetUrlObj.hostname.endsWith("." + domain)
      );
      
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Domain not allowed for proxy" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
      "Sec-CH-UA": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      "Sec-CH-UA-Mobile": "?0",
      "Sec-CH-UA-Platform": '"Windows"',
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site"
    };

    // Adiciona Referer para Twitter/Meta se necessário
    try {
      const targetUrlObj = new URL(targetUrl);
      if (targetUrlObj.hostname.includes("twimg.com")) {
        headers["Referer"] = "https://twitter.com/";
      } else if (targetUrlObj.hostname.includes("fbcdn.net") || targetUrlObj.hostname.includes("instagram.com")) {
        headers["Referer"] = "https://www.facebook.com/";
      }
    } catch (e) {}

    console.log(`[PROXY] Fetching: ${targetUrl}`);
    
    // Fetch the image from the target URL
    const response = await fetch(targetUrl, {
      method: "GET",
      headers
    });

    if (!response.ok) {
      console.error(`[PROXY] Failed to fetch. Status: ${response.status}`);
      return new Response(JSON.stringify({ error: `Failed to fetch image. Status: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Copy the response headers (like content-type)
    const headers = new Headers(corsHeaders);
    const contentType = response.headers.get("content-type");
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
    
    // Cache control
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400"); // Cache for 24 hours

    // Return the image blob
    const body = await response.arrayBuffer();
    
    return new Response(body, {
      status: 200,
      headers
    });

  } catch (error: any) {
    console.error(`[PROXY] Exception:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
