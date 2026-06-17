import { ENV } from "../config/env.ts"

export async function publishTikTok(
    content: string,
    media: any[],
    connection: any,
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live' || postType === 'story') {
        return { success: false, error: `Formato ${postType} não suportado pela integração atual do TikTok` };
    }

    if (mediaType === 'audio' || mediaType === 'text' || !media || !media.length) {
        return { success: false, error: "TikTok Cloud API requer vídeo" };
    }

    const res = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${connection.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                post_info: {
                    title: content
                },
                source_info: {
                    source: "FILE_UPLOAD",
                    video_url: media[0]
                }
            })
        }
    );

    const data = await res.json();

    if (data.error && data.error.message) {
        return { success: false, error: data.error.message };
    }

    if (data.data?.publish_id) {
        return { success: true, postId: data.data.publish_id };
    }

    return { success: false, error: "Erro desconhecido ao publicar no TikTok" };
}