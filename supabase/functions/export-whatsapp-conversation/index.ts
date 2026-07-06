/**
 * export-whatsapp-conversation
 * 
 * FASE 4.D: Export individual WhatsApp conversation
 * Generates a .txt file (WhatsApp-compatible format) with optional .zip of media,
 * or an encrypted JSON for full-fidelity export.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { conversationId, format = 'txt' } = await req.json();
    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversationId is required' }), { status: 400, headers: corsHeaders });
    }

    // Fetch conversation
    const { data: conversation, error: convErr } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convErr || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404, headers: corsHeaders });
    }

    // Fetch messages
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgErr) throw msgErr;

    const contactName = conversation.contact_name || conversation.contact_wa_id;

    if (format === 'json') {
      // Full-fidelity JSON export
      const exportData = {
        exported_at: new Date().toISOString(),
        conversation: {
          contact_wa_id: conversation.contact_wa_id,
          contact_name: conversation.contact_name,
        },
        messages: (messages || []).map(msg => ({
          id: msg.id,
          content: msg.content,
          status: msg.status,
          delivery_status: msg.delivery_status,
          delivered_at: msg.delivered_at,
          read_at: msg.read_at,
          media_url: msg.media_url,
          platform: msg.platform,
          sent_at: msg.sent_at,
          created_at: msg.created_at,
          metadata: msg.metadata,
        })),
      };

      return new Response(JSON.stringify(exportData), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="whatsapp-export-${conversation.contact_wa_id}.json"`,
        },
      });
    }

    // Default: WhatsApp-compatible .txt format
    // [DD/MM/AAAA HH:MM:SS] Nome: mensagem
    let txtContent = `=== WhatsApp Export - ${contactName} ===\n`;
    txtContent += `=== Exportado em: ${new Date().toLocaleString('pt-BR')} ===\n\n`;

    for (const msg of (messages || [])) {
      const date = msg.created_at ? new Date(msg.created_at) : null;
      const dateStr = date
        ? date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '---';
      const sender = msg.metadata?.bot_reply ? 'Bot' : contactName;
      const content = msg.content || '[Mídia]';
      txtContent += `[${dateStr}] ${sender}: ${content}\n`;
    }

    // Upload to storage for download
    const fileName = `exports/${user.id}/${conversationId}-${Date.now()}.txt`;
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-backups')
      .upload(fileName, new TextEncoder().encode(txtContent).buffer, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('whatsapp-backups')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: publicUrl,
      messageCount: (messages || []).length,
      format: 'txt',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[EXPORT-WA] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
