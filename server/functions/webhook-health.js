// Ported from supabase/functions/webhook-health (Deno) → Node/Express local runtime.
// Checks the health/configuration status of inbound webhooks for each platform.
import { json } from "../lib/fnShared.js";
import { pool } from "../lib/db.js";

export default async function webhookHealth({ body, query, user, supabase }) {
  const platform = body.platform || query.platform || "all";
  const userId = body.userId || query.userId || (user ? user.id : null);

  const webhookStatuses = {};

  // ─── Telegram ─────────────────────────────────────────────────
  if (platform === "all" || platform === "telegram") {
    let creds = null;
    try {
      const { data } = await supabase
        .from("api_credentials")
        .select("credentials")
        .eq("platform", "telegram")
        .limit(1);
      if (userId) {
        const { data: userCreds } = await supabase
          .from("api_credentials")
          .select("credentials")
          .eq("platform", "telegram")
          .eq("user_id", userId)
          .maybeSingle();
        if (userCreds) creds = userCreds;
      }
      if (!creds && data && data.length > 0) creds = data[0];
    } catch (e) {
      console.warn("[webhook-health] Error fetching Telegram creds:", e.message);
    }

    const botToken = creds?.credentials?.bot_token || creds?.credentials?.token;
    if (botToken) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const result = await res.json();
        if (result.ok) {
          const hasUrl = result.result.url && result.result.url.length > 0;
          const pending = result.result.pending_update_count || 0;
          const lastErrorDate = result.result.last_error_date;
          const lastErrorMessage = result.result.last_error_message || "";
          let healthy = hasUrl;
          if (hasUrl && pending > 0 && lastErrorDate) {
            const cincoMinAtras = Math.floor(Date.now() / 1000) - 300;
            if (lastErrorDate > cincoMinAtras) healthy = false;
          }
          webhookStatuses["telegram"] = {
            configured: hasUrl,
            healthy,
            details: hasUrl
              ? `URL: ${result.result.url} | Pendentes: ${pending}${lastErrorDate ? ` | Último erro: ${lastErrorMessage} (${new Date(lastErrorDate * 1000).toLocaleString()})` : ""}`
              : "Webhook não registrado — execute setup no Telegram Bot Father",
          };
        } else {
          webhookStatuses["telegram"] = {
            configured: false,
            healthy: false,
            details: `Erro Telegram API: ${result.description || "desconhecido"}`,
          };
        }
      } catch (err) {
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

  // ─── Meta (Facebook / Instagram / WhatsApp / Threads) ──────────
  if (platform === "all" || platform === "meta" || platform === "whatsapp" ||
      platform === "facebook" || platform === "instagram" || platform === "threads") {
    const verifyTokenConfigured = !!process.env.WEBHOOK_VERIFY_TOKEN;
    const metaAppId = process.env.META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;
    const metaConfigured = verifyTokenConfigured && !!metaAppId && !!metaAppSecret;

    webhookStatuses["meta"] = {
      configured: metaConfigured,
      healthy: metaConfigured,
      details: metaConfigured
        ? `WEBHOOK_VERIFY_TOKEN configurado | META_APP_ID=${metaAppId.substring(0, 6)}...`
        : "Env vars ausentes: WEBHOOK_VERIFY_TOKEN, META_APP_ID, META_APP_SECRET",
    };

    if (platform === "whatsapp" || platform === "all") {
      webhookStatuses["whatsapp"] = {
        configured: metaConfigured,
        healthy: metaConfigured,
        details: metaConfigured
          ? "Meta webhook unificado configurado — verificar no Meta Developer Console assinaturas WhatsApp"
          : "Configure META_APP_ID e META_APP_SECRET + registre o webhook no Meta Developer Console",
      };
    }

    if (platform === "facebook" || platform === "all") {
      webhookStatuses["facebook"] = {
        configured: metaConfigured,
        healthy: metaConfigured,
        details: metaConfigured
          ? "Meta webhook unificado configurado — verificar campo 'feed' assinado"
          : "Configure env vars e registre o webhook no Meta Dev Console com campo 'feed'",
      };
    }

    if (platform === "threads" || platform === "all") {
      webhookStatuses["threads"] = {
        configured: metaConfigured,
        healthy: metaConfigured,
        details: metaConfigured
          ? "Meta webhook unificado configurado — verificar assinaturas Threads"
          : "Configure env vars e registre o webhook no Meta Dev Console para Threads",
      };
    }

    if (platform === "instagram" || platform === "all") {
      webhookStatuses["instagram"] = {
        configured: metaConfigured,
        healthy: metaConfigured,
        details: metaConfigured
          ? "Meta webhook unificado configurado — verificar campos 'comments' e 'messaging'"
          : "Configure env vars e registre o webhook no Meta Dev Console com 'comments' e 'messaging'",
      };
    }
  }

  // ─── Twitter/X ─────────────────────────────────────────────────
  if (platform === "all" || platform === "twitter") {
    const twKey = process.env.TWITTER_CONSUMER_SECRET;
    const twId = process.env.TWITTER_CONSUMER_KEY;
    webhookStatuses["twitter"] = {
      configured: !!twKey && !!twId,
      healthy: !!twKey && !!twId,
      details: (twKey && twId)
        ? "Twitter Consumer Key & Secret configurados. Registre o webhook no X Developer Console."
        : "TWITTER_CONSUMER_KEY e TWITTER_CONSUMER_SECRET necessários",
    };
  }

  // ─── TikTok e LinkedIn ─────────────────────────────────────────
  for (const p of ["tiktok", "linkedin"]) {
    if (platform !== "all" && platform !== p) continue;
    const key = process.env[p === "tiktok" ? "TIKTOK_CLIENT_SECRET" : "LINKEDIN_CLIENT_SECRET"];
    webhookStatuses[p] = {
      configured: !!key,
      healthy: !!key,
      details: key
        ? `Webhook function deployed | ${p === "tiktok" ? "TikTok" : "LinkedIn"} Client Secret configurado`
        : `Client Secret não configurado — registre o webhook no Portal do ${p === "tiktok" ? "TikTok" : "LinkedIn"} Developer`,
    };
  }

  return json({
    success: true,
    baseUrl: `${process.env.LOCAL_BASE_URL || `http://localhost:${process.env.PORT || 3001}`}/api/webhooks`,
    verifyToken: !!process.env.WEBHOOK_VERIFY_TOKEN,
    webhooks: webhookStatuses,
    message: "Webhooks não-Meta (Telegram) podem ser verificados diretamente. Meta webhooks precisam de configuração manual no Meta Developer Console.",
  });
}
