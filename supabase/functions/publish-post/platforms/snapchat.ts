import { ENV } from "../config/env.ts"

export async function publishSnapchat(
    content: string,
    media: string[],
    connection: { access_token: string },
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live') {
        return { success: false, error: "Live não suportado no Snapchat" };
    }

    if (mediaType === 'audio' || mediaType === 'text' || !media || !media.length) {
        return { success: false, error: "Snapchat requer imagem ou vídeo" };
    }

    const res = await fetch(
        "https://adsapi.snapchat.com/v1/media",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${connection.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                caption: content,
                media_url: media[0]
            })
        }
    );

    const data = await res.json();

    if (data.error) {
        return { success: false, error: data.error };
    }

    return { success: true, postId: data.media_id };
}