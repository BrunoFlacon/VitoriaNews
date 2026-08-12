// Ported from supabase/functions/publish-post (Deno) → Node/Express local runtime.
// Focused critical-path implementation: Facebook + Instagram via Graph API.
// Other platforms return an explicit "not yet ported" result so the frontend never crashes.
import { getPlatformCreds, fnError, json } from "../lib/fnShared.js";

function mediaTypeFromUrl(url) {
  const u = (url || "").toLowerCase();
  if (u.endsWith(".mp4") || u.endsWith(".mov") || u.endsWith(".webm")) return "video";
  if (u.endsWith(".mp3") || u.endsWith(".wav") || u.endsWith(".ogg")) return "audio";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".png") || u.endsWith(".gif") || u.endsWith(".webp")) return "image";
  return "text";
}

async function publishFacebook(conn, content, mediaUrls, postType) {
  const token = conn.access_token;
  const pageId = conn.page_id || conn.platform_user_id;
  if (!token || !pageId) throw new Error("Conexão Facebook sem token/pageId.");
  const media = mediaUrls && mediaUrls.length ? mediaUrls[0] : null;
  const mt = media ? mediaTypeFromUrl(media) : "text";

  if (mt === "text") {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ message: content || "", access_token: token }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { id: data.id };
  }
  // Image/video: attach as link or use the media as source
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message: content || "", url: media, access_token: token, published: "true" }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { id: data.id };
}

async function publishInstagram(conn, content, mediaUrls) {
  const token = conn.access_token;
  const igId = conn.platform_user_id;
  if (!token || !igId) throw new Error("Conexão Instagram sem token/IG id.");
  const media = mediaUrls && mediaUrls.length ? mediaUrls[0] : null;
  const mt = media ? mediaTypeFromUrl(media) : "text";
  if (mt === "text") {
    // Instagram requires media to publish; text-only not supported via Graph API
    throw new Error("Instagram exige mídia para publicar (texto puro não suportado).");
  }
  // Step 1: create media container
  const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      caption: content || "", [mt === "video" ? "video_url" : "image_url"]: media, access_token: token,
    }),
  });
  const container = await containerRes.json();
  if (container.error) throw new Error(container.error.message);
  // Step 2: publish
  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: container.id, access_token: token }),
  });
  const pub = await pubRes.json();
  if (pub.error) throw new Error(pub.error.message);
  return { id: pub.id };
}

export default async function publishPost({ body, user, supabase }) {
  const {
    platforms = [], content = "", mediaUrls = [], postType = "post",
  } = body;

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return fnError("unknown", "publish", "platforms[] is required", 400);
  }

  const userId = user?.id || "system";
  const results = [];

  for (const rawPlatform of platforms) {
    try {
      const [platform, targetProfileId] = String(rawPlatform).split("|");
      const { data: conn, error: connError } = await supabase
        .from("social_connections")
        .select("access_token, platform_user_id, page_id, is_connected")
        .eq("user_id", userId)
        .eq("platform", platform)
        .maybeSingle();
      if (connError || !conn || !conn.access_token) {
        results.push({ platform: rawPlatform, success: false, error: "Conta não conectada ou sem token." });
        continue;
      }

      let r;
      if (platform === "facebook") {
        r = await publishFacebook(conn, content, mediaUrls, postType);
      } else if (platform === "instagram") {
        r = await publishInstagram(conn, content, mediaUrls);
      } else {
        results.push({ platform: rawPlatform, success: false, error: `Plataforma '${platform}' ainda não portada para o runtime local.` });
        continue;
      }
      results.push({ platform: rawPlatform, success: true, id: r.id });

      if (platform === "facebook") {
        // Best-effort: update cached posts_count
        try {
          const fbPageId = conn.page_id || conn.platform_user_id;
          let total = 0, url = `https://graph.facebook.com/v21.0/${fbPageId}/feed?fields=id&limit=100&access_token=${conn.access_token}`;
          for (let i = 0; i < 50 && url; i++) {
            const fr = await fetch(url); if (!fr.ok) break;
            const fd = await fr.json(); if (fd.data) total += fd.data.length; url = fd.paging?.next || null;
          }
          if (total) {
            await supabase.from("social_connections").update({ posts_count: total }).eq("user_id", userId).eq("platform", "facebook").eq("platform_user_id", fbPageId);
            await supabase.from("social_accounts").update({ posts_count: total }).eq("user_id", userId).eq("platform", "facebook").eq("platform_user_id", fbPageId);
          }
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      results.push({ platform: rawPlatform, success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return json({ success: true, results });
}
