export async function publishThreads(content: string, media: any, connection: any, options: { postType?: string; mediaType?: string } = {}) {
    try {
        const postType = options.postType?.toLowerCase() || 'post';
        const mediaType = options.mediaType?.toLowerCase() || 'image';

        // VALIDAÇÕES
        if (!connection?.access_token) {
            return { success: false, error: "Access token do Threads ausente" };
        }

        if (!connection?.platform_user_id) {
            return { success: false, error: "platform_user_id não encontrado" };
        }

        if (!content?.trim()) {
            return { success: false, error: "Conteúdo vazio" };
        }

        if (postType === 'live' || postType === 'story') {
            return { success: false, error: `Formato ${postType} não suportado` };
        }

        if (mediaType === 'audio') {
            return { success: false, error: "Áudio não suportado" };
        }

        const accessToken = connection.access_token;
        const userId = connection.platform_user_id;

        // 1. CRIAR CONTAINER
        let containerBody: any = {
            text: content.trim()
        };

        if (media && media.length > 0) {
            const mediaUrl = media[0];

            containerBody.media_type = mediaType === 'video' ? 'VIDEO' : 'IMAGE';

            if (mediaType === 'video') {
                containerBody.video_url = mediaUrl;
            } else {
                containerBody.image_url = mediaUrl;
            }
        }

        const createRes = await fetch(
            `https://graph.threads.net/v1.0/${connection.platform_user_id}/threads`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${connection.access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(containerBody)
            }
        );

        const createData = await createRes.json();

        console.log("THREADS CREATE:", createData);

        if (!createRes.ok || createData.error) {
            return {
                success: false,
                error: createData?.error?.message || "Erro ao criar container",
                details: createData
            };
        }

        const creationId = createData.id;

        if (!creationId) {
            return {
                success: false,
                error: "Threads não retornou container_id",
                details: createData
            };
        }

        // 2. PUBLICAR CONTAINER
        const publishRes = await fetch(
            `https://graph.threads.net/v1.0/${connection.platform_user_id}/threads_publish`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${connection.access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    creation_id: creationId
                })
            }
        );

        const publishData = await publishRes.json();

        console.log("THREADS PUBLISH:", publishData);

        if (!publishRes.ok || publishData.error) {
            return {
                success: false,
                error: publishData?.error?.message || "Erro ao publicar",
                details: publishData
            };
        }

        return {
            success: true,
            postId: publishData.id
        };

    } catch (err: any) {
        console.error("THREADS ERROR:", err);

        return {
            success: false,
            error: "Erro inesperado no Threads",
            details: err.message || err
        };
    }
}   