-- Habilita políticas de UPDATE públicas para a tabela portal_subscribers
-- Isso resolve conflitos de chave única durante o cadastro de novos assinantes (fluxo de UPSERT)
DROP POLICY IF EXISTS "Allow public update for subscriptions" ON portal_subscribers;
CREATE POLICY "Allow public update for subscriptions"
ON portal_subscribers FOR UPDATE
USING (true)
WITH CHECK (true);
