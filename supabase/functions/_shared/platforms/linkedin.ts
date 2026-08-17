import { PublishPayload } from './dispatcher.ts';
import { getPlatformCredentials } from "../credentials.ts";
import { detectMediaType } from '../media.ts';

const LINKEDIN_API = "https://api.linkedin.com/rest";
const LINKEDIN_VERSION = "202601";

async function linkedinFetch(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${LINKEDIN_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_VERSION,
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      body?.message ||
      body?.serviceErrorCode?.message ||
      body?.status ||
      body?.error_description ||
      `HTTP ${response.status}`;
    throw new Error(`LinkedIn API Error: ${msg}`);
  }
  // Expor o header x-restli-id (contém o URN do recurso criado) quando presente
  const restliId = response.headers.get("x-restli-id");
  return restliId ? { ...body, _restliId: restliId } : body;
}

// Upload de imagem → URN do digital media asset (2 passos)
async function uploadImage(supabase: any, userId: string, personUrn: string, token: string, mediaUrl: string) {
  const init = await linkedinFetch(`/images?action=initializeUpload`, token, {
    method: "POST",
    body: JSON.stringify({
      initializeUploadRequest: { owner: personUrn },
    }),
  });

  const uploadUrl = init?.value?.uploadUrl;
  const imageUrn = init?.value?.image;
  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn API Error: initializeUpload não retornou uploadUrl/image URN.");
  }

  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) {
    throw new Error(`LinkedIn upload: não foi possível baixar a imagem da URL (HTTP ${fileRes.status}).`);
  }
  const fileBytes = new Uint8Array(await fileRes.arrayBuffer());

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: fileBytes,
  });
  if (!uploadRes.ok) {
    throw new Error(`LinkedIn upload: envio do binário falhou (HTTP ${uploadRes.status}).`);
  }

  return imageUrn;
}

// Upload de vídeo → URN do vídeo (initializeUpload → partes → finalizeUpload)
async function uploadVideo(supabase: any, userId: string, personUrn: string, token: string, mediaUrl: string) {
  const init = await linkedinFetch(`/videos?action=initializeUpload`, token, {
    method: "POST",
    body: JSON.stringify({
      initializeUploadRequest: { owner: personUrn },
    }),
  });

  const uploadUrl = init?.value?.uploadUrl;
  const videoUrn = init?.value?.video;
  const uploadToken = init?.value?.uploadToken;
  if (!uploadUrl || !videoUrn || !uploadToken) {
    throw new Error("LinkedIn API Error: initializeUpload de vídeo não retornou uploadUrl/video/uploadToken.");
  }

  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) {
    throw new Error(`LinkedIn upload: não foi possível baixar o vídeo da URL (HTTP ${fileRes.status}).`);
  }
  const fileBytes = new Uint8Array(await fileRes.arrayBuffer());
  if (fileBytes.byteLength === 0) {
    throw new Error("LinkedIn upload: arquivo de vídeo vazio (0 bytes).");
  }

  // Envia em partes de 5 MB com header "Part" (formato do upload S3 do LinkedIn)
  const PART_SIZE = 5 * 1024 * 1024;
  const partCount = Math.max(1, Math.ceil(fileBytes.byteLength / PART_SIZE));
  for (let i = 0; i < partCount; i++) {
    const start = i * PART_SIZE;
    const end = Math.min(start + PART_SIZE, fileBytes.byteLength);
    const part = fileBytes.slice(start, end);
    const partRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Part": String(i + 1),
      },
      body: part,
    });
    if (!partRes.ok) {
      throw new Error(`LinkedIn upload: envio da parte ${i + 1}/${partCount} do vídeo falhou (HTTP ${partRes.status}).`);
    }
  }

  await linkedinFetch(`/videos?action=finalizeUpload`, token, {
    method: "POST",
    body: JSON.stringify({
      finalizeUploadRequest: { video: videoUrn, uploadToken },
    }),
  });

  return videoUrn;
}

// Upload de documento (PDF/DOC/PPT/XLS) → URN do documento
async function uploadDocument(supabase: any, userId: string, personUrn: string, token: string, mediaUrl: string) {
  const kind = detectMediaType(mediaUrl);
  const docMime =
    kind === 'document'
      ? (mediaUrl.split('.')[1]?.toLowerCase() === 'pdf' ? 'application/pdf' : 'application/octet-stream')
      : 'application/octet-stream';

  const init = await linkedinFetch(`/documents?action=initializeUpload`, token, {
    method: "POST",
    body: JSON.stringify({
      initializeUploadRequest: { owner: personUrn },
    }),
  });

  const uploadUrl = init?.value?.uploadUrl;
  const docUrn = init?.value?.document;
  const uploadToken = init?.value?.uploadToken;
  if (!uploadUrl || !docUrn || !uploadToken) {
    throw new Error("LinkedIn API Error: initializeUpload de documento não retornou uploadUrl/document/uploadToken.");
  }

  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) {
    throw new Error(`LinkedIn upload: não foi possível baixar o documento da URL (HTTP ${fileRes.status}).`);
  }
  const fileBytes = new Uint8Array(await fileRes.arrayBuffer());

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": docMime },
    body: fileBytes,
  });
  if (!uploadRes.ok) {
    throw new Error(`LinkedIn upload: envio do documento falhou (HTTP ${uploadRes.status}).`);
  }

  await linkedinFetch(`/documents?action=finalizeUpload`, token, {
    method: "POST",
    body: JSON.stringify({
      finalizeUploadRequest: { document: docUrn, uploadToken },
    }),
  });

  return docUrn;
}

