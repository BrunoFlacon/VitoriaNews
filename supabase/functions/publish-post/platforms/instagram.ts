import { ENV } from "../config/env.ts" 

export async function publishInstagram(
    content: any,
    media: string | any[],
    connection: { platform_user_id: any; access_token: any },
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live') {
        return { success: false, error: "Live não suportado via Graph API neste endpoint" };
    }

    if (mediaType === 'audio' || (!media || !media.length)) {
        return { success: false, error: "Instagram requer imagem ou vídeo" };
    }

    const containerBody: any = {
        caption: content,
        access_token: connection.access_token
    };

    if (mediaType === 'video') {
        containerBody.media_type = 'REELS';
        containerBody.video_url = media[0];
    } else {
        containerBody.image_url = media[0];
    }

    if (postType === 'story') {
        containerBody.media_type = mediaType === 'video' ? 'VIDEO' : 'IMAGE';
        containerBody.is_carousel_item = false;
        // Story requires specific logic, adding parameter theoretically
        // Graph API requires different handling for stories, returning err for now if not supported
        return { success: false, error: "Stories requer endpoint e formato de container específicos no Instagram" };
    }

    const container = await fetch(
        `https://graph.facebook.com/v21.0/${connection.platform_user_id}/media`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(containerBody)
        }
    );

    const containerData = await container.json();

    if (containerData.error) {
        return { success: false, error: containerData.error.message };
    }

    // if video, might require polling for status before publish. For simplicity, trying immediate publish.
    const publish = await fetch(
        `https://graph.facebook.com/v21.0/${connection.platform_user_id}/media_publish`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                creation_id: containerData.id,
                access_token: connection.access_token
            })
        }
    );

    const data = await publish.json();

    if (data.error) {
        return { success: false, error: data.error.message };
    }

    return { success: true, postId: data.id };
}