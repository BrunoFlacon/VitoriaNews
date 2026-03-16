import { ENV } from "../config/env.ts"

// import { uploadMedia } from "../storage/storage.ts" // Se for preciso subir pra Twitter

export async function publishX(
    content: any,
    media: any,
    connection: { access_token: any },
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live' || postType === 'story') {
        return { success: false, error: `Formato ${postType} não suportado no X/Twitter via API v2 text endpoint` };
    }
    if (mediaType === 'audio') {
        return { success: false, error: "Áudio puro não suportado no X/Twitter" };
    }

    const payload: any = { text: content };

    if (media && media.length > 0) {
        // Native media upload on X requires v1.1 endpoint to upload to get a media_id,
        // Then passing the media_id to v2 endpoint.
        // As this is complex and we don't have the media upload phase implemented directly here,
        // we'll append the link to the content or return error if strict native media upload is required.
        // For simplicity, failing gracefully if we can't upload media properly, but we can just append url to text.
        payload.text = `${content} \n\n ${media[0]}`; 
    }

    const res = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${connection.access_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
        return { success: false, error: data.detail || data.title || "Erro no X/Twitter" };
    }

    return {
        success: true,
        postId: data.data.id,
        url: `https://x.com/i/web/status/${data.data.id}`
    };
}