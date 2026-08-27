export async function monitorPoliticalTrends(supabaseClient: any) {
  const trendsToInsert: any[] = [];

  try {
    // 1. Buscando via Google News RSS (Políticas/Eleições)
    const rssRes = await fetch('https://news.google.com/rss/search?q=politica+OR+eleicoes+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419');
    if (rssRes.ok) {
      const xml = await rssRes.text();
      // Extrai os títulos das notícias
      const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)]
        .map(match => match[1].replace('<![CDATA[', '').replace(']]>', '').trim())
        .filter(t => t && !t.includes('Google News'));

      const topNews = titles.slice(0, 5);
      for (const title of topNews) {
        // Sentimento baseado em palavras-chave reais (análise simples, não IA)
        let sentiment = 'mixed';
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('crise') || lowerTitle.includes('cai') || lowerTitle.includes('baixa') || lowerTitle.includes('protest')) sentiment = 'negative';
        if (lowerTitle.includes('avança') || lowerTitle.includes('aprova') || lowerTitle.includes('alta') || lowerTitle.includes('cresce')) sentiment = 'positive';

        trendsToInsert.push({
          keyword: title.substring(0, 100),
          mentions: 0, // Google News RSS não fornece contagem de menções — dados reais requerem API de social listening
          sentiment: sentiment,
          velocity: 0, // Dados reais requerem API de trending topics (Twitter/X, Google Trends)
          source: 'Google News',
          category: 'Política',
          detected_at: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error("Error fetching Political Trends:", err);
  }

  // Se não houver dados reais, retorna sem poluir o banco
  if (trendsToInsert.length === 0) {
    return { success: false, count: 0, reason: 'No political trends data available from RSS' };
  }

  for (const trend of trendsToInsert) {
    await supabaseClient.from('political_trends').insert(trend);
  }

  return { success: true, count: trendsToInsert.length };
}
