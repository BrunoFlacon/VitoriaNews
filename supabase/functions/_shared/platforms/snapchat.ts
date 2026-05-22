// _shared/platforms/snapchat.ts
// Adaptador de despacho para Snapchat.
// Busca credenciais via getPlatformCredentials() e delega à implementação real.
//
// ⚠️  O Snapchat exige ad_account_id, que pode estar armazenado em:
//   1. social_connections.page_id  (campo genérico reutilizado)
//   2. social_connections.metadata.ad_account_id
//   3. api_credentials.credentials.ad_account_id

import { PublishPayload } from "./dispatcher.ts";
import { getPlatformCredentials } from "../credentials.ts";
import { publishSnapchat } from "../../publish-post/platforms/snapchat.ts";

export async function publishToSnapchat(
  supabase: any,
  payload: PublishPayload
): Promise<any> {
  const { content, mediaUrls, userId, options } = payload;

  // ── Credenciais ───────────────────────────────────────────────────────────
  const creds = await getPlatformCredentials(
    supabase,
    userId || "",
    "snapchat",
    options?.targetProfileId
  );

  if (!creds.accessToken) {
    throw new Error(
      "Snapchat: access_token não encontrado. Conecte sua conta primeiro."
    );
  }

  // Resolve ad_account_id em cascata:
  //   page_id → metadata.ad_account_id → api_credentials.ad_account_id
  const adAccountId: string | undefined =
    (creds.pageId as string | undefined) ||
    (creds.ad_account_id as string | undefined) ||
    ((creds.metadata as Record<string, string> | undefined)?.ad_account_id);

  if (!adAccountId) {
    throw new Error(
      "Snapchat: ad_account_id não encontrado. Configure-o em Configurações → Snapchat."
    );
  }

  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("Snapchat requer pelo menos uma imagem ou vídeo.");
  }

  // ── Publicar ──────────────────────────────────────────────────────────────
  const result = await publishSnapchat(
    content,
    mediaUrls,
    { access_token: creds.accessToken, ad_account_id: adAccountId },
    {
      postType:  options?.postType,
      mediaType: payload.contentType,
    }
  );

  if (!result.success) {
    throw new Error(`Snapchat: ${result.error}`);
  }

  return { success: true, platform: "snapchat", mediaId: result.mediaId };
}
