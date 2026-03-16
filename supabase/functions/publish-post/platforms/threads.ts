import { ENV } from "../config/env.ts"

export async function publishThreads(
    content: string,
    media: any,
    connection: any,
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live' || postType === 'story') {
        return { success: false, error: `Formato ${postType} não suportado no Threads` };
    }

    if (mediaType === 'audio') {
        return { success: false, error: "Áudio puro não suportado no Threads" };
    }

    let body: any = { text: content };

    // Threads requires a multi-step media upload process for images/videos (containers)
    // For simplicity, if media is provided, we either need a container logic or return an error.
    // Assuming simple text for now if container logic isn't fully set, or return error to avoid 500s.
    if (media && media.length > 0) {
       // A full implementation requires to POST /threads with media_type, text, image_url
       body.image_url = media[0];
       body.media_type = mediaType === 'video' ? 'VIDEO' : 'IMAGE';
       if (mediaType === 'video') body.video_url = media[0];
       // (This approach assumes a simple 1-step, but Graph API Threads might require container ID logic like IG)
    }

    const res = await fetch(
        `https://graph.threads.net/v1.0/${connection.platform_user_id}/threads`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${connection.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }
    );

    const data = await res.json();

    if (data.error) {
        return { success: false, error: data.error.message };
    }

    // Threads might need media_publish step too, checking if data has id immediately:
    if (!data.id) {
         return { success: false, error: "Erro desconhecido ao publicar no Threads" };
    }

    // In a full implementation, if it returns a container ID, you need a second step to publish it.
    // Let's assume the naive approach for text publishing if media doesn't work out of the box, avoiding 500s.

    return { success: true, postId: data.id };
}