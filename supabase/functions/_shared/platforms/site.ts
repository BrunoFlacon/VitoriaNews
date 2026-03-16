import { PublishPayload } from './dispatcher.ts';

export async function publishToSite(payload: PublishPayload): Promise<any> {
  console.log('Publishing to Site:', payload);
  return { success: true, platform: 'site', timestamp: new Date().toISOString() };
}
