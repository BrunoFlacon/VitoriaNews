CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ,
  raw_payload JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_platform ON webhook_events(platform);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_events' AND policyname = 'Usuários podem ver seus próprios eventos') THEN
    CREATE POLICY "Usuários podem ver seus próprios eventos" ON webhook_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM api_credentials ac
          WHERE ac.platform = webhook_events.platform
            AND ac.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_events' AND policyname = 'Service role pode inserir eventos') THEN
    CREATE POLICY "Service role pode inserir eventos" ON webhook_events
      FOR INSERT
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_events' AND policyname = 'Service role pode atualizar eventos') THEN
    CREATE POLICY "Service role pode atualizar eventos" ON webhook_events
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
