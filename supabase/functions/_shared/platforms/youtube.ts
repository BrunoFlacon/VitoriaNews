import { PublishPayload } from './dispatcher.ts';
import { getPlatformCredentials, refreshYoutubeToken } from "../credentials.ts";
import { detectMediaType } from '../media.ts';

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos";

// 🔄 Executa uma chamada à API do YouTube com retry automático se o token expirar (401)
async function youtubeFetch(
  url: string,
  init: RequestInit,
  supabase: any,
  userId: string,
  connectionId: string | null,
  accessToken: string
): Promise<Response> {
  const attempt = async (token: string) =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  let response = await attempt(accessToken);

  if (response.status === 401) {
    // Token expirado → renova e tenta de novo (1x)
    const fresh = await refreshYoutubeToken(supabase, userId || "", connectionId);
    response = await attempt(fresh.accessToken);
  }

  return response;
}

export async function publishToYouTube(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId, contentType } = payload;
  const targetProfileId = payload.options?.targetProfileId || null;

  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("YouTube requer um vídeo para upload.");
  }

  const kind = detectMediaType(mediaUrls[0]);
  if (kind !== 'video') {
    throw new Error("YouTube: apenas vídeos são suportados no momento.");
  }

  const creds = await getPlatformCredentials(supabase, userId || "", "youtube", targetProfileId);

  if (!creds.isConnected || !creds.accessToken) {
    throw new Error("YouTube não conectado. Conecte sua conta em Configurações.");
  }

  const videoUrl = mediaUrls[0];
  const profileId = creds.connectionId || null;

  // 🔹 STEP 1: baixar o vídeo da URL pública
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    throw new Error(`YouTube: não foi possível baixar o vídeo da URL (HTTP ${videoRes.status}).`);
  }
  const videoBlob = await videoRes.blob();
  const bytes = await videoBlob.arrayBuffer();

  const isShort = contentType === 'short' || contentType === 'story' || contentType === 'reels';

  const metadata = {
    snippet: {
      title: (payload.options?.title || content || "Publicação").slice(0, 100),
      description: content || "",
      categoryId: "22", // Pessoas e Blogs
    },
    status: {
      privacyStatus: "private", // privado durante testes; mude para public em produção
      selfDeclaredMadeForKids: false,
    },
  };

  // 🔹 STEP 2: iniciar upload resumable (metadados → URL de upload)
  const initRes = await youtubeFetch(
    `${YOUTUBE_UPLOAD}?uploadType=resumable&part=snippet,status${isShort ? '&supportsOwnershipTransfer=false' : ''}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(bytes.byteLength),
        "X-Upload-Content-Type": videoBlob.type || "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
    supabase,
    userId || "",
    profileId,
    creds.accessToken
  );

  if (!initRes.ok) {
    const errBody = await initRes.json().catch(() => ({}));
    const msg = errBody?.error?.message || `HTTP ${initRes.status}`;
    throw new Error(`YouTube API Error (init): ${msg}`);
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("YouTube API Error: resposta sem Location de upload.");
  }

  // 🔹 STEP 3: enviar o binário do vídeo
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": videoBlob.type || "video/mp4",
      "Content-Length": String(bytes.byteLength),
    },
    body: bytes,
  });

  const result = await uploadRes.json().catch(() => ({}));

  if (uploadRes.status !== 200 && uploadRes.status !== 201) {
    const msg = result?.error?.message || result?.error?.errors?.[0]?.reason || `HTTP ${uploadRes.status}`;
    throw new Error(`YouTube upload error: ${msg}`);
  }

  const videoId = result?.id;
  if (!videoId) {
    throw new Error("YouTube API Error: resposta sem videoId — upload não confirmado.");
  }

  return {
    success: true,
    platform: 'youtube',
    videoId,
    profileId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    contentType: isShort ? 'short' : contentType,
  };
}