export async function publishToLinkedIn(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId, contentType } = payload;

  const creds = await getPlatformCredentials(supabase, userId || "", "linkedin", payload.options?.targetProfileId);

  if (!creds.isConnected) {
    throw new Error('LinkedIn não conectado. Conecte sua conta em Configurações.');
  }

  if (!creds.accessToken) {
    throw new Error('LinkedIn access token not found. Please configure it in Settings.');
  }

  const personUrn = creds.person_urn || creds.personUrn || null;

  let resolvedPersonUrn = personUrn;

  // 🔎 Person URN não configurada → busca automaticamente via userinfo
  if (!resolvedPersonUrn) {
    try {
      const userInfoRes = await fetch(`https://api.linkedin.com/v2/userinfo`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const userInfo = await userInfoRes.json().catch(() => ({}));
      if (userInfo?.sub) {
        resolvedPersonUrn = `urn:li:person:${userInfo.sub}`;
      } else {
        // Fallback: /v2/me (token antigo)
        const meRes = await fetch(`https://api.linkedin.com/v2/me`, {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
        });
        const me = await meRes.json().catch(() => ({}));
        if (me?.id) resolvedPersonUrn = `urn:li:person:${me.id}`;
      }
    } catch (e) {
      console.error("[linkedin] Erro ao resolver Person URN:", e);
    }

    // Salva a URN descoberta para reuso
    if (resolvedPersonUrn) {
      try {
        const { data: existing } = await supabase
          .from("api_credentials")
          .select("id, credentials")
          .eq("user_id", userId)
          .eq("platform", "linkedin")
          .maybeSingle();
        const current = existing?.credentials || {};
        if (existing?.id) {
          await supabase
            .from("api_credentials")
            .update({ credentials: { ...current, person_urn: resolvedPersonUrn } })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("api_credentials")
            .insert({ user_id: userId, platform: "linkedin", credentials: { ...current, person_urn: resolvedPersonUrn } });
        }
      } catch (e) {
        console.error("[linkedin] Erro ao salvar Person URN:", e);
      }
    }
  }

  if (!resolvedPersonUrn) {
    throw new Error(
      'LinkedIn Person URN não configurada e não foi possível resolvê-la com o token atual. ' +
      'Reconecte a conta do LinkedIn (token com escopo w_member_social).'
    );
  }

  const profileId = creds.connectionId || null;
  const author = resolvedPersonUrn.startsWith("urn:li:") ? resolvedPersonUrn : `urn:li:person:${resolvedPersonUrn}`;

  const postBody: Record<string, unknown> = {
    author,
    commentary: content || "",
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  // 📸 Mídia: imagem (upload real), vídeo (upload multipart real) ou documento (upload real)
  if (mediaUrls && mediaUrls.length > 0) {
    if (contentType === 'carousel' || mediaUrls.length > 1) {
      throw new Error("LinkedIn: carrossel não suportado nesta integração (envie imagem/vídeo/documento único).");
    }
    const kind = detectMediaType(mediaUrls[0]);
    const videoTitle = payload.options?.title || content || "Publicação";
    if (kind === 'image') {
      const imageUrn = await uploadImage(supabase, userId || "", author, creds.accessToken, mediaUrls[0]);
      postBody.content = {
        media: {
          id: imageUrn,
          title: content ? content.slice(0, 180) : "Publicação",
        },
      };
    } else if (kind === 'video') {
      const videoUrn = await uploadVideo(supabase, userId || "", author, creds.accessToken, mediaUrls[0]);
      postBody.content = {
        media: {
          id: videoUrn,
          title: videoTitle.slice(0, 200),
          description: (content || "").slice(0, 2000),
        },
      };
    } else if (kind === 'document') {
      const docUrn = await uploadDocument(supabase, userId || "", author, creds.accessToken, mediaUrls[0]);
      postBody.content = {
        media: {
          id: docUrn,
          title: content ? content.slice(0, 180) : "Documento",
        },
      };
    } else {
      throw new Error(
        `LinkedIn: tipo de arquivo '${kind}' não suportado (use imagem, vídeo ou documento).`
      );
    }
  }

  const result = await linkedinFetch(`/posts`, creds.accessToken, {
    method: "POST",
    body: JSON.stringify(postBody),
  });

  // A resposta de sucesso expõe o URN do post no header x-restli-id (ex: urn:li:share:123)
  const postUrn = result?._restliId || result?.id || result?.activity || null;
  if (!postUrn) {
    throw new Error("LinkedIn API Error: resposta sem id de post — publicação não confirmada.");
  }

  const activityId = String(postUrn).split(':').pop() || postUrn;

  return {
    success: true,
    platform: 'linkedin',
    postId: activityId,
    profileId,
    url: `https://www.linkedin.com/feed/update/${postUrn}/`,
  };
}
