// Pinterest API v5 — Pins
// Docs: https://developers.pinterest.com/docs/api/v5/

export async function publishPinterest(
    content: string,
    media: string[],
    connection: { access_token: string; page_id: string }, // page_id = board_id
    options: { postType?: string; mediaType?: string } = {}
): Promise<{ success: boolean; postId?: string; error?: string }> {

    const postType  = options.postType?.toLowerCase()  || "post";
    const mediaType = options.mediaType?.toLowerCase() || "image";

    // ── Validações de formato ──────────────────────────────────────────────────
    if (postType === "live" || postType === "story") {
        return { success: false, error: `Formato "${postType}" não suportado no Pinterest` };
    }
    if (mediaType === "audio" || mediaType === "text") {
        return { success: false, error: "Pinterest não suporta publicações de áudio ou texto puro" };
    }
    if (!media || media.length === 0) {
        return { success: false, error: "Pinterest requer pelo menos uma imagem ou vídeo" };
    }

    const headers: Record<string, string> = {
        Authorization:  `Bearer ${connection.access_token}`,
        "Content-Type": "application/json",
    };

    // ── Montar media_source conforme o tipo ───────────────────────────────────
    let mediaSource: Record<string, unknown>;

    if (mediaType === "video") {
        // Passo 1 — Registrar upload de vídeo no endpoint /v5/media
        const registerRes = await fetch("https://api.pinterest.com/v5/media", {
            method: "POST",
            headers,
            body: JSON.stringify({ media_type: "video" }),
        });

        if (!registerRes.ok) {
            const err = await registerRes.json().catch(() => ({}));
            return {
                success: false,
                error: (err as Record<string, string>).message || `Falha ao registrar upload de vídeo (HTTP ${registerRes.status})`,
            };
        }

        const registerData = await registerRes.json();
        const mediaId      = registerData?.media_id    as string | undefined;
        const uploadUrl    = registerData?.upload_url  as string | undefined;
        const uploadParams = registerData?.upload_parameters as Record<string, string> | undefined;

        if (!mediaId || !uploadUrl) {
            return { success: false, error: "Pinterest retornou resposta inválida ao registrar vídeo" };
        }

        // Passo 2 — Enviar vídeo via multipart/form-data para a URL S3 retornada
        const formData = new FormData();
        if (uploadParams) {
            for (const [key, val] of Object.entries(uploadParams)) {
                formData.append(key, val);
            }
        }

        const videoFetch = await fetch(media[0]);
        if (!videoFetch.ok) {
            return { success: false, error: "Não foi possível baixar o vídeo da URL fornecida" };
        }
        const videoBlob = await videoFetch.blob();
        formData.append("file", videoBlob, "video.mp4");

        const uploadRes = await fetch(uploadUrl, { method: "POST", body: formData });
        if (!uploadRes.ok) {
            return { success: false, error: `Falha ao enviar vídeo para o Pinterest (HTTP ${uploadRes.status})` };
        }

        // Passo 3 — Referenciar o media_id no pin
        // cover_image_url: segunda URL do array (thumbnail) ou a própria URL do vídeo
        mediaSource = {
            source_type:      "video_id",
            cover_image_url:  media[1] ?? media[0],
            media_id:         mediaId,
        };

    } else {
        // Imagem — a API v5 aceita image_url diretamente (não precisa de upload prévio)
        mediaSource = {
            source_type: "image_url",
            url:         media[0],
        };
    }

    // ── Criar o pin ───────────────────────────────────────────────────────────
    const pinBody: Record<string, unknown> = {
        board_id:     connection.page_id,
        title:        content.substring(0, 100),       // limite da API: 100 chars
        description:  content.substring(0, 500),       // limite da API: 500 chars
        alt_text:     content.substring(0, 500),       // acessibilidade
        media_source: mediaSource,
    };

    const res = await fetch("https://api.pinterest.com/v5/pins", {
        method: "POST",
        headers,
        body: JSON.stringify(pinBody),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
            success: false,
            error: (data as Record<string, string>).message || `Erro HTTP ${res.status} ao publicar no Pinterest`,
        };
    }

    const data = await res.json();
    return { success: true, postId: data.id };
}