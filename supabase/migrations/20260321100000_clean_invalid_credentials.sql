-- Script para remover credenciais de API obsoletas/inválidas que causam erros de OAuth
-- Aplique este script no SQL Editor do Supabase

DELETE FROM public.api_credentials 
WHERE credentials->>'client_id' LIKE '%sesu7074g5bbo4ub80ad0j2317vmtjs9%'
   OR credentials->>'app_id' = '323348644425052';

-- Opcional: Limpar todas as credenciais para garantir um estado limpo
-- DELETE FROM public.api_credentials;
