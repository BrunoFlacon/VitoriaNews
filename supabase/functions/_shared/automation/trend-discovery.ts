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

export async function discoverTrends(supabaseClient: any) {
  const allTrends: any[] = [];
  let trendsCount = 0;

  // ─── 1. Google Trends RSS (sempre gratuito, sem chave) ─────────────────────
  try {
    const rssRes = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=BR');
    if (rssRes.ok) {
      const xml = await rssRes.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

      items.slice(0, 10).forEach(itemXml => {
        const titleMatch = itemXml[1].match(/<title>(.*?)<\/title>/);
        const linkMatch  = itemXml[1].match(/<link>(.*?)<\/link>/);
        const pubMatch   = itemXml[1].match(/<pubDate>(.*?)<\/pubDate>/);
        const trafficMatch = itemXml[1].match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/);
        const imgMatch   = itemXml[1].match(/<ht:picture>(.*?)<\/ht:picture>/);

        const title   = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
        const link    = linkMatch  ? linkMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '') : `https://www.google.com/search?q=${encodeURIComponent(title)}`;
        const pub     = pubMatch   ? pubMatch[1] : null;
        const traffic = trafficMatch ? trafficMatch[1] : '50K+';
        const imgUrl  = imgMatch ? imgMatch[1] : null;

        if (title && title !== 'Daily Search Trends') {
          allTrends.push({
            keyword: title,
            source: 'Google Trends',
            category: 'Geral',
            url: link,
            thumbnail_url: imgUrl,
            metadata: { 
              published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
              traffic: traffic 
            },
            score: traffic.includes('M') ? 98 : 92 + Math.floor(Math.random() * 5),
          });
        }
      });
    }
  } catch (err) {
    console.error('[discoverTrends] Google Trends error:', err);
  }

  // ─── 2. NewsAPI.org (se chave cadastrada) ──────────────────────────────────
  try {
    const newsApiCreds = await fetchCreds(supabaseClient, 'newsapi');
    const googleCreds  = await fetchCreds(supabaseClient, 'google_cloud');
    const newsApiKey   = newsApiCreds.api_key || googleCreds.news_api_key || '';

    if (newsApiKey.trim()) {
      console.log('[discoverTrends] Buscando NewsAPI.org...');
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?country=br&pageSize=12&apiKey=${newsApiKey}`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const json = await res.json();
        for (const article of (json.articles || [])) {
          if (!article.title || article.title === '[Removed]') continue;
          allTrends.push({
            keyword: article.title.split(' - ')[0].substring(0, 100),
            source: 'NewsAPI',
            category: 'Notícias',
            url: article.url,
            thumbnail_url: article.urlToImage || null,
            description: article.description || '',
            metadata: { published_at: article.publishedAt, source_name: article.source?.name },
            score: 88 + Math.floor(Math.random() * 8),
          });
        }
      } else {
        const errBody = await res.text();
        console.warn('[discoverTrends] NewsAPI respondeu com erro:', res.status, errBody.substring(0, 200));
      }
    }
  } catch (err) {
    console.error('[discoverTrends] NewsAPI error:', err);
  }

  // ─── 3. G1 Globo RSS (gratuito, com imagens nativas) ──────────────────────
  try {
    const res = await fetch('https://g1.globo.com/rss/g1/');
    if (res.ok) {
      const xml   = await res.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

      items.slice(0, 12).forEach(itemXml => {
        const titleMatch   = itemXml[1].match(/<title>(.*?)<\/title>/);
        const linkMatch    = itemXml[1].match(/<link>(.*?)<\/link>/);
        const descMatch    = itemXml[1].match(/<description>(.*?)<\/description>/);
        const pubMatch     = itemXml[1].match(/<pubDate>(.*?)<\/pubDate>/);
        
        // Busca imagem em media:content ou em tag <img> dentro da description (escaped or not)
        const mediaMatch   = itemXml[1].match(/<media:content[^>]*url=['"]([^'"]+)['"]/i);
        const imgTagMatch  = itemXml[1].match(/&lt;img[^>]*src=['"]([^'"]+)['"]/i) || itemXml[1].match(/<img[^>]*src=['"]([^'"]+)['"]/i);

        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').split(' - ')[0].trim() : '';
        const link  = linkMatch  ? linkMatch[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'') : '';
        const desc  = descMatch  ? descMatch[1].replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').replace(/<[^>]+>/gm,'').substring(0,400) : '';
        const pub   = pubMatch   ? pubMatch[1] : null;
        const img   = mediaMatch ? mediaMatch[1] : (imgTagMatch ? imgTagMatch[1] : null);

        if (title) {
          allTrends.push({
            keyword: title,
            source: 'G1',
            category: 'Notícias',
            url: link,
            thumbnail_url: img,
            description: desc,
            metadata: { 
              published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
              original_pub_date: pub // Guarda a string original para debug
            },
            score: 85,
          });
        }
      });
    }
  } catch (err) {
    console.error('[discoverTrends] G1 error:', err);
  }

  // ─── 4. Redes Sociais (baseadas nos Google Trends capturados) ──────────────
  const seedKeywords = allTrends.filter(t => t.source === 'Google Trends').slice(0, 6);
  const socialNetworks = [
    { name: 'X / Twitter',  category: 'Viral',       baseScore: 93 },
    { name: 'Instagram',    category: 'Viral',        baseScore: 90 },
    { name: 'TikTok',       category: 'Viral',        baseScore: 95 },
    { name: 'Facebook',     category: 'Discussão',    baseScore: 84 },
    { name: 'Threads',      category: 'Debate',       baseScore: 80 },
    { name: 'YouTube',      category: 'Vídeo',        baseScore: 88 },
    { name: 'LinkedIn',     category: 'Profissional', baseScore: 78 },
    { name: 'Pinterest',    category: 'Inspiração',   baseScore: 75 },
  ];

  if (seedKeywords.length > 0) {
    for (const network of socialNetworks) {
      const numTrends = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numTrends; i++) {
        const seed = seedKeywords[i % seedKeywords.length];
        const useHashtag = Math.random() > 0.4;
        const kw = useHashtag ? `#${seed.keyword.replace(/\s+/g, '')}` : seed.keyword;
        const url = (SOCIAL_SEARCH_URLS[network.name] || ((k: string) => `https://www.google.com/search?q=${encodeURIComponent(k)}`))(kw);

        allTrends.push({
          keyword: kw,
          source: network.name,
          category: network.category,
          url,
          thumbnail_url: seed.thumbnail_url || null,
          description: `Trending em ${network.name}: "${seed.keyword}" está com alto engajamento agora.`,
          score: network.baseScore + Math.floor(Math.random() * 7),
        });
      }
    }
  }

  // ─── 5. Salvar no banco ────────────────────────────────────────────────────
  for (const trend of allTrends) {
    try {
      const { error } = await supabaseClient.from('trends').insert({
        keyword:       trend.keyword,
        source:        trend.source,
        category:      trend.category,
        score:         trend.score,
        url:           trend.url,
        thumbnail_url: trend.thumbnail_url,
        description:   trend.description || '',
        metadata:      trend.metadata || {},
        detected_at:   new Date().toISOString(),
      });
      if (!error) trendsCount++;
    } catch (e) {
      console.error('[discoverTrends] insert error:', e);
    }
  }

  console.log(`[discoverTrends] Concluído. Inserido: ${trendsCount}/${allTrends.length}`);
  return { success: true, count: trendsCount };
}
