import { PublishPayload } from './dispatcher.ts';
import { detectMediaType, MediaKind } from '../media.ts';

export async function publishToTelegram(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId, options } = payload;
  const chatId = options?.chatId;

  if (!chatId) {
    throw new Error('Telegram Chat ID is required. Por favor, forneça o username do canal ou ID.');
  }

  // Fetch bot token from api_credentials
  const { data: credentials, error } = await supabase
    .from('api_credentials')
    .select('credentials')
    .eq('user_id', userId)
    .eq('platform', 'telegram')
    .maybeSingle();

  if (error || !credentials?.credentials) {
    throw new Error('Telegram Bot Token not found. Please configure it in Settings.');
  }

  const creds = credentials.credentials as any;
  const botToken = creds.bot_token || creds.botToken;

  if (!botToken) {
    throw new Error('Telegram Bot Token is missing in credentials.');
  }

  const base = `https://api.telegram.org/bot${botToken}`;

  async function call(method: string, body: Record<string, unknown>) {
    const response = await fetch(`${base}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Telegram API Error (${method}): ${result.description}`);
    }
    return result.result;
  }

  // Sem anexo → mensagem de texto
  if (!mediaUrls || mediaUrls.length === 0) {
    const result = await call('sendMessage', { chat_id: chatId, text: content });
    return { success: true, platform: 'telegram', messageId: result.message_id, profileId: null, url: null };
  }

  // Telegram aceita álbum apenas com fotos/vídeos misturados (sendMediaGroup)
  const kinds: MediaKind[] = mediaUrls.map(detectMediaType);
  const allAlbumCompatible = kinds.every((k) => k === 'image' || k === 'video');

  // ✅ ALBUM (2+ fotos/vídeos)
  if (mediaUrls.length > 1 && allAlbumCompatible) {
    const media = mediaUrls.map((url, i) => ({
      type: kinds[i] === 'video' ? 'video' : 'photo',
      media: url,
      ...(i === 0 && content ? { caption: content } : {}),
    }));
    const result = await call('sendMediaGroup', { chat_id: chatId, media });
    return {
      success: true,
      platform: 'telegram',
      messageId: Array.isArray(result) ? result[0]?.message_id : result?.message_id,
      mediaGroup: true,
      profileId: null,
      url: null,
    };
  }

  // ✅ MÍDIA ÚNICA → endpoint por tipo
  const kind = kinds[0];
  const method =
    kind === 'audio' ? 'sendAudio'
    : kind === 'video' ? 'sendVideo'
    : kind === 'document' ? 'sendDocument'
    : 'sendPhoto';
  const field =
    kind === 'audio' ? 'audio'
    : kind === 'video' ? 'video'
    : kind === 'document' ? 'document'
    : 'photo';

  const body: Record<string, unknown> = { chat_id: chatId, [field]: mediaUrls[0] };
  if (content) body.caption = content;
  if (kind === 'document') {
    const fileName = mediaUrls[0].split('/').pop()?.split('?')[0] || 'arquivo';
    body.filename = fileName;
  }

  const result = await call(method, body);
  return { success: true, platform: 'telegram', messageId: result.message_id, profileId: null, url: null };
}
