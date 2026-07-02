import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-days, x-connection-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function applyFilters(q: any, userId: string, since: string | null, connectionId?: string | null) {
  q = q.eq('platform', 'whatsapp').eq('user_id', userId);
  if (since) q = q.or(`sent_at.gte.${since},and(sent_at.is.null,created_at.gte.${since})`);
  if (connectionId) q = q.eq('metadata->>connection_id', connectionId);
  return q;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id') || req.headers.get('x-user-id') || '';
    const daysParam = url.searchParams.get('days') || req.headers.get('x-days') || '';
    const days = daysParam ? parseInt(daysParam, 10) : null;
    const connectionId = url.searchParams.get('connection_id') || req.headers.get('x-connection-id') || null;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;

    // Status + bot_reply
    const { data: statusData, error: err1 } = await applyFilters(
      supabase.from('messages').select('status, metadata->>bot_reply'),
      userId, since, connectionId
    );

    if (err1) throw err1;

    const byStatus: Record<string, number> = { draft: 0, scheduled: 0, sent: 0, failed: 0, received: 0 };
    let botCount = 0;
    let humanCount = 0;

    for (const row of statusData || []) {
      const s = row.status || 'unknown';
      byStatus[s] = (byStatus[s] || 0) + 1;
      if (row.bot_reply === 'true') botCount++;
      else humanCount++;
    }

    // Unique contacts
    const { data: phones, error: err2 } = await applyFilters(
      supabase.from('messages').select('recipient_phone'),
      userId, since, connectionId
    ).not('recipient_phone', 'is', null);

    if (err2) throw err2;
    const uniquePhones = new Set((phones || []).map(c => c.recipient_phone));

    // Bot-replied conversations
    const { data: botPhones, error: err3 } = await applyFilters(
      supabase.from('messages').select('recipient_phone'),
      userId, since, connectionId
    ).eq('metadata->>bot_reply', 'true').not('recipient_phone', 'is', null);

    if (err3) throw err3;
    const botPhoneSet = new Set((botPhones || []).map(r => r.recipient_phone));
    const respondedPhones = [...uniquePhones].filter(p => botPhoneSet.has(p));

    // System logs pending
    const { count: pendingDelete, error: err4 } = await applyFilters(
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      userId, since, connectionId
    ).eq('metadata->>is_system_log', 'true');

    if (err4) throw err4;

    // Messages per connection
    const { data: connData, error: err5 } = await applyFilters(
      supabase.from('messages').select('metadata->>connection_id'),
      userId, since, connectionId
    );

    if (err5) throw err5;

    const byConnection: Record<string, number> = {};
    for (const row of connData || []) {
      const cid = row.connection_id || 'unknown';
      byConnection[cid] = (byConnection[cid] || 0) + 1;
    }

    // Recent messages for display
    const { data: recentMessages, error: err6 } = await applyFilters(
      supabase.from('messages').select('id, content, status, created_at, recipient_phone, metadata'),
      userId, null, connectionId  // no date filter for recent messages
    ).order('created_at', { ascending: false }).limit(20);

    if (err6) throw err6;

    const total = statusData?.length || 0;
    const responseRate = humanCount > 0 ? Math.round((botCount / (botCount + humanCount)) * 100) : 0;

    return new Response(JSON.stringify({
      total,
      period: days ? `${days}d` : 'all',
      byStatus,
      bySender: { bot: botCount, human: humanCount },
      conversations: uniquePhones.size,
      responseRate,
      botzap: {
        enviadas: botCount,
        respondidas: respondedPhones.length,
        apagadas: pendingDelete || 0,
      },
      byConnection,
      recentMessages: (recentMessages || []).map(m => ({
        id: m.id,
        content: m.content?.substring(0, 200),
        status: m.status,
        created_at: m.created_at,
        recipient_phone: m.recipient_phone,
        is_bot: m.metadata?.bot_reply === true || m.metadata?.bot_reply === 'true',
      })),
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
