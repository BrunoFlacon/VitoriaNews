import { ENV } from "../config/env.ts"

export async function publishPinterest(
    content: string,
    media: string[],
    connection: { access_token: string; page_id: string },
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live' || postType === 'story') {
        return { success: false, error: `Formato ${postType} não suportado no Pinterest` };
    }

    if (mediaType === 'audio' || mediaType === 'text' || !media || !media.length) {
        return { success: false, error: "Pinterest requer imagem ou vídeo" };
    }

    const res = await fetch(
        "https://api.pinterest.com/v5/pins",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${connection.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                board_id: connection.page_id,
                title: content.substring(0, 100),
                description: content,
                media_source: {
                    source_type: mediaType === 'video' ? "video_id" : "image_url", // simplified, usually requires video upload phase
                    url: media[0]
                }
            })
        }
    );

    const data = await res.json();

    if (data.message) {
        return { success: false, error: data.message };
    }

    return { success: true, postId: data.id };
}