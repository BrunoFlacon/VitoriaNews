// Coletor real de mensageria. Deriva trends de canais reais cadastrados em messaging_channels.
export async function collectMessagingIntelligence(supabaseClient: any, userId: string) {
  const trends: any[] = [];

  try {
    const { data: channels } = await supabaseClient
      .from('messaging_channels')
      .select('*')
      .eq('user_id', userId);

    if (!channels || channels.length === 0) return [];

    // Top canais por número de membros
    const sorted = [...channels].sort((a, b) => (b.members_count || 0) - (a.members_count || 0));
    for (const ch of sorted.slice(0, 10)) {
      if ((ch.members_count || 0) === 0) continue;
      trends.push({
        keyword: ch.channel_name,
        source: ch.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram',
        sub_source: ch.channel_type || 'group',
        category: 'Mensageria',
        score: Math.min(100, Math.floor((ch.members_count || 0) / 10)),
        metadata: {
          members: ch.members_count,
          online: ch.online_count || 0,
          channel_id: ch.channel_id,
        },
      });
    }
  } catch (err) {
    console.error('[MessagingCollector] Error:', err);
  }

  return trends;
}
