-- Migration: Harden metrics schema and prevent accidental data loss
-- Date: 2026-05-27

-- 1. Redefinir restrição em account_metrics
ALTER TABLE public.account_metrics 
DROP CONSTRAINT IF EXISTS account_metrics_social_account_id_fkey;

ALTER TABLE public.account_metrics 
ADD CONSTRAINT account_metrics_social_account_id_fkey 
FOREIGN KEY (social_account_id) 
REFERENCES public.social_accounts(id) 
ON DELETE NO ACTION; -- Impede a deleção da conta se houver métricas

-- 2. Redefinir restrição em post_metrics
ALTER TABLE public.post_metrics 
DROP CONSTRAINT IF EXISTS post_metrics_post_id_fkey;

ALTER TABLE public.post_metrics 
ADD CONSTRAINT post_metrics_post_id_fkey 
FOREIGN KEY (post_id) 
REFERENCES public.scheduled_posts(id) 
ON DELETE NO ACTION;

-- 3. Trigger de Segurança para prevenir DELETE em massa sem flag
CREATE OR REPLACE FUNCTION public.check_bulk_delete_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM old_table) > 100 AND current_setting('app.allow_bulk_delete', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Deleção em massa bloqueada em tabelas de métricas. Ative app.allow_bulk_delete para prosseguir.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Nota: Triggers de segurança em massa exigem Postgres 10+ (statement level)
-- Por segurança básica, vamos apenas garantir as FKs acima que são o ponto crítico de perda por cascade.

COMMENT ON TABLE public.account_metrics IS 'Tabela de métricas históricas. Protegida contra deleção em cascata.';
COMMENT ON TABLE public.post_metrics IS 'Tabela de métricas de posts. Protegida contra deleção em cascata.';
