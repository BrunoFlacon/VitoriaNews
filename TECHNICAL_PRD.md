# Documento de Requisitos Técnicos (PRD) - Vitória Net & Social Canvas Hub

Este documento fornece uma visão estruturada de 360 graus de todo o sistema, detalhando a arquitetura, páginas, ferramentas, banco de dados e design. Ele serve como base para auditorias, detecção de gargalos e planejamento de evolução.

---

## 1. Arquitetura e Stack Tecnológica

O sistema é construído sobre uma arquitetura moderna e escalável de "Frontend-as-a-Platform":

- **Frontend**: React 18 com Vite.js para builds ultrarrápidos.
- **Linguagem**: TypeScript (Strict Mode) para segurança de tipos.
- **Estilização**: Tailwind CSS com sistema de design baseado em variáveis HSL.
- **Animações**: Framer Motion para micro-interações fluidas.
- **Backend (Serverless)**: Supabase Edge Functions (Deno) para lógica de integração pesada.
- **Banco de Dados**: PostgreSQL (via Supabase) com PostgREST para APIs automáticas.
- **Autenticação**: Supabase Auth (Email/Senha e OAuth2).
- **Armazenamento**: Supabase Storage para mídias e documentos.
- **IA/ML**: Integração com Groq, OpenAI e Gemini via MCP (Model Context Protocol).

---

## 2. Estrutura de Páginas e Rotas

### 2.1 Páginas Públicas / Portal
- `/` (`PortalLanding.tsx`): Home do portal de notícias, com grid dinâmico e temas avançados.
- `/news` (`News.tsx`): Feed completo de notícias categorizadas.
- `/article/:slug` (`ArticlePage.tsx`): Visualização de leitura de artigos com suporte a SEO.
- `/bruno-profile` (`BrunoProfile.tsx`): Media Kit interativo para autoridade de marca.
- `/privacy`, `/terms`: Páginas de conformidade legal.

### 2.2 Autenticação
- `/login` (`Login.tsx`): Interface de acesso com recuperação de senha.
- `/register` (`Register.tsx`): Cadastro de novos usuários/agentes.
- `/auth/callback` (`OAuthCallback.tsx`): Handler para retornos de login social (Google, etc).

### 2.3 Área Restrita (Dashboard)
- `/dashboard` (`Dashboard.tsx`): Orquestrador central que gerencia as seguintes ferramentas (Tabs):

| Tab ID | Componente | Descrição |
| :--- | :--- | :--- |
| `dashboard` | `RecentPosts.tsx` / `StatsCard.tsx` | Visão geral rápida de métricas e posts recentes. |
| `analytics` | `AdvancedAnalytics.tsx` | Dashboards complexos com Recharts (Gráficos de Radar, Linhas). |
| `create` | `CreatePostPanel.tsx` | Editor multi-plataforma com visualização em tempo real. |
| `messaging` | `MessagingView.tsx` | Hub de mensagens unificado (WhatsApp, Telegram, etc). |
| `news` | `NewsPortal.tsx` / `TrendsView.tsx` | Radar AI monitorando tendências globais e locais. |
| `robot` | `RobotBuilder.tsx` | Configuração de comportamento e personalidade da IA. |
| `networks` | `SocialNetworkCard.tsx` | Gestão de conexões OAuth e credenciais de API. |
| `documents` | `DocumentsView.tsx` | Gerenciador de arquivos e ativos de mídia. |
| `stories` | `StoriesLivesView.tsx` | Gestão de conteúdo efêmero e transmissões ao vivo. |
| `settings` | `SettingsView.tsx` | Configurações técnicas do sistema e preferências do usuário. |

---

## 3. Detalhamento das Ferramentas Core

### 3.1 Radar AI News (`radarnews.tsx`)
- **Função**: Coleta e processa notícias via feeds RSS e Google News.
- **Capacidades**: Classificação automática por relevância, geração de resumos via IA e extração de sentimentos.
- **Gargalo Identificado**: Dependência de Edge Functions que podem sofrer timeout em coletas massivas.

