export async function detectViralCampaigns(supabaseClient: any) {
  // STUB: Detecção de campanhas virais requer:
  // - Análise de velocidade de posts (post velocity)
  // - Detecção de propagação cross-platform
  // - Detecção de spikes de engajamento
  // - Dados reais das tabelas analytics_posts e post_metrics
  // NÃO inserimos dados falsos — retornamos vazio até implementação real.
  
  console.log('[campaign-detector] Stub: Viral campaign detection not yet implemented. Skipping.');
  return { success: true, detected: 0, reason: 'Campaign detection requires real-time analytics pipeline — not yet implemented' };
}
