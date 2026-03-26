import { PublishPayload } from './dispatcher.ts';
import { getMetaCredentials } from "../credentials.ts";

export async function publishToInstagram(supabase: any, payload: PublishPayload) {
  const { content, mediaUrls, userId, options } = payload;
  const meta = await getMetaCredentials(supabase, userId || "", "instagram", options?.targetProfileId);

  if (!meta.accessToken || !meta.pageId) {
    throw new Error("Instagram access token or Page ID not found. Connect your account first.");
  }

  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("Media is required for Instagram posts.");
  }

  const results = [];
  for (const mediaUrl of mediaUrls) {
    // Phase 1: Create Container
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${meta.pageId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: mediaUrl,
          caption: content,
          access_token: meta.accessToken,
        }),
      }
    );
    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(`Instagram Media Container Error: ${containerData.error.message}`);

    const creationId = containerData.id;

    // Phase 2: Publish Container
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${meta.pageId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: meta.accessToken,
        }),
      }
    );
    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(`Instagram Publish Error: ${publishData.error.message}`);

    results.push({ success: true, platform: 'instagram', postId: publishData.id });
  }

  return results.length === 1 ? results[0] : results;
}
