import { PublishPayload } from './dispatcher.ts';
import { getPlatformCredentials } from "../credentials.ts";
import { detectMediaType } from '../media.ts';

const UPLOAD_API = "https://upload.twitter.com/1.1/media/upload.json";
const API_V2 = "https://api.twitter.com/2/tweets";
const TWEET_TEXT_LIMIT = 280;

// 🔹 INIT: cria a sessão de upload de mídia (retorna media_id)
async function uploadInit(
  token: string,
  totalBytes: number,
  mediaType: string
): Promise<{ mediaId: string }> {
  const params = new URLSearchParams({
    command: "INIT",
    total_bytes: String(totalBytes),
    media_type: mediaType,
  });
  const res = await fetch(`${UPLOAD_API}?${params.toString()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`X Media INIT Error: ${body?.errors?.[0]?.message || body?.error?.message || `HTTP ${res.status}`}`);
  }
  if (!body?.media_id_string) {
    throw new Error("X Media INIT Error: resposta sem media_id_string.");
  }
  return { mediaId: body.media_id_string };
}

// 🔹 APPEND: envia a mídia em chunks (≤ 5 MB para vídeo; imagens em 1 chunk)
async function uploadAppend(
  token: string,
  mediaId: string,
  bytes: Uint8Array,
  chunkSize = 1024 * 1024
): Promise<void> {
  const total = bytes.byteLength;
  const chunkCount = Math.max(1, Math.ceil(total / chunkSize));
  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, total);
    const chunk = bytes.slice(start, end);
    const base64 = btoa(String.fromCharCode(...chunk));
    const params = new URLSearchParams({
      command: "APPEND",
      media_id: mediaId,
      segment_index: String(i),
    });
    const res = await fetch(`${UPLOAD_API}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: base64,
    });
    if (!res.ok && res.status !== 204) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`X Media APPEND Error (chunk ${i + 1}/${chunkCount}): ${errBody?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    }
  }
}

// 🔹 FINALIZE: fecha a sessão; para vídeo, retorna processing_info para poll
async function uploadFinalize(
  token: string,
  mediaId: string
): Promise<{ processing?: any }> {
  const params = new URLSearchParams({ command: "FINALIZE", media_id: mediaId });
  const res = await fetch(`${UPLOAD_API}?${params.toString()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`X Media FINALIZE Error: ${body?.errors?.[0]?.message || body?.error?.message || `HTTP ${res.status}`}`);
  }
  return body?.processing_info ? { processing: body.processing_info } : {};
}

// ⏳ Poll do processamento de vídeo (até 'succeeded'/'failed')
async function waitForVideoProcessing(token: string, mediaId: string, maxAttempts = 30): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const params = new URLSearchParams({ command: "STATUS", media_id: mediaId });
    const res = await fetch(`${UPLOAD_API}?${params.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    const state = body?.processing_info?.state;
    if (state === "succeeded") return;
    if (state === "failed" || state === "failed_permanently") {
      throw new Error(`X video processing failed: ${body?.processing_info?.error?.message || "erro de processamento"}`);
    }
    const checkAfterMs = body?.processing_info?.check_after_secs || 2;
    await new Promise((r) => setTimeout(r, checkAfterMs * 1000));
  }
  throw new Error(`X video processing timeout: não finalizado em ${maxAttempts * 2}s`);
}

// 🚀 Upload completo (INIT → APPEND → FINALIZE → poll p/ vídeo)
async function uploadMedia(token: string, mediaUrl: string): Promise<string> {
  const kind = detectMediaType(mediaUrl);
  if (kind === 'audio' || kind === 'document') {
    throw new Error(
      `X (Twitter) não aceita ${kind === 'audio' ? 'áudio' : 'documentos'} como mídia. ` +
      'Publique o texto com o link do arquivo.'
    );
  }
  if (kind !== 'image' && kind !== 'video') {
    throw new Error(`X (Twitter): tipo de mídia não suportado (${kind}).`);
  }

  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) {
    throw new Error(`X Media: não foi possível baixar o arquivo da URL (HTTP ${fileRes.status}).`);
  }
  const bytes = new Uint8Array(await fileRes.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("X Media: arquivo vazio (0 bytes).");
  }

  const isVideo = kind === 'video';
  const mediaType = isVideo ? (fileRes.headers.get("content-type") || "video/mp4") : "image/jpeg";
  const { mediaId } = await uploadInit(token, bytes.byteLength, mediaType);
  // Vídeos: chunks de 5 MB. Imagens: chunk único (limite v1.1 = 15 MB).
  await uploadAppend(token, mediaId, bytes, isVideo ? 5 * 1024 * 1024 : bytes.byteLength);
  const { processing } = await uploadFinalize(token, mediaId);
  if (isVideo && processing) {
    await waitForVideoProcessing(token, mediaId);
  }
  return mediaId;
}

export async function publishToX(supabase: any, payload: PublishPayload) {
  const { content, mediaUrls, userId } = payload;
  const creds = await getPlatformCredentials(supabase, userId || "", "twitter", payload.options?.targetProfileId);

  // Sem conexão OAuth ativa → erro real (evita "sucesso falso")
  if (!creds.isConnected) {
    throw new Error("X (Twitter) não conectado. Conecte sua conta em Configurações.");
  }

  if (!creds.accessToken) {
    throw new Error("X (Twitter) access token not found. Connect your account first.");
  }

  const text = (content || "").slice(0, TWEET_TEXT_LIMIT);
  const body: any = { text };

  // 📸 Mídia real: upload v1.1 (INIT/APPEND/FINALIZE) → media_ids no tweet
  if (mediaUrls && mediaUrls.length > 0) {
    const mediaIds: string[] = [];
    for (const url of mediaUrls) {
      const mediaId = await uploadMedia(creds.accessToken, url);
      if (mediaId) mediaIds.push(mediaId);
      // X permite até 4 imagens/1 GIF/1 vídeo por tweet
      if (mediaIds.length >= 4) break;
    }
    if (mediaIds.length > 0) {
      body.media = { media_ids: mediaIds };
    }
  }

  const response = await fetch(API_V2, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg =
      errBody?.detail ||
      errBody?.title ||
      errBody?.errors?.[0]?.message ||
      errBody?.error?.message ||
      `HTTP ${response.status}`;
    throw new Error(`X API Error: ${msg}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`X API Error: ${data.errors[0].message}`);
  }

  if (!data.data?.id) {
    throw new Error("X API Error: resposta sem tweetId — publicação não confirmada.");
  }

  const tweetId = data.data.id;
  const profileId = creds.connectionId || null;
  const username = creds.connectionUsername || creds.connectionPageName || null;
  const url = username
    ? `https://x.com/${username}/status/${tweetId}`
    : `https://x.com/i/web/status/${tweetId}`;

  return { success: true, platform: 'twitter', tweetId, profileId, url };
}
