import { PublishPayload } from './dispatcher.ts';

/**
 * Google News: Não existe API pública para publicação direta.
 * O Google News é um agregador — publicadores submetem via RSS/Atom feeds ou Publisher Center.
 * Esta função retorna erro claro indicando que a integração real requer configuração externa.
 */
export async function publishToGoogleNews(supabase: any, payload: PublishPayload): Promise<any> {
    return {
        success: false,
        platform: 'googlenews',
        error: 'Google News não possui API de publicação direta. Requer submissão via RSS feed ou Publisher Center.',
        unsupported: true,
    };
}
