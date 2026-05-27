const https = require('https');

const PROJECT_REF = 'ghtkdkauseesambzqfrd';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodGtka2F1c2Vlc2FtYnpxZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTUwMTQsImV4cCI6MjA4OTUzMTAxNH0.X1OeIwLezATvztpzJzDJWMSUgukNXIWNQp2L1rHkLGs';

const sql = `
  -- 1. TABELA DE ESTADO
  CREATE TABLE IF NOT EXISTS public.historical_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    next_cursor TEXT,
    is_completed BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (social_account_id, platform)
  );

  -- 2. HABILITA RLS
  ALTER TABLE public.historical_sync_state ENABLE ROW LEVEL SECURITY;

  -- 3. INICIALIZA REGISTROS POR CONTA CONECTADA
  INSERT INTO public.historical_sync_state (social_account_id, platform, is_completed)
  SELECT id, platform, false
  FROM public.social_accounts
  WHERE is_connected = true
  ON CONFLICT (social_account_id, platform) DO NOTHING;

  -- 4. RETORNA ESTADO INICIAL
  SELECT platform, is_completed FROM public.historical_sync_state ORDER BY created_at;
`;

function postSql(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

postSql(sql).then(res => console.log('Status:', res.status, '\nResponse:', res.body));
