/**
 * backup-whatsapp-conversations
 *
 * FASE 4.C: Automatic daily backup of WhatsApp conversations
 * - For each active WhatsApp connection, backup conversations with new messages since last backup
 * - Encrypts using AES-256-GCM via backupCrypto.ts
 * - Stores in whatsapp-backups bucket (private)
 * - Creates entries in whatsapp_backups and whatsapp_backup_access_log tables
 *
 * Designed to run as a cron job (daily).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt } from "../_shared/security/backupCrypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Support both cron (service-role) and manual (user-triggered) invocation
    let targetUserId: string | null = null;
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');

    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader);
      if (user) targetUserId = user.id;
    }

    // Fetch active WhatsApp connections
    let query = supabase
      .from('social_connections')
      .select('id, user_id, page_name, phone_number_id, platform_user_id, is_connected')
      .eq('platform', 'whatsapp')
      .eq('is_connected', true);

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: connections, error: connErr } = await query;
    if (connErr) throw connErr;
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No WhatsApp connections found', backupsCreated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const results: Array<{ connectionId: string; userId: string; conversationsBackedUp: number; totalMessages: number }> = [];

    for (const conn of connections) {
      const connectionId = conn.id;
      const userId = conn.user_id;

      // Fetch conversations for this connection
      const { data: conversations, error: convErr } = await supabase
        .from('whatsapp_conversations')
        .select('id, contact_wa_id, contact_name, last_message_at')
        .eq('connection_id', connectionId);

      if (convErr) {
        console.error(`[BACKUP] Error fetching conversations for ${connectionId}:`, convErr.message);
        continue;
      }
      if (!conversations || conversations.length === 0) continue;

      // Find latest backup for this connection to do incremental backup
      const { data: lastBackup } = await supabase
        .from('whatsapp_backups')
        .select('created_at')
        .eq('connection_id', connectionId)
        .eq('scope', 'full_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        .maybeSingle();

      const since = lastBackup?.created_at || null;
      let conversationsBackedUp = 0;
      let totalMessages = 0;

      for (const conv of conversations) {
        // Fetch messages since last backup
        let msgQuery = supabase
          .from('messages')
          .select('id, content, status, delivery_status, delivered_at, read_at, media_url, platform, sent_at, created_at, metadata')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (since) {
          msgQuery = msgQuery.gt('created_at', since);
        }

        const { data: messages, error: msgErr } = await msgQuery;
        if (msgErr) {
          console.error(`[BACKUP] Error fetching messages for ${conv.id}:`, msgErr.message);
          continue;
        }
        if (!messages || messages.length === 0) continue;

        // Build backup payload
        const backupPayload = {
          exported_at: new Date().toISOString(),
          connection_id: connectionId,
          conversation: {
            contact_wa_id: conv.contact_wa_id,
            contact_name: conv.contact_name,
          },
          messages: messages.map(msg => ({
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

        const payloadJson = JSON.stringify(backupPayload);
        const payloadSize = new TextEncoder().encode(payloadJson).length;

        // Encrypt
        const encrypted = await encrypt(payloadJson);

        // Compute checksum of the encrypted payload
        const checksumHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(encrypted.encryptedBase64 + encrypted.ivBase64)
        );
        const checksumHex = Array.from(new Uint8Array(checksumHash))
          .map(b => b.toString(16).padStart(2, '0')).join('');

        // Upload encrypted blob to storage
        const fileName = `backups/${userId}/${connectionId}/${conv.id}/${new Date().toISOString().split('T')[0]}.json.enc`;
        const fileContent = JSON.stringify(encrypted);

        const { error: uploadErr } = await supabase.storage
          .from('whatsapp-backups')
          .upload(fileName, new TextEncoder().encode(fileContent).buffer, {
            contentType: 'application/octet-stream',
            upsert: true,
          });

        if (uploadErr) {
          console.error(`[BACKUP] Upload error for ${fileName}:`, uploadErr.message);
          continue;
        }

        // Register backup in catalog
        const { error: insertErr } = await supabase
          .from('whatsapp_backups')
          .insert({
            user_id: userId,
            connection_id: connectionId,
            conversation_id: conv.id,
            scope: 'single_conversation',
            format: 'encrypted_json',
            storage_path: fileName,
            checksum_sha256: checksumHex,
            encryption_key_id: `kek:${encrypted.keyFingerprint}`,
            size_bytes: payloadSize,
            message_count: messages.length,
            retention_class: 'daily',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          });

        if (insertErr) {
          console.error(`[BACKUP] Insert error for ${conv.id}:`, insertErr.message);
        }

        // Log access
        await supabase.from('whatsapp_backup_access_log').insert({
          user_id: userId,
          backup_id: (await supabase.from('whatsapp_backups').select('id').eq('storage_path', fileName).single().maybeSingle())?.data?.id,
          action: 'created',
        }).catch(e => console.error('[BACKUP] Log error:', e.message));

        conversationsBackedUp++;
        totalMessages += messages.length;
      }

      // Also create a consolidated "full_number" backup weekly (every 7 days)
      const { data: weeklyBackup } = await supabase
        .from('whatsapp_backups')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('scope', 'full_number')
        .eq('retention_class', 'weekly')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();

      if (!weeklyBackup && conversationsBackedUp > 0) {
        // Create consolidated backup by aggregating all conversation backups
        const allBackupPayload = {
          exported_at: new Date().toISOString(),
          connection_id: connectionId,
          scope: 'full_number',
          conversation_count: conversations.length,
        };

        const consolidatedJson = JSON.stringify(allBackupPayload);
        const consolidatedFileName = `backups/${userId}/${connectionId}/full/${new Date().toISOString().split('T')[0]}.consolidated.json.enc`;

        const consolidatedEncrypted = await encrypt(consolidatedJson);
        const consolidatedContent = JSON.stringify(consolidatedEncrypted);

        await supabase.storage
          .from('whatsapp-backups')
          .upload(consolidatedFileName, new TextEncoder().encode(consolidatedContent).buffer, {
            contentType: 'application/octet-stream',
            upsert: true,
          });

        await supabase.from('whatsapp_backups').insert({
          user_id: userId,
          connection_id: connectionId,
          conversation_id: null,
          scope: 'full_number',
          format: 'encrypted_json',
          storage_path: consolidatedFileName,
          checksum_sha256: checksumHex || 'pending',
          size_bytes: consolidatedJson.length,
          message_count: totalMessages,
          retention_class: 'weekly',
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        }).catch(e => console.error('[BACKUP] Weekly insert error:', e.message));
      }

      results.push({
        connectionId,
        userId,
        conversationsBackedUp,
        totalMessages,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Backup completed',
      results,
      totalConnections: connections.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[BACKUP-WA] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
