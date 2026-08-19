import { PublishPayload } from './dispatcher.ts';

export async function publishToSnapchat(supabase: any, payload: PublishPayload): Promise<any> {
  // Snapchat: API de conteúdo público ainda não disponível
  // Fonte: https://developers.snap.com/api/studio-api
  return {
    success: false,
    platform: 'snapchat',
    error: 'Snapchat Content API ainda não implementada. Publicação não realizada.',
    unsupported: true,
  };
}
