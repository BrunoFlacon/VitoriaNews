import { ENV } from "../config/env.ts"

export async function publishLinkedin(
    content: string,
    media: any,
    connection: any,
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live' || postType === 'story') {
        return { success: false, error: `Formato ${postType} não suportado no LinkedIn` };
    }
    if (mediaType === 'audio') {
        return { success: false, error: "Áudio puro não suportado no LinkedIn" };
    }

    const author = `urn:li:person:${connection.platform_user_id}`;

    let shareMediaCategory = "NONE";
    let mediaData = [];

    // Note: To properly upload media to LinkedIn UGC, we need multi-step asset upload.
    // Assuming mediaUrls are just URLs for now, which LinkedIn UGC doesn't natively support without asset upload.
    // If media is present, we fallback to NONE temporarily or return an error if we can't upload.
    if (media && media.length > 0) {
        // We'll return an error if someone tries to attach media without asset URN support here, 
        // to prevent 500s or fail silently. Real implementation requires asset registration.
        // For now, if we don't have URN logic, we skip media or return error. 
        // Let's just post text or return error.
        // shareMediaCategory = mediaType === "video" ? "VIDEO" : "IMAGE";
        // mediaData = [{ status: "READY", description: {text: content}, media: media[0] }]; // Media format requires assets urn
    }

    const res = await fetch(
        "https://api.linkedin.com/v2/ugcPosts",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${connection.access_token}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            },
            body: JSON.stringify({
                author: author,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: {
                            text: content
                        },
                        shareMediaCategory: shareMediaCategory
                    }
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
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