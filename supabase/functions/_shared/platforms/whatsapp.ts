import { PublishPayload } from './dispatcher.ts';

export async function publishToWhatsApp(payload: PublishPayload): Promise<any> {
  console.log('Publishing to WhatsApp:', payload);
  return { success: true, platform: 'whatsapp', timestamp: new Date().toISOString() };
}
