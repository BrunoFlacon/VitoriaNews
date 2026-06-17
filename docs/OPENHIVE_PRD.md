# OpenHive AI — Product Requirements Document (PRD)

> **Versão:** 1.0  
> **Data da Auditoria:** Junho/2026  
> **Repositório:** github.com/NetoNetoArreche/Projeto-Hive  
> **Tipo:** Plataforma Open-Source de Gestão de Conteúdo para Redes Sociais com IA

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 O que é o OpenHive

O **OpenHive AI** é uma plataforma completa, self-hosted e open-source para criação, gestão e publicação de conteúdo para redes sociais com Inteligência Artificial integrada. Unifica em um único painel: geração de imagens por IA, editor visual tipo Figma, extração de clipes de vídeo do YouTube, gestão de tarefas e projetos, funis de vendas com drag & drop, identidade visual de marcas (Brands), gerenciamento de equipe com permissões e um bot do Telegram para operar tudo de forma remota.

### 1.2 Proposta de Valor

| Para quem | Problema | Solução OpenHive |
|-----------|----------|-----------------|
| Criadores de conteúdo | Fluxo fragmentado entre várias ferramentas | Tudo em um painel dark-mode integrado |
| Agências de marketing | Sem controle de equipe + fluxo de aprovação | Roles, permissões por página, multi-Instagram |
| Educadores e infoprodutores | Gestão de projetos separada do conteúdo | Projetos com módulos ligados a tarefas e posts |
| Times de growth | Funis visuais complexos sem integração com conteúdo | Funil React Flow + posts sociais integrados |
| Desenvolvedores / power users | Sem API / automação possível | MCP Server com 40 tools para Claude, Cursor, VSCode |

### 1.3 Modelo de Acesso

- **Self-hosted** via Docker Compose (VPS, Coolify, Easypanel)
- **Licença Source Available** — uso pessoal e interno gratuito
- **Licença Comercial** necessária para SaaS / redistribuição

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Visão Geral (Diagrama Conceitual)

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTES                          │
│  Web Dashboard (3000) │ Telegram Bot │ MCP (3002)   │
└──────────┬────────────┴──────┬───────┴──────┬────────┘
           │                   │              │
           ▼                   ▼              ▼
┌──────────────────────────────────────────────────────┐
│               API REST — Express.js (3001)            │
│  Auth │ Posts │ Tasks │ Projects │ Funnels │ Brands   │
│  Generate │ Upload │ Instagram │ Video Clips │ Team   │
└─────┬────────┬───────┬────────┬───────┬──────────────┘
      │        │       │        │       │
      ▼        ▼       ▼        ▼       ▼
 PostgreSQL  Redis  MinIO/S3  Gemini  Renderer(3003)
  (Prisma)  (BullMQ) (Storage)  API   Puppeteer+Chromium
```

### 2.2 Stack Tecnológica Completa

| Camada | Tecnologia | Versão | Função |
|--------|-----------|--------|--------|
| **Frontend** | Next.js | 14 | SSR, roteamento, UI |
| **UI Components** | Tailwind CSS + shadcn/ui | 3.x | Design system dark mode |
| **Backend API** | Express.js + TypeScript | 5.x | REST API central |
| **ORM** | Prisma | 5.x | Abstração do banco |
| **Banco de Dados** | PostgreSQL | 16 | Dados relacionais |
| **Fila de Jobs** | BullMQ + Redis | 7.x | Agendamento + workers |
| **Storage** | MinIO (S3-compatible) | latest | Imagens e arquivos |
| **IA — Imagens** | Google Gemini | 2.5 Flash | Geração de imagens |
| **IA — Texto** | Google Gemini | 2.5 Flash | Legendas e refinamento |
| **Renderização HTML→PNG** | Puppeteer + Chromium | latest | Carrosseis HTML |
| **Funis (drag & drop)** | @xyflow/react (React Flow) | latest | Editor de funis visual |
| **Telegram Bot** | grammy.js | latest | Bot conversacional |
| **MCP Server** | MCP SDK TypeScript | latest | 40 tools para IDEs |
| **Vídeo** | Python + FFmpeg + yt-dlp | latest | YouTube Clips |
| **Orquestração** | Docker Compose | latest | Multi-container |
| **Proxy Reverso** | Traefik (via Coolify) | latest | SSL, roteamento |
| **Imagem pública (Instagram)** | Cloudinary | Free tier | Mirror para Meta API |

### 2.3 Pacotes do Monorepo

```
/
├── packages/
│   ├── api/          → Backend Express (porta 3001)
│   ├── web/          → Frontend Next.js (porta 3000)
│   ├── bot/          → Telegram Bot (grammy.js)
│   ├── mcp/          → MCP Server HTTP (porta 3002)
│   ├── mcp-cli/      → MCP CLI para IDEs via npx
│   └── shared/       → Tipos TypeScript compartilhados
├── scripts/
│   ├── renderer/     → HTML→PNG (Puppeteer, porta 3003)
│   └── video/        → Worker Python + FFmpeg
└── docker-compose.*.yml
```

### 2.4 Banco de Dados — Modelos Principais

| Modelo | Campos-chave | Relações |
|--------|-------------|---------|
| `User` | id, email, password, role, allowedPages | Post, Task, Project, Funnel, Brand, Setting, InstagramToken |
| `Brand` | id, name, logoUrl, 6 cores, 3 fontes, voiceTone, websiteUrl, instagramUrl | User |
| `Post` | id, caption, imageUrl, status, scheduledAt, isCarousel, mediaType, publishMode, editorState | User, PostImage |
| `PostImage` | id, imageUrl, order, prompt | Post |
| `InstagramToken` | id, accessToken, instagramUserId, username, isDefault, expiresAt | User |
| `Task` | id, title, status, priority, platform, recordDate, publishDate | User, Project |
| `Project` | id, title, status | User, ProjectModule, Task |
| `ProjectModule` | id, title, content, order, isRecorded, driveLink | Project |
| `Funnel` | id, title, description | User, FunnelStage |
| `FunnelStage` | id, title, color, order | Funnel, FunnelStep |
| `FunnelStep` | id, title, type, link, status, order | FunnelStage |
| `VideoClip` | id, sourceUrl, status, moments, clips | User |
| `Setting` | key, value | User |
| `Invitation` | email, role, token, expiresAt, allowedPages | User |

### 2.5 Enums do Sistema

```
PostStatus:    DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | FAILED
MediaType:     IMAGE | VIDEO | CAROUSEL
PublishMode:   FEED | REELS | STORIES
ImageSource:   NANOBANA | UPLOAD | URL
PostSource:    WEB | TELEGRAM | MCP
TaskStatus:    PENDING | IN_PROGRESS | COMPLETED | CANCELLED
TaskPriority:  LOW | MEDIUM | HIGH | URGENT
TaskPlatform:  YOUTUBE | INSTAGRAM | META_ADS | TIKTOK | OTHER
ProjectStatus: PLANNING | IN_PROGRESS | COMPLETED | ARCHIVED
FunnelStepType: LANDING_PAGE | LEAD_CAPTURE | EMAIL_SEQUENCE | SALES_PAGE | 
                CHECKOUT | UPSELL | THANK_YOU | WEBINAR | VIDEO | SOCIAL_POST | AD | OTHER
