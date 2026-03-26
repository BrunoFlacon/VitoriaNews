import { PublishPayload } from './dispatcher.ts';
import { getMetaCredentials } from "../credentials.ts";

export async function publishToFacebook(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId, options } = payload;
  const targetId = options?.chatId || options?.groupId; // Using chatId as a generic target ID from dispatcher

  const meta = await getMetaCredentials(supabase, userId || "", "facebook", options?.targetProfileId);
  
  if (!meta.accessToken || !meta.pageId) {
    throw new Error("Facebook access token or Page ID not found. Connect your account first.");
  }

  // If no targetId is provided, we might be posting to the user's feed or a default page
  // But for the "Messaging" context, we expect a group or chat ID.
  // The new logic implies posting to a page's feed or photos.
  // For simplicity, we'll assume posting to the page's feed if no media, or photos if media exists.

  if (mediaUrls && mediaUrls.length > 0) {
    // Handle photo uploads
    const results = [];
    for (const mediaUrl of mediaUrls) {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${meta.pageId}/photos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: mediaUrl,
            caption: content, // Use content as caption for photos
            access_token: meta.accessToken,
          }),
        }
      );
      const result = await response.json();
      if (result.error) {
        throw new Error(`Facebook API Error: ${result.error.message}`);
      }
      results.push({ success: true, platform: 'facebook', postId: result.id, mediaUrl: mediaUrl });
    }
    return results; // Return array of results for multiple media
  } else {
    // Handle text post to page feed
    const endpoint = `/${meta.pageId}/feed`; // Always post to the page's feed
    const url = `https://graph.facebook.com/v17.0${endpoint}`;

    let body: any = {
      message: content,
      access_token: meta.accessToken
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(`Facebook API Error: ${result.error.message}`);
    }

    return { success: true, platform: 'facebook', postId: result.id };
  }
}
