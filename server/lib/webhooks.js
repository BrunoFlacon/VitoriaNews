// Webhook receivers for inbound platform events (Meta, Twitter/X, LinkedIn, TikTok, Telegram, WhatsApp).
// In local mode these only fire if a public tunnel (ngrok/cloudflared) points the platform's
// webhook URL at http://<tunnel>/api/webhooks/<platform>.
import crypto from "crypto";
import { pool } from "./db.js";

export async function ensureWebhookTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      platform text NOT NULL,
      payload jsonb,
      raw_text text,
      processed boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `).catch(() => {});
}

function rawBodyString(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (typeof req.body === "string") return req.body;
  return JSON.stringify(req.body || {});
}

// Verify Meta/IG webhook signature: sha1 of (app_secret + body) as hex.
function verifyMetaSignature(req, rawBody) {
  const appSecret = process.env.META_APP_SECRET;
  const sig =
    req.headers["x-hub-signature"] || req.headers["x-hub-signature-256"] || "";
  if (!appSecret) return true; // no secret configured → accept (dev)
  const expected = "sha1=" + crypto.createHmac("sha1", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function handleWebhook(platform, req, res) {
  try {
    const rawBody = rawBodyString(req);

    if (platform === "meta" || platform === "facebook" || platform === "instagram") {
      if (!verifyMetaSignature(req, rawBody)) {
        return res.status(401).json({ error: "invalid signature" });
      }
      // Meta verification handshake
      const url = new URL(req.url, "http://localhost");
      const mode = url.searchParams.get("hub.mode");
      const challenge = url.searchParams.get("hub.challenge");
      const token = url.searchParams.get("hub.verify_token");
      const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
      if (mode === "subscribe" && (!expectedToken || token === expectedToken)) {
        return res.status(200).send(challenge || "OK");
      }
      await pool
        .query("INSERT INTO webhook_events (platform, raw_text, created_at) VALUES ($1, $2, now())", [
          platform,
          rawBody,
        ])
        .catch(() => {});
      return res.status(200).json({ received: true });
    }

    await pool
      .query("INSERT INTO webhook_events (platform, raw_text, created_at) VALUES ($1, $2, now())", [
        platform,
        rawBody,
      ])
      .catch(() => {});
    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
