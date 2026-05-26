# 🏦 Camada 4: Nova Infraestrutura de Pagamentos — EFI Bank (PIX Recorrente)

Esta é a camada central de engenharia financeira e backend-first. Toda a lógica de pagamentos e tratamento de Webhooks sensíveis será delegada exclusivamente para o ambiente isolado das Supabase Edge Functions.

## 📝 Ações a Executar

### 4.1. Migração de Banco de Dados (Estrutura de Tabelas & RLS)
* **Ação:** Executar a seguinte migration via console SQL do Supabase Studio para controle de cobranças de assinaturas.

```sql
-- Tabela para rastreamento de cobranças imediatas de PIX via EFI Bank
CREATE TABLE payment_charges (
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
CREATE TABLE subscriptions (
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

-- Políticas de Acesso
CREATE POLICY "Usuários consultam suas próprias cobranças" 
  ON payment_charges FOR SELECT USING (auth.jwt() ->> 'email' = customer_email);

CREATE POLICY "Usuários consultam sua própria assinatura" 
  ON subscriptions FOR SELECT USING (auth.jwt() ->> 'email' = email);
```

### 4.2. Implementação das Supabase Edge Functions (Deno Runtime)
* **Segurança:** As chaves de homologação/produção e o Certificado Digital PFX/P12 convertido em string Base64 devem ser armazenados de forma blindada nos Secrets do Supabase.

```bash
# Configurando segredos no CLI/Painel do Supabase
supabase secrets set EFI_CLIENT_ID="seu_client_id"
supabase secrets set EFI_CLIENT_SECRET="seu_client_secret"
supabase secrets set EFI_CERTIFICATE_BASE64="string_base64_do_pfx"
supabase secrets set EFI_PIX_KEY="sua_chave_pix"
supabase secrets set EFI_SANDBOX="false"
```

* **Função Principal (`efi-create-charge/index.ts`):** Instanciar o cliente oficial da EFI via specifier do npm (`npm:sdk-node-apis-efi`), enviar os dados de devedor e valor estruturado em centavos (corrigindo a precificação dos planos) e retornar a string 'copia e cola' juntamente com a imagem Base64 do QR Code para o front-end.

* **Tabela Atualizada de Preços (Faturamento Exato):**
  * Mensal: R$ 22,92 (2292 centavos)
  * Trimestral: R$ 69,92 (6992 centavos)
  * Anual (Sócio Fundador): R$ 222,22 (22222 centavos)

* **Função Webhook (`efi-webhook/index.ts`):** Endpoint público exposto para receber os payloads disparados pelos servidores da EFI Bank. Ao ler o status `CONCLUIDA`, a função altera o status em `payment_charges` e dispara um upsert na tabela de `subscriptions` estendendo o `expires_at` baseado no plano adquirido (30, 90 ou 365 dias).
