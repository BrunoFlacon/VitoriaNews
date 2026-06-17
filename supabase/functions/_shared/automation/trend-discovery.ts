import { getPlatformCredentials } from '../credentials.ts';

declare const Deno: any;

// URLs de busca por rede social
const SOCIAL_SEARCH_URLS: Record<string, (kw: string) => string> = {
  'X / Twitter':  (kw) => `https://twitter.com/search?q=${encodeURIComponent(kw)}&src=trend_click`,
  'Instagram':    (kw) => `https://www.instagram.com/explore/tags/${encodeURIComponent(kw.replace(/^#/, '').replace(/\s+/g, ''))}`,
  'TikTok':       (kw) => `https://www.tiktok.com/tag/${encodeURIComponent(kw.replace(/^#/, '').replace(/\s+/g, ''))}`,
  'Facebook':     (kw) => `https://www.facebook.com/search/top?q=${encodeURIComponent(kw)}`,
  'Threads':      (kw) => `https://www.threads.net/search?q=${encodeURIComponent(kw)}`,
  'YouTube':      (kw) => `https://www.youtube.com/results?search_query=${encodeURIComponent(kw)}`,
  'LinkedIn':     (kw) => `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(kw)}`,
  'Pinterest':    (kw) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(kw)}`,
  'WhatsApp':     (kw) => `https://api.whatsapp.com/send?text=${encodeURIComponent(kw)}`,
};

async function fetchCreds(supabaseClient: any, platform: string): Promise<Record<string, string>> {
  try {
    const { data } = await supabaseClient
      .from('api_credentials')
      .select('credentials')
      .eq('platform', platform)
      .limit(1)
      .maybeSingle();
    return data?.credentials || {};
  } catch {
    return {};
  }
}

import { collectMetaIntelligence } from './collectors/meta.ts';
import { collectGoogleIntelligence } from './collectors/google.ts';
import { collectTikTokIntelligence } from './collectors/tiktok.ts';
import { collectAlternativeIntelligence } from './collectors/alt-social.ts';
import { monitorPoliticalTrends } from '../radar/political-trends.ts';

export async function discoverTrends(supabaseClient: any, userId?: string) {
  const allTrends: any[] = [];
  let trendsCount = 0;

  // Se userId não for informado, pegamos o primeiro usuário logado ou rodamos globalmente
  // Para fins de automação, muitas vezes rodamos para todos os usuários com conexões
  const targetUserId = userId || (await supabaseClient.auth.getUser())?.data?.user?.id;

  if (!targetUserId) {
    console.error('[discoverTrends] No user ID provided or found');
    return { success: false, error: 'No user ID' };
  }

  // 1. Coleta Unificada
  const metaTrends = await collectMetaIntelligence(supabaseClient, targetUserId);
  const googleTrends = await collectGoogleIntelligence(supabaseClient, targetUserId);
  const tikTokTrends = await collectTikTokIntelligence(supabaseClient, targetUserId);
  const altTrends = await collectAlternativeIntelligence(supabaseClient, targetUserId);

  allTrends.push(...metaTrends, ...googleTrends, ...tikTokTrends, ...altTrends);

  // 2. Coleta de Notícias (NewsAPI como Fonte Principal)
  try {
    const { data: newsApiData } = await supabaseClient.from('api_credentials').select('credentials').eq('platform', 'newsapi').maybeSingle();
    const newsApiKey = newsApiData?.credentials?.api_key || '';

    if (newsApiKey) {
      console.log('[discoverTrends] Fetching from NewsAPI...');
      const res = await fetch(`https://newsapi.org/v2/top-headlines?country=br&pageSize=20&apiKey=${newsApiKey}`);
      if (res.ok) {
        const json = await res.json();
        for (const article of (json.articles || [])) {
          allTrends.push({
            keyword: article.title.substring(0, 100),
            source: article.source?.name || 'Notícias',
            sub_source: 'NewsAPI',
            category: 'Geral',
            url: article.url,
            thumbnail_url: article.urlToImage,
            description: article.description,
            score: 85,
            metadata: { 
              published_at: article.publishedAt,
              author: article.author,
              content_snippet: article.content ? article.content.substring(0, 200) : null
            }
          });
        }
      }
    }
  } catch (e) { console.error('[discoverTrends] NewsAPI failed:', e); }

  // 3. Sincronizar Radar Político / Geopolítico
  try {
    console.log('[discoverTrends] Monitoring Political Trends...');
    await monitorPoliticalTrends(supabaseClient);
  } catch (e) { console.error('[discoverTrends] Political monitoring failed:', e); }

  // 3. Salvar no banco
  for (const trend of allTrends) {
    try {
      const { error } = await supabaseClient.from('trends').insert({
        user_id: targetUserId,
        keyword: trend.keyword,
        source: trend.source,
        sub_source: trend.sub_source || null,
        category: trend.category,
        score: trend.score || 0,
        url: trend.url || null,
        thumbnail_url: trend.thumbnail_url || null,
        description: trend.description || null,
        metadata: trend.metadata || {},
        detected_at: new Date().toISOString(),
      });
      if (!error) trendsCount++;
    } catch (e) {
      console.error('[discoverTrends] Insert error:', e);
    }
  }

  console.log(`[discoverTrends] Concluído. Inserido: ${trendsCount}/${allTrends.length}`);
  return { success: true, count: trendsCount };
}
