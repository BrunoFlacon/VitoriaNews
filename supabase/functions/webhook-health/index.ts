import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    let body: any = {};
    try { body = await req.json(); } catch {}
    const platform = url.searchParams.get("platform") || body.platform || "all";
    const userId = url.searchParams.get("userId") || body.userId;

    const webhookStatuses: Record<string, {
      configured: boolean;
      healthy: boolean;
      details: string;
    }> = {};

    const verifyTokenConfigured = !!Deno.env.get("WEBHOOK_VERIFY_TOKEN");
    const metaAppId = Deno.env.get("META_APP_ID");
    const metaAppSecret = Deno.env.get("META_APP_SECRET");

    if (platform === "all" || platform === "telegram") {
      let telegramQuery = supabase
        .from("api_credentials")
        .select("credentials")
        .eq("platform", "telegram")
        .limit(1);
      if (userId) telegramQuery = telegramQuery.eq("user_id", userId);
      const { data: creds } = await telegramQuery.maybeSingle();

      const botToken = creds?.credentials?.bot_token || creds?.credentials?.token;
      if (botToken) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
          const data = await res.json();
          if (data.ok) {
            const hasUrl = data.result.url && data.result.url.length > 0;
            const pending = data.result.pending_update_count || 0;
            const lastErrorDate = data.result.last_error_date;
            const lastErrorMessage = data.result.last_error_message || "";
            let healthy = hasUrl;
            if (hasUrl && pending > 0) {
              if (lastErrorDate) {
                const cincoMinAtras = Math.floor(Date.now() / 1000) - 300;
                if (lastErrorDate > cincoMinAtras) healthy = false;
              }
            }
            webhookStatuses["telegram"] = {
              configured: hasUrl,
              healthy,
              details: hasUrl
                ? `URL: ${data.result.url} | Pendentes: ${pending}${lastErrorDate ? ` | Último erro: ${lastErrorMessage} (${new Date(lastErrorDate * 1000).toLocaleString()})` : ""}`
                : "Webhook não registrado — execute setup no Telegram Bot Father",
            };
          } else {
            webhookStatuses["telegram"] = {
              configured: false,
              healthy: false,
              details: `Erro Telegram API: ${data.description || "desconhecido"}`,
            };
          }
        } catch (err: any) {
          webhookStatuses["telegram"] = {
            configured: false,
            healthy: false,
            details: `Falha de rede: ${err.message}`,
          };
        }
      } else {
        webhookStatuses["telegram"] = {
          configured: false,
          healthy: false,
          details: "Bot token não configurado — adicione credenciais do Telegram",
        };
      }
    }

    if (platform === "all" || platform === "meta" || platform === "whatsapp" || platform === "facebook" || platform === "instagram") {
      const metaConfigured = verifyTokenConfigured && !!metaAppId && !!metaAppSecret;
      webhookStatuses["meta"] = {
        configured: metaConfigured,
        healthy: metaConfigured,
        details: metaConfigured
          ? `WEBHOOK_VERIFY_TOKEN configurado | META_APP_ID=${metaAppId?.substring(0, 6)}...`
          : "Env vars ausentes: WEBHOOK_VERIFY_TOKEN, META_APP_ID, META_APP_SECRET — configure no Supabase",
      };

      if (platform === "whatsapp" || platform === "all") {
        webhookStatuses["whatsapp"] = {
          configured: metaConfigured,
          healthy: metaConfigured,
          details: metaConfigured
            ? "Meta webhook unificado configurado — verificar no Meta Developer Console se as assinaturas de WhatsApp estão ativas"
            : "Configure as env vars META_APP_ID e META_APP_SECRET + registre o webhook no Meta Developer Console",
        };
      }

      if (platform === "facebook" || platform === "all") {
        webhookStatuses["facebook"] = {
          configured: metaConfigured,
          healthy: metaConfigured,
          details: metaConfigured
            ? "Meta webhook unificado configurado — verificar no Meta Developer Console se o campo 'feed' está assinado"
            : "Configure as env vars e registre o webhook no Meta Dev Console com campo 'feed'",
        };
      }

      if (platform === "instagram" || platform === "all") {
        webhookStatuses["instagram"] = {
          configured: metaConfigured,
          healthy: metaConfigured,
          details: metaConfigured
            ? "Meta webhook unificado configurado — verificar no Meta Developer Console se os campos 'comments' e 'messaging' estão assinados"
            : "Configure as env vars e registre o webhook no Meta Dev Console com campos 'comments' e 'messaging'",
        };
      }
    }

    if (platform === "all" || platform === "twitter") {
      const twKey = Deno.env.get("TWITTER_CONSUMER_SECRET");
      const twId = Deno.env.get("TWITTER_CONSUMER_KEY");
      webhookStatuses["twitter"] = {
        configured: !!twKey && !!twId,
        healthy: !!twKey && !!twId,
        details: (twKey && twId)
          ? "Twitter Consumer Key & Secret configurados. Registre o webhook no X Developer Console."
          : "TWITTER_CONSUMER_KEY e TWITTER_CONSUMER_SECRET necessários — configure no Supabase",
      };
    }

    for (const p of ["tiktok", "linkedin"]) {
      if (platform !== "all" && platform !== p) continue;
      const key = Deno.env.get(p === "tiktok" ? "TIKTOK_CLIENT_SECRET" : "LINKEDIN_CLIENT_SECRET");
      webhookStatuses[p] = {
        configured: !!key,
        healthy: !!key,
        details: key
          ? `Webhook function deployed | ${p === "tiktok" ? "TikTok" : "LinkedIn"} Client Secret configurado`
          : `Client Secret não configurado — registre o webhook no Portal do ${p === "tiktok" ? "TikTok" : "LinkedIn"} Developer`,
      };
    }

    return new Response(JSON.stringify({
      success: true,
      baseUrl: `${supabaseUrl}/functions/v1`,
      verifyToken: verifyTokenConfigured,
      webhooks: webhookStatuses,
      message: "Webhooks não-Meta (Telegram) podem ser verificados diretamente. Meta webhooks precisam de configuração manual no Meta Developer Console — consulte docs/META_DEVCONSOLE_GUIDE.md",
    }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[WEBHOOK-HEALTH] Fatal:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
