// _shared/platforms/linkedin.ts
// Adaptador de despacho para LinkedIn.
// Busca credenciais via getPlatformCredentials() e delega à implementação real.

import { PublishPayload } from "./dispatcher.ts";
import { getPlatformCredentials } from "../credentials.ts";
import { publishLinkedin } from "../../publish-post/platforms/linkedin.ts";

export async function publishToLinkedIn(
  supabase: any,
  payload: PublishPayload
): Promise<any> {
  const { content, mediaUrls, userId, options } = payload;

  // ── Credenciais ───────────────────────────────────────────────────────────
  const creds = await getPlatformCredentials(
    supabase,
    userId || "",
    "linkedin",
    options?.targetProfileId
  );

  if (!creds.accessToken) {
    throw new Error(
      "LinkedIn: access_token não encontrado. Conecte sua conta primeiro."
    );
  }

  const rawUserId = creds.platformUserId as string | undefined;
  const pageId = creds.pageId as string | undefined;

  if (!rawUserId) {
    throw new Error(
      "LinkedIn: platform_user_id não encontrado na conexão. Reconecte a conta."
    );
  }

  // Se pageId existir, é uma company page → usa URN de organização
  // Caso contrário, é perfil pessoal → usa URN de pessoa
  const platformUserId = pageId
    ? `urn:li:organization:${pageId}`
    : rawUserId.replace(/^urn:li:person:/, "");

  // ── Converter mediaUrls[] → Array<{ url, altText? }> ─────────────────────
  const mediaItems: Array<{ url: string; altText?: string }> | null =
    mediaUrls && mediaUrls.length > 0
      ? mediaUrls.map((url) => ({ url }))
      : null;

  // ── Publicar ──────────────────────────────────────────────────────────────
  const result = await publishLinkedin(
    content,
    mediaItems,
    { platform_user_id: platformUserId, access_token: creds.accessToken },
    {
      postType:  options?.postType,
      mediaType: payload.contentType,
    }
  );

  if (!result.success) {
    throw new Error(`LinkedIn: ${result.error}`);
  }

  return { success: true, platform: "linkedin", postId: result.postId };
}
