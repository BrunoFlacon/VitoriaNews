import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ghtkdkauseesambzqfrd.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodGtka2F1c2Vlc2FtYnpxZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTUwMTQsImV4cCI6MjA4OTUzMTAxNH0.X1OeIwLezATvztpzJzDJWMSUgukNXIWNQp2L1rHkLGs';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodGtka2F1c2Vlc2FtYnpxZnJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1NTAxNCwiZXhwIjoyMDg5NTMxMDE0fQ.tnh0poAxUBJNHvyg-2xPDcyiN__Dl6y_6FX5YDezN3M';
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

let passed = 0;
let failed = 0;

function log(label, ok, detail = '') {
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} ${label}${detail ? ' — ' + detail : ''}`);
  if (ok) passed++; else failed++;
}

function separator(msg) {
  console.log(`\n═══ ${msg} ═══`);
}

async function main() {
  console.log('🔍 WhatsApp Signal Test\n');
  console.log(`Project: ghtkdkauseesambzqfrd`);
  console.log(`Functions base: ${FUNCTIONS_BASE}`);

  // ── 1. WhatsApp Connections ─────────────────────────
  separator('1. Database: WhatsApp Connections');

  const { data: connections, error: connErr } = await supabase
    .from('social_connections')
    .select('id, platform, phone_number_id, page_name, is_connected, user_id, access_token, token_expires_at, updated_at')
    .eq('platform', 'whatsapp');

  if (connErr) {
    log('Query social_connections', false, connErr.message);
  } else if (!connections || connections.length === 0) {
    log('WhatsApp connections found', false, 'Nenhuma conexão cadastrada');
  } else {
    log(`WhatsApp connections found`, true, `${connections.length} conexão(ões)`);
    for (const c of connections) {
      const expiresAt = c.token_expires_at ? new Date(c.token_expires_at) : null;
      const expired = expiresAt && expiresAt < new Date();
      log(`  ${c.page_name || c.id.slice(0,8)}`, c.is_connected,
        `phone:${c.phone_number_id || 'n/a'} token_expira:${expiresAt?.toLocaleDateString('pt-BR') || 'n/a'}${expired ? ' EXPIRADO' : ''} token:${!!c.access_token}`);
    }
  }

  // ── 2. WhatsApp Conversations ───────────────────────
  separator('2. Database: WhatsApp Conversations');

  const { data: conversations, error: convErr } = await supabase
    .from('whatsapp_conversations')
    .select('id, contact_wa_id, contact_name, unread_count, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(10);

  if (convErr) {
    log('Query whatsapp_conversations', false, convErr.message);
  } else if (!conversations || conversations.length === 0) {
    log('WhatsApp conversations found', false, 'Nenhuma conversa (sem msgs recebidas ainda)');
  } else {
    log(`WhatsApp conversations`, true, `${conversations.length} conversa(ões)`);
    for (const c of conversations) {
      log(`  ${c.contact_name || c.contact_wa_id}`, true,
        `msgs:${c.unread_count} last:${c.last_message_at ? new Date(c.last_message_at).toLocaleString('pt-BR') : 'n/a'}`);
    }
  }

  // ── 3. Recent WhatsApp Messages ────────────────────
  separator('3. Database: Recent WhatsApp Messages');

  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('id, content, status, platform, created_at, metadata')
    .eq('platform', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(10);

  if (msgErr) {
    log('Query messages', false, msgErr.message);
  } else if (!messages || messages.length === 0) {
    log('WhatsApp messages found', false, 'Nenhuma mensagem no banco');
  } else {
    log(`WhatsApp messages`, true, `${messages.length} mensagens recentes`);
    for (const m of messages) {
      const waId = m.metadata?.wa_message_id || '—';
      log(`  [${m.status}]`, true, `${m.content?.slice(0,60) || '(mídia)'} wa_id:${waId}`);
    }
  }

  // ── 4. Webhook GET Verification ─────────────────────
  separator('4. Webhook Verification (GET)');

  const webhookUrl = `${FUNCTIONS_BASE}/whatsapp-webhook`;
  const verifyToken = 'webradiosocial2025@';

  try {
    const challengeUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=987654321`;
    const resp = await fetch(challengeUrl, { method: 'GET' });

    if (resp.status === 200) {
      const text = await resp.text();
      log('Webhook GET verification (token correto)', text === '987654321', `✓`);
    } else if (resp.status === 403) {
      const text = await resp.text();
      log('Webhook GET verification', false,
        `403 — token mismatch. Execute: supabase secrets set WHATSAPP_VERIFY_TOKEN="${verifyToken}"`);
    } else {
      const text = await resp.text();
      log('Webhook GET verification', false, `${resp.status} — ${text}`);
    }
  } catch (err) {
    log('Webhook GET verification', false, err.message);
  }

  try {
    const resp2 = await fetch(`${webhookUrl}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123`, { method: 'GET' });
    log('Webhook GET wrong token (deve ser 403)', resp2.status === 403, `✓`);
  } catch (err) {
    log('Webhook GET wrong token', false, err.message);
  }

  // ── 5. Webhook POST ────────────────────────────────
  separator('5. Webhook POST (Simulated Inbound)');

  const simPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { phone_number_id: 'test_phone_id' },
          contacts: [{ profile: { name: 'Test User' }, wa_id: '5511999999999' }],
          messages: [{
            from: '5511999999999',
            id: `test_msg_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: { body: 'Teste de sinal — Webhook funcionando!' },
            type: 'text'
          }]
        }
      }]
    }]
  };

  try {
    const postResp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simPayload)
    });
    const data = await postResp.json();
    log('Webhook POST simulated message', postResp.ok, `✓`);
  } catch (err) {
    log('Webhook POST simulated message', false, err.message);
  }

  // ── 6. Connection Validation ───────────────────────
  separator('6. Connection Validation');

  const anonKey = ANON_KEY;

  if (connections && connections.length > 0) {
    let validatedCount = 0;
    for (const conn of connections) {
      if (!conn.phone_number_id || !conn.access_token) {
        log(`Validate ${conn.page_name || conn.id.slice(0,8)}`, false,
          'sem phone_number_id ou access_token');
        continue;
      }

      try {
        const validateResp = await fetch(`${FUNCTIONS_BASE}/validate-whatsapp-connection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            phone_number_id: conn.phone_number_id,
            access_token: conn.access_token
          })
        });

        const result = await validateResp.json();
        if (result.valid) {
          log(`Validate ${conn.page_name || conn.id.slice(0,8)}`, true,
            `${result.display_phone_number} quality:${result.quality_rating}`);
          validatedCount++;
        } else {
          const expired = conn.token_expires_at && new Date(conn.token_expires_at) < new Date();
          const tip = result.code === 190
            ? 'Token rejeitado pelo Meta — gere novo System User Token no Business Manager'
            : result.error;
          log(`Validate ${conn.page_name || conn.id.slice(0,8)}`, false,
            `${tip}${expired ? ' (expirado)' : ''}`);
        }
      } catch (err) {
        log(`Validate ${conn.page_name || conn.id.slice(0,8)}`, false, err.message);
      }
    }
    if (validatedCount === 0) {
      log('→ Ação necessária:', false,
        'Reconecte o WhatsApp: Meta Business Manager → System Users → gerar novo token');
    }
  } else {
    log('Connection validation', false, 'Nenhuma conexão para validar');
  }

  // ── 7. Bot Settings ────────────────────────────────
  separator('7. Bot Settings');

  const { data: botSettings, error: botErr } = await supabase
    .from('bot_settings')
    .select('id, connection_id, is_active, behavior_mode, ai_provider')
    .limit(10);

  if (botErr) {
    log('Query bot_settings', false, botErr.message);
  } else if (!botSettings || botSettings.length === 0) {
    log('Bot settings found', false, 'Nenhuma configuração de bot');
  } else {
    log(`Bot settings`, true, `${botSettings.length} configuração(ões)`);
    for (const b of botSettings) {
      log(`  Bot ${b.id.slice(0,8)}`, b.is_active,
        `mode:${b.behavior_mode} provider:${b.ai_provider}`);
    }
  }

  // ── 8. Edge Functions Status ───────────────────────
  separator('8. WhatsApp Edge Functions');

  const waFunctions = [
    'whatsapp-webhook', 'validate-whatsapp-connection', 'whatsapp-analytics',
    'whatsapp-media-proxy', 'whatsapp-tech-provider-auth', 'whatsapp-upload-photo',
    'fix-whatsapp-photos', 'notify-new-post-whatsapp', 'meta-webhook'
  ];
  for (const fn of waFunctions) {
    try {
      const resp = await fetch(`${FUNCTIONS_BASE}/${fn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      // 200 = deployed and responding, anything else = deployed (auth/input error)
      log(`Function ${fn}`, resp.status < 500, `status:${resp.status}`);
    } catch (err) {
      log(`Function ${fn}`, false, err.message);
    }
  }

  // ── Final Summary ──────────────────────────────────
  separator('RESULTADO FINAL');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total:  ${passed + failed}\n`);

  if (failed === 0) {
    console.log('✅ Todos os testes de sinal passaram! WhatsApp operacional.');
  } else {
    const critical = [];
    const warnings = [];

    if (!connections || connections.length === 0) warnings.push('Nenhuma conexão WhatsApp cadastrada');
    if (connErr) critical.push('Erro ao consultar conexões: ' + connErr.message);
    if (!conversations || conversations.length === 0)
      warnings.push('Nenhuma conversa (ausência de msgs recebidas — esperado se webhook nunca recebeu tráfego real)');

    const tokenIssues = connections?.filter(c => {
      const expired = c.token_expires_at && new Date(c.token_expires_at) < new Date();
      return expired || !c.access_token;
    });
    if (tokenIssues?.length > 0) {
      critical.push(`${tokenIssues.length} conexão(ões) com token inválido/expirado — reconecte no Meta Business Manager`);
    }

    if (critical.length > 0) {
      console.log('🔴 Crítico:');
      critical.forEach(c => console.log(`  • ${c}`));
    }
    if (warnings.length > 0) {
      console.log('🟡 Atenção:');
      warnings.forEach(w => console.log(`  • ${w}`));
    }
    console.log('\n📋 Para reconectar: Meta Business Manager → System Users → gerar novo token de longa duração');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
