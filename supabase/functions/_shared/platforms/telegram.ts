import { PublishPayload } from './dispatcher.ts';

async function getBotToken(supabase: any, userId: string): Promise<string> {
  const { data: credentials, error } = await supabase
    .from('api_credentials')
    .select('credentials')
    .eq('user_id', userId)
    .eq('platform', 'telegram')
    .maybeSingle();

  const creds = (credentials?.credentials as any) || {};
  let botToken = creds.bot_token || creds.botToken;
  if (!botToken && Array.isArray(creds.tokens) && creds.tokens.length > 0) {
    botToken = creds.tokens[0];
  }
  if (!botToken) {
    throw new Error('Telegram Bot Token not found. Please configure it in Settings.');
  }
  return botToken;
}

export async function publishToTelegram(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId, options, contentType } = payload;
  const chatId = options?.chatId;

  if (!chatId) {
    throw new Error('Telegram Chat ID is required.');
  }

  const botToken = await getBotToken(supabase, userId || "");
  const apiUrl = `https://api.telegram.org/bot${botToken}`;

  if (contentType === 'location') {
    const coords = content.split(',').map(Number);
    const res = await fetch(`${apiUrl}/sendLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, latitude: coords[0], longitude: coords[1] }),
    });
    const result = await res.json();
    if (!result.ok) throw new Error(`Telegram API Error: ${result.description}`);
    return { success: true, platform: 'telegram', messageId: result.result.message_id };
  }

  if (contentType === 'contact') {
    const phone = options?.recipientPhone || content;
    const res = await fetch(`${apiUrl}/sendContact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, phone_number: phone, first_name: content }),
    });
    const result = await res.json();
    if (!result.ok) throw new Error(`Telegram API Error: ${result.description}`);
    return { success: true, platform: 'telegram', messageId: result.result.message_id };
  }

  const mediaUrl = mediaUrls?.[0];
  let endpoint = `${apiUrl}/sendMessage`;
  let body: any = { chat_id: chatId, text: content };

  if (mediaUrl) {
    if (contentType === 'sticker') {
      endpoint = `${apiUrl}/sendSticker`;
      body = { chat_id: chatId, sticker: mediaUrl };
    } else if (contentType === 'animation') {
      endpoint = `${apiUrl}/sendAnimation`;
      body = { chat_id: chatId, animation: mediaUrl, caption: content };
    } else if (contentType === 'video_note') {
      endpoint = `${apiUrl}/sendVideoNote`;
      body = { chat_id: chatId, video_note: mediaUrl };
    } else if (contentType === 'voice') {
      endpoint = `${apiUrl}/sendVoice`;
      body = { chat_id: chatId, voice: mediaUrl, caption: content };
    } else if (contentType === 'video') {
      endpoint = `${apiUrl}/sendVideo`;
      body = { chat_id: chatId, video: mediaUrl, caption: content, supports_streaming: true };
    } else if (contentType === 'audio') {
      endpoint = `${apiUrl}/sendAudio`;
      body = { chat_id: chatId, audio: mediaUrl, caption: content };
    } else if (contentType === 'document') {
      endpoint = `${apiUrl}/sendDocument`;
      body = { chat_id: chatId, document: mediaUrl, caption: content };
    } else {
      endpoint = `${apiUrl}/sendPhoto`;
      body = { chat_id: chatId, photo: mediaUrl, caption: content };
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Telegram API Error: ${result.description}`);
  }

  return { success: true, platform: 'telegram', messageId: result.result.message_id };
}
