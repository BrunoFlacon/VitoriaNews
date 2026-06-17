-- ============================================================
-- AUDITORIA COMPLETA DE MÉTRICAS DO FACEBOOK
-- Página: Web Rádio Vitória / Bruno Flacon
-- Conta de Anúncios: Bruno Flacon (6009080110707)
-- Gerado em: 2026-06-02
-- Fonte: Análise de capturas de tela (D:\Pictures\Screenshots\Insds Facebook)
-- ============================================================

-- ============================================================
-- 1. TABELAS BASE
-- ============================================================

-- Tabela de resumo por período (Visão Geral da Página)
CREATE TABLE IF NOT EXISTS fb_resumo_periodo (
  id                        BIGSERIAL PRIMARY KEY,
  periodo_inicio            DATE        NOT NULL,
  periodo_fim               DATE        NOT NULL,
  impressoes                BIGINT,
  alcance                   BIGINT,
  interacoes_conteudo       BIGINT,
  seguidores_total          BIGINT,
  cliques_link              BIGINT,
  seguidores_liquidos       BIGINT,
  novos_seguidores          BIGINT,
  deixaram_de_seguir        BIGINT,
  curtidas_pagina           BIGINT,
  variacao_impressoes_pct   NUMERIC(6,2),
  variacao_alcance_pct      NUMERIC(6,2),
  variacao_interacoes_pct   NUMERIC(6,2),
  variacao_seg_liquidos_pct NUMERIC(6,2),
  variacao_novos_seg_pct    NUMERIC(6,2),
  variacao_deixaram_pct     NUMERIC(6,2),
  fonte_imagem              TEXT,
  criado_em                 TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de métricas de vídeo / retenção por período
CREATE TABLE IF NOT EXISTS fb_metricas_video_periodo (
  id                          BIGSERIAL PRIMARY KEY,
  periodo_inicio              DATE        NOT NULL,
  periodo_fim                 DATE        NOT NULL,
  minutos_visualizados_total  BIGINT,
  visualizacoes_3s            BIGINT,
  visualizacoes_15s           BIGINT,
  reproducoes_1min            BIGINT,
  visualizacoes_completas     BIGINT,
  retencao_15s_pct            NUMERIC(5,2),
  pct_origem_recomendacoes    NUMERIC(5,2),
  pct_origem_seguidores       NUMERIC(5,2),
  pct_origem_compartilhamentos NUMERIC(5,2),
  variacao_visualizacoes_completas_pct NUMERIC(6,2),
  observacoes                 TEXT,
  fonte_imagem                TEXT,
  criado_em                   TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de atividade dos seguidores por período
CREATE TABLE IF NOT EXISTS fb_atividade_seguidores (
  id                          BIGSERIAL PRIMARY KEY,
  periodo_inicio              DATE        NOT NULL,
  periodo_fim                 DATE        NOT NULL,
  novos_seguidores            BIGINT,
  novos_seguidores_anterior   BIGINT,
  deixaram_de_seguir          BIGINT,
  deixaram_de_seguir_anterior BIGINT,
  seguidores_liquidos         BIGINT,
  variacao_liquidos_pct       NUMERIC(6,2),
  seguidores_engajados        BIGINT,
  seguidores_engajados_anterior BIGINT,
  visualizadores_que_retornam BIGINT,
  periodo_mais_ativo          TEXT,
  fonte_imagem                TEXT,
  criado_em                   TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de avaliação comparativa (benchmarking)
CREATE TABLE IF NOT EXISTS fb_avaliacao_comparativa (
  id                          BIGSERIAL PRIMARY KEY,
  periodo_inicio              DATE        NOT NULL,
  periodo_fim                 DATE        NOT NULL,
  categoria                   TEXT        DEFAULT 'Publishers',
  conteudo_publicado          INT,
  seguidores_facebook_total   BIGINT,
  seguidores_facebook_normal  BIGINT,
  novos_seguidores_periodo    INT,
  novos_seguidores_normal     INT,
  interacoes_conteudo         BIGINT,
  interacoes_normal           INT,
  observacoes                 TEXT,
  fonte_imagem                TEXT,
  criado_em                   TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de insights de posts individuais
CREATE TABLE IF NOT EXISTS fb_insights_posts (
  id                BIGSERIAL PRIMARY KEY,
  data_captura      DATE,
  titulo_post       TEXT        NOT NULL,
  publicado_por     TEXT        DEFAULT 'Bruno Flacon',
  tipo_post         TEXT,       -- 'texto', 'video', 'foto', 'live'
  impressoes        BIGINT,
  alcance           BIGINT,
  engajamento       BIGINT,
  reacoes_curtida   INT         DEFAULT 0,
  reacoes_amor      INT         DEFAULT 0,
  reacoes_haha      INT         DEFAULT 0,
  reacoes_uau       INT         DEFAULT 0,
  reacoes_triste    INT         DEFAULT 0,
  reacoes_raiva     INT         DEFAULT 0,
  total_reacoes     INT,
  comentarios       INT,
  compartilhamentos INT,
  salvamentos       INT,
  visualizacoes     BIGINT,
  tempo_visualizacao_total TEXT,
  tempo_medio_visualizacao TEXT,
  retencao_pico_em  TEXT,
  duracao_video     TEXT,
  visibilidade_pct_seguidores   NUMERIC(5,2),
  visibilidade_pct_nao_seguidores NUMERIC(5,2),
  fonte_imagem      TEXT,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de eventos/alertas de moderação e problemas
CREATE TABLE IF NOT EXISTS fb_alertas_moderacao (
  id              BIGSERIAL PRIMARY KEY,
  data_evento     DATE,
  tipo_alerta     TEXT,   -- 'direitos_autorais', 'informacao_falsa', 'restricao_monetizacao', 'silenciamento'
  entidade        TEXT,   -- página, grupo, perfil
  nome_entidade   TEXT,
  descricao       TEXT,
  status_conta    TEXT,
  status_monetizacao TEXT,
  status_recomendacoes TEXT,
  acao_tomada     TEXT,
  fonte_imagem    TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de grupos do Facebook
CREATE TABLE IF NOT EXISTS fb_grupos (
  id              BIGSERIAL PRIMARY KEY,
  nome_grupo      TEXT        NOT NULL,
  tipo            TEXT,       -- 'Privado', 'Público'
  membros         BIGINT,
  status_grupo    TEXT,
  problemas       TEXT,
  data_captura    DATE,
  fonte_imagem    TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. DADOS - RESUMOS POR PERÍODO (Visão Geral da Página)
-- ============================================================

-- Conflito por período: usar ON CONFLICT para evitar duplicatas
-- Mesclando dados de imagens que mostram o mesmo período com mesmos valores

-- Período: 19 mai 2024 - 23 mai 2024 (Esta semana)
INSERT INTO fb_resumo_periodo
  (periodo_inicio, periodo_fim, impressoes, alcance, interacoes_conteudo,
   seguidores_total, cliques_link,
   variacao_impressoes_pct, variacao_alcance_pct, variacao_interacoes_pct,
   fonte_imagem)
VALUES
  ('2024-05-19', '2024-05-23', 13300, 5700, 1900, 20000, 0,
   -37.4, -30.3, -44.7,
   'Captura de tela 2024-05-24 011757.png')
ON CONFLICT DO NOTHING;

-- Período: 25 abr 2024 - 22 mai 2024 (28 dias: fidelidade/seguidores)
INSERT INTO fb_resumo_periodo
  (periodo_inicio, periodo_fim, impressoes, alcance, interacoes_conteudo,
   seguidores_total, cliques_link,
   seguidores_liquidos, novos_seguidores, deixaram_de_seguir,
   variacao_seg_liquidos_pct, variacao_novos_seg_pct, variacao_deixaram_pct,
   fonte_imagem)
VALUES
  ('2024-04-25', '2024-05-22', NULL, NULL, NULL,
   20000, NULL,
   59, 95, 36,
   -25.3, NULL, NULL,
   'Captura de tela 2024-05-24 010657.png / 010726.png')
ON CONFLICT DO NOTHING;

-- Período: 30 nov 2023 - 23 mai 2024 (longo)
INSERT INTO fb_resumo_periodo
  (periodo_inicio, periodo_fim, impressoes, alcance, interacoes_conteudo,
   seguidores_total, cliques_link,
   seguidores_liquidos, novos_seguidores, deixaram_de_seguir, curtidas_pagina,
   variacao_impressoes_pct, variacao_alcance_pct, variacao_interacoes_pct,
   variacao_seg_liquidos_pct, variacao_novos_seg_pct, variacao_deixaram_pct,
   fonte_imagem)
VALUES
  ('2023-11-30', '2024-05-23', 674900, 239200, 67100,
   20000, 340,
   957, 1203, 246, 4122,
   -96.8, -95.4, -92.8,
   -92.2, -90.8, -71.1,
   'Captura de tela 2024-05-24 012610.png')
ON CONFLICT DO NOTHING;

-- Período: 01 out 2023 - 23 mai 2024 (desde início / audiência histórica)
INSERT INTO fb_resumo_periodo
  (periodo_inicio, periodo_fim, impressoes, alcance, interacoes_conteudo,
   seguidores_total, cliques_link,
   seguidores_liquidos, novos_seguidores, deixaram_de_seguir, curtidas_pagina,
   variacao_impressoes_pct, variacao_alcance_pct, variacao_interacoes_pct, variacao_seg_liquidos_pct,
   variacao_novos_seg_pct, variacao_deixaram_pct,
   fonte_imagem)
VALUES
  ('2023-10-01', '2024-05-23', 8100000, 1700000, 384400,
   20000, 349,
   4648, 5134, 486, 4122,
   -41.5, -65.4, -38.5, -48.7,
   -47.1, -23.5,
   'Captura de tela 2024-05-24 013300.png / 013627.png')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. DADOS - ATIVIDADE DOS SEGUIDORES
-- ============================================================

-- 10 jan 2025 - 6 fev 2025 (28 dias)
INSERT INTO fb_atividade_seguidores
  (periodo_inicio, periodo_fim, novos_seguidores, deixaram_de_seguir,
   seguidores_liquidos, variacao_liquidos_pct,
   seguidores_engajados, seguidores_engajados_anterior,
   visualizadores_que_retornam, periodo_mais_ativo,
   fonte_imagem)
VALUES
  ('2025-01-10', '2025-02-06', 40, 20,
   20, 2.1,
   1300, NULL,
   242, 'Sextas-feiras às 15h PST',
   'Captura de tela Facebook n° de novos seguidores 2025-02-07 205209.png / Seguidores que deixaram de seguir 2025-02-07 205748.png / Seguidores.png')
ON CONFLICT DO NOTHING;

-- 25 abr 2024 - 22 mai 2024 (28 dias)
INSERT INTO fb_atividade_seguidores
  (periodo_inicio, periodo_fim, novos_seguidores, novos_seguidores_anterior,
   deixaram_de_seguir, deixaram_de_seguir_anterior,
   seguidores_liquidos, variacao_liquidos_pct,
   visualizadores_que_retornam,
   fonte_imagem)
VALUES
  ('2024-04-25', '2024-05-22', 95, 101,
   36, 22,
   59, -25.3,
   235,
   'Captura de tela 2024-05-24 010657.png')
ON CONFLICT DO NOTHING;

-- 29 abr 2024 - 26 mai 2024 (28 dias - seguidores engajados)
INSERT INTO fb_atividade_seguidores
  (periodo_inicio, periodo_fim, seguidores_engajados, seguidores_engajados_anterior,
   fonte_imagem)
VALUES
  ('2024-04-29', '2024-05-26', 1518, 1238,
   'Captura de tela Seguidores Engajados 2024-05-27 200056.png')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. DADOS - MÉTRICAS DE VÍDEO E RETENÇÃO
-- ============================================================

-- 01 out 2023 - 23 mai 2024 (grande histórico)
INSERT INTO fb_metricas_video_periodo
  (periodo_inicio, periodo_fim,
   minutos_visualizados_total, visualizacoes_3s, visualizacoes_15s, reproducoes_1min,
   retencao_15s_pct,
   pct_origem_recomendacoes, pct_origem_seguidores, pct_origem_compartilhamentos,
   observacoes, fonte_imagem)
VALUES
  ('2023-10-01', '2024-05-23',
   6500000, 4903568, 2500984, 1343538,
   51.0,
   94.1, 4.55, 1.36,
   'Pico de visualizações em 25 de outubro de 2023. Pico de reproduções ≥1min também em 25 out 2023.',
   'Captura de tela 2024-05-24 015812.png / 015834.png / 020128.png')
ON CONFLICT DO NOTHING;

-- 25 abr 2024 - 22 mai 2024 (28 dias - retenção)
INSERT INTO fb_metricas_video_periodo
  (periodo_inicio, periodo_fim,
   minutos_visualizados_total, visualizacoes_completas,
   retencao_15s_pct,
   pct_origem_recomendacoes, pct_origem_seguidores, pct_origem_compartilhamentos,
   variacao_visualizacoes_completas_pct,
   fonte_imagem)
VALUES
  ('2024-04-25', '2024-05-22',
   45100000, 4500,
   51.5,
   15.9, 77.8, 6.25,
   108.0,
   'Captura de tela 2024-05-24 010949.png')
ON CONFLICT DO NOTHING;

-- 29 abr 2024 - 26 mai 2024 (28 dias - retenção variante)
INSERT INTO fb_metricas_video_periodo
  (periodo_inicio, periodo_fim,
   minutos_visualizados_total, visualizacoes_completas,
   retencao_15s_pct,
   pct_origem_recomendacoes, pct_origem_seguidores, pct_origem_compartilhamentos,
   fonte_imagem)
VALUES
  ('2024-04-29', '2024-05-26',
   43500000, 34000,
   NULL,
   16.8, 76.1, 7.07,
   'Captura de tela 2024-05-27 200459.png / Captura de telaccc 2024-05-27 200459.png')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. DADOS - AVALIAÇÃO COMPARATIVA
-- ============================================================

-- 10 jan 2025 - 6 fev 2025
INSERT INTO fb_avaliacao_comparativa
  (periodo_inicio, periodo_fim, categoria,
   conteudo_publicado, seguidores_facebook_total, seguidores_facebook_normal,
   novos_seguidores_periodo, novos_seguidores_normal,
   interacoes_conteudo, interacoes_normal,
   observacoes, fonte_imagem)
VALUES
  ('2025-01-10', '2025-02-06', 'Publishers',
   24, 20100, 1500,
   40, 9,
   3900, 110,
   'Conteúdo publicado mais alto do que o normal. Seguidores e interações também mais altas que o normal.',
   'Captura de tela Facebook n° de novos seguidores 2025-02-07 205209.png')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. DADOS - INSIGHTS DE POSTS INDIVIDUAIS
-- ============================================================

-- Posts do dia 27 mai 2024 (capturados em sequência - insights individuais)
-- Nota: datas dos posts não visíveis explicitamente, mas capturas são de 27/05/2024
-- "13h atrás", "12h atrás", "11h atrás", "10h atrás", "9h atrás" indicam publicação em ~27/05/2024

INSERT INTO fb_insights_posts
  (data_captura, titulo_post, publicado_por, tipo_post,
   impressoes, alcance, engajamento,
   reacoes_curtida, reacoes_amor, reacoes_haha, reacoes_uau, reacoes_triste, reacoes_raiva,
   total_reacoes,
   fonte_imagem)
VALUES
  ('2024-05-27',
   '#claudiocaivano traz fatos na #comissãodesegurançapublica que desmontam a...',
   'Bruno Flacon', 'texto',
   170, 170, 114,
   66, 2, 0, 0, 0, 2,
   69,
   'Captura de tela 2024-05-27 194331.png'),

  ('2024-05-27',
   'O abuso de Poder está claro para Adv. #gabrielaritter atua na defesa de #JorginhoCardoso um dos 1.500 pres...',
   'Bruno Flacon', 'texto',
   145, 144, 46,
   14, 0, 0, 0, 0, 1,
   14,
   'Captura de tela 2024-05-27 194536.png'),

  ('2024-05-27',
   'O Dep #ZéTrovão disse na #comissãodesegurançapublica em comparação com a manifestação de 2015 no...',
   'Bruno Flacon', 'texto',
   152, 152, 32,
   17, 0, 0, 0, 0, 0,
   17,
   'Captura de tela 2024-05-27 194638.png'),

  ('2024-05-27',
   'O #advogado #AlexanderBrasil solicita a transferência de #SilvineiVasques ex-diretor da #prf ao...',
   'Bruno Flacon', 'texto',
   69, 69, 20,
   10, 0, 0, 1, 0, 0,
   12,
   'Captura de tela 2024-05-27 194731.png'),

  ('2024-05-27',
   'O Dep. #rodrigovaladares vai lutar para obter #anistia e #liberdade aos presos do #08dejaneiro sendo que o...',
   'Bruno Flacon', 'texto',
   211, 211, 49,
   24, 0, 0, 0, 0, 0,
   24,
   'Captura de tela 2024-05-27 194923.png'),

  ('2024-05-27',
   '#marianaeustáquio filha no primeiro preso político #osvaldoeustáquio chama atenção para os filhos dos...',
   'Bruno Flacon', 'texto',
   73, 73, 15,
   10, 0, 0, 0, 0, 0,
   10,
   'Captura de tela 2024-05-27 195023.png'),

  ('2024-05-27',
   '#deputado #RobertoMonteiro indignado por manterem preso #gabrielmonteiro preso injustamente seu filho...',
   'Bruno Flacon', 'texto',
   80, 80, 14,
   9, 0, 0, 0, 0, 0,
   9,
   'Captura de tela 2024-05-27 195113.png'),

  ('2024-05-27',
   'A #carolinabarretosiebra advoga para associação dos familiares e vítimas do #08dejaneiro destacou sua...',
   'Bruno Flacon', 'texto',
   80, 80, 35,
   16, 2, 0, 0, 0, 0,
   18,
   'Captura de tela 2024-05-27 195210.png'),

  ('2024-05-27',
   'Dep.#nikolasferreira, expõe sua indignação pela perseguição ao povo estar de verde e amarelo se fosse ...',
   'Bruno Flacon', 'texto',
   100, 100, 12,
   7, 0, 0, 0, 0, 0,
   7,
   'Captura de tela 2024-05-27 195256.png'),

  ('2024-05-27',
   'O adv. #Fernando foi a voz do #capitãoassunção na #comissãodesegurançapublica por causa da cautelar...',
   'Bruno Flacon', 'texto',
   64, 64, 8,
   5, 0, 0, 0, 0, 0,
   5,
   'Captura de tela 2024-05-27 195342.png'),

  ('2024-05-27',
   '#jeanwillis destaca que #paulopimenta, criou um gabinete do ódio para denegrir a sua imagem junto co...',
   'Bruno Flacon', 'texto',
   116, 116, 35,
   16, 0, 0, 0, 0, 1,
   16,
   'Captura de tela 2024-05-27 195434.png');

-- Vídeo Eduardo Bolsonaro (#USAID #gate) - dados capturados em 07/02/2025
-- Mesmo vídeo aparece em 2 screenshots, com dados levemente divergentes (96→141 reações por tempo de captura)
-- Mesclando: usando dados mais completos do segundo screenshot (insights expandidos)
INSERT INTO fb_insights_posts
  (data_captura, titulo_post, publicado_por, tipo_post,
   impressoes, alcance, engajamento,
   reacoes_curtida, reacoes_amor, reacoes_haha, reacoes_uau, reacoes_triste, reacoes_raiva,
   total_reacoes, comentarios, compartilhamentos, salvamentos,
   visualizacoes, tempo_visualizacao_total, tempo_medio_visualizacao,
   retencao_pico_em, duracao_video,
   visibilidade_pct_seguidores, visibilidade_pct_nao_seguidores,
   fonte_imagem)
VALUES
  ('2025-02-07',
   'Eduardo Bolsonaro Expõe a #USAID #gate que interferiu em vários países inclusive nas #eleições2022 impedindo o #PresidenteJairMessiasBolsonaro de contestar o modus operandi... em Câmara dos Deputados',
   'Bruno Flacon', 'video',
   1765, 890, 156,
   141, 1, 2, 1, 0, 1,
   NULL, 22, 37, 1,
   1765, '13 h 49 min', '34s',
   '0:18', '3:04',
   79.0, 21.0,
   'Captura de tela Facebook Alcance reduzido pelo tanto de vzualização 2025-02-07 210613.png / Analise das Publicações/Captura de tela 2025-02-07 210947.png / 211041.png');

-- Nota: visualizações ≥3s = 973, visualizações ≥1min = 243 para este vídeo
UPDATE fb_insights_posts
SET engajamento = 156
WHERE titulo_post LIKE '%Eduardo Bolsonaro Expõe a #USAID%';

-- Vídeo #rombofiscal / #gaucha "Lula é Confrontado com Dados" - capturado 07/02/2025
INSERT INTO fb_insights_posts
  (data_captura, titulo_post, publicado_por, tipo_post,
   reacoes_curtida, reacoes_amor, reacoes_haha, reacoes_uau, reacoes_triste, reacoes_raiva,
   total_reacoes, comentarios, compartilhamentos, salvamentos,
   tempo_medio_visualizacao, retencao_pico_em, duracao_video,
   fonte_imagem)
VALUES
  ('2025-02-07',
   'Lula é Confrontado com Dados do #rombofiscal que Comprova R$ 1 TRILHÃO de Déficit histórico em menos de um ano #gaucha Rebate e diz "Nunca Tivemos Ajuda do #desgoverno Federal" — em Tupã. #webradiovitoria #ForaLula',
   'Bruno Flacon', 'video',
   348, 9, 24, 7, 5, 17,
   NULL, 36, 161, 1,
   '28s', '0:05', '1:31',
   'Captura de tela Facebook 2025-02-07 211145.png / 211235.png');

-- Live Manifestação Av. Paulista 25/fev (Bolsonaro) - contestada por direitos autorais
INSERT INTO fb_insights_posts
  (data_captura, titulo_post, publicado_por, tipo_post,
   total_reacoes, comentarios, visualizacoes, duracao_video,
   fonte_imagem)
VALUES
  ('2024-02-25',
   '🔴 Ao vivo! 👉 Manifestação 25/Fev Direto da Av.Paulista Bolsonaro 📗 - Manifestação Agora! Direto da o Capitão do Povo e e a ... em Av. Paulista - São Paulo - SP',
   'Bruno Flacon', 'live',
   305, 123, 3800, '2:30:46',
   'Captura de tela Live já contestada 2024-04-21 160749.png');

-- ============================================================
-- 7. DADOS - ALERTAS E MODERAÇÃO
-- ============================================================

-- Alerta de Direitos Autorais - Vídeo Eduardo Bolsonaro / Live Av. Paulista
INSERT INTO fb_alertas_moderacao
  (data_evento, tipo_alerta, entidade, nome_entidade, descricao,
   acao_tomada, fonte_imagem)
VALUES
  ('2025-02-12', 'direitos_autorais', 'pagina', 'Web Rádio Vitória / Bruno Flacon',
   'Contestação de direitos autorais em vídeo. Vídeo de Live na Av. Paulista (25/fev) silenciado em determinados países por direitos de música.',
   'Usuário tentou contestar via "Apresentar contestação" mas não conseguiu concluir',
   'Captura de tela Não consigo Contestar Direitos Autorais 2025-02-12 022311.png / Live já contestada 2024-04-21 160749.png'),

  -- Restrição de monetização - Página Ricardo do Val
  ('2025-01-14', 'restricao_monetizacao', 'pagina', 'Ricardo do Val',
   'Publicação movida para baixo no Feed por conter informação falsa segundo verificador de fatos independente. Capacidade de ganhar dinheiro em risco.',
   'Monetização em risco - publicação movida para baixo no Feed',
   'Analise das Publicações/ricardo Captura de tela 2025-02-21 204147.png / 204432.png / 204708.png'),

  -- Informação falsa - Grupo Tupã Pela Pátria
  ('2025-01-21', 'informacao_falsa', 'grupo', 'Tupã Pela Pátria',
   'Edson S Da Silva compartilhou publicação classificada como Falso por verificador de fatos. Grupo com status "O grupo tem alguns problemas".',
   'Conteúdo sinalizado como informação falsa em grupo',
   'Analise das Publicações/Restrição no Grupo Captura de tela 2025-02-21 195537.png / restrição grupo 200358.png'),

  -- Silenciamento de vídeo Live por música
  ('2024-02-25', 'silenciamento', 'video', 'Web Rádio Vitória',
   'Vídeo Live da Manifestação da Av. Paulista silenciado em determinados países nos quais a Meta não tem direitos sobre a música.',
   'Vídeo silenciado automaticamente pela Meta',
   'Captura de tela Live já contestada 2024-04-21 160749.png');

-- ============================================================
-- 8. DADOS - GRUPOS DO FACEBOOK
-- ============================================================

-- Grupo: Tupã Pela Pátria (membros diferentes em imagens distintas = diferentes datas)
INSERT INTO fb_grupos
  (nome_grupo, tipo, membros, status_grupo, problemas, data_captura, fonte_imagem)
VALUES
  ('Tupã Pela Pátria', 'Privado', 1999, 'Com problemas',
   'Informações falsas compartilhadas por membros no grupo - sinalizado pelo Facebook',
   '2024-02-25',
   'Captura de tela Live já contestada 2024-04-21 160749.png'),

  ('Tupã Pela Pátria', 'Privado', 2300, 'Com problemas',
   'Conteúdo classificado como Falso por verificadores independentes - Grupo tem alguns problemas',
   '2025-02-21',
   'Analise das Publicações/restrição grupo Captura de tela 2025-02-21 200358.png');

-- ============================================================
-- 9. DADOS - VÍDEOS COM MÉTRICAS ADICIONAIS (Eduardo Bolsonaro)
-- ============================================================

-- Tabela auxiliar: métricas detalhadas de visualização por vídeo
CREATE TABLE IF NOT EXISTS fb_metricas_video_individual (
  id                          BIGSERIAL PRIMARY KEY,
  post_id                     BIGINT      REFERENCES fb_insights_posts(id) ON DELETE CASCADE,
  data_captura                DATE,
  titulo_post                 TEXT,
  visualizacoes_3s            BIGINT,
  visualizacoes_1min          BIGINT,
  tempo_total_visualizacao    TEXT,
  tempo_medio_visualizacao    TEXT,
  duracao_video               TEXT,
  retencao_saida_em           TEXT,
  fonte_imagem                TEXT,
  criado_em                   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fb_metricas_video_individual
  (data_captura, titulo_post,
   visualizacoes_3s, visualizacoes_1min,
   tempo_total_visualizacao, tempo_medio_visualizacao,
   duracao_video, retencao_saida_em,
   fonte_imagem)
VALUES
  ('2025-02-07',
   'Eduardo Bolsonaro - #USAID #gate - Câmara dos Deputados',
   973, 243,
   '13 h 49 min', '34s',
   '3:04', '0:18',
   'Captura de tela Facebook Alcance reduzido pelo tanto de vzualização 2025-02-07 210613.png / Analise das Publicações/Captura de tela 2025-02-07 211041.png');

-- ============================================================
-- 10. VIEW CONSOLIDADA (opcional - facilita consultas no Supabase)
-- ============================================================

CREATE OR REPLACE VIEW vw_fb_resumo_geral AS
SELECT
  'resumo_periodo'      AS tipo,
  periodo_inicio,
  periodo_fim,
  NULL::TEXT            AS titulo,
  impressoes,
  alcance,
  interacoes_conteudo   AS interacoes,
  seguidores_total,
  novos_seguidores,
  deixaram_de_seguir,
  curtidas_pagina,
  NULL::BIGINT          AS reacoes,
  NULL::INT             AS comentarios,
  NULL::INT             AS compartilhamentos,
  fonte_imagem
FROM fb_resumo_periodo
UNION ALL
SELECT
  'atividade_seguidores',
  periodo_inicio,
  periodo_fim,
  NULL,
  NULL, NULL, NULL,
  NULL,
  novos_seguidores,
  deixaram_de_seguir,
  NULL,
  NULL, NULL, NULL,
  fonte_imagem
FROM fb_atividade_seguidores
UNION ALL
SELECT
  'post_individual',
  data_captura        AS periodo_inicio,
  data_captura        AS periodo_fim,
  titulo_post,
  impressoes,
  alcance,
  engajamento,
  NULL,
  NULL, NULL, NULL,
  total_reacoes,
  comentarios,
  compartilhamentos,
  fonte_imagem
FROM fb_insights_posts;

-- ============================================================
-- FIM DO SCRIPT
-- Total de registros inseridos:
--   fb_resumo_periodo            : 4 registros (4 períodos distintos)
--   fb_atividade_seguidores      : 3 registros (3 períodos distintos)
--   fb_metricas_video_periodo    : 3 registros (3 períodos distintos)
--   fb_avaliacao_comparativa     : 1 registro
--   fb_insights_posts            : 14 registros (11 posts + 2 vídeos + 1 live)
--   fb_alertas_moderacao         : 4 registros
--   fb_grupos                    : 2 registros (mesmo grupo em datas diferentes)
--   fb_metricas_video_individual : 1 registro (vídeo Eduardo Bolsonaro)
-- ============================================================
