// Coletor real Meta (Facebook/Instagram). Sem mocks — retorna [] se não há credencial.
export async function collectMetaIntelligence(supabaseClient: any, userId: string) {
  const trends: any[] = [];

  try {
    const { data: connections } = await supabaseClient
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .in('platform', ['facebook', 'instagram'])
      .eq('is_connected', true);

    if (!connections || connections.length === 0) return [];

    for (const conn of connections) {
      if (!conn.access_token) continue;
      const pageId = conn.page_id || conn.platform_user_id;
      if (!pageId) continue;

      try {
        // Busca posts recentes da página
        const url = `https://graph.facebook.com/v21.0/${pageId}/posts?fields=message,created_time,shares,likes.summary(true),comments.summary(true),permalink_url,full_picture&limit=10&access_token=${conn.access_token}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();

        for (const post of (data.data || [])) {
          const likes = post.likes?.summary?.total_count || 0;
          const comments = post.comments?.summary?.total_count || 0;
          const shares = post.shares?.count || 0;
          const score = likes + (comments * 2) + (shares * 3);

          if (post.message && score > 0) {
            trends.push({
              keyword: post.message.substring(0, 100),
              source: conn.platform === 'instagram' ? 'Instagram' : 'Facebook',
              sub_source: conn.page_name || pageId,
              category: 'Engajamento',
              score,
              url: post.permalink_url,
              thumbnail_url: post.full_picture,
              metadata: { likes, comments, shares, posted_at: post.created_time }
            });
          }
        }
      } catch (e) {
        console.error(`[MetaCollector] Failed for ${conn.platform}:`, e);
      }
    }
  } catch (err) {
    console.error('[MetaCollector] Error:', err);
  }

  return trends;
}
