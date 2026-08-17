import { PublishPayload } from './dispatcher.ts';
import { getPlatformCredentials } from "../credentials.ts";
import { detectMediaType } from '../media.ts';

const TIKTOK_API = "https://open.tiktokapis.com/v2";

// ⏳ Aguarda o vídeo do TikTok terminar de publicar (PUBLISH_COMPLETE)
async function waitForPublish(publishId: string, accessToken: string, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(`TikTok API Error: ${body?.error?.message || `HTTP ${res.status}`}`);
    }

    const status = body?.data?.status;
    if (status === "PUBLISH_COMPLETE") return body.data;
    if (status === "FAILED" || status === "PUBLISH_FAILED") {
      throw new Error(`TikTok publish failed: ${body?.data?.fail_reason || "motivo desconhecido"}`);
    }
    if (status === "PROCESSING_DONE") return body.data;

    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("TikTok publish timeout: vídeo não concluído em 150s");
}

// 🚀 Upload direto dos bytes do vídeo para a upload_url do TikTok (FILE_UPLOAD)
async function uploadVideoBytes(uploadUrl: string, bytes: Uint8Array, videoSize: number) {
  const actualSize = bytes.byteLength;
  const total = actualSize;

  // Arquivos até 64 MB: PUT único (chunk_size = total, total_chunk_count = 1)
  // Acima de 64 MB: chunks de 64 MB (mín 5 MB, máx 64 MB; último pode ir até 128 MB)
  const MAX_CHUNK = 64 * 1024 * 1024;
  const chunkSize = total <= MAX_CHUNK ? total : MAX_CHUNK;
  const totalChunks = Math.max(1, Math.ceil(total / chunkSize));

  let lastStatus = 0;
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, total) - 1;
    const chunk = bytes.slice(start, end + 1);

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${start}-${end}/${total}`,
      },
      body: chunk,
    });

    lastStatus = putRes.status;
    if (putRes.status === 201) {
      return; // upload concluído
    }
    if (putRes.status !== 206) {
      const errBody = await putRes.text().catch(() => "");
      throw new Error(`TikTok upload: PUT do chunk ${i + 1}/${totalChunks} falhou (HTTP ${putRes.status}) ${errBody.slice(0, 300)}`);
    }
  }

  // Se caiu aqui: último chunk retornou 206 sem 201 → sinalizar estado
  if (lastStatus !== 201) {
    throw new Error("TikTok upload: upload concluído sem confirmação 201 — verifique o status em /status/fetch/.");
  }
}

export async function publishToTikTok(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId, contentType } = payload;
  const title = payload.options?.title || content || "Publicação";

  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("TikTok requer um vídeo ou foto para publicação.");
  }
  if (mediaUrls.length > 1) {
    throw new Error("TikTok: apenas 1 arquivo por publicação nesta integração.");
  }

  const kind = detectMediaType(mediaUrls[0]);
  if (kind === 'audio' || kind === 'document') {
    throw new Error(
      `TikTok não aceita ${kind === 'audio' ? 'áudio' : 'documentos'} como publicação. ` +
      'Envie vídeo (reels) ou fotos (JPEG/PNG/WebP).'
    );
  }
  if (kind !== 'image' && kind !== 'video') {
    throw new Error(`TikTok: tipo de arquivo não suportado (${kind}).`);
  }
  const isPhoto = kind === 'image';

  const creds = await getPlatformCredentials(supabase, userId || "", "tiktok", payload.options?.targetProfileId);

  if (!creds.isConnected || !creds.accessToken) {
    throw new Error("TikTok não conectado. Conecte sua conta em Configurações.");
  }

  const mediaUrl = mediaUrls[0];
  const profileId = creds.connectionId || null;

  // Baixa o arquivo primeiro para saber o tamanho exato
  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) {
    throw new Error(`TikTok upload: não foi possível baixar o arquivo da URL (HTTP ${fileRes.status}).`);
  }
  const fileBytes = new Uint8Array(await fileRes.arrayBuffer());
  const fileSize = fileBytes.byteLength;
  if (fileSize === 0) {
    throw new Error("TikTok upload: arquivo vazio (0 bytes).");
  }

  // Mesma lógica de chunking usada no upload (5–64 MB por chunk)
  const MAX_CHUNK = 64 * 1024 * 1024;
  const initChunkSize = fileSize <= MAX_CHUNK ? fileSize : MAX_CHUNK;
  const initTotalChunks = Math.max(1, Math.ceil(fileSize / initChunkSize));

  const postInfo: Record<string, unknown> = {
    title,
    privacy_level: "SELF_ONLY", // Apps não auditados só podem publicar de forma privada
    disable_comment: false,
    disable_duet: false,
    disable_stitch: false,
    video_cover_timestamp_ms: 1000,
  };
  const sourceInfo: Record<string, unknown> = {
    source: "FILE_UPLOAD",
  };
  if (isPhoto) {
    sourceInfo.photo_size = fileSize;
    sourceInfo.photo_index = 0;
    sourceInfo.total_photo_count = 1;
    sourceInfo.chunk_size = initChunkSize;
    sourceInfo.total_chunk_count = initTotalChunks;
  } else {
    sourceInfo.video_size = fileSize;
    sourceInfo.chunk_size = initChunkSize;
    sourceInfo.total_chunk_count = initTotalChunks;
  }

  // 🔹 STEP 1: iniciar publicação (FILE_UPLOAD — sem verificação de domínio)
  const endpoint = isPhoto ? `/post/publish/photo/init/` : `/post/publish/video/init/`;
  const initRes = await fetch(`${TIKTOK_API}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: postInfo,
      source_info: sourceInfo,
    }),
  });

  const initBody = await initRes.json().catch(() => ({}));

  if (!initRes.ok) {
    const errCode = initBody?.error?.code;
    const errMsg = initBody?.error?.message || initBody?.message || `HTTP ${initRes.status}`;
    if (errCode === "unaudited_client_can_only_post_to_private_accounts") {
      throw new Error(
        "TikTok bloqueou a publicação: o app ainda não passou pela revisão (unaudited) e só pode " +
        "postar para contas PRIVADAS. Torne a conta '@' do TikTok privada em Configurações do TikTok " +
        "ou conclua o App Review no portal de desenvolvedores."
      );
    }
    throw new Error(`TikTok API Error: ${errMsg}${errCode ? ` (${errCode})` : ""}`);
  }

  const publishId = initBody?.data?.publish_id;
  const uploadUrl = initBody?.data?.upload_url;
  if (!publishId || !uploadUrl) {
    throw new Error("TikTok API Error: resposta sem publish_id/upload_url — publicação não confirmada.");
  }

  // 🔹 STEP 2: enviar os bytes do arquivo
  await uploadVideoBytes(uploadUrl, fileBytes, fileSize);

  // 🔹 STEP 3: aguardar processamento/publish
  const publishData = await waitForPublish(publishId, creds.accessToken);

  return {
    success: true,
    platform: 'tiktok',
    publishId,
    videoId: publishData?.publicaly_available_post_id?.[0] || publishData?.video_id || publishData?.photo_id || null,
    profileId,
    url: null, // Link público exige username — indisponível sem token de leitura de perfil
    contentType,
  };
}
