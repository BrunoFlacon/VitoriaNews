/**
 * cleanup-expired-backups
 *
 * FASE 4.C: Backup retention policy enforcement
 * - Removes expired backups from Storage and whatsapp_backups table
 * - Enforces retention limits (max N daily/weekly/monthly per connection)
 * - Logs deletions in whatsapp_backup_access_log
 *
 * Designed to run as a cron job (daily).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetentionConfig {
  daily: number;
  weekly: number;
  monthly: number;
}

function getRetentionConfig(): RetentionConfig {
  return {
    daily: parseInt(Deno.env.get('WHATSAPP_BACKUP_RETENTION_DAILY') || '7', 10),
    weekly: parseInt(Deno.env.get('WHATSAPP_BACKUP_RETENTION_WEEKLY') || '4', 10),
    monthly: parseInt(Deno.env.get('WHATSAPP_BACKUP_RETENTION_MONTHLY') || '12', 10),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const config = getRetentionConfig();
    const now = new Date();
    let totalDeleted = 0;
    let totalFreedBytes = 0;

    // 1. Delete backups past expires_at
    const { data: expiredBackups, error: expiredErr } = await supabase
      .from('whatsapp_backups')
      .select('id, storage_path, size_bytes, connection_id, user_id, retention_class')
      .lt('expires_at', now.toISOString())
      .not('expires_at', 'is', null);

    if (expiredErr) throw expiredErr;

    for (const backup of (expiredBackups || [])) {
      // Remove from storage
      const { error: removeErr } = await supabase.storage
        .from('whatsapp-backups')
        .remove([backup.storage_path]);

      if (removeErr) {
        console.error(`[CLEANUP] Failed to remove storage file ${backup.storage_path}:`, removeErr.message);
        // Continue anyway — we can still delete the db record
      }

      // Log deletion
      await supabase.from('whatsapp_backup_access_log').insert({
        user_id: backup.user_id,
        backup_id: backup.id,
        action: 'deleted',
      }).catch(e => console.error('[CLEANUP] Log error:', e.message));

      // Delete from table
      await supabase.from('whatsapp_backups').delete().eq('id', backup.id);
      totalDeleted++;
      totalFreedBytes += backup.size_bytes || 0;
    }

    // 2. Enforce retention limits per connection per retention_class
    for (const retentionClass of ['daily', 'weekly', 'monthly'] as const) {
      const maxKeep = config[retentionClass];

      // Get distinct connections with backups of this retention class
      const { data: connections } = await supabase
        .from('whatsapp_backups')
        .select('connection_id')
        .eq('retention_class', retentionClass)
        .neq('expires_at', null)
        .not('connection_id', 'is', null);

      if (!connections) continue;
      const uniqueConnIds = [...new Set(connections.map(c => c.connection_id))];

      for (const connId of uniqueConnIds) {
        // Get backups for this connection + retention class, ordered newest first
        const { data: backups } = await supabase
          .from('whatsapp_backups')
          .select('id, storage_path, size_bytes, user_id')
          .eq('connection_id', connId)
          .eq('retention_class', retentionClass)
          .neq('expires_at', null)
          .order('created_at', { ascending: false });

        if (!backups || backups.length <= maxKeep) continue;

        // Remove excess (oldest ones)
        const toRemove = backups.slice(maxKeep);
        for (const backup of toRemove) {
          await supabase.storage
            .from('whatsapp-backups')
            .remove([backup.storage_path])
            .catch(e => console.error('[CLEANUP] Storage remove error:', e.message));

          await supabase.from('whatsapp_backup_access_log').insert({
            user_id: backup.user_id,
            backup_id: backup.id,
            action: 'deleted',
          }).catch(e => console.error('[CLEANUP] Log error:', e.message));

          await supabase.from('whatsapp_backups').delete().eq('id', backup.id);
          totalDeleted++;
          totalFreedBytes += backup.size_bytes || 0;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      deletedCount: totalDeleted,
      freedBytes: totalFreedBytes,
      freedFormatted: `${(totalFreedBytes / 1024 / 1024).toFixed(2)} MB`,
      retentionConfig: config,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[CLEANUP] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
