import { PublishPayload } from './dispatcher.ts';

export async function publishToGettr(supabase: any, payload: PublishPayload): Promise<any> {
    // GETTR: API pública de publicação não disponível
    return {
        success: false,
        platform: 'gettr',
        error: 'GETTR Content API não disponível para integrações de terceiros.',
        unsupported: true,
    };
}
