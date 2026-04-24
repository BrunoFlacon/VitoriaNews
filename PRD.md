# Product Requirements Document (PRD) - Vitória Net & Web Rádio Vitória

## 1. Visão Geral do Produto
O **Vitória Net (Social Canvas Hub)** é uma plataforma integrada de inteligência social, automação de engajamento e portal de notícias imponente. O ecossistema inclui a **Web Rádio Vitória**, formando uma agência digital completa dedicada à credibilidade jornalística e monetização de alta performance.

### 1.1 Objetivo de Negócio
Funcionar como o "Cérebro" de uma agência de comunicação proprietária, centralizando a produção de conteúdo, a autoridade de marca do proprietário e a geração de receita via assinaturas e anúncios.

---

## 2. Público-Alvo (Personas)
1.  **Proprietário/Agente de Mídia:** Foco em autoridade e presença digital imponente.
2.  **Jornalistas e Editores:** Busca por pautas quentes via Radar AI e redação rápida.
3.  **Estagiários de Produção:** Triagem automatizada de notícias virais.
4.  **Seguidores/Assinantes:** Consumidores de conteúdo premium e membros do Clube de Assinaturas.

---

## 3. Infraestrutura Técnica (Concluída)

### 3.1 Stack de Tecnologias
- **Frontend:** React (Vite.js), Tailwind CSS, Framer Motion (Animações), Lucide Icons.
- **Backend (Automação):** Node.js com Express para o servido de Robô WhatsApp.
- **Banco de Dados & Auth:** Supabase (PostgreSQL) com sistema de Migrations robusto.
- **Visualização de Dados:** Recharts para gráficos de radar e tendências.

### 3.2 Módulos Funcionais Implementados
- **Radar AI News:** Integração com Google News e monitoramento de trends.
- **Bruno Profile (Media Kit Builder):** Ferramenta visual interativa para criação de perfis de autoridade.
- **Dashboard Central:** Gestão de conexões sociais e métricas básicas.
- **BotZap (Versão Web):** Chatbot funcional para respostas automatizadas e triagem de pautas.
- **Engine de Temas:** Suporte dinâmico a Dark Mode e personalização estética premium.

---

## 4. O que Falta Concluir e Corrigir (Gap Analysis)

### 4.1 Automação e Resiliência (Alta Prioridade)
- **Migração para API Oficial do WhatsApp:** Substituir `whatsapp-web.js` pela API Oficial para garantir estabilidade e eliminar riscos de bloqueio.
- **Resposta de Comentários:** Implementar lógica de escuta e resposta automática de comentários no site e redes sociais.
- **Estabilização do Robô:** Refinar a IA (Groq/OpenAI) para vendas diretas de assinaturas no chat.

### 4.2 Monetização e Checkout (Pendente)
- **Integração de Gateway:** Implementar checkout seguro (Stripe/Pagar.me) para o Clube de Assinaturas.
- **Suporte Multi-moedas:** Configuração de cobrança em BRL, USD (e futuramente BTC).
- **Módulo AdSense:** Slots otimizados para publicidade Google no portal e notícias.

### 4.3 Analytics e Rastreamento
- **Métricas Unificadas:** Cruzamento de engajamento de todas as redes e do site da Web Rádio em um único painel.
- **Pixel Tracking:** Implementação completa de rastreio de comportamento de leads.

---

## 5. Roadmap de Evolução (Fases Futuras)

### Fase 1: Ativação Comercial
- Lançamento do **Clube de Assinaturas** com área de membros exclusiva.
- Ativação de monetização de anúncios (Google AdSense).

### Fase 2: Expansão de Inteligência
- **IA de Vídeos:** Automação para gerar vídeos curtos (Reels/TikTok) baseados nas notícias do Radar.
- **Gestão de Tráfego:** Módulo para criação e acompanhamento de anúncios pagos (Meta/Google Ads).

### Fase 3: Internacionalização
- Tradução de interface e ativação de recebimentos globais.

---

## 6. Benchmarks e Referências
- **Nacionais:** G1, Poder 360, Revista Oeste, Jornal O Globo.
- **Locais:** Mais Tupã, Tupã City, Rádio Tupã.
- **Segmento:** O Código 22, O Cruzeiro Notícias.

---

## 7. Requisitos Não-Funcionais
- **Credibilidade:** Design limpo, tipografia premium e carregamento instantâneo.
- **Segurança:** Sistema de monitoramento de acessos (Attack Detection) integrado ao banco.
- **Conformidade:** Alinhamento rigoroso com a LGPD para armazenamento de dados de leads e assinantes.
