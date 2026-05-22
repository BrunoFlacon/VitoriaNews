// LinkedIn Posts API (v2/rest) — substitui o UGC Posts (deprecated)
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api

export async function publishLinkedin(
    content: string,
    media: Array<{ url: string; altText?: string }> | null,
    connection: { platform_user_id: string; access_token: string },
    options: { postType?: string; mediaType?: string } = {}
): Promise<{ success: boolean; postId?: string; error?: string }> {

    const postType  = options.postType?.toLowerCase()  || "post";
    const mediaType = options.mediaType?.toLowerCase() || "image";

    // ── Validações de formato ──────────────────────────────────────────────────
    if (postType === "live" || postType === "story") {
        return { success: false, error: `Formato "${postType}" não suportado no LinkedIn` };
    }
    if (mediaType === "audio") {
        return { success: false, error: "Áudio puro não é suportado no LinkedIn" };
    }

    const author = `urn:li:person:${connection.platform_user_id}`;

    // Cabeçalhos comuns — LinkedIn-Version obrigatório na nova REST API
    const headers: Record<string, string> = {
        Authorization:               `Bearer ${connection.access_token}`,
        "Content-Type":              "application/json",
        "LinkedIn-Version":          "202401",          // versão mínima para /rest/posts
        "X-Restli-Protocol-Version": "2.0.0",
    };

    // ── Upload de mídia (quando fornecida) ────────────────────────────────────
    let contentBlock: Record<string, unknown> | undefined;

    if (media && media.length > 0) {
        try {
            if (mediaType === "video") {
                // 1) Inicializar upload de vídeo
                const initRes = await fetch(
                    "https://api.linkedin.com/rest/videos?action=initializeUpload",
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            initializeUploadRequest: {
                                owner:            author,
                                fileSizeBytes:    0,     // forneça o tamanho real quando disponível
                                uploadCaptions:   false,
                                uploadThumbnail:  false,
                            },
                        }),
                    }
                );

                if (!initRes.ok) {
                    const err = await initRes.json().catch(() => ({}));
                    return { success: false, error: err.message || `Falha ao inicializar upload de vídeo (HTTP ${initRes.status})` };
                }

                const initData   = await initRes.json();
                const uploadUrl  = initData?.value?.uploadInstructions?.[0]?.uploadUrl as string | undefined;
                const videoUrn   = initData?.value?.video as string | undefined;

                if (!uploadUrl || !videoUrn) {
                    return { success: false, error: "LinkedIn retornou resposta inválida ao inicializar upload de vídeo" };
                }

                // 2) Fazer upload do binário do vídeo
                const videoFetch = await fetch(media[0].url);
                if (!videoFetch.ok) {
                    return { success: false, error: "Não foi possível baixar o vídeo da URL fornecida" };
                }
                const videoBlob = await videoFetch.blob();

                const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": "application/octet-stream" },
                    body:    videoBlob,
                });
                if (!uploadRes.ok) {
                    return { success: false, error: `Falha ao enviar vídeo para o LinkedIn (HTTP ${uploadRes.status})` };
                }

                // 3) Finalizar upload
                await fetch(
                    "https://api.linkedin.com/rest/videos?action=finalizeUpload",
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            finalizeUploadRequest: {
                                video:          videoUrn,
                                uploadToken:    "",
                                uploadedPartIds: [],
                            },
                        }),
                    }
                );

                contentBlock = {
                    media: {
                        id:    videoUrn,
                        title: content.substring(0, 100),
                    },
                };

            } else {
                // ── Upload de imagem ───────────────────────────────────────────
                // 1) Inicializar
                const initRes = await fetch(
                    "https://api.linkedin.com/rest/images?action=initializeUpload",
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            initializeUploadRequest: { owner: author },
                        }),
                    }
                );

                if (!initRes.ok) {
                    const err = await initRes.json().catch(() => ({}));
                    return { success: false, error: err.message || `Falha ao inicializar upload de imagem (HTTP ${initRes.status})` };
                }

                const initData  = await initRes.json();
                const uploadUrl = initData?.value?.uploadUrl as string | undefined;
                const imageUrn  = initData?.value?.image     as string | undefined;

                if (!uploadUrl || !imageUrn) {
                    return { success: false, error: "LinkedIn retornou resposta inválida ao inicializar upload de imagem" };
                }

                // 2) Fazer upload do binário da imagem
                const imgFetch = await fetch(media[0].url);
                if (!imgFetch.ok) {
                    return { success: false, error: "Não foi possível baixar a imagem da URL fornecida" };
                }
                const imgBlob = await imgFetch.blob();

                const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": imgBlob.type || "image/jpeg" },
                    body:    imgBlob,
                });
                if (!uploadRes.ok) {
                    return { success: false, error: `Falha ao enviar imagem para o LinkedIn (HTTP ${uploadRes.status})` };
                }

                contentBlock = {
                    media: {
                        id:      imageUrn,
                        altText: media[0].altText || content.substring(0, 200),
                    },
                };
            }
        } catch (err) {
            return { success: false, error: `Erro inesperado ao processar mídia: ${err}` };
        }
    }

    // ── Publicar o post ───────────────────────────────────────────────────────
    const postBody: Record<string, unknown> = {
        author,
        commentary: content,       // campo correto na Posts API (≠ "text" do UGC)
        visibility: "PUBLIC",
        distribution: {
            feedDistribution:           "MAIN_FEED",
            targetEntities:             [],
            thirdPartyDistributionChannels: [],
        },
        lifecycleState:            "PUBLISHED",
        isReshareDisabledByAuthor: false,
    };

    if (contentBlock) {
        postBody.content = contentBlock;
    }

    const res = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers,
        body: JSON.stringify(postBody),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
            success: false,
            error: (data as Record<string, string>).message || `Erro HTTP ${res.status} ao publicar no LinkedIn`,
        };
    }

    // A Posts API devolve o URN do post no header "x-restli-id"
    const postId =
        res.headers.get("x-restli-id") ??
        ((await res.json().catch(() => ({}))) as Record<string, string>).id ??
        "unknown";

    return { success: true, postId };
}