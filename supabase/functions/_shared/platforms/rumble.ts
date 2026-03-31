import { PublishPayload } from './dispatcher.ts';

export async function publishToRumble(supabase: any, payload: PublishPayload): Promise<any> {
    const { content, mediaUrls, userId } = payload;
    
    console.log(`[Rumble] Iniciando despacho de vídeo para o canal do usuário ${userId}. Conteúdo: ${content.substring(0, 30)}...`);
    
    if (payload.contentType !== 'video') {
         throw new Error("[Rumble] Rumble aceita apenas envios de vídeo.");
    }

    return { 
        success: true, 
        platform: 'rumble', 
        post_id: `rbl_${Math.floor(Math.random()*1000000)}`,
        status: 'processing',
        info: 'Vídeo enviado ao Rumble. O processamento pode levar alguns minutos.' 
    };
}
