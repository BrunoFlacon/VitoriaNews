
async function forceSyncAll() {
  console.log('🚀 Iniciando Sincronização Forçada de Analytics...');
  
  const platforms = ['social', 'twitter', 'telegram', 'meta-ads', 'youtube', 'google-analytics'];
  
  for (const p of platforms) {
    console.log(`📡 Sincronizando: ${p}...`);
    try {
      const functionName = p === 'social' ? 'collect-social-analytics' : 
                          p === 'twitter' ? 'sync-twitter' :
                          p === 'telegram' ? 'sync-telegram-chats' :
                          `collect-${p}`;
      
      // Chamar via Supabase Client (assumindo que está no escopo ou via fetch)
      // No Lovable/React, podemos usar o hook, mas aqui vamos simular a chamada
      const { data, error } = await window.supabase.functions.invoke(functionName);
      
      if (error) console.error(`❌ Erro em ${p}:`, error);
      else console.log(`✅ ${p} sincronizado!`, data);
    } catch (e) {
      console.error(`💥 Falha crítica em ${p}:`, e);
    }
  }
  
  console.log('✨ Processo concluído! Recarregue a página para ver os resultados.');
}

forceSyncAll();
