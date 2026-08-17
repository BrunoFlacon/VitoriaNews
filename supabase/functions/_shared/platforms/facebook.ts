import { PublishPayload } from './dispatcher.ts';
import { getMetaCredentials } from "../credentials.ts";
import { detectMediaType } from '../media.ts';

export async function publishToFacebook(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId, options, contentType } = payload;
  const meta = await getMetaCredentials(supabase, userId || "", "facebook", options?.targetProfileId);

  if (!meta.accessToken || !meta.pageId) {
    throw new Error("Facebook access token or Page ID not found. Connect your account first.");
  }

  const pageId = meta.pageId;
  const base = `https://graph.facebook.com/v21.0/${pageId}`;

  const profileId = meta.connectionId || meta.pageId || null;
  const permalink = (postId: string) => `https://www.facebook.com/${pageId}/posts/${postId}`;

  async function graph(path: string, body: Record<string, unknown>): Promise<any> {
    const response = await fetch(`${base}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: meta.accessToken }),
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(`Facebook API Error: ${result.error.message}`);
    }
    return result;
  }

  // 📖 STORY
  if (contentType === 'story') {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error("Story exige mídia (foto ou vídeo).");
    }
    const kind = detectMediaType(mediaUrls[0]);
    const body: Record<string, unknown> = {
      media_type: kind === 'video' ? 'video' : 'photo',
    };
    if (kind === 'video') body.video_url = mediaUrls[0];
    else body.url = mediaUrls[0];
    if (content) body.message = content;

    const result = await graph("story", body);
    return { success: true, platform: 'facebook', postId: result.id, contentType: 'story', profileId, url: permalink(result.id) };
  }

  // 🎠 CARROSSEL (até 10 mídias em um único post)
  const isCarousel = contentType === 'carousel' || (mediaUrls && mediaUrls.length > 1);
  if (isCarousel && mediaUrls && mediaUrls.length > 0) {
    if (mediaUrls.length > 10) {
      throw new Error("Facebook carrossel suporta no máximo 10 mídias.");
    }

    // Fase 1: sobe cada foto como unpublished
    const attachedMedia = [];
    for (const mediaUrl of mediaUrls) {
      const kind = detectMediaType(mediaUrl);
      if (kind !== 'image') {
        throw new Error("Carrossel do Facebook aceita apenas imagens.");
      }
      const photo = await graph("photos", {
        url: mediaUrl,
        published: false,
      });
      attachedMedia.push({ media_fbid: photo.id });
    }

    // Fase 2: publica o post com as mídias anexadas
    const result = await graph("feed", {
      message: content || '',
      attached_media: attachedMedia,
    });
    return { success: true, platform: 'facebook', postId: result.id, contentType: 'carousel', items: attachedMedia.length, profileId, url: permalink(result.id) };
  }

  // 🎬 MÍDIA ÚNICA (foto ou vídeo)
  if (mediaUrls && mediaUrls.length > 0) {
    const kind = detectMediaType(mediaUrls[0]);
    const results = [];

    if (kind === 'video') {
      const result = await graph("videos", {
        file_url: mediaUrls[0],
        description: content || '',
      });
      return { success: true, platform: 'facebook', postId: result.id, contentType: 'video', profileId, url: permalink(result.id) };
    }

    // Fotos: 1 post por foto (comportamento histórico)
    for (const mediaUrl of mediaUrls) {
      const result = await graph("photos", {
        url: mediaUrl,
        caption: content || '',
      });
      results.push({ success: true, platform: 'facebook', postId: result.id, mediaUrl, profileId, url: permalink(result.id) });
    }
    return results.length === 1 ? results[0] : results;
  }

  // 📝 TEXTO (feed da página)
  const result = await graph("feed", {
    message: content || '',
  });
  return { success: true, platform: 'facebook', postId: result.id, profileId, url: permalink(result.id) };
}
