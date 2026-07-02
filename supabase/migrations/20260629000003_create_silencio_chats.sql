-- WhatsApp Plano de Correção — Fase 5
-- Bot silêncio: migrar lógica de silencio_whatsapp.js para o banco de dados
-- NOTA: tabela silencio_chats já existia com schema parcial; esta migration adiciona colunas e RLS faltantes

-- 1. Colunas adicionais para integração multi-conexão
ALTER TABLE public.silencio_chats ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.social_connections(id) ON DELETE CASCADE;
ALTER TABLE public.silencio_chats ADD COLUMN IF NOT EXISTS contact_phone TEXT;
UPDATE public.silencio_chats SET contact_phone = chat_id WHERE contact_phone IS NULL;
ALTER TABLE public.silencio_chats ALTER COLUMN contact_phone SET NOT NULL;

-- 2. Partial unique indexes: sem connection_id → único por (user_id, platform, chat_id)
--    com connection_id → único por (user_id, platform, chat_id, connection_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_silencio_chats_contact 
  ON public.silencio_chats (user_id, platform, chat_id) 
  WHERE connection_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_silencio_chats_contact_connection 
  ON public.silencio_chats (user_id, platform, chat_id, connection_id) 
  WHERE connection_id IS NOT NULL;

-- 3. RLS
ALTER TABLE public.silencio_chats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'silencio_chats' AND policyname = 'Users can view own silenced chats') THEN
    CREATE POLICY "Users can view own silenced chats"
      ON public.silencio_chats FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'silencio_chats' AND policyname = 'Users can insert own silenced chats') THEN
    CREATE POLICY "Users can insert own silenced chats"
      ON public.silencio_chats FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'silencio_chats' AND policyname = 'Users can update own silenced chats') THEN
    CREATE POLICY "Users can update own silenced chats"
      ON public.silencio_chats FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'silencio_chats' AND policyname = 'Users can delete own silenced chats') THEN
    CREATE POLICY "Users can delete own silenced chats"
      ON public.silencio_chats FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Função para limpar silêncios expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_silencio()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM public.silencio_chats
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;
