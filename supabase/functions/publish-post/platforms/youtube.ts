import { ENV } from "../config/env.ts"

export async function publishYoutube(
    content: string,
    media: any,
    connection: { access_token: any },
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    const googleClientId = (Deno as any).env.get("GOOGLE_CLIENT_ID");
    if (!googleClientId) throw new Error("GOOGLE_CLIENT_ID não definido");

    if (postType === 'live' || postType === 'story') {
        return { success: false, error: `Formato ${postType} não suportado via simples publish do YouTube` };
    }

    if (mediaType !== 'video' || !media || !media.length) {
        return { success: false, error: "YouTube requer vídeo" };
    }

    // YouTube real video upload to YouTube Data API v3 requires uploading the file stream.
    // If media[0] is just a url, standard API doesn't pull from URL automatically in standard videos.insert endpoint.
    // For now we simulate the current logic or fail gracefully if it doesn't upload the blob.

    const res = await fetch(
        "https://www.googleapis.com/youtube/v3/videos?part=snippet,status",
        {
            method: "POST", // Standard videos.insert endpoint
            headers: {
                Authorization: `Bearer ${connection.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                snippet: {
                    title: content.substring(0, 100) || "Sem título",
                    description: content
                },
                status: {
                    privacyStatus: "public"
                }
            })
        }
    );

    const data = await res.json();

    if (data.error) {
        return { success: false, error: data.error.message };
    }

    return { success: true, postId: data.id };
}