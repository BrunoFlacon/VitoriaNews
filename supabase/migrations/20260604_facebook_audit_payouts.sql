-- SCRIPT SQL DE AUDITORIA CONSOLIDADA (META 2016-2026)
-- Gerado em: 04/06/2026
-- Objetivo: Sincronizar histórico financeiro de 10 anos e métricas virais no Supabase.

BEGIN;

-- 1. Inserir Posts de Destaque Extraídos de Prints (Foco no viral de 1M)
INSERT INTO facebook_posts_audit (post_id, published_at, reach, engagement, visualizacoes, content_type)
VALUES 
    ('audit_v_2026_01', '2025-06-17 13:29:00-03', 1014320, 4520, 1014320, 'reel'), -- Post Viral Recorde
    ('audit_v_2026_02', '2025-11-22 21:57:00-03', 27000, 4505, 27000, 'reel'),    -- Post Inundação
    ('audit_v_2026_03', '2025-03-31 21:44:00-03', 2796, 212, 2796, 'foto'),      -- Vacina Arquivado
    ('audit_v_2011_01', '2025-07-11 12:03:00-03', 26340, 26340, 26340, 'reel')   -- Top Engagement
ON CONFLICT (post_id) DO UPDATE SET 
    reach = EXCLUDED.reach,
    visualizacoes = EXCLUDED.visualizacoes;

-- 2. Histórico de Pagamentos de 10 Anos (Dados extraídos dos 8 PDFs de Remessa)
INSERT INTO fb_payout_history (payment_number, payment_date, amount, currency, reference_period, status)
VALUES
    ('6679639558817715', '2023-10-23', 1142.22, 'USD', 'Setembro 2023', 'PAID'),
    ('6611655028949493', '2023-09-21', 885.83, 'USD', 'Junho-Agosto 2023', 'PAID'),
    ('6835397136575287', '2023-11-20', 775.74, 'USD', 'Outubro 2023', 'PAID'),
    ('6997040970410901', '2023-12-21', 315.80, 'USD', 'Novembro 2023', 'PAID'),
    ('6974320179349646', '2024-01-22', 56.22, 'USD', 'Dezembro 2023', 'PAID'),
    ('7443948672386790', '2024-04-19', 40.66, 'USD', 'Janeiro-Março 2024', 'PAID'),
    ('24075753728779695', '2025-07-23', 26.44, 'USD', 'Nov/24-Jun/25', 'PAID'),
    ('8648802731901374', '2024-11-21', 25.06, 'USD', 'Abr/24-Out/24', 'PAID')
ON CONFLICT (payment_number) DO UPDATE SET 
    amount = EXCLUDED.amount,
    status = EXCLUDED.status;

-- 3. Atualizar Status de Seguidores Global
UPDATE social_connections 
SET 
    followers_count = 29415,
    last_sync = NOW()
WHERE 
    platform = 'facebook';

-- 4. Métricas de Engajamento Recentes (Últimos 28 dias)
INSERT INTO fb_daily_stats (stats_date, reach, engagement, reactions, comments, shares)
VALUES 
    ('2026-06-04', 1431, 30, 14, 4, 10)
ON CONFLICT (stats_date) DO UPDATE SET 
    reach = EXCLUDED.reach,
    engagement = EXCLUDED.engagement;

COMMIT;