### 3.2 Bruno Profile Builder (`BrunoProfile.tsx`)
- **Função**: CMS visual para criação de Media Kits.
- **Design**: Layout ultra-premium, suporte a temas escuros profundos e botões animados.
- **Integração**: Conectado à tabela `profiles` para persistência em tempo real.

### 3.3 Hub de Mensagens (`MessagingView.tsx`)
- **Função**: Centraliza chats de múltiplas fontes.
- **IA**: BotZap integrado para triagem e automação de vendas.
- **Status**: Em transição de `whatsapp-web.js` (Web Automation) para API Oficial (Cloud API).

---

## 4. Estrutura do Banco de Dados (Schema)

Principais tabelas e suas funções:

| Tabela | Função Principal |
| :--- | :--- |
| `profiles` | Dados de perfil, biografia e configurações de tema do Media Kit. |
| `social_accounts` | Armazena tokens OAuth e metadados de contas conectadas. |
| `account_metrics` | Histórico diário de seguidores, likes e engajamento. |
| `messages` | Logs de conversas e mensagens enviadas/recebidas. |
| `bot_settings` | Configurações de personalidade da IA, API Keys e comportamentos. |
| `trends` | Tópicos quentes capturados pelo Radar AI. |
| `articles` | Conteúdo do portal de notícias criado por usuários ou gerado por IA. |
| `subscribers` | Base de leads e assinantes do clube de benefícios. |
| `attack_logs` | Registro de tentativas de intrusão e segurança (WAF customizado). |
| `advanced_themes` | Configurações JSON para a engine de temas dinâmicos do portal. |

---

## 5. Estrutura de Layout e Design System

### 5.1 Tokens de Design (Tailwind / CSS Variables)
O sistema utiliza um esquema de cores dinâmico injetado via `:root`:

- **Primária**: `#4F8AFF` (Azul Elétrico) -> `#8B5CF6` (Vibrant Violet).
- **Fundo (Dark)**: `hsl(240 10% 3.9%)` - Um preto profundo e elegante.
- **Cards**: Vidro (Glassmorphism) com bordas sutis e blur.
- **Tipografia**:
  - `Inter`: Para interface e legibilidade técnica.
  - `Space Grotesk`: Para títulos imponentes e identidade visual.

### 5.2 Estrutura do Dashboard
1. **Sidebar (`Sidebar.tsx`)**: Colapsável, com navegação baseada em ícones Lucide e estados ativos com glow.
2. **Header (`Header.tsx`)**: Busca global, centro de notificações e seletor de perfil.
3. **Main Content**: Área de renderização dinâmica de abas com transições `AnimatePresence`.

---

## 6. Auditoria de Pontos Críticos (Erros e Gargalos)

### 6.1 Performance
- **Dashboard**: Muitos componentes pesados (`AdvancedAnalytics`, `MessagingView`) carregados simultaneamente podem causar lentidão no primeiro render.
- **Solução**: Implementar `React.lazy` e Suspense para carregamento sob demanda das abas.

### 6.2 Sincronização de Dados
- **OAuth**: Tokens do Instagram/Facebook expiram e o sistema precisa de uma lógica de refresh mais robusta.
- **Métricas**: A coleta de métricas é feita via Edge Function cron; se a conta tiver muitos posts, o limite de execução do Supabase pode ser atingido.

### 6.3 UX/UI
- **Configurações**: O componente `SettingsView.tsx` cresceu demais (antiga versão tinha >2000 linhas). Precisa ser modularizado em pequenos componentes de sub-configurações.

---

## 7. Próximos Passos para Auditoria Completa
1. **Teste de Carga**: Validar o comportamento do Hub de Mensagens com +1000 mensagens/hora.
2. **Varredura de Segurança**: Verificar permissões RLS (Row Level Security) em todas as novas tabelas.
3. **Audit de SEO**: Validar renderização no lado do servidor (SSR) para páginas do portal via Vite SSR ou pre-rendering.
