import { PublishPayload } from './dispatcher.ts';

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

  let url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  let body: any = {
    chat_id: chatId,
    text: content,
  };

  // Se houver anexo (foto), mudar o endpoint e o payload
  if (mediaUrls && mediaUrls.length > 0) {
    url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    body = {
      chat_id: chatId,
      photo: mediaUrls[0],
      caption: content || "",
    };
  }

  const response = await fetch(url, {
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
