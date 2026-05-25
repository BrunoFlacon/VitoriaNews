-- Tabela para rastreamento de cobranças imediatas de PIX via EFI Bank
CREATE TABLE IF NOT EXISTS payment_charges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  txid text UNIQUE NOT NULL,
  plan text NOT NULL CHECK (plan IN ('monthly', 'quarterly', 'yearly')),
  value_cents integer NOT NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  qrcode_text text,
  expires_at timestamptz NOT NULL,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tabela para controle de assinaturas ativas
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text UNIQUE NOT NULL,
  plan text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'canceled')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE payment_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Evita conflitos se políticas já existirem)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_charges' AND policyname = 'Usuários consultam suas próprias cobranças'
  ) THEN
    CREATE POLICY "Usuários consultam suas próprias cobranças" 
      ON payment_charges FOR SELECT USING (auth.jwt() ->> 'email' = customer_email);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' AND policyname = 'Usuários consultam sua própria assinatura'
  ) THEN
    CREATE POLICY "Usuários consultam sua própria assinatura" 
      ON subscriptions FOR SELECT USING (auth.jwt() ->> 'email' = email);
  END IF;
END
$$;