FunnelStepStatus: TODO | IN_PROGRESS | DONE
Role:          OWNER | ADMIN | EDITOR | VIEWER
```

---

## 3. MÓDULOS E FUNCIONALIDADES

### 3.1 DASHBOARD (/)

**Objetivo:** Visão geral operacional com dados do Instagram e posts recentes.

**Componentes:**
- **Cards de Estatísticas:** Total de posts / Rascunhos / Agendados / Publicados / Falhas
- **Próximos Posts:** Lista dos posts agendados para os próximos dias
- **Posts Recentes:** Últimos posts criados com status visual
- **Perfil do Instagram:** Avatar, @username, seguidores, follows, contagem de mídia, bio
- **Mídias Recentes do Instagram:** Grade de thumbnails com likes/comentários em hover
- **Seletor Multi-Conta:** Dropdown para trocar entre contas Instagram conectadas
- **Ações Rápidas:** Botões para criar post, ir ao editor, ir ao calendário, configurações

**API Calls:**
- `GET /api/posts?limit=5&status=SCHEDULED` → próximos posts
- `GET /api/posts?limit=5` → recentes
- `GET /api/instagram/profile` → dados do perfil IG
- `GET /api/instagram/accounts` → lista de contas conectadas

---

### 3.2 CRIAR POST (/posts/new)

**Objetivo:** Interface principal de criação de posts com geração IA e preview em tempo real.

**Modos de Criação:**
1. **Gerar com IA** — Prompt → Gemini gera imagem completa (texto + fundo)
2. **Para Editor Visual** — Prompt → Gemini gera apenas fundo → abre editor separado
3. **Upload Manual** — Arrastar/soltar ou clicar para enviar imagem
4. **Google Drive Link** — Cola URL de compartilhamento do Drive

**Campos do Formulário:**

| Campo | Tipo | Validação |
|-------|------|-----------|
| Prompt | Textarea | Obrigatório para geração |
| Quantidade de Imagens | Seletor 1–10 | Máximo 10 (carrossel) |
| Legenda | Textarea | Máx 2.200 chars |
| Hashtags | Input texto | Separadas por vírgula |
| Agendamento | DateTime-local | Futuro |
| Aspect Ratio | Seletor (1:1, 4:5, 9:16) | |
| Arquivo Anexo | Upload | PDF, DOC, XLS, PPT, TXT, CSV, imagens |
| Link Google Drive | URL | |

**Fluxo de Geração IA:**
1. Usuário digita prompt
2. Clica "Imagem Completa" → `POST /api/generate/image` (Gemini gera imagem final)
3. OU clica "Para Editor Visual" → gera fundo limpo + captura legenda → redireciona ao `/posts/visual-editor?postId=xxx`
4. Geração de legenda/hashtags é paralela à geração de imagem
5. Preview ao vivo no painel direito (mockup Instagram com header, ações, legenda)

**Carrossel:**
- 2+ imagens ativam automaticamente o modo carrossel
- Navegação com ChevronLeft/Right + dots indicator
- Contador "X/Y" no canto superior
- Botão de remover imagem individual
- Modal de fullscreen ao clicar na imagem

**Ações Finais:**
- **Rascunho** → `POST /api/posts` (status DRAFT)
- **Agendar** → `POST /api/posts` + `POST /api/posts/:id/schedule`
- **Publicar Agora** → `POST /api/posts` + `POST /api/posts/:id/publish`

---

### 3.3 EDITOR VISUAL (/posts/visual-editor)

**Objetivo:** Editor de slides estilo Figma para carrosseis com edição completa de layout, tipografia, fundo, sobreposição e brand identity.

**Arquitetura do Editor:**

```
VisualEditorPage
├── SlideStrip (tira de slides com drag & drop para reordenar)
│   ├── SlideThumb × N (miniaturas renderizadas)
│   └── AddSlide button
├── LivePreview (canvas 1080px renderizado via buildSlideHtml)
└── EditorSidebar (painel colateral de configurações)
    ├── Templates (hero, content, stat, quote, cta, list)
    ├── Conteúdo (title, subtitle, label, stat)
    ├── IA (gerar conteúdo, refinar com instrução natural)
    ├── Fundo (upload, generate IA, posição X/Y, zoom, flip, opacidade, infiniteCarousel)
    ├── Overlay (opacidade, estilo: base/gradiente/vinheta)
    ├── Slide BG (cor sólida + 15 padrões geométricos)
    ├── Tipografia Título (família, peso, cor, tamanho, espaçamento)
    ├── Tipografia Subtítulo (família, peso, cor, tamanho, espaçamento, lineHeight)
    ├── Posição (grid 3×3 de 9 posições)
    ├── Word Highlights (destaque por palavra: cor, bold, italic, underline, strikethrough)
    ├── Glass Effect (cor + opacidade)
    ├── Label Badge (pill/rounded/square, cor BG, cor texto)
    ├── Text Card (BG card ao redor do texto: opacidade, raio, padding, sombra)
    ├── Cantos (4 cantos: texto livre + ícones, glass, borda)
    ├── Logo (posição, URL personalizada, tamanho, badge de perfil)
    ├── Indicadores (dots de progresso do slide)
    ├── CTA (toggle + texto de chamada para ação)
    ├── Aspect Ratio (1:1, 4:5, 9:16)
    ├── Brand Selector (dropdown dos brands cadastrados)
    ├── Legenda + Hashtags (campo aberto)
    ├── Agendamento
    └── Templates Salvos (salvar/aplicar estilos)
