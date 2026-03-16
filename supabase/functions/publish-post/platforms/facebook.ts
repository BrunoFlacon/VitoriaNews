import { ENV } from "../config/env.ts"

export async function publishFacebook(
    content: any,
    media: any,
    connection: { page_id: any; access_token: any },
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live') {
        return { success: false, error: "Live não suportado via Graph API de feed padrão" };
    }

    if (mediaType === 'audio') {
        return { success: false, error: "Áudio puro não suportado no feed do Facebook" };
    }

    if (postType === 'story') {
        return { success: false, error: "Story exige endpoint específico e permissões adicionais não configuradas" };
    }

    let url = `https://graph.facebook.com/v21.0/${connection.page_id}/feed`;
    let body: any = { message: content, access_token: connection.access_token };

    if (media && media.length > 0) {
        if (mediaType === 'video') {
            url = `https://graph.facebook.com/v21.0/${connection.page_id}/videos`;
            body = {
                description: content,
                file_url: media[0],
                access_token: connection.access_token
            };
        } else {
            url = `https://graph.facebook.com/v21.0/${connection.page_id}/photos`;
            body = {
                caption: content,
                url: media[0],
                access_token: connection.access_token
            };
        }
    }

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.error) {
        return {
            success: false,
            error: data.error.message
        };
    }

    return {
        success: true,
        postId: data.id
    };
}