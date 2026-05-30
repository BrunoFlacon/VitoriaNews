export async function generateContent(supabaseClient: any, trendId: string) {
  try {
    const { data: trend, error: trendError } = await supabaseClient
      .from('trends')
      .select('title, description, platform, metadata')
      .eq('id', trendId)
      .single();

    if (trendError || !trend) {
      console.warn(`[CONTENT-GENERATOR] Trend ${trendId} not found:`, trendError);
      return { success: false, error: `Trend ${trendId} not found` };
    }

    const trendTitle = trend.title || "Tendência";
    const trendDesc = trend.description || "";
    const trendPlatform = trend.platform || "x";

    const templates = [
      `O que acham dessa tendência? "${trendTitle}" — será que vale a pena investir? 🚀`,
      `🔥 "${trendTitle}" está bombando! Vamos discutir?`,
      `Sobre "${trendTitle}": ${trendDesc ? trendDesc.substring(0, 120) : 'vem forte por aí'}`
    ];
    const content = templates[Math.floor(Math.random() * templates.length)];

    const generated = {
      trend_id: trendId,
      content,
      platform: trendPlatform,
      tone: "viral",
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from('ai_generated_posts')
      .insert([generated])
      .select();

    return { success: !error, data, error };
  } catch (err) {
    console.error(`[CONTENT-GENERATOR] Error generating content for trend ${trendId}:`, err);
    return { success: false, error: String(err) };
  }
}