```

**Templates de Slide Disponíveis:**

| Template | Nome | Campos | Posição Default |
|----------|------|--------|----------------|
| `hero` | Capa / Hook | title, subtitle | bottom-left |
| `content` | Conteúdo | label, title, subtitle | middle-center |
| `stat` | Dado / Stat | stat, title, subtitle | middle-center |
| `quote` | Citação | title, subtitle | middle-center |
| `cta` | CTA Final | title, subtitle, label | middle-center |
| `list` | Lista / Steps | label, title, subtitle | middle-left |

**Fontes Disponíveis:** 60 fontes do Google Fonts (Sans-serif, Serif, Display, Handwriting, Monospace)

**Padrões de Fundo:** 15 padrões geométricos (grid, dots, h-lines, v-lines, d-lines, checkerboard, triangles, hexagons, crosses, zigzag, waves, diamonds, stars)

**IA no Editor:**
- **"Gerar Conteúdo"** → captura o tema da legenda/título → `POST /api/generate/caption` → popula title e subtitle
- **"Refinar Slide"** → campo de instrução em linguagem natural (ex: "deixe mais curto", "tom profissional") → `POST /api/generate/refine` → atualiza title/subtitle/label
- **"Gerar Fundo"** → campo de prompt → `POST /api/generate/image` → backgroundUrl atualizado

**Renderização:**
- Preview ao vivo via `buildSlideHtml()` renderizado no browser (CSS puro, sem servidor)
- Renderização final via `POST /api/generate/compose` (Puppeteer → PNG 1080px)
- Botão **"Renderizar Todos"** → loop sequencial de todos os slides → salva URLs
- Botão **"Salvar Post"** → cria/atualiza post com `editorState` (JSON completo dos slides)
- Botão **"Publicar Agora"** / **"Agendar"**

**Infinite Carousel:** Slide marcado como `infiniteCarousel` faz o fundo continuar do slide anterior (efeito de panorama).

---

### 3.4 REELS / VÍDEOS (/posts/videos)

**Objetivo:** Upload em lote de vídeos para publicar como Reels ou Stories no Instagram.

**Capacidades:**
- **Upload Multi-Arquivo:** Drag & drop ou clique (MP4, MOV, M4V, máx 150MB/arquivo)
- **Configuração Individual:** Cada vídeo tem campos próprios (legenda, hashtags, data/hora, modo de publicação)
- **Configuração em Lote:** Legenda global, hashtags globais, agendamento em série com intervalo configurável (ex: 60 min entre cada)
- **Modo de Publicação:** REELS (vertical para feed) ou STORIES

**Fluxo de Upload:**
1. Arquivo adicionado → `PUT /api/upload/multipart` (upload direto ao MinIO)
2. Status visual por arquivo: pending → uploading (progress bar) → uploaded → saving → saved
3. "Salvar Todos" → cria post no banco com `mediaType: VIDEO` e `publishMode: REELS|STORIES`

**Campos por Vídeo:**
- Legenda (2200 chars)
- Hashtags
- Data/hora de agendamento
- Modo de publicação (REELS/STORIES)
- Keep Media (manter vídeo no storage após publicação)
- Preview do thumbnail local (blob URL)

---

### 3.5 POSTS (/posts)

**Objetivo:** Lista e gestão de todos os posts criados.

**Visualização:**
- Grid de cards com thumbnail da imagem (ou ícone de vídeo/carrossel)
- Badge de status colorido: Rascunho (cinza), Agendado (azul), Publicando (laranja), Publicado (verde), Falha (vermelho)
- Data de agendamento ou criação
- Fonte do post (WEB / TELEGRAM / MCP)
- Contador de imagens para carrosseis
- Tipo de mídia (imagem, vídeo, carrossel)

**Filtros:**
- Todos / Rascunho / Agendado / Publicando / Publicado / Falha

**Ações por Post:**
- **Ver** → abre modal lateral com detalhes completos e navegação de carrossel
- **Editar** → modal inline de edição de legenda, hashtags, data de agendamento
- **Publicar Agora** → confirma e chama `POST /api/posts/:id/publish`
- **Agendar** → modal com datetime-local
- **Deletar** → confirma e remove

**Auto-refresh:** A cada 5 segundos quando há posts com status PUBLISHING.

**Paginação:** 10 posts por página com navegação anterior/próximo.

---

### 3.6 CALENDÁRIO (/calendar)

**Objetivo:** Visualização mensal dos posts agendados e publicados.

**Visualização:**
- **Grade Mensal:** 7 colunas (Dom–Sáb) com dias numerados
- **Eventos por Dia:** Bolhas coloridas dos posts (cor por status: cinza/azul/verde/vermelho)
- **Dias do mês anterior/posterior:** Exibidos em cinza como overflow
- **Highlight do dia atual:** Círculo primário na data de hoje
- **Seleção de Dia:** Clica no dia → painel lateral mostra todos os posts daquele dia

**Painel Lateral de Dia Selecionado:**
- Lista dos posts do dia com thumbnail miniatura
- Horário (hh:mm) de agendamento/publicação
- Status badge
- Link direto para o post

**Estatísticas do Mês:**
- Posts agendados no mês atual
- Posts publicados no mês atual

**Navegação:**
- Botões ← → para mês anterior/próximo
- Botão "Hoje" para voltar ao mês atual

**Dados:** Carrega todos os posts (limit 200) e filtra por mês/ano no frontend.

---

### 3.7 TAREFAS (/tasks)

**Objetivo:** Gestão de tarefas de gravação e publicação com prioridades e prazos.

**Campos de uma Tarefa:**
- **Título** (obrigatório)
- **Plataforma:** YouTube, Instagram, Meta Ads, TikTok, Outro
- **Status:** Pendente, Em Andamento, Concluído, Cancelado
- **Prioridade:** Baixa, Média, Alta, Urgente
- **Data de Gravação** (date)
- **Data de Publicação** (date)
- **Script** — campo de texto longo (editor de roteiro)
- **Projeto Vinculado** — referência a um projeto
- **Link Google Drive**
- **Arquivo Anexo**

**Tela de Lista:**
- Filtros por status (Todos / Pendente / Em Andamento / Concluído / Cancelado)
- Cards com: título, plataforma (badge), prioridade (badge colorido), datas, status
- Dropdown inline de mudança de status
- Botão de deletar (com confirmação)
- Paginação: 20 por página

**Tela de Detalhe da Tarefa (/tasks/:id):**
- Formulário completo de edição
- Todos os campos acima editáveis
- Botão para abrir roteiro (/tasks/:id/script)

**Página de Roteiro (/tasks/:id/script):**
- Editor de texto dedicado para o roteiro da tarefa
- Campo grande com placeholder e salvamento inline

---

### 3.8 PROJETOS (/projects)

**Objetivo:** Organização de conteúdo em projetos estruturados com módulos.

**Campos de um Projeto:**
- **Título** (obrigatório)
- **Descrição**
- **Status:** Planejamento, Em Andamento, Concluído, Arquivado

**Estrutura Projeto → Módulos:**
- Um projeto tem N módulos (ordenados, reordenáveis)
- Cada módulo tem: título, conteúdo (texto), link Drive, arquivo, isRecorded (toggle)

**Tela de Lista (/projects):**
- Filtros por status
- Cards com: título, descrição, status badge, contador de módulos, data de criação
- Botão deletar (confirma antes)

**Tela de Detalhe (/projects/:id):**
- Header com status editável e descrição
- **Lista de Módulos** com:
  - Reordenação drag & drop (ou botões cima/baixo)
  - Toggle "Gravado" por módulo
  - Link Drive por módulo
  - Upload de arquivo por módulo
  - Edição inline de título e conteúdo
  - Botão adicionar módulo
  - Botão remover módulo
- **Tarefas Vinculadas:** Lista de tarefas associadas ao projeto
- **Botão Novo Módulo:** Adiciona ao final da lista

---

### 3.9 FUNIS DE VENDAS (/funnels)

**Objetivo:** Construção visual de funis de marketing/vendas com drag & drop usando React Flow.

**Estrutura Funil → Etapas → Passos:**
```
Funil
└── Stage (Etapa) — cor personalizável, barra de progresso
    └── Step (Passo) — tipo, link, status (TODO/IN_PROGRESS/DONE)
