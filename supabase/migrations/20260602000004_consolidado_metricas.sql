-- =============================================================================
-- CONSOLIDAÇÃO DE MÉTRICAS — AUDITORIA COMPLETA
-- Período: 13 de maio de 2022 a 13 de junho de 2025
-- Gerado em: 02 de junho de 2026
-- =============================================================================
-- Este script cria a estrutura unificada de relatórios de auditoria e popula
-- com os dados extraídos de todas as fontes (4 lotes).
-- Uso: cole no SQL Editor do Supabase e execute.
-- =============================================================================

-- Habilita extensão UUID (se já existir, apenas avisa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- DDL — CRIAÇÃO DAS TABELAS
-- =============================================================================

-- Tabela Mestre: Controle de Relatórios / Auditorias
CREATE TABLE IF NOT EXISTS relatorios_auditoria (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    data_consolidacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    periodo_analise VARCHAR(100) NOT NULL,
    alcance_total BIGINT NOT NULL,
    alcance_organico BIGINT NOT NULL,
    alcance_pago BIGINT NOT NULL,
    interacoes_totais BIGINT NOT NULL,
    interacoes_seguidores BIGINT NOT NULL,
    interacoes_nao_seguidores BIGINT NOT NULL,
    cliques_link INT NOT NULL,
    ganhos_totais_usd DECIMAL(10, 2) NOT NULL
);

-- Tabela: Ganhos Financeiros Detalhados
CREATE TABLE IF NOT EXISTS ganhos_financeiros (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    relatorio_id UUID REFERENCES relatorios_auditoria(id) ON DELETE CASCADE,
    fonte_monetizacao VARCHAR(100) NOT NULL,
    valor_usd DECIMAL(10, 2) NOT NULL
);

-- Tabela: Audiência e Dinâmica de Seguidores
CREATE TABLE IF NOT EXISTS dinamica_audiencia (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    relatorio_id UUID REFERENCES relatorios_auditoria(id) ON DELETE CASCADE,
    seguidores_totais INT NOT NULL,
    seguidores_liquidos INT NOT NULL,
    unfollows INT NOT NULL,
    visitas_pagina INT NOT NULL,
    homens_pct DECIMAL(5,2),
    mulheres_pct DECIMAL(5,2),
    melhor_horario VARCHAR(100)
);

-- Tabela: Retenção e Comportamento de Vídeo
CREATE TABLE IF NOT EXISTS comportamento_video (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    relatorio_id UUID REFERENCES relatorios_auditoria(id) ON DELETE CASCADE,
    visualizadores_retornantes BIGINT NOT NULL,
    views_3_segundos BIGINT NOT NULL,
    views_15_segundos BIGINT NOT NULL,
    views_1_minuto BIGINT NOT NULL
);

-- Tabela: Desempenho por Formato de Conteúdo
CREATE TABLE IF NOT EXISTS formatos_conteudo (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    relatorio_id UUID REFERENCES relatorios_auditoria(id) ON DELETE CASCADE,
    formato VARCHAR(50) NOT NULL,
    quantidade INT,
    alcance BIGINT,
    interacoes BIGINT
);

-- Tabela: Geografia do Público
CREATE TABLE IF NOT EXISTS audiencia_geografia (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    relatorio_id UUID REFERENCES relatorios_auditoria(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cidade', 'pais')),
    nome VARCHAR(100) NOT NULL,
    estado VARCHAR(2),
    percentual DECIMAL(5, 2) NOT NULL
);

-- =============================================================================
-- DML — INSERÇÃO DOS DADOS CONSOLIDADOS
-- =============================================================================

WITH relatorio_atual AS (
    INSERT INTO relatorios_auditoria (
        periodo_analise, alcance_total, alcance_organico, alcance_pago,
        interacoes_totais, interacoes_seguidores, interacoes_nao_seguidores,
        cliques_link, ganhos_totais_usd
    ) VALUES (
        '13 de maio de 2022 a 13 de junho de 2025',
        5467514, 5467514, 982,
        1077158, 143102, 934056,
        694, 3214.21
    ) RETURNING id
)
-- Ganhos Financeiros Detalhados
, insercao_ganhos AS (
    INSERT INTO ganhos_financeiros (relatorio_id, fonte_monetizacao, valor_usd)
    SELECT id, unnest(ARRAY[
        'Anúncios in-stream (Vídeos)',
        'Anúncios in-stream',
        'Monetização de Conteúdo',
        'Estrelas',
        'Anúncios no Reels'
    ]), unnest(ARRAY[
        3106.19,
        3189.21,
        24.61,
        0.30,
        0.09
    ])
    FROM relatorio_atual
)
-- Dinâmica de Audiência
, insercao_audiencia AS (
    INSERT INTO dinamica_audiencia (
        relatorio_id, seguidores_totais, seguidores_liquidos, unfollows,
        visitas_pagina, homens_pct, mulheres_pct, melhor_horario
    )
    SELECT id, 20921, 19184, 1737, 125301, 66.00, 34.00,
           'Sábados às 15h (3PM PST)'
    FROM relatorio_atual
)
-- Retenção de Vídeo (valores máximos consolidados da auditoria)
, insercao_retencao AS (
    INSERT INTO comportamento_video (
        relatorio_id, visualizadores_retornantes,
        views_3_segundos, views_15_segundos, views_1_minuto
    )
    SELECT id, 255700, 14745903, 7861936, 4210229
    FROM relatorio_atual
)
-- Desempenho por Formato de Conteúdo
, insercao_formatos AS (
    INSERT INTO formatos_conteudo (relatorio_id, formato, quantidade, alcance, interacoes)
    SELECT id,
        unnest(ARRAY['Vídeos', 'Ao vivo', 'Fotos', 'Reels', 'Stories', 'Links', 'Texto', 'Várias fotos', 'Várias mídias', 'Outros']),
        unnest(ARRAY[85, 2, 59, 47, 70, 1, 0, 0, 0, 0]),
        unnest(ARRAY[5340328, 628204, 59924, 24869, 13637, 16345, 2172, 534, 21, 38288]),
        unnest(ARRAY[989449, 39022, 12647, 16360, 14199, 5094, 210, 28, 0, 51])
    FROM relatorio_atual
)
-- Geografia: Cidades
, insercao_cidades AS (
    INSERT INTO audiencia_geografia (relatorio_id, tipo, nome, estado, percentual)
    SELECT id, 'cidade', unnest(ARRAY[
        'São Paulo', 'Rio de Janeiro', 'Tupã', 'Manaus', 'Curitiba'
    ]), unnest(ARRAY[
        'SP', 'RJ', 'SP', 'AM', 'PR'
    ]), unnest(ARRAY[
        6.10, 4.70, 3.00, 1.80, 1.40
    ])
    FROM relatorio_atual
)
-- Geografia: Países
INSERT INTO audiencia_geografia (relatorio_id, tipo, nome, estado, percentual)
SELECT id, 'pais', unnest(ARRAY[
    'Brasil', 'Estados Unidos', 'Angola', 'Portugal', 'Moçambique'
]), NULL, unnest(ARRAY[
    96.90, 0.70, 0.60, 0.50, 0.40
])
FROM relatorio_atual;

-- =============================================================================
-- RELATÓRIO DE AUDITORIA (query de conferência)
-- =============================================================================
-- Execute abaixo para ver os dados inseridos:
--
-- SELECT
--   r.periodo_analise,
--   r.alcance_total,
--   r.interacoes_totais,
--   r.ganhos_totais_usd,
--   d.seguidores_totais,
--   d.homens_pct || '%' as homens,
--   d.mulheres_pct || '%' as mulheres,
--   cv.views_3_segundos,
--   cv.views_1_minuto,
--   cv.visualizadores_retornantes
-- FROM relatorios_auditoria r
-- LEFT JOIN dinamica_audiencia d ON d.relatorio_id = r.id
-- LEFT JOIN comportamento_video cv ON cv.relatorio_id = r.id
-- ORDER BY r.data_consolidacao DESC
-- LIMIT 1;

-- =============================================================================
-- ANÁLISE EXECUTIVA (documentação inline)
-- =============================================================================
--
-- 1. TRÁFEGO E ENGAJAMENTO
--    Alcance total: 5.467.514 (99,98% orgânico, apenas 982 pago)
--    Interações: 1.077.158
--      → 86,7% (934.056) de NÃO seguidores → alto potencial de viralização
--      → 13,3% (143.102) de seguidores
--
-- 2. FUNIL DE RETENÇÃO (Vídeos)
--    3s: 14.745.903 → 15s: 7.861.936 (53,3%) → 1min: 4.210.229 (53,6% dos 15s)
--    Visualizadores retornantes: 255.700
--
-- 3. FINANCEIRO
--    Total: $3.214,21
--    Anúncios in-stream: $3.189,21 (99,2%) ← motor financeiro
--    Monetização de Conteúdo: $24,61
--    Estrelas: $0,30 | Reels: $0,09 (oportunidade de crescimento)
--
-- 4. PÚBLICO
--    Seguidores: 20.921 (crescimento líquido: +19.184, unfollows: 1.737)
--    Visitas: 125.301
--    Gênero: 66% Homens / 34% Mulheres
--    Top cidades: São Paulo (6,1%), Rio de Janeiro (4,7%), Tupã (3,0%)
--    Brasil: 96,9% do público
--    Melhor horário: Sábados às 15h
--
-- 5. FORMATOS (Top 5 por alcance)
--    Vídeos:   85 pubs → 5.340.328 alcance → 989.449 interações
--    Ao vivo:   2 pubs →   628.204 alcance →  39.022 interações
--    Fotos:    59 pubs →    59.924 alcance →  12.647 interações
--    Reels:    47 pubs →    24.869 alcance →  16.360 interações
--    Stories:  70 pubs →    13.637 alcance →  14.199 interações
-- =============================================================================