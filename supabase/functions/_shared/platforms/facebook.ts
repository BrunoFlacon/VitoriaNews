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
      throw new Error(`Facebook API Error (${path}): ${result.error.message} [code ${result.error.code}]`);
    }
    return result;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📖 FACEBOOK PAGE STORIES
  // Foto  → POST /{page-id}/photo_stories  { url: <imageUrl> }
  // Vídeo → POST /{page-id}/video_stories  { file_url: <videoUrl>, thumb_url?: <thumbUrl> }
  // Requer permissão: publish_stories (aprovada no App Review)
  // Docs: https://developers.facebook.com/docs/pages/publishing/stories
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (contentType === 'story') {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error("Facebook Stories exige mídia (foto ou vídeo).");
    }
    const kind = detectMediaType(mediaUrls[0]);

    if (kind === 'video') {
      // Vídeo Story: POST /{page-id}/video_stories
      const storyBody: Record<string, unknown> = {
        file_url: mediaUrls[0],
      };
      // Thumbnail do story de vídeo (se disponível)
      const thumbUrl = options?.coverUrl || options?.thumbnailUrl;
      if (thumbUrl) storyBody.thumb_url = thumbUrl;

      const result = await graph("video_stories", storyBody);
      return {
        success: true,
        platform: 'facebook',
        postId: result.video_id || result.id,
        contentType: 'story',
        mediaKind: 'video',
        profileId,
        url: null, // Stories não têm URL pública permanente
      };
    } else {
      // Foto Story: POST /{page-id}/photo_stories
      const result = await graph("photo_stories", { url: mediaUrls[0] });
      return {
        success: true,
        platform: 'facebook',
        postId: result.post_id || result.id,
        contentType: 'story',
        mediaKind: 'photo',
        profileId,
        url: null, // Stories não têm URL pública permanente
      };
    }
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
      const videoBody: Record<string, unknown> = {
        file_url: mediaUrls[0],
        description: content || '',
      };
      // Thumbnail customizada para vídeos do feed
      const thumbUrl = options?.coverUrl || options?.thumbnailUrl;
      if (thumbUrl) videoBody.thumb = thumbUrl;

      const result = await graph("videos", videoBody);
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
