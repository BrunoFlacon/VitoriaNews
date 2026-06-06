-- ============================================================
-- AUDITORIA DE MÉTRICAS FACEBOOK: PERÍODO PÓS-13/06/2025
-- Página: Web Rádio Vitória / Bruno Flacon
-- Gerado em: 2026-06-03
-- Baseado em Auditoria de Capturas de Tela
-- ============================================================

-- 1. HISTÓRICO CONSOLIDADO DE GANHOS (Auditado em 14/06/2025)
-- Período de referência original: 13/05/2022 a 13/06/2025
INSERT INTO fb_resumo_periodo 
    (periodo_inicio, periodo_fim, seguidores_total, novos_seguidores, deixaram_de_seguir, seguidores_liquidos, fonte_imagem)
VALUES 
    ('2022-05-13', '2025-06-13', 20474, NULL, 1737, 19184, '2025-06-14 024443.png')
ON CONFLICT DO NOTHING;

-- 2. MÉTRICAS DE VÍDEO (Auditadas em 14/06/2025)
INSERT INTO fb_metricas_video_periodo 
    (periodo_inicio, periodo_fim, visualizacoes_3s, visualizacoes_1min, minutos_visualizados_total, fonte_imagem)
VALUES 
    ('2022-05-13', '2025-06-13', 14745903, 4210229, NULL, '2025-06-14 035131.png')
ON CONFLICT DO NOTHING;

-- 3. GANHOS TOTAIS NO PERÍODO (Auditados em 14/06/2025)
-- Tabela para registro de faturamento/earnings
CREATE TABLE IF NOT EXISTS fb_ganhos_detalhados (
    id BIGSERIAL PRIMARY KEY,
    data_consolidacao DATE,
    ganhos_totais NUMERIC(12,2),
    anuncios_in_stream NUMERIC(12,2),
    monetizacao_conteudo NUMERIC(12,2),
    reels NUMERIC(12,2),
    estrelas NUMERIC(12,2),
    estrelas_qtd INT,
    fonte_imagem TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fb_ganhos_detalhados 
    (data_consolidacao, ganhos_totais, anuncios_in_stream, monetizacao_conteudo, reels, estrelas, estrelas_qtd, fonte_imagem)
VALUES 
    ('2025-06-13', 3214.21, 3189.21, 24.61, 0.09, 0.30, 30, '2025-06-14 035059.png')
ON CONFLICT DO NOTHING;

-- 4. PERFORMANCE RECENTE (Período 28 mai - 24 jun 2025)
INSERT INTO fb_resumo_periodo 
    (periodo_inicio, periodo_fim, alcance, variacao_alcance_pct, fonte_imagem)
VALUES 
    ('2025-05-28', '2025-06-24', 573754, 497.00, '2025-06-25 022457.png')
ON CONFLICT DO NOTHING;

-- 5. GANHOS INCREMENTAIS (Auditados em 17/09/2025)
INSERT INTO fb_ganhos_detalhados 
    (data_consolidacao, ganhos_totais, fonte_imagem)
VALUES 
    ('2025-09-17', 0.56, '2025-09-17 160150.png') -- Ganhos últimos 28 dias
ON CONFLICT DO NOTHING;

-- 6. STATUS DE INTEGRIDADE (Setembro 2025)
INSERT INTO fb_alertas_moderacao 
    (data_evento, tipo_alerta, nome_entidade, descricao, status_monetizacao, status_conta, fonte_imagem)
VALUES 
    ('2025-09-17', 'status_check', 'Web Rádio Vitória', 'Página sem violações de monetização', 'Regular', 'Sem problemas', '2025-09-17 155934.png')
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTA: O período de 17/09/2025 até 03/06/2026 não possui 
-- capturas de tela disponíveis na pasta de auditoria local.
-- ============================================================
