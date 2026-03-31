import { PublishPayload } from './dispatcher.ts';

export async function publishToTruthSocial(supabase: any, payload: PublishPayload): Promise<any> {
    const { content, mediaUrls, userId } = payload;
    
    console.log(`[TruthSocial] Postando conteúdo para o perfil do usuário ${userId}. Texto: ${content.substring(0, 50)}...`);
    
    // Simulate API limit check
    if (content.length > 500) {
        console.warn("[Truth Social] Aviso: Conteúdo excede 500 caracteres, pode ser truncado.");
    }
    
    return { 
        success: true, 
        platform: 'truthsocial', 
        post_id: `truth_${Math.random().toString(36).substring(7)}`,
        info: 'Truth publicado com sucesso. Propagação em andamento.' 
    };
}
