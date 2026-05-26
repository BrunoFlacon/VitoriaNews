import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-authorization, x-supabase-auth, x-client-version, x-my-custom-header",
  "Access-Control-Max-Age": "86400",
});

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
      "threads.net",
      "twimg.com",
      "twitter.com",
      "api.telegram.org",
      "newsapi.org",
      "tiktok.com",
      "tiktokv.com"
    ];

    try {
      const targetUrlObj = new URL(targetUrl);
      const isAllowed = allowedDomains.some(domain => 
        targetUrlObj.hostname === domain || targetUrlObj.hostname.endsWith("." + domain)
      );
      
      if (!isAllowed) {
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

    // Referer específico para burlar bloqueios do Twitter/Meta
    const targetUrlObj = new URL(targetUrl);
    if (targetUrlObj.hostname.includes("twimg.com") || targetUrlObj.hostname.includes("twitter.com")) {
      fetchHeaders["Referer"] = "https://twitter.com/";
    } else if (targetUrlObj.hostname.includes("fbcdn.net") || targetUrlObj.hostname.includes("instagram.com")) {
      fetchHeaders["Referer"] = "https://www.facebook.com/";
    } else if (targetUrlObj.hostname.includes("tiktok.com")) {
      fetchHeaders["Referer"] = "https://www.tiktok.com/";
    }

    console.log(`[PROXY] Fetching: ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: fetchHeaders
    });

    if (!response.ok) {
      console.error(`[PROXY] Failed to fetch. Status: ${response.status}`);
      return new Response(JSON.stringify({ error: `Failed to fetch image. Status: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Prepara os headers de resposta copiando o content-type original
    const responseHeaders = new Headers(corsHeaders(req));
    const contentType = response.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("Content-Type", contentType);
    }
    
    // Cache de 24 horas para performance e economia de banda
    responseHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400");

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

