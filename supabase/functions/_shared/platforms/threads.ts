import { getThreadsCredentials } from "../credentials";
import { PublishPayload } from "./dispatcher";

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

  const BASE_URL = "https://graph.threads.net/v1.0";

  // 🧱 STEP 1: CRIAR CONTAINER
  const containerRes = await fetch(
    `${BASE_URL}/${platformUserId}/threads`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: content,
        ...(mediaUrls?.length
          ? {
              media_type: "IMAGE",
              image_url: mediaUrls[0]
            }
          : {})
      })
    }
  );

  const containerData = await containerRes.json();

  console.log("THREADS CONTAINER:", containerData);

  if (!containerRes.ok || containerData.error) {
    throw new Error(
      containerData?.error?.message || "Erro ao criar container"
    );
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
    postId: publishData.id
  };
}