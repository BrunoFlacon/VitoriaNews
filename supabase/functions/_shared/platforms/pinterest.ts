import { PublishPayload } from './dispatcher.ts';
import { getPlatformCredentials } from "../credentials.ts";
import { detectMediaType } from '../media.ts';

const PINTEREST_API = "https://api.pinterest.com/v5";

async function pinterestFetch(token: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${PINTEREST_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      body?.message ||
      (Array.isArray(body?.items) ? body.items.map((i: any) => i.message).join('; ') : null) ||
      body?.code ||
      `HTTP ${response.status}`;
    throw new Error(`Pinterest API Error: ${msg}`);
  }
  return body;
}

// Vídeo: 2 passos — /v5/media (inicializa) + upload multipart + aguarda SUCCEEDED
async function uploadVideo(token: string, videoUrl: string): Promise<string> {
  const init = await pinterestFetch(token, "/media", {
    method: "POST",
    body: JSON.stringify({ media_type: "video" }),
  });

  const mediaId = init?.media_id;
  const uploadUrl = init?.upload_url;
  const uploadParams = init?.upload_parameters || {};
  if (!mediaId || !uploadUrl) {
    throw new Error("Pinterest API Error: /media não retornou media_id/upload_url.");
  }

  // Baixa o vídeo da URL pública
  const fileRes = await fetch(videoUrl);
  if (!fileRes.ok) {
    throw new Error(`Pinterest upload: não foi possível baixar o vídeo da URL (HTTP ${fileRes.status}).`);
  }
  const blob = await fileRes.blob();

  // Envia como multipart/form-data (campos de upload + arquivo)
  const form = new FormData();
  for (const [key, value] of Object.entries(uploadParams)) {
    form.append(key, String(value));
  }
  const fileName = videoUrl.split('/').pop()?.split('?')[0] || 'video.mp4';
  form.append("file", blob, fileName);

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    body: form,
  });
  if (!uploadRes.ok) {
    throw new Error(`Pinterest upload: envio do binário falhou (HTTP ${uploadRes.status}).`);
  }

  // Aguarda processamento
  for (let attempt = 1; attempt <= 30; attempt++) {
    const status = await pinterestFetch(token, `/media/${mediaId}`);
    const state = status?.status;
    if (state === "SUCCEEDED") return mediaId;
    if (state === "FAILED") {
      throw new Error("Pinterest upload: processamento do vídeo falhou.");
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Pinterest upload timeout: vídeo não processado em 90s.");
}

export async function publishToPinterest(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId } = payload;

  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("Pinterest requer imagem ou vídeo para criar um Pin.");
  }

  const creds = await getPlatformCredentials(supabase, userId || "", "pinterest", payload.options?.targetProfileId);

  if (!creds.isConnected || !creds.accessToken) {
    throw new Error("Pinterest não conectado. Conecte sua conta em Configurações.");
  }

  const boardId =
    creds.board_id ||
    (creds as any)?.metadata?.board_id ||
    null;

  if (!boardId) {
    throw new Error(
      "Pinterest Board ID não configurado. Defina board_id em api_credentials.pinterest (ou metadata da conexão)."
    );
  }

  const profileId = creds.connectionId || null;
  const kind = detectMediaType(mediaUrls[0]);

  const pinBody: Record<string, unknown> = {
    board_id: boardId,
    title: content ? content.slice(0, 100) : "Publicação",
    description: content || "",
  };

  if (kind === 'video') {
    const mediaId = await uploadVideo(creds.accessToken, mediaUrls[0]);
    pinBody.media_source = {
      source_type: "video_id",
      media_id: mediaId,
    };
  } else {
    pinBody.media_source = {
      source_type: "image_url",
      url: mediaUrls[0],
    };
  }

  const result = await pinterestFetch(creds.accessToken, "/pins", {
    method: "POST",
    body: JSON.stringify(pinBody),
  });

  const pinId = result?.id;
  if (!pinId) {
    throw new Error("Pinterest API Error: resposta sem id do Pin — publicação não confirmada.");
  }

  return {
    success: true,
    platform: 'pinterest',
    postId: pinId,
    profileId,
    url: `https://www.pinterest.com/pin/${pinId}/`,
  };
}
