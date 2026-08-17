import { getThreadsCredentials } from "../credentials.ts";
import { PublishPayload } from "./dispatcher.ts";
import { detectMediaType } from "../media.ts";

async function waitForContainerReady(creationId: string, accessToken: string, maxAttempts = 24) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusRes = await fetch(
      `https://graph.threads.net/v1.0/${creationId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusRes.json();

    const code = statusData?.status_code;
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`Threads container ${code}: ${statusData?.status || "erro no processamento da mídia"}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Threads container timeout: mídia não processada em ${maxAttempts * 5}s`);
}

export async function publishToThreads(supabase: any, payload: PublishPayload) {
  const { content, mediaUrls, userId, options } = payload;

  if (!userId) {
    throw new Error("userId é obrigatório para publicar no Threads");
  }

  const creds = await getThreadsCredentials(
    supabase,
    userId,
    options?.targetProfileId
  );

  if (creds.error) {
    throw new Error(creds.error);
  }

  const { accessToken, platformUserId } = creds;

  const profileId = (creds as any).connectionId || platformUserId || null;

  const BASE_URL = "https://graph.threads.net/v1.0";

  // 🧱 STEP 1: CRIAR CONTAINER
  const mediaType = mediaUrls?.length ? detectMediaType(mediaUrls[0]) : null;
  const containerBody: Record<string, unknown> = {
    text: content,
  };
  if (mediaUrls?.length) {
    if (mediaType === "video") {
      containerBody.media_type = "VIDEO";
      containerBody.video_url = mediaUrls[0];
    } else {
      containerBody.media_type = "IMAGE";
      containerBody.image_url = mediaUrls[0];
    }
  }

  const containerRes = await fetch(
    `${BASE_URL}/${platformUserId}/threads`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(containerBody)
    }
  );

  const containerData = await containerRes.json();

  console.log("THREADS CONTAINER:", containerData);

  if (!containerRes.ok || containerData.error) {
    throw new Error(
      containerData?.error?.message || "Erro ao criar container"
    );
  }

  // ⏳ Aguarda a mídia processar antes de publicar (evita erro de container)
  if (mediaType === "video" || mediaType === "image") {
    await waitForContainerReady(containerData.id, accessToken);
  }

  // 🚀 STEP 2: PUBLICAR
  const publishRes = await fetch(
    `${BASE_URL}/${platformUserId}/threads_publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        creation_id: containerData.id
      })
    }
  );

  const publishData = await publishRes.json();

  console.log("THREADS PUBLISH:", publishData);

  if (!publishRes.ok || publishData.error) {
    throw new Error(
      publishData?.error?.message || "Erro ao publicar"
    );
  }

  return {
    success: true,
    platform: "threads",
    postId: publishData.id,
    profileId,
    url: `https://www.threads.net/t/${publishData.id}`
  };
}