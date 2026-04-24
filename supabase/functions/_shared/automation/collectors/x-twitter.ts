// Coletor real X/Twitter. Sem fallback de mock.
export async function collectXIntelligence(supabaseClient: any, userId: string) {
  const trends: any[] = [];

  try {
    const { data: creds } = await supabaseClient
      .from('api_credentials')
      .select('credentials')
      .eq('user_id', userId)
      .eq('platform', 'twitter')
      .maybeSingle();

    const { data: conn } = await supabaseClient
      .from('social_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('platform', 'twitter')
      .eq('is_connected', true)
      .maybeSingle();

    const bearer =
      creds?.credentials?.bearer_token ||
      creds?.credentials?.bearerToken ||
      conn?.access_token;

    if (!bearer) return [];

    // WOEID 23424768 = Brasil
    const res = await fetch('https://api.twitter.com/1.1/trends/place.json?id=23424768', {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.[0]?.trends || [];
    for (const t of items.slice(0, 15)) {
      trends.push({
        keyword: t.name,
        source: 'X-Twitter',
        sub_source: 'Trending Topics',
        category: 'Tendências',
        score: Math.min(100, Math.floor((t.tweet_volume || 0) / 1000)),
        url: t.url,
        metadata: { tweet_volume: t.tweet_volume, promoted: !!t.promoted_content },
      });
    }
  } catch (err) {
    console.error('[XCollector] Error:', err);
  }

  return trends;
}
