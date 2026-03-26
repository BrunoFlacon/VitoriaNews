import { PublishPayload } from './dispatcher.ts';

export async function publishToTelegram(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId, options } = payload;
  const chatId = options?.chatId;

  if (!chatId) {
    throw new Error('Telegram Chat ID is required.');
  }

  // Fetch bot token from api_credentials
  const { data: credentials, error } = await supabase
    .from('api_credentials')
    .select('credentials')
    .eq('user_id', userId)
    .eq('platform', 'telegram')
    .maybeSingle();

  if (error || !credentials?.credentials?.bot_token) {
    throw new Error('Telegram Bot Token not found. Please configure it in Settings.');
  }

  const botToken = credentials.credentials.bot_token;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: content,
    }),
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Telegram API Error: ${result.description}`);
  }

  return { success: true, platform: 'telegram', messageId: result.result.message_id };
}
