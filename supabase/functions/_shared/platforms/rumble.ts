import { PublishPayload } from './dispatcher.ts';

export async function publishToRumble(supabase: any, payload: PublishPayload): Promise<any> {
    // Rumble: API pública de upload não disponível
    return {
        success: false,
        platform: 'rumble',
        error: 'Rumble Content API não disponível. Upload de vídeo requer interface manual.',
        unsupported: true,
    };
}
