import { PublishPayload } from './dispatcher.ts';
import { getMetaCredentials } from "../credentials.ts";
import { detectMediaType, detectOrientation, MediaKind } from '../media.ts';

// 🔄 Aguarda o container do Instagram ficar pronto (FINISHED) antes de publicar.
// ⚠️ Só `status_code` é campo válido do container — `error_message`/`status`
//    em conjunto fazem o Graph rejeitar a request inteira (#100).
async function waitForContainerReady(creationId: string, accessToken: string, maxAttempts = 24) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusRes.json();

    const code = statusData?.status_code;
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      // Best-effort: busca o detalhe do erro via campo `status`
      let msg = "erro no processamento da mídia";
      try {
        const errRes = await fetch(
          `https://graph.facebook.com/v21.0/${creationId}?fields=status&access_token=${accessToken}`
        );
        msg = (await errRes.json())?.status || msg;
      } catch { /* mantém mensagem genérica */ }
      throw new Error(`Instagram container ${code}: ${msg}`);
    }

    // IN_PROGRESS ou outro — aguarda e tenta de novo
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Instagram container timeout: mídia não processada em ${maxAttempts * 5}s`);
}

async function createContainer(
  igUserId: string,
  accessToken: string,
  mediaUrl: string,
  extra: Record<string, unknown> = {}
): Promise<string> {
  const kind = detectMediaType(mediaUrl);
  const isVideo = kind === 'video';

  const container: any = { access_token: accessToken, ...extra };
  if (isVideo) {
    if (!container.media_type) container.media_type = 'REELS';
    container.video_url = mediaUrl;
  } else {
    container.image_url = mediaUrl;
  }

  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(container),
    }
  );
  const containerData = await containerRes.json();
  if (containerData.error) throw new Error(`Instagram Media Container Error: ${containerData.error.message}`);
  return containerData.id;
}

async function publishContainer(igUserId: string, accessToken: string, creationId: string): Promise<string> {
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    }
  );
  const publishData = await publishRes.json();
  if (publishData.error) throw new Error(`Instagram Publish Error: ${publishData.error.message}`);
  return publishData.id;
}

// 🆔 Converte o media ID numérico do Instagram em shortcode (base64url),
// permitindo montar o link público: https://www.instagram.com/p/{shortcode}/
function mediaIdToShortcode(mediaId: string | number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(String(mediaId).replace(/\D/g, '') || '0');
  if (id <= 0n) return String(mediaId);
  let shortcode = '';
  while (id > 0n) {
    shortcode = alphabet[Number(id % 64n)] + shortcode;
    id = id / 64n;
  }
  return shortcode;
}

function instagramPermalink(postId: string): string {
  const shortcode = mediaIdToShortcode(postId);
  return `https://www.instagram.com/p/${shortcode}/`;
}

export async function publishToInstagram(supabase: any, payload: PublishPayload) {
  const { content, mediaUrls, userId, options, contentType } = payload;
  const meta = await getMetaCredentials(supabase, userId || "", "instagram", options?.targetProfileId);

  // O Instagram Graph API exige o INSTAGRAM BUSINESS ACCOUNT ID (1784140...),
  // que fica em platform_user_id — NÃO o Facebook Page ID (page_id).
  if (!meta.accessToken || !meta.platformUserId) {
    throw new Error("Instagram access token or Business Account ID not found. Connect your account first.");
  }

  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("Media is required for Instagram posts.");
  }

  const igUserId = meta.platformUserId;
  const isStory = contentType === 'story';
  const isCarousel = contentType === 'carousel' || (mediaUrls.length > 1 && !isStory);

  const profileId = meta.connectionId || meta.platformUserId || null;

  // 📖 STORY (STORIES)
  if (isStory) {
    const creationId = await createContainer(igUserId, meta.accessToken, mediaUrls[0], {
      media_type: 'STORIES',
    });
    await waitForContainerReady(creationId, meta.accessToken);
    const postId = await publishContainer(igUserId, meta.accessToken, creationId);
    return { success: true, platform: 'instagram', postId, contentType: 'story', profileId, url: null };
  }

  // 🎠 CARROSSEL (CAROUSEL — 2 a 10 mídias)
  if (isCarousel) {
    if (mediaUrls.length > 10) {
      throw new Error("Instagram carousel suporta no máximo 10 mídias.");
    }
    // Fase 1: containers filhos (is_carousel_item)
    const children: string[] = [];
    for (const mediaUrl of mediaUrls) {
      const childId = await createContainer(igUserId, meta.accessToken, mediaUrl, {
        is_carousel_item: true,
      });
      // Espera cada filho processar antes de montar o carrossel
      await waitForContainerReady(childId, meta.accessToken);
      children.push(childId);
    }

    // Fase 2: container pai CAROUSEL
    const parentRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: children.join(','),
          caption: content || undefined,
          access_token: meta.accessToken,
        }),
      }
    );
    const parentData = await parentRes.json();
    if (parentData.error) throw new Error(`Instagram Carousel Error: ${parentData.error.message}`);

    await waitForContainerReady(parentData.id, meta.accessToken);
    const postId = await publishContainer(igUserId, meta.accessToken, parentData.id);
    return { success: true, platform: 'instagram', postId, contentType: 'carousel', items: children.length, profileId, url: instagramPermalink(postId) };
  }

  // 🎥 PADRÃO: cada mídia publicada separadamente
  //  - imagem → IMAGE
  //  - vídeo vertical/curto → REELS
  //  - vídeo horizontal → VIDEO (feed)
  const results = [];
  for (const mediaUrl of mediaUrls) {
    const kind: MediaKind = detectMediaType(mediaUrl);
    const extra: Record<string, unknown> = {};
    if (kind === 'video') {
      extra.media_type = detectOrientation(mediaUrl) === 'horizontal' ? 'VIDEO' : 'REELS';
      // 🗃️ Thumbnail/capa customizada para Reels e Vídeos
      // Enviada como cover_url no container (Graph API v21+)
      const coverUrl = payload.options?.coverUrl || payload.options?.thumbnailUrl;
      if (coverUrl) {
        extra.cover_url = coverUrl;
      }
    }
    const creationId = await createContainer(igUserId, meta.accessToken, mediaUrl, extra);

    // ⏳ Phase 1.5: Aguardar container processar (evita "Media ID is not available")
    await waitForContainerReady(creationId, meta.accessToken);

    // Phase 2: Publish Container
    const postId = await publishContainer(igUserId, meta.accessToken, creationId);
    results.push({ success: true, platform: 'instagram', postId, profileId, url: instagramPermalink(postId) });
  }

  return results.length === 1 ? results[0] : results;
}
