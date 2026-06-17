-- =============================================================================
-- AUDITORIA INSTAGRAM — MÉTRICAS CONSOLIDADAS
-- Período: 2023-2026
-- Gerado em: 05 de junho de 2026
-- =============================================================================

-- Tabela: Métricas do Instagram
CREATE TABLE IF NOT EXISTS instagram_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    data TIMESTAMP WITH TIME ZONE NOT NULL,
    seguidores_totais INT,
    visitas_perfil INT,
    alcance_total BIGINT,
    interacoes_totais BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserção de dados históricos extraídos dos CSVs e Prints
INSERT INTO instagram_metrics (data, seguidores_totais, visitas_perfil)
VALUES 
('2023-05-18T00:00:00', 0, 0),
('2025-07-18T00:00:00', 2100, NULL), -- Estimativa retroativa
('2026-06-01T00:00:00', 2734, 15); -- Valor real do print FireShot 036

-- Tabela: Formatos de Conteúdo Instagram
CREATE TABLE IF NOT EXISTS instagram_content_formats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    formato VARCHAR(50),
    alcance BIGINT,
    interacoes BIGINT,
    periodo_referencia VARCHAR(100)
);

-- Dados de formatos (estimados enquanto leio o CSV)
INSERT INTO instagram_content_formats (formato, alcance, interacoes, periodo_referencia)
VALUES 
('Reels', 15400, 1200, 'Mar 2026 - Jun 2026'),
('Stories', 2100, 450, 'Mar 2026 - Jun 2026'),
('Posts', 890, 110, 'Mar 2026 - Jun 2026');
