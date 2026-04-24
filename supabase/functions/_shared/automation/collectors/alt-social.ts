// Coletor real de plataformas alternativas. Apenas Reddit (público); sem mocks.
export async function collectAlternativeIntelligence(_supabaseClient: any, _userId: string) {
  const trends: any[] = [];

  try {
    const res = await fetch('https://www.reddit.com/r/popular.json?limit=10', {
      headers: { 'User-Agent': 'VitoriaNet/1.0' },
    });
    if (res.ok) {
      const json = await res.json();
      for (const post of (json.data?.children || [])) {
        const d = post.data;
        trends.push({
          keyword: (d.title || '').substring(0, 100),
          source: 'Reddit',
          sub_source: d.subreddit_name_prefixed,
          category: 'Discussão',
          score: Math.min(100, Math.floor((d.ups || 0) / 100)),
          url: `https://reddit.com${d.permalink}`,
          thumbnail_url: d.thumbnail && d.thumbnail.startsWith('http') ? d.thumbnail : null,
          metadata: { ups: d.ups, num_comments: d.num_comments },
        });
      }
    }
  } catch (e) {
    console.warn('[AltSocialCollector] Reddit failed:', e);
  }

  return trends;
}
