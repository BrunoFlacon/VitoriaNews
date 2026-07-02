-- Migração para criar a tabela de logs de OAuth para depuração
CREATE TABLE IF NOT EXISTS public.oauth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    stage TEXT NOT NULL, -- e.g., 'init', 'exchange', 'callback'
    request_payload JSONB,
    response_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para segurança
ALTER TABLE public.oauth_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oauth_logs' AND policyname = 'Users can view their own oauth logs') THEN
    CREATE POLICY "Users can view their own oauth logs" ON public.oauth_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oauth_logs' AND policyname = 'System can insert oauth logs') THEN
    CREATE POLICY "System can insert oauth logs" ON public.oauth_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
