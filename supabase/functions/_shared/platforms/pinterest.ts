// _shared/platforms/pinterest.ts
// Adaptador de despacho para Pinterest.
// Busca credenciais via getPlatformCredentials() e delega à implementação real.

import { PublishPayload } from "./dispatcher.ts";
import { getPlatformCredentials } from "../credentials.ts";
import { publishPinterest } from "../../publish-post/platforms/pinterest.ts";

export async function publishToPinterest(
  supabase: any,
  payload: PublishPayload
): Promise<any> {
  const { content, mediaUrls, userId, options } = payload;

  // ── Credenciais ───────────────────────────────────────────────────────────
  const creds = await getPlatformCredentials(
    supabase,
    userId || "",
    "pinterest",
    options?.targetProfileId
  );

  if (!creds.accessToken) {
    throw new Error(
      "Pinterest: access_token não encontrado. Conecte sua conta primeiro."
    );
  }

  // page_id armazena o board_id no social_connections
  const boardId = creds.pageId as string | undefined;
  if (!boardId) {
    throw new Error(
      "Pinterest: board_id (page_id) não encontrado na conexão. Configure um board padrão."
    );
  }

  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("Pinterest requer pelo menos uma imagem ou vídeo.");
  }

  // ── Publicar ──────────────────────────────────────────────────────────────
  const result = await publishPinterest(
    content,
    mediaUrls,
    { access_token: creds.accessToken, page_id: boardId },
    {
      postType:  options?.postType,
      mediaType: payload.contentType,
    }
  );

  if (!result.success) {
    throw new Error(`Pinterest: ${result.error}`);
  }

  return { success: true, platform: "pinterest", postId: result.postId };
}
