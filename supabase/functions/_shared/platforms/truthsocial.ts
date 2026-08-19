import { PublishPayload } from './dispatcher.ts';

export async function publishToTruthSocial(supabase: any, payload: PublishPayload): Promise<any> {
    // Truth Social: API pública não disponível
    return {
        success: false,
        platform: 'truthsocial',
        error: 'Truth Social Content API não disponível para integrações de terceiros.',
        unsupported: true,
    };
}
