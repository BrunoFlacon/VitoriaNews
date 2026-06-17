-- =============================================================================
-- RELATÓRIO ÚNICO DE CONSOLIDAÇÃO — DEPLOY COMPLETO
-- Período: 13 de maio de 2022 a 13 de junho de 2025
-- Tratamento de Duplicidade e Flutuação Temporal incluído
-- =============================================================================
-- Métricas de Painel (Imagens): Foram identificadas leves flutuações
-- (ex: seguidores variando de 20.315 para 20.921). A auditoria priorizou o
-- pico de consolidação temporal como um snapshot único, evitando sobreposição
-- de dados irreais.
--
-- Dados Tabulares (CSV): Os arquivos de origem do Facebook continham registros
-- granulares de comentários e interações por vídeo. Foi desenhada uma chave
-- única (comentario_id) no banco de dados para garantir que, caso o mesmo
-- comentário ou post seja exportado duas vezes em dias diferentes, o Supabase
-- utilize a regra de UPSERT (atualizar se existir), anulando o risco de
-- duplicidade de cliques ou contagem falsa.
--
-- Seguidores (CSV): Os arquivos Seguidores do Facebook (WRV) estavam com os
-- cabeçalhos vazios de registros no momento da exportação, o que indica que
-- a API do Facebook não populou a lista nominal. O banco de dados foi
-- preparado para receber essa carga futura sem quebrar a integridade.
-- =============================================================================
-- Uso: Cole no SQL Editor do Supabase e execute.
-- =============================================================================

-- 1. Configurações Iniciais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Consolidação de Relatórios (Snapshots Gerais)
CREATE TABLE IF NOT EXISTS relatorios_gerais (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    periodo_analise VARCHAR(150) UNIQUE NOT NULL,
    data_auditoria TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    alcance_total BIGINT NOT NULL,
    alcance_organico BIGINT NOT NULL,
    interacoes_totais BIGINT NOT NULL,
    interacoes_seguidores BIGINT NOT NULL,
    interacoes_nao_seguidores BIGINT NOT NULL,
    seguidores_pico INT NOT NULL,
    ganhos_totais_usd DECIMAL(10, 2) NOT NULL
);

-- 3. Tabela de Interações Granulares e Comentários (Para receber os dados do CSV)
CREATE TABLE IF NOT EXISTS facebook_interacoes_detalhadas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conta_nome VARCHAR(150) NOT NULL,
    comentario_id VARCHAR(255) UNIQUE NOT NULL, -- Impede duplicidade de dados do CSV
    texto_comentario TEXT,
    cliques DECIMAL(10, 2) DEFAULT 0,
    fonte_trafego VARCHAR(100),
    data_registro DATE NOT NULL,
    descricao_post TEXT,
    duracao_video DECIMAL(10, 3)
);

-- 4. Tabela de Demografia e Geolocalização
CREATE TABLE IF NOT EXISTS demografia_publico (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    relatorio_id UUID REFERENCES relatorios_gerais(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'Cidade', 'País', 'Gênero'
    nome VARCHAR(100) NOT NULL,
    percentual DECIMAL(5, 2) NOT NULL
);

-- 5. Inserção do Snapshot Consolidado e Auditado (Métricas Gerais)
WITH relatorio_atual AS (
    INSERT INTO relatorios_gerais (
        periodo_analise, alcance_total, alcance_organico, interacoes_totais,
        interacoes_seguidores, interacoes_nao_seguidores, seguidores_pico, ganhos_totais_usd
    ) VALUES (
        '13 de maio de 2022 a 13 de junho de 2025',
        5467514, 5467514, 1077158,
        143102, 934056, 20921, 3214.21
    )
    ON CONFLICT (periodo_analise) DO NOTHING
    RETURNING id
)
-- 6. Inserção das Cidades e Países (Demografia)
INSERT INTO demografia_publico (relatorio_id, tipo, nome, percentual)
SELECT id,
    unnest(ARRAY['Cidade', 'Cidade', 'Cidade', 'Cidade', 'Cidade', 'País', 'País', 'Gênero', 'Gênero']),
    unnest(ARRAY['São Paulo, SP', 'Rio de Janeiro, RJ', 'Tupã, SP', 'Manaus, AM', 'Curitiba, PR', 'Brasil', 'Estados Unidos', 'Homens', 'Mulheres']),
    unnest(ARRAY[6.10, 4.70, 3.00, 1.80, 1.40, 96.90, 0.70, 66.00, 34.00])
FROM relatorio_atual;

-- 7. Inserção de Amostra dos Dados do CSV (Comentários e Engajamento)
-- A restrição ON CONFLICT (comentario_id) garante que uploads futuros não dupliquem linhas.
INSERT INTO facebook_interacoes_detalhadas (
    conta_nome, comentario_id, texto_comentario, cliques, fonte_trafego, data_registro, descricao_post, duracao_video
) VALUES
(
    'Web Rádio Vitória', '1272917644833854_1757624578124662', '@superfãs', 26.0, 'facebook_organic', '2025-05-19',
    'Dep. Gustavo Gayer traz a lista dos #records do terceiro #DesgovernoDoPT...', 347.866
),
(
    'Web Rádio Vitória', '1302601675198784_1892214214971333', 'Eu tinha ouvido falar da falsa paz imposta por Trump, pra depois o caldo engrossar, o q pensam a respeito???', 85.0, 'facebook_organic', '2025-06-24',
    'O Presidente Donald J. Trump anunciou pela #TruthSocial um acordo de paz em até 24horas...', 154.387
)
ON CONFLICT (comentario_id) DO UPDATE SET
    cliques = EXCLUDED.cliques,
    texto_comentario = EXCLUDED.texto_comentario;

-- =============================================================================
-- RELATÓRIO DE CONFERÊNCIA
-- =============================================================================
-- SELECT * FROM relatorios_gerais;
-- SELECT * FROM demografia_publico;
-- SELECT * FROM facebook_interacoes_detalhadas;
--
-- Para importar o CSV completo de comentários:
-- 1. Abra o Table Editor do Supabase > tabela facebook_interacoes_detalhadas
-- 2. Clique em "Insert" > "Import CSV"
-- 3. A chave UNIQUE(comentario_id) + ON CONFLICT garantem deduplicação automática
-- =============================================================================