```

**Tela de Lista (/funnels):**
- Cards com: título, descrição, contador de etapas, data
- Botões: entrar no funil, deletar

**Tela de Detalhe (/funnels/:id):**
- **Modo Flow (React Flow):**
  - Cada Stage = node personalizado com header colorido + lista de steps
  - Conexões entre stages com setas (edges)
  - MiniMapa e controles de zoom
  - Drag & drop de steps entre stages
  - Adicionar stage → cria node no grafo
  - Mover, redimensionar, conectar nodes

- **Tipos de Passo (StepType):**
  - Landing Page, Captura de Lead, Sequência de Emails, Página de Vendas
  - Checkout, Upsell, Obrigado, Webinar, Vídeo, Post Social, Anúncio, Outro

- **Para cada Passo:**
  - Ícone por tipo
  - Status (TODO/IN_PROGRESS/DONE) → toggle com check visual
  - Link (abre nova aba com ícone ExternalLink)
  - Botão de editar (modal com título, descrição, link, tipo)
  - Botão de deletar

- **Barra de Progresso por Etapa:** % de steps com status DONE

**Painel de Criação de Stage:** Input de título + paleta de 8 cores pré-definidas.

---

### 3.10 BRANDS / IDENTIDADE VISUAL (/brands)

**Objetivo:** Gerenciar identidades visuais de marcas para aplicação automática em posts.

**Campos Completos de um Brand:**

| Campo | Tipo | Uso |
|-------|------|-----|
| Nome | Texto | Identificação |
| Logo | Upload PNG/JPG/WebP | Aplicado nos slides do editor |
| Cor Primária | Color picker | CSS var nos templates |
| Cor Secundária | Color picker | CSS var nos templates |
| Cor de Destaque | Color picker | CSS var nos templates |
| Cor de Fundo | Color picker | CSS var nos templates |
| Cor de Texto | Color picker | CSS var nos templates |
| Cor Muted | Color picker | CSS var nos templates |
| Fonte Principal | Texto | CSS var nos templates |
| Fonte Heading | Texto | CSS var nos templates |
| Fonte Body | Texto | CSS var nos templates |
| Descrição | Textarea | Contexto para IA |
| Tom de Voz | Texto | Prompt de legenda |
| Website URL | URL | Agentes IA podem pesquisar |
| Instagram URL | URL | Agentes IA podem analisar |
| Produtos/Serviços | Tags (vírgula) | Contexto para IA |
| Hashtags Padrão | Tags (vírgula) | Mescladas nos posts |
| Brand Padrão | Toggle | Aplicado automaticamente |

**Design Systems (58 Inspirações Visuais):**
- Biblioteca interna com inspirações de marcas como Stripe, Linear, Apple, Notion, Tesla, etc.
- Categorias: fintech, dev-tools, ai, luxury, e mais
- Cada inspiração tem: paleta de cores, tipografia, princípios de design, vibe/mood
- `suggest_brand_from_inspirations` — combina 1–5 inspirações em sugestão pronta para salvar

**Tela de Lista:**
- Cards com logo, cores em swatches, nome, badge "Padrão" quando aplicável
- Botões: editar, deletar, definir como padrão

**Modal de Criação/Edição:**
- Upload de logo com preview
- Color pickers para todas as cores
- Todos os campos textuais
- Toggle de brand padrão

---

### 3.11 EQUIPE (/team)

**Objetivo:** Gerenciar membros da equipe com roles e permissões granulares por página.

**Roles Disponíveis:**

| Role | Ícone | Permissões |
|------|-------|-----------|
| OWNER | Crown | Acesso total a tudo |
| ADMIN | Shield | Tudo exceto configurações de billing |
| EDITOR | Pencil | Acesso às páginas permitidas |
| VIEWER | Eye | Apenas visualização nas páginas permitidas |

**Páginas Controláveis por Role:**
- Dashboard, Posts, Calendário, Tarefas, Projetos, Funis

**Fluxo de Convite:**
1. Owner/Admin clica "Convidar Membro"
2. Informa: email, role, páginas permitidas (multi-select com checkboxes)
3. Sistema gera token único (UUID) com expiração de 7 dias
4. Link de convite copiado: `/invite?token=xxx`
5. Convidado acessa o link → cria conta vinculada ao owner

**Gestão de Membros:**
- Lista de membros ativos com avatar (inicial do nome), role badge, email
- Editar páginas permitidas de um membro sem modal (dropdown inline)
- Remover membro da equipe (com confirmação)
- Ver/copiar token de convites pendentes
- Expiração visual de convites (expirado vs ativo)

**Controle de Acesso no Frontend:**
- Sidebar filtra links visíveis por `user.allowedPages`
- OWNER e ADMIN veem tudo
- EDITOR/VIEWER veem apenas páginas do `allowedPages`

---

### 3.12 YOUTUBE CLIPS (/clips)

**Objetivo:** Extrair melhores momentos de vídeos do YouTube e gerar clips verticais (1080×1920) com transcrição.

**Fluxo de Trabalho:**

**1. Nova Análise (/clips/new):**
- Campo URL do YouTube
- Seleção de idioma (pt-BR, en-US, es-ES, etc.)
- Botão "Analisar" → `POST /api/videos/analyze`
  - yt-dlp baixa o vídeo
  - Whisper transcreve o áudio
  - IA detecta momentos de destaque (viralidade, clareza, impacto)
  - Status: PENDING → ANALYZING → ANALYZED

**2. Lista de Clips (/clips):**
- Cards com: URL de origem, status badge, duração, data
- Status visuais: Pendente, Analisando, Analisado, Cortando, Pronto, Falhou
- Botão "Ver Detalhes"

**3. Detalhe do Clip (/clips/:id):**
- **Lista de Momentos Detectados:** Cada momento com:
  - Timestamp início–fim
  - Transcrição do trecho
  - Score de "viralidade"
  - Seleção individual (checkbox)
- Botão "Gerar Clips Selecionados" → `POST /api/videos/cut`
  - FFmpeg corta clips verticais (1080×1920)
  - Adiciona legendas automáticas (burn-in)
  - Opcional: face cam (crop inteligente da face)
- Botão "Gerar Todos" → `DELETE /api/videos/:id/clips/all`

**Saída:**
- Clips em formato MP4 vertical (1080×1920)
- Legendas embedded (open captions)
- Download individual ou em lote
- Upload direto ao MinIO

---

### 3.13 CONFIGURAÇÕES (/settings)

**Objetivo:** Configurar todas as integrações e chaves de API da plataforma.

**Seções:**

**1. Facebook App (para token Instagram)**
- App ID e App Secret (para troca de token short-lived → long-lived)

**2. Geração de Imagens (Gemini)**
- Google Gemini API Key (`AIzaSy...`)
- Seletor de modelo: Nano Banana Pro | Nano Banana 2.5 | 2.5 Preview

**3. Telegram Bot**
- Bot Token (BotFather)
- Chat IDs permitidos (separados por vírgula)

**4. MCP Server**
- Token de autenticação interno (`INTERNAL_SERVICE_TOKEN`)
- Exibição da URL do MCP com botão de cópia

**5. Cloudinary (obrigatório para Instagram)**
- Cloud Name, API Key, API Secret
- Necessário desde Apr/2026 pois a API do Meta rejeita hosts desconhecidos
- As imagens são espelhadas do MinIO para o Cloudinary antes de publicar

**6. YouTube Clips**
- Upload do arquivo `cookies.txt` do YouTube (autenticação)

**7. Contas do Instagram (multi-conta)**
- Lista de contas conectadas com: @username, avatar, badge "Padrão"
- Botão "Adicionar Conta" → modal com: Access Token, Instagram User ID
- Toggle de conta padrão
- Botão de remover conta

**UI de Campos:**
- Campos de senha com toggle show/hide
- Copiar valor com feedback visual (ícone Check)
- Salvar por seção individualmente
- Ícone de status: ✅ configurado / ❌ não configurado
- Hints contextuais por campo

---

### 3.14 MCP SERVER (40 Tools)

**Objetivo:** Expor toda a funcionalidade da plataforma como tools MCP para uso em Claude, Cursor, VSCode, Gemini Antigravity.

#### Grupo: Design Systems

| Tool | Função |
|------|--------|
| `list_design_systems` | Lista 58 inspirações visuais com paleta, vibe e mood |
| `get_design_system` | Detalhes completos de uma inspiração |
| `list_design_system_categories` | Categorias disponíveis |
| `suggest_brand_from_inspirations` | Combina 1–5 inspirações em sugestão de brand |

#### Grupo: Brands

| Tool | Função |
|------|--------|
| `list_brands` | Lista brands cadastrados |
| `get_brand` | Detalhes de um brand |
| `get_default_brand` | Brand padrão do usuário |
| `create_brand` | Cria novo brand |
| `update_brand` | Atualiza brand existente |
| `set_default_brand` | Define brand padrão |
| `delete_brand` | Remove brand |

#### Grupo: Posts

| Tool | Função |
|------|--------|
| `create_post` | Cria post (image_prompt, image_prompts, image_urls) |
| `update_post` | Edita post (legenda, hashtags, reagendamento) |
| `create_mixed_carousel` | Carrossel misto: capa IA + slides HTML |
| `list_posts` | Lista posts com filtros |
| `add_image_to_post` | Adiciona imagem a post existente |
| `schedule_post` | Agenda publicação |
| `publish_now` | Publica imediatamente no Instagram |

#### Grupo: Geração

| Tool | Função |
|------|--------|
| `generate_image` | Gera imagem via Gemini |
| `generate_caption` | Gera legenda e conteúdo de slide |
| `generate_template_image` | Gera imagem com template HTML |
| `render_html_to_image` | Renderiza HTML/CSS/Tailwind → PNG |
| `compose_image_with_html_overlay` | Imagem IA de fundo + overlay HTML com CSS vars do brand |
| `upload_image` | Upload de imagem base64 |
| `get_analytics` | Métricas dos posts |

#### Grupo: Tarefas

| Tool | Função |
|------|--------|
| `create_task` | Cria tarefa |
| `list_tasks` | Lista com filtros |
| `update_task` | Atualiza tarefa |
| `delete_task` | Remove tarefa |

#### Grupo: Projetos

| Tool | Função |
|------|--------|
| `create_project` | Cria projeto |
| `list_projects` | Lista projetos |
| `get_project` | Detalhes com módulos e tarefas |
| `update_project` | Atualiza projeto |
| `delete_project` | Remove projeto |
| `add_module` | Adiciona módulo |
| `update_module` | Atualiza módulo |
| `delete_module` | Remove módulo |

#### Grupo: Vídeo

| Tool | Função |
|------|--------|
| `analyze_youtube_video` | Analisa vídeo YouTube (transcreve + detecta momentos) |
| `cut_youtube_clips` | Corta clips verticais com face cam e legendas |
| `list_video_clips` | Lista clips |

---

### 3.15 TELEGRAM BOT

**Comandos Disponíveis:**

| Comando | Função |
|---------|--------|
| `/start` | Lista todos os comandos |
| `/gerar [tema]` | Gera post com imagem e legenda |
| `/gerar 3 [tema]` | Gera carrossel com 3 imagens |
| `/novopost` | Criação interativa de post |
| `/listar` | Posts agendados |
| `/publicar [id]` | Publica post |
| `/agendar [id] [data] [hora]` | Agenda post |
| `/cancelar [id]` | Cancela agendamento |
| `/tarefas` | Tarefas dos próximos 7 dias |
| `/projetos` | Lista projetos |
| `/funis` | Lista funis |
| `/clip [url]` | Analisa vídeo do YouTube |
| `/clipcortar [id] todos` | Corta clips |
| `/template [título]` | Gera imagem com template |
| `/status` | Status das integrações |

---

## 4. SISTEMA DE AGENDAMENTO E PUBLICAÇÃO

### 4.1 Fluxo de Agendamento

```
Post criado com SCHEDULED + scheduledAt
       ↓
BullMQ: job adicionado com delay = scheduledAt - now()
       ↓
No horário: Worker publish.worker.ts processa
       ↓
Post → status PUBLISHING
       ↓
Instagram API: cria container → polling FINISHED → publica
       ↓
Post → status PUBLISHED + instagramId + publishedAt
       ↓
(Falha) → retry exponencial (3x) → status FAILED
```

### 4.2 Fluxo de Publicação com Cloudinary

```
Imagem no MinIO
       ↓
Mirror para Cloudinary (upload via API)
       ↓
URL res.cloudinary.com/... enviada para Meta API
       ↓
Meta API aceita URL confiável e processa
       ↓
Post publicado no Instagram
```

### 4.3 Multi-Instagram

- Múltiplas contas `InstagramToken` por usuário
- Campo `isDefault` define qual conta recebe os posts sem seleção explícita
- API `/api/posts/:id/publish` usa a conta padrão ou a especificada

---

## 5. SEGURANÇA

| Área | Implementação |
|------|--------------|
| Autenticação | JWT com expiração de 7 dias |
| Senhas | Bcrypt hash |
| API Keys | Salvas em `Setting` no banco (criptografadas), nunca expostas no frontend |
| MCP | Bearer token (`INTERNAL_SERVICE_TOKEN`) |
| Telegram | Whitelist de `chat_id` |
| Upload | Validação MIME type, máximo 150MB (vídeos), 10MB (imagens) |
| Rate Limiting | Express rate-limit em rotas públicas |
| MinIO | Política `public-read` apenas para o bucket de imagens |
| Instagram Token | Long-lived com refresh automático (50 dias) |
| Permissões | `allowedPages[]` por usuário, verificado no frontend e backend |

---

## 6. ROTAS DA API REST

```
AUTH
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh

POSTS
GET    /api/posts
POST   /api/posts
GET    /api/posts/:id
PUT    /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/publish
POST   /api/posts/:id/schedule
GET    /api/posts/:id/status

GENERATION
POST   /api/generate/image
POST   /api/generate/caption
POST   /api/generate/compose
POST   /api/generate/refine
POST   /api/generate/template

UPLOAD
POST   /api/upload
POST   /api/upload/multipart

INSTAGRAM
GET    /api/instagram/accounts
POST   /api/instagram/accounts
DELETE /api/instagram/accounts/:id
PATCH  /api/instagram/accounts/:id/default
GET    /api/instagram/profile

BRANDS
GET    /api/brands
POST   /api/brands
GET    /api/brands/:id
PUT    /api/brands/:id
DELETE /api/brands/:id
PATCH  /api/brands/:id/default

TASKS
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id

PROJECTS
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/modules
PUT    /api/projects/:id/modules/:moduleId
DELETE /api/projects/:id/modules/:moduleId

FUNNELS
GET    /api/funnels
POST   /api/funnels
GET    /api/funnels/:id
PUT    /api/funnels/:id
DELETE /api/funnels/:id
POST   /api/funnels/:id/stages
DELETE /api/funnels/:id/stages/:stageId
POST   /api/funnels/:id/stages/:stageId/steps
PUT    /api/funnels/:id/stages/:stageId/steps/:stepId
DELETE /api/funnels/:id/stages/:stageId/steps/:stepId
POST   /api/funnels/steps/:stepId/move

VIDEOS
POST   /api/videos/analyze
POST   /api/videos/cut
GET    /api/videos
DELETE /api/videos/:id

SETTINGS
GET    /api/settings
POST   /api/settings (upsert batch)

TEAM
GET    /api/team/members
POST   /api/team/invite
DELETE /api/team/members/:id
PATCH  /api/team/members/:id/pages
GET    /api/team/invitations
DELETE /api/team/invitations/:id
POST   /api/invite/accept (rota pública)

DESIGN SYSTEMS
GET    /api/design-systems
GET    /api/design-systems/:id
GET    /api/design-systems/categories

ANALYTICS
GET    /api/analytics
```

---

## 7. REQUISITOS NÃO-FUNCIONAIS

| Requisito | Especificação |
|-----------|--------------|
| **Performance** | Preview do editor ao vivo < 50ms; geração de imagem < 15s |
| **Disponibilidade** | Auto-restart via Docker `restart: unless-stopped` |
| **Escalabilidade** | BullMQ suporta workers paralelos (aumentar replicas) |
| **Storage** | MinIO ilimitado (limitado apenas pelo disco da VPS) |
| **Monitoramento** | Logs via `docker compose logs` por serviço |
| **Backup** | Volumes Docker nomeados (`pgdata`, `redisdata`, `miniodata`) |
| **SSL** | Automático via Traefik/Let's Encrypt no Coolify/Easypanel |
| **Compatibilidade de Instância** | Ubuntu 22+ com 2vCPU, 4GB RAM, 80GB SSD (mínimo) |

---

## 8. INTEGRAÇÕES EXTERNAS

| Integração | Propósito | Obrigatório? |
|-----------|---------|------------|
| **Google Gemini AI** | Geração de imagens + legendas + refinamento | Sim (para geração) |
| **Meta/Instagram Graph API** | Publicação de posts | Sim (para publicar) |
| **Cloudinary** | Mirror de imagens para Meta API | Sim (desde abr/2026) |
| **Telegram BotFather** | Bot de controle remoto | Opcional |
| **Cloudinary** | CDN de imagens com reputação para Meta | Sim (para publicar) |
| **YouTube / yt-dlp** | Download de vídeos para clips | Opcional (cookies) |
| **OpenAI Whisper** | Transcrição de áudio para clips | Opcional (clips) |

---

## 9. ESTRUTURA DE ARQUIVOS DO FRONTEND (Web)

```
packages/web/src/
├── app/
│   ├── page.tsx                    → Dashboard (/)
│   ├── layout.tsx                  → Layout raiz (Sidebar + AuthProvider)
│   ├── posts/
│   │   ├── page.tsx                → Lista de Posts (/posts)
│   │   ├── new/page.tsx            → Criar Post (/posts/new)
│   │   ├── videos/page.tsx         → Reels/Vídeos (/posts/videos)
│   │   └── visual-editor/
│   │       ├── page.tsx            → Editor Visual (/posts/visual-editor)
│   │       ├── types.ts            → Tipos SlideState, GlobalStyle, etc.
│   │       ├── build-slide-html.ts → Renderização HTML do slide
│   │       ├── components/
│   │       │   ├── EditorSidebar.tsx
│   │       │   └── CollapsibleSection.tsx
│   │       └── hooks/
│   │           └── use-style-templates.ts
│   ├── calendar/page.tsx           → Calendário (/calendar)
│   ├── tasks/
│   │   ├── page.tsx                → Lista de Tarefas (/tasks)
│   │   ├── new/page.tsx            → Nova Tarefa (/tasks/new)
│   │   └── [id]/
│   │       ├── page.tsx            → Detalhe da Tarefa (/tasks/:id)
│   │       └── script/page.tsx     → Roteiro (/tasks/:id/script)
│   ├── projects/
│   │   ├── page.tsx                → Lista de Projetos
│   │   ├── new/page.tsx            → Novo Projeto
│   │   └── [id]/page.tsx           → Detalhe do Projeto
│   ├── funnels/
│   │   ├── page.tsx                → Lista de Funis
│   │   ├── new/page.tsx            → Novo Funil
│   │   └── [id]/
│   │       ├── page.tsx            → Detalhe do Funil
│   │       └── FunnelFlowView.tsx  → Editor React Flow
│   ├── brands/page.tsx             → Brands (/brands)
│   ├── clips/
│   │   ├── page.tsx                → Lista de Clips (/clips)
│   │   ├── new/page.tsx            → Novo Clip (/clips/new)
│   │   └── [id]/page.tsx           → Detalhe do Clip (/clips/:id)
│   ├── team/page.tsx               → Equipe (/team)
│   ├── settings/page.tsx           → Configurações (/settings)
│   ├── invite/page.tsx             → Aceitar Convite (/invite)
│   └── api/                        → Route handlers Next.js
│       └── videos/
│           ├── analyze/route.ts
│           └── upload/route.ts
├── components/
│   ├── AuthProvider.tsx            → Contexto de autenticação JWT
│   ├── Sidebar.tsx                 → Navegação lateral com filtro de permissões
│   ├── LayoutContent.tsx           → Wrapper de layout principal
│   ├── ThemeProvider.tsx           → Dark/Light mode toggle
│   ├── ConfirmModal.tsx            → Modal de confirmação reutilizável
│   └── FormattedText.tsx           → Renderização de texto formatado
└── lib/
    └── api.ts                      → Cliente HTTP centralizado (todas as chamadas de API)
```

---

## 10. ROADMAP OBSERVADO (Baseado no Código)

### ✅ Implementado (Produção)
- [x] Auth JWT com roles e permissões por página
- [x] Criar/listar/editar/deletar/publicar posts
- [x] Geração de imagens via Google Gemini
- [x] Geração de legendas e hashtags
- [x] Editor Visual completo (6 templates, 60+ fontes, 15 padrões)
- [x] Upload de Reels/Vídeos em lote
- [x] Calendário mensal de posts
- [x] Tarefas com prioridade e plataforma
- [x] Projetos com módulos
- [x] Funis com React Flow (drag & drop)
- [x] Brands com design system e 58 inspirações
- [x] Equipe com convite por email e token
- [x] YouTube Clips (análise + corte)
- [x] Configurações com todas as integrações
- [x] MCP Server com 40 tools
- [x] Telegram Bot com 14 comandos
- [x] Multi-Instagram com Cloudinary
- [x] Dark mode / Light mode

### 🔜 Próximas Possibilidades
- [ ] Analytics avançado (impressões, alcance por post do Instagram)
- [ ] LinkedIn e TikTok integration
- [ ] Biblioteca de templates compartilhados entre usuários
- [ ] Notificações push/email quando post é publicado
- [ ] IA para sugestão de melhores horários
- [ ] A/B testing de legendas
- [ ] Modo colaborativo em tempo real (multi-cursor no editor)
- [ ] Webhooks para notificações externas

---

*Documento gerado por auditoria completa do repositório OpenHive AI em Junho/2026.*
