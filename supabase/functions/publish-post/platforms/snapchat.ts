// Snapchat Marketing API — Media Upload + Creative
// Docs: https://marketingapi.snapchat.com/docs/
//
// ⚠️  IMPORTANTE:
//   O Snapchat NÃO possui uma API pública de publicação orgânica equivalente ao
//   Instagram/LinkedIn. A única API disponível para criação de conteúdo é a
//   Marketing API (para anúncios/sponsored content).
//   - A conexão DEVE incluir `ad_account_id` (obtido no Snapchat Business Manager).
//   - O endpoint `/v1/media` exige upload em duas etapas: registro + envio binário.
//   - O endpoint original do script (`/v1/media` com body JSON simples) estava incorreto.

export async function publishSnapchat(
    content: string,
    media: string[],
    connection: {
        access_token:  string;
        ad_account_id: string;  // ← NOVO campo obrigatório
    },
    options: { postType?: string; mediaType?: string } = {}
): Promise<{ success: boolean; mediaId?: string; error?: string }> {

    const postType  = options.postType?.toLowerCase()  || "post";
    const mediaType = options.mediaType?.toLowerCase() || "image";

    // ── Validações ────────────────────────────────────────────────────────────
    if (postType === "live") {
        return { success: false, error: "Live não é suportado no Snapchat via Marketing API" };
    }
    if (mediaType === "audio" || mediaType === "text") {
        return { success: false, error: "Snapchat requer imagem ou vídeo" };
    }
    if (!media || media.length === 0) {
        return { success: false, error: "Snapchat requer pelo menos uma mídia (imagem ou vídeo)" };
    }
    if (!connection.ad_account_id) {
        return { success: false, error: "ad_account_id é obrigatório para publicar no Snapchat" };
    }

    const BASE = "https://adsapi.snapchat.com/v1";

    const headers: Record<string, string> = {
        Authorization:  `Bearer ${connection.access_token}`,
        "Content-Type": "application/json",
    };

    // ── Passo 1: Registrar a mídia (cria o slot para upload) ─────────────────
    const snapMediaType = mediaType === "video" ? "VIDEO" : "IMAGE";

    const registerRes = await fetch(
        `${BASE}/adaccounts/${connection.ad_account_id}/media`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                media: [
                    {
                        ad_account_id: connection.ad_account_id,
                        name:          `media_${Date.now()}`,
                        type:          snapMediaType,
                    },
                ],
            }),
        }
    );

    if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}));
        const msg =
            (err as { request_status?: string; debug_message?: string })
                .debug_message ||
            `Falha ao registrar mídia no Snapchat (HTTP ${registerRes.status})`;
        return { success: false, error: msg };
    }

    const registerData = await registerRes.json();

    // A API devolve um array; pegamos o primeiro item
    const mediaRecord = registerData?.media?.[0]?.media as
        | Record<string, string>
        | undefined;

    const mediaId      = mediaRecord?.id;
    const uploadHandle = mediaRecord?.upload_handle;  // token necessário para upload

    if (!mediaId || !uploadHandle) {
        return { success: false, error: "Snapchat retornou resposta inválida ao registrar mídia" };
    }

    // ── Passo 2: Upload do binário ────────────────────────────────────────────
    const mediaFetch = await fetch(media[0]);
    if (!mediaFetch.ok) {
        return { success: false, error: "Não foi possível baixar a mídia da URL fornecida" };
    }
    const mediaBlob = await mediaFetch.blob();

    // Upload via multipart/form-data
    const formData = new FormData();
    formData.append("upload_handle", uploadHandle);
    formData.append(
        "file",
        mediaBlob,
        mediaType === "video" ? "media.mp4" : "media.jpg"
    );

    // Para upload, remover Content-Type para o browser/runtime definir o boundary correto
    const uploadHeaders: Record<string, string> = {
        Authorization: `Bearer ${connection.access_token}`,
    };

    const uploadRes = await fetch(
        `${BASE}/adaccounts/${connection.ad_account_id}/media/${mediaId}/upload`,
        {
            method: "POST",
            headers: uploadHeaders,
            body:    formData,
        }
    );

    if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        const msg =
            (err as { debug_message?: string }).debug_message ||
            `Falha ao fazer upload da mídia (HTTP ${uploadRes.status})`;
        return { success: false, error: msg };
    }

    // ── Passo 3 (opcional): Verificar status do processamento ─────────────────
    // Vídeos passam por transcodificação; em produção implemente polling aqui.
    // Para imagens, o status costuma ser imediato (READY).
    const statusRes = await fetch(
        `${BASE}/adaccounts/${connection.ad_account_id}/media/${mediaId}`,
        { headers }
    );

    if (statusRes.ok) {
        const statusData = await statusRes.json();
        const mediaStatus =
            (statusData?.media as Record<string, string> | undefined)?.media_status;

        if (mediaStatus === "FAILED") {
            return { success: false, error: "Processamento da mídia falhou no Snapchat" };
        }
        // Se PENDING, o conteúdo está em fila (normal para vídeos)
    }

    // ── Retorno ───────────────────────────────────────────────────────────────
    // A Marketing API do Snapchat não expõe um endpoint de "post orgânico".
    // O mediaId retornado pode ser usado para criar um Snap Ad ou criativo.
    // Para publicação orgânica real, integre com a Snap Kit Creator API:
    // https://kit.snapchat.com/docs/creator-kit
    return { success: true, mediaId };
}