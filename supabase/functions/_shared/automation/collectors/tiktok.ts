// Coletor real TikTok. Sem mocks — retorna [] se não há credencial ou se a API não responde.
export async function collectTikTokIntelligence(supabaseClient: any, userId: string) {
  const trends: any[] = [];

  try {
    const { data: conn } = await supabaseClient
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'tiktok')
      .eq('is_connected', true)
      .maybeSingle();

    if (!conn?.access_token) return [];

    // Busca vídeos recentes do usuário
    const res = await fetch(
      'https://open.tiktokapis.com/v2/video/list/?fields=id,title,view_count,like_count,comment_count,share_count,create_time,share_url,cover_image_url',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_count: 20 }),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();

    for (const video of (data.data?.videos || [])) {
      const score = (video.view_count || 0) + (video.like_count || 0) * 2 + (video.comment_count || 0) * 3;
      if (video.title && score > 0) {
        trends.push({
          keyword: video.title.substring(0, 100),
          source: 'TikTok',
          sub_source: conn.username || 'Conta TikTok',
          category: 'Vídeo',
          score,
          url: video.share_url,
          thumbnail_url: video.cover_image_url,
          metadata: {
            views: video.view_count,
            likes: video.like_count,
            comments: video.comment_count,
            shares: video.share_count,
            posted_at: video.create_time ? new Date(video.create_time * 1000).toISOString() : null,
          },
        });
      }
    }
  } catch (err) {
    console.error('[TikTokCollector] Error:', err);
  }

  return trends;
}
