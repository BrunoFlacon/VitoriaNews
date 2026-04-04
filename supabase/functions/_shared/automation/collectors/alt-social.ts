export async function collectAlternativeIntelligence(supabaseClient: any, userId: string) {
  console.log(`[AltSocialCollector] Starting collection for user: ${userId}`);
  
  const trends: any[] = [];

  try {
    // 1. Reddit Trending (via /r/popular or specific subs)
    try {
      const res = await fetch('https://www.reddit.com/r/popular.json?limit=5');
      if (res.ok) {
        const json = await res.json();
        json.data.children.forEach((post: any) => {
          trends.push({
            keyword: post.data.title.substring(0, 80),
            source: 'Reddit',
            sub_source: post.data.subreddit_name_prefixed,
            category: 'Discussão',
            score: 75,
            metadata: { ups: post.data.ups, num_comments: post.data.num_comments }
          });
        });
      }
    } catch (e) {
      console.warn('[AltSocialCollector] Reddit failed:', e);
    }

    // 2. Alternative Platforms mock (Kwai, Rumble, Gettr, Truth Social)
    // These would normally require scraping or specialized unofficial APIs
    
    trends.push({
      keyword: "Viral Challenge BR",
      source: "Kwai",
      sub_source: "Hot",
      category: "Vídeo",
      score: 90,
      metadata: { region: "Brazil" }
    });

    trends.push({
      keyword: "Political Debate Live",
      source: "Rumble",
      sub_source: "Live",
      category: "Política",
      score: 85,
      metadata: { viewers: 5000 }
    });

  } catch (err) {
    console.error('[AltSocialCollector] Error:', err);
  }

  return trends;
}
