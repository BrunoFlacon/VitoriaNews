import { createClient } from '@supabase/supabase-js';

// Interface para organizar os dados das contas
interface XAccountStats {
  username: string;
  display_name: string;
  profile_image: string;
  followers_count: number;
  tweet_count: number;
}

export async function collectXIntelligence(supabaseClient: any, userId: string) {
  const finalReport = {
    trends: [] as any[],
    accounts_stats: [] as XAccountStats[],
  };

  try {
    // 1. Buscar TODAS as contas conectadas do usuário
    const { data: connections, error: connError } = await supabaseClient
      .from('social_connections')
      .select('id, access_token, platform_user_id')
      .eq('user_id', userId)
      .eq('platform', 'twitter')
      .eq('is_connected', true);

    if (connError || !connections || connections.length === 0) {
      console.warn('Nenhuma conta do X conectada encontrada.');
      return finalReport;
    }

    // Usaremos a primeira conta válida para buscar Trends (Trends são globais/regionais)
    const primaryToken = connections[0].access_token;

    // 2. BUSCAR TRENDING TOPICS (Brasil)
    // Nota: API v2 usa endpoints diferentes, mas o v1.1 ainda funciona para Trends em algumas chaves
    const trendsRes = await fetch('https://api.twitter.com/1.1/trends/place.json?id=23424768', {
      headers: { Authorization: `Bearer ${primaryToken}` },
    });

    if (trendsRes.ok) {
      const trendsData = await trendsRes.json();
      const items = trendsData?.[0]?.trends || [];
      finalReport.trends = items.slice(0, 15).map((t: any) => ({
        keyword: t.name,
        source: 'X-Twitter',
        score: Math.min(100, Math.floor((t.tweet_volume || 0) / 1000)),
        metadata: { tweet_volume: t.tweet_volume },
      }));
    }

    // 3. MONITORAR E BUSCAR ANALYTICS DE MÚLTIPLAS CONTAS
    for (const conn of connections) {
      const token = decodeURIComponent(conn.access_token);
      const userRes = await fetch(`https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url,description`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (userRes.ok) {
        const userData = await userRes.json();
        const user = userData.data;

        finalReport.accounts_stats.push({
          username: user.username,
          display_name: user.name,
          profile_image: user.profile_image_url,
          followers_count: user.public_metrics.followers_count,
          tweet_count: user.public_metrics.tweet_count,
        });

        // Inserção no histórico de analytics (Data Science)
        await supabaseClient.from('social_analytics').insert({
          user_id: userId,
          platform: 'twitter',
          platform_user_id: user.id,
          username: user.username,
          display_name: user.name,
          profile_image_url: user.profile_image_url,
          followers_count: user.public_metrics.followers_count,
          following_count: user.public_metrics.following_count,
          posts_count: user.public_metrics.tweet_count,
          raw_data: user // Salva tudo para futuras análises
        });

        // Atualiza também a tabela de conexões para ter a foto e dados mais recentes no Dashboard
        await supabaseClient.from('social_connections')
          .update({
            last_sync: new Date(),
            metadata: {
              photo: user.profile_image_url,
              followers: user.public_metrics.followers_count,
              posts_count: user.public_metrics.tweet_count
            }
          })
          .eq('platform_user_id', user.id);
      }
    }

  } catch (err) {
    console.error('[XCollector] Erro Crítico:', err);
  }

  return finalReport;
}

/**
 * FUNÇÃO PARA PUBLICAR POSTS (TEXTO + LINKS)
 * Ideal para o fluxo de "Pauta Aprovada" que definimos.
 */
export async function postToX(accessToken: string, content: string) {
  try {
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content }),
    });

    return await res.json();
  } catch (err) {
    console.error('[XPublisher] Erro ao postar:', err);
    return null;
  }
}