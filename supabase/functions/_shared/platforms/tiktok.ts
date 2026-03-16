import { PublishPayload } from './dispatcher.ts';

export async function publishToTikTok(payload: PublishPayload): Promise<any> {
  console.log('Publishing to TikTok:', payload);
  return { success: true, platform: 'tiktok', timestamp: new Date().toISOString() };
}
