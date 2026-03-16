import { ENV } from "../config/env.ts"

export async function publishTelegram(
    content: any,
    media: any,
    connection: { access_token: any; page_id: any },
    options: { postType?: string; mediaType?: string } = {}
) {
    const postType = options.postType?.toLowerCase() || 'post';
    const mediaType = options.mediaType?.toLowerCase() || 'image';

    if (postType === 'live' || postType === 'story') {
        return { success: false, error: `Formato ${postType} não suportado pela integração atual do Telegram` };
    }

    let endpoint = `https://api.telegram.org/bot${ENV.TELEGRAM_TOKEN}/sendMessage`;
    let body: any = { chat_id: connection.page_id, text: content };

    if (media && media.length > 0) {
        if (mediaType === 'video') {
            endpoint = `https://api.telegram.org/bot${ENV.TELEGRAM_TOKEN}/sendVideo`;
            body = { chat_id: connection.page_id, video: media[0], caption: content };
        } else if (mediaType === 'audio') {
            endpoint = `https://api.telegram.org/bot${ENV.TELEGRAM_TOKEN}/sendAudio`;
            body = { chat_id: connection.page_id, audio: media[0], caption: content };
        } else {
            endpoint = `https://api.telegram.org/bot${ENV.TELEGRAM_TOKEN}/sendPhoto`;
            body = { chat_id: connection.page_id, photo: media[0], caption: content };
        }
    }

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!data.ok) {
        return { success: false, error: data.description || "Telegram error" };
    }

    return { success: true, postId: data.result.message_id };
}