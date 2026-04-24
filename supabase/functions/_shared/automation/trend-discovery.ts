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

import { collectMetaIntelligence } from './collectors/meta.ts';
import { collectGoogleIntelligence } from './collectors/google.ts';
import { collectTikTokIntelligence } from './collectors/tiktok.ts';
import { collectAlternativeIntelligence } from './collectors/alt-social.ts';
import { collectXIntelligence } from './collectors/x-twitter.ts';
import { collectMessagingIntelligence } from './collectors/messaging.ts';
import { monitorPoliticalTrends } from '../radar/political-trends.ts';

export async function discoverTrends(supabaseClient: any, userId?: string) {
  const allTrends: any[] = [];
  let trendsCount = 0;

  const targetUserId = userId || (await supabaseClient.auth.getUser())?.data?.user?.id;

  if (!targetUserId) {
    console.error('[discoverTrends] No user ID provided or found');
    return { success: false, error: 'No user ID' };
  }

  // 1. Coleta em Redes Sociais
  console.log('[discoverTrends] Collecting from social networks...');
  const [metaTrends, googleIntell, tikTokTrends, altTrends, xTrends, msgTrends] = await Promise.all([
    collectMetaIntelligence(supabaseClient, targetUserId).catch(() => []),
    collectGoogleIntelligence(supabaseClient, targetUserId).catch(() => []),
    collectTikTokIntelligence(supabaseClient, targetUserId).catch(() => []),
    collectAlternativeIntelligence(supabaseClient, targetUserId).catch(() => []),
    collectXIntelligence(supabaseClient, targetUserId).catch(() => []),
    collectMessagingIntelligence(supabaseClient, targetUserId).catch(() => [])
  ]);

  allTrends.push(...metaTrends, ...googleIntell, ...tikTokTrends, ...altTrends, ...xTrends, ...msgTrends);

  // 2. Notícias em Tempo Real (NewsAPI - Fonte Principal)
  try {
    const { data: newsApiData } = await supabaseClient.from('api_credentials').select('credentials').eq('platform', 'newsapi').maybeSingle();
    const newsApiKey = newsApiData?.credentials?.api_key || newsApiData?.credentials?.apiKey || '';

    if (newsApiKey) {
      console.log('[discoverTrends] Fetching from NewsAPI...');
      // Buscando manchetes globais e do Brasil para dados reais
      const responses = await Promise.all([
        fetch(`https://newsapi.org/v2/top-headlines?country=br&pageSize=15&apiKey=${newsApiKey}`),
        fetch(`https://newsapi.org/v2/top-headlines?language=en&pageSize=15&apiKey=${newsApiKey}`),
        // Adicionando filtros de categorias solicitadas (Política, Tecnologia, Geral/Mundo)
        fetch(`https://newsapi.org/v2/everything?q=geopolitics%20OR%20politica&pageSize=10&apiKey=${newsApiKey}`),
        fetch(`https://newsapi.org/v2/everything?q=tecnologia%20OR%20tech&pageSize=10&apiKey=${newsApiKey}`)
      ]);

      for (const res of responses) {
        if (res.ok) {
          const json = await res.json();
          for (const article of (json.articles || [])) {
            allTrends.push({
              keyword: article.title.substring(0, 100),
              source: 'News',
              sub_source: article.source?.name || 'NewsAPI',
              category: 'Headline',
              url: article.url,
              thumbnail_url: article.urlToImage,
              description: article.description,
              score: 90,
              metadata: { 
                published_at: article.publishedAt,
                author: article.author,
                content_snippet: article.content ? article.content.substring(0, 200) : null
              }
            });
          }
        }
      }
    }
  } catch (e) { console.error('[discoverTrends] NewsAPI failed:', e); }

  // 3. Suporte Adicional a Google News & NewsAPI Enrichment
  try {
    const { data: newsApiData } = await supabaseClient.from('api_credentials').select('credentials').eq('platform', 'newsapi').maybeSingle();
    const newsApiKey = newsApiData?.credentials?.api_key || newsApiData?.credentials?.apiKey || '';

    if (newsApiKey) {
      console.log('[discoverTrends] Enriching trends with NewsAPI...');
      
      // Para cada tendência descoberta pelo Google, buscamos mais dados (foto, manchete rica) na NewsAPI
      const enrichPromises = googleIntell.slice(0, 5).map(async (trend: any) => {
        try {
          const res = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(trend.keyword)}&language=pt&sortBy=relevancy&pageSize=3&apiKey=${newsApiKey}`);
          if (res.ok) {
            const json = await res.json();
            const bestArticle = json.articles?.find((a: any) => a.urlToImage) || json.articles?.[0];
            
            if (bestArticle) {
              return {
                ...trend,
                keyword: bestArticle.title.substring(0, 100),
                thumbnail_url: bestArticle.urlToImage,
                description: bestArticle.description,
                url: bestArticle.url,
                score: trend.score || 85,
                metadata: {
                  ...trend.metadata,
                  enriched: true,
                  source_original: trend.source,
                  author: bestArticle.author,
                  published_at: bestArticle.publishedAt
                }
              };
            }
          }
        } catch (e) { console.error(`[discoverTrends] Enrichment failed for ${trend.keyword}:`, e); }
        return trend;
      });

      const enrichedGoogleTrends = await Promise.all(enrichPromises);
      
      // Substituir os originais pelos enriquecidos (ou manter se não houver melhora)
      enrichedGoogleTrends.forEach(enriched => {
        const idx = allTrends.findIndex(t => t.keyword === enriched.keyword || (enriched.metadata?.source_original === t.source && t.keyword === enriched.metadata?.keyword_original));
        if (idx !== -1) allTrends[idx] = enriched;
        else allTrends.push(enriched);
      });
    }
  } catch (e) { console.error('[discoverTrends] Enrichment block failed:', e); }

    // 4. Radar Político e Ataques
    try {
      console.log('[discoverTrends] Running political radar...');
      await monitorPoliticalTrends(supabaseClient);
      
      // Chamada interna para a nova Edge Function de Google Trends se estiver no ambiente Supabase
      // Isso garante que os dados mundiais e geopolíticos sejam capturados
      const baseUrl = Deno.env.get('SUPABASE_URL');
      if (baseUrl) {
          fetch(`${baseUrl}/functions/v1/collect-google-trends`, {
              headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` }
          }).catch(e => console.error('[discoverTrends] collect-google-trends trigger failed:', e));
      }
    } catch (e) { console.error('[discoverTrends] Political monitoring failed:', e); }

  // 5. Salvar no banco (Sem duplicatas por keyword no mesmo batch) usando UPSERT em massa
  const uniqueTrends = Array.from(new Map(allTrends.map(item => [item.keyword, item])).values());
  
  if (uniqueTrends.length > 0) {
    try {
      const trendsToInsert = uniqueTrends.map(trend => ({
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
      }));

      const { error } = await supabaseClient
        .from('trends')
        .upsert(trendsToInsert, { 
          onConflict: 'keyword',
          ignoreDuplicates: false 
        });

      if (error) throw error;
      trendsCount = uniqueTrends.length;
    } catch (e: any) {
      console.error('[discoverTrends] Bulk Upsert error:', e.message);
    }
  }

  console.log(`[discoverTrends] Concluído. Processados: ${trendsCount}/${uniqueTrends.length}`);
  return { success: true, count: trendsCount };
}
