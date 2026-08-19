import { PublishPayload } from './dispatcher.ts';

export async function publishToKwai(supabase: any, payload: PublishPayload): Promise<any> {
    // Kwai: Content Posting API não disponível para terceiros
    return {
        success: false,
        platform: 'kwai',
        error: 'Kwai Content Posting API não disponível para integrações de terceiros.',
        unsupported: true,
    };
}
