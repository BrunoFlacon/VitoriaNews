import { ENV } from "../config/env.ts"

export async function publishWhatsApp(
    content: string,
    media: any,
    connection: any,
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live' || postType === 'story') {
        return { success: false, error: `Formato ${postType} não suportado no endpoint atual do WhatsApp` };
    }

    let type = "text";
    let messageBody: any = { body: content };

    if (media && media.length > 0) {
        if (mediaType === 'video') {
            type = "video";
            messageBody = { link: media[0], caption: content };
        } else if (mediaType === 'audio') {
            type = "audio";
            messageBody = { link: media[0] }; // audio doesn't have caption in same way
        } else {
            type = "image";
            messageBody = { link: media[0], caption: content };
        }
    }

    const payload: any = {
        messaging_product: "whatsapp",
        to: connection.recipient,
        type: type
    };
    
    payload[type] = messageBody;

    const res = await fetch(
        `https://graph.facebook.com/v19.0/${connection.phone_number_id}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${connection.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }
    );

    const data = await res.json();

    if (data.error) {
        return { success: false, error: data.error.message };
    }

    return { success: true, postId: data.messages?.[0]?.id };
}