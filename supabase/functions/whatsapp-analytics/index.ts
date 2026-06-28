import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const userId = req.headers.get('x-user-id') || '';

    // Total messages
    const { count: total, error: err0 } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'whatsapp')
      .eq('user_id', userId);
    if (err0) throw err0;

    // By status
    const statuses = ['draft', 'scheduled', 'sent', 'failed', 'received'];
    const byStatus: Record<string, number> = {};
    for (const s of statuses) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('platform', 'whatsapp')
        .eq('user_id', userId)
        .eq('status', s);
      byStatus[s] = count || 0;
    }

    // Bot vs human
    const { count: botCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'whatsapp')
      .eq('user_id', userId)
      .eq('metadata->>bot_reply', 'true');

    const { count: humanCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'whatsapp')
      .eq('user_id', userId)
      .or('metadata->>bot_reply.eq.false,metadata->>bot_reply.is.null');

    // Conversations (unique recipient_phone)
    const { data: convos } = await supabase
      .from('messages')
      .select('recipient_phone')
      .eq('platform', 'whatsapp')
      .eq('user_id', userId)
      .not('recipient_phone', 'is', null);

    const uniqueConversations = new Set((convos || []).map(c => c.recipient_phone));

    // Botzap: responded conversations (bot sent + human received)
    const { data: repliedPhones } = await supabase
      .from('messages')
      .select('recipient_phone')
      .eq('platform', 'whatsapp')
      .eq('user_id', userId)
      .eq('metadata->>bot_reply', 'true')
      .not('recipient_phone', 'is', null);
    const botPhones = new Set((repliedPhones || []).map(r => r.recipient_phone));
    const respondedPhones = [...uniqueConversations].filter(p => botPhones.has(p));

    // Botzap: system messages pending deletion
    const { count: pendingDelete } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'whatsapp')
      .eq('user_id', userId)
      .eq('metadata->>is_system_log', 'true');

    return new Response(JSON.stringify({
      total: total || 0,
      byStatus,
      bySender: { bot: botCount || 0, human: humanCount || 0 },
      conversations: uniqueConversations.size,
      botzap: {
        enviadas: botCount || 0,
        respondidas: respondedPhones.length,
        apagadas: pendingDelete || 0,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
