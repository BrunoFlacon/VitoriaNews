# OpenHive AI — Guia de Implementação Completo
## Passo a Passo Detalhado de Cada Ferramenta e Página

> **Repositório:** github.com/NetoNetoArreche/Projeto-Hive  
> **Stack:** Next.js 14 + Express + Prisma + PostgreSQL + Redis + MinIO + Google Gemini  
> **Auditoria:** Junho/2026

---

## FASE 0 — SETUP DA INFRAESTRUTURA

### 0.1 Pré-requisitos

```bash
# Docker Desktop (inclui Docker Compose)
https://www.docker.com/products/docker-desktop/

# Node.js 22 LTS (via fnm recomendado)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 22
fnm use 22

# Git
git --version  # deve ser ≥ 2.x
```

### 0.2 Clonar e Configurar

```bash
git clone https://github.com/NetoNetoArreche/Projeto-Hive openhive
cd openhive

# Copiar configuração de ambiente
cp .env.example .env

# Editar o .env com suas credenciais
nano .env
```

### 0.3 Variáveis de Ambiente Essenciais

```env
# ═══════════════════════════════════════════
# BANCO DE DADOS
# ═══════════════════════════════════════════
DB_PASSWORD=SuaSenhaForte123          # Senha do PostgreSQL
DATABASE_URL=postgresql://instapost:SuaSenhaForte123@localhost:5433/instapost

# ═══════════════════════════════════════════
# REDIS (Fila BullMQ)
# ═══════════════════════════════════════════
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=                       # Deixar vazio para dev local

# ═══════════════════════════════════════════
# JWT
# ═══════════════════════════════════════════
JWT_SECRET=gere_com_openssl_rand_hex_32   # openssl rand -hex 32
JWT_EXPIRES_IN=7d

# ═══════════════════════════════════════════
# TOKEN INTERNO (Bot + MCP)
# ═══════════════════════════════════════════
INTERNAL_SERVICE_TOKEN=gere_com_openssl_rand_hex_24  # openssl rand -hex 24

# ═══════════════════════════════════════════
# MINIO (Storage S3)
# ═══════════════════════════════════════════
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=SuaSenhaMinIO123
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_BUCKET=instapost-images

# ═══════════════════════════════════════════
# URLS
# ═══════════════════════════════════════════
FRONTEND_URL=http://localhost:3000
WEB_PORT=3000
MCP_PORT=3002

# ═══════════════════════════════════════════
# IA — GOOGLE GEMINI (configurar depois na UI)
# ═══════════════════════════════════════════
NANO_BANANA_API_KEY=                  # Preencher em Configurações
NANO_BANANA_PROVIDER=google

# ═══════════════════════════════════════════
# CLOUDINARY (obrigatório para publicar no Instagram)
# ═══════════════════════════════════════════
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ═══════════════════════════════════════════
# INSTAGRAM (configurar depois na UI)
# ═══════════════════════════════════════════
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_USER_ID=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# ═══════════════════════════════════════════
# TELEGRAM (opcional, configurar na UI)
# ═══════════════════════════════════════════
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_CHAT_IDS=
```

### 0.4 Subir Infraestrutura Docker

```bash
# Sobe PostgreSQL (5433), Redis (6379), MinIO (9000/9001)
docker compose up -d

# Verificar se estão healthy
docker compose ps
# Saída esperada:
# instapost-postgres   running (healthy)
# instapost-redis      running (healthy)
# instapost-minio      running (healthy)

# Se algum falhar, ver logs:
docker compose logs postgres
docker compose logs redis
docker compose logs minio
```

### 0.5 Instalar Dependências e Migrations

```bash
# Instalar todas as dependências do monorepo
npm install

# Rodar migrations do banco de dados
npx prisma migrate deploy --schema=packages/api/prisma/schema.prisma

# Verificar se as tabelas foram criadas
npx prisma studio --schema=packages/api/prisma/schema.prisma
# Abre UI visual em http://localhost:5555
```

### 0.6 Iniciar a Aplicação

```bash
# Inicia todos os pacotes em paralelo (turborepo)
npm run dev

# Acessos:
# Web Dashboard:  http://localhost:3000
# API REST:       http://localhost:3001
# MCP Server:     http://localhost:3002/mcp
# MinIO Console:  http://localhost:9001
```

### 0.7 Setup Automático (Alternativa)

```bash
# Script que faz tudo acima automaticamente + cria usuário admin
bash setup.sh

# Para produção em VPS:
bash setup.sh --production

# Credenciais padrão (TROCAR DEPOIS):
# Email: admin@instapost.local
# Senha: admin123
```

---

## FASE 1 — CONFIGURAÇÕES INICIAIS

### 1.1 Criar Conta e Fazer Login

```
1. Abrir http://localhost:3000
2. Clicar "Registrar"
3. Preencher: nome, email, senha
4. O PRIMEIRO usuário criado se torna OWNER automaticamente
5. Login com as credenciais criadas
```

### 1.2 Configurar Google Gemini (Obrigatório para IA)

```
1. Acessar https://aistudio.google.com/
2. Clicar "Get API Key" → "Create API Key"
3. Copiar a chave (começa com AIzaSy...)
4. No OpenHive: Menu → Configurações → Geração de Imagens
5. Colar a chave no campo "Google Gemini API Key"
6. Selecionar modelo (Nano Banana Pro = recomendado para qualidade)
7. Clicar Salvar
```

### 1.3 Configurar Instagram (Para Publicação)

```
PASSO 1 — Criar App no Meta
1. Acessar https://developers.facebook.com/
2. "Meus Apps" → "Criar App"
3. Tipo: "Empresa"
4. Nome do app (ex: "OpenHive Posts")
5. Anotar App ID e App Secret (aba Configurações → Básico)

PASSO 2 — Adicionar Instagram ao App
1. Dashboard do App → "Adicionar Produto" → "Instagram" → "Configurar"
2. Funções do app → Adicionar sua conta Instagram como "Testador do Instagram"
3. No Instagram: Configurações → Apps e sites → Convites → Aceitar

PASSO 3 — Gerar Access Token
1. Voltar ao Facebook: Instagram → Configuração da API do Instagram
2. "Gerar token" (selecione sua página do Facebook vinculada)
3. Copiar: Access Token e Instagram User ID

PASSO 4 — Configurar no OpenHive
1. Configurações → Facebook App → Colar App ID e App Secret → Salvar
2. Configurações → Contas do Instagram → Adicionar Conta
3. Colar Access Token e Instagram User ID → Salvar
4. Definir como conta padrão (toggle)
```

### 1.4 Configurar Cloudinary (Obrigatório para publicar no Instagram)

```
1. Criar conta gratuita em https://cloudinary.com/users/register_free
   (Free tier: 25GB storage + 25GB bandwidth/mês — sem cartão de crédito)
2. Dashboard → Programmable Media:
   - Cloud Name (ex: dxxxxxxxxx)
   - API Key (15 dígitos)
   - API Secret (clicar "Reveal")
3. OpenHive → Configurações → Cloudinary
4. Colar os 3 campos → Salvar

Por que é necessário:
   Desde abril/2026 a API do Meta rejeita imagens de hosts desconhecidos
   (incluindo MinIO self-hosted, R2, S3 default, sslip.io, etc.)
   O Cloudinary funciona como mirror confiável para a Meta API
```

### 1.5 Configurar Telegram Bot (Opcional)

```
1. No Telegram, falar com @BotFather
2. /newbot → dar nome e username ao bot
3. Copiar o token (formato: 123456:ABCxxxx...)
4. Falar com @userinfobot para descobrir seu Chat ID
5. OpenHive → Configurações → Telegram Bot
6. Colar Token e Chat ID(s) separados por vírgula
7. Salvar
```

---

## FASE 2 — CRIAR PRIMEIRO BRAND

### 2.1 Acessar Brands

```
Menu lateral → Brands
Clicar "Novo Brand" (botão azul no canto superior direito)
```

### 2.2 Preencher Dados do Brand

```
CAMPOS OBRIGATÓRIOS:
├── Nome da marca (ex: "Buildix", "Academia XYZ")
└── Cor Primária (clica no circle → color picker)

IDENTIDADE VISUAL:
├── Logo → Clica no botão upload → seleciona PNG/JPG (recomendado 200×200)
├── Cor Primária → Color picker (cor principal da marca)
├── Cor Secundária → Color picker (cor de destaque)
├── Cor de Destaque → (opcional, para calls-to-action)
├── Cor de Fundo → (opcional)
├── Cor de Texto → (opcional)
└── Cor Muted → (opcional, para textos secundários)

TIPOGRAFIA (opcional, mas recomendado):
├── Fonte Principal → nome da Google Font (ex: "Poppins")
├── Fonte Heading → fonte para títulos (ex: "Montserrat")
└── Fonte Body → fonte para corpo (ex: "Inter")

CONTEXTO PARA IA (muito importante):
├── Descrição → O que é a marca, público, diferenciais
├── Tom de Voz → "educativo", "descontraído", "formal", "inspirador"
├── Website URL → https://www.suamarca.com (IA pode pesquisar)
└── Instagram URL → https://www.instagram.com/suamarca (IA pode analisar)

CONTEÚDO:
├── Produtos/Serviços → separados por vírgula
└── Hashtags Padrão → separadas por vírgula (sem #)

MARCA PADRÃO → Toggle ON para aplicar automaticamente
```

### 2.3 Design Systems — Inspirações Visuais

```
COMO USAR:
Via MCP (Claude/Cursor):
   "Liste os design systems disponíveis" → list_design_systems
   "Crie um brand baseado no estilo do Stripe + Linear" → suggest_brand_from_inspirations

Categorias disponíveis (58 inspirações):
├── fintech → Stripe, Wise, Revolut
├── dev-tools → Linear, Vercel, Railway
├── ai → OpenAI, Anthropic, Midjourney
├── luxury → Apple, Tesla, Rolex
├── saas → Notion, Figma, Framer
└── ... (e mais)
```

---

## FASE 3 — CRIAR POSTS

### 3.1 Criar Post com IA (Modo Rápido)

```
1. Menu → Novo Post (/posts/new)

2. SEÇÃO "Gerar Imagem com IA":
   ├── Prompt: "Post sobre produtividade com dicas de organização, 
   │           estilo minimalista, tons de azul"
   ├── Quantidade: clicar no número (1 = imagem única, 2+ = carrossel)
   └── Aspect Ratio: 1:1 (Feed) | 4:5 (Retrato) | 9:16 (Stories/Reels)

3. BOTÃO "Imagem Completa":
   ├── Gemini gera a imagem com texto integrado
   ├── Legenda e hashtags geradas automaticamente em paralelo
   └── Preview aparece no painel direito (simulação Instagram)

4. AJUSTAR:
   ├── Editar legenda no campo "Legenda" (máx 2200 chars)
   ├── Editar hashtags (separadas por vírgula → preview das tags)
   └── Opcional: anexar arquivo ou link Google Drive

5. AÇÕES:
   ├── Rascunho → salva como DRAFT (pode editar depois)
   ├── Agendar → selecionar data/hora → publica automaticamente
   └── Publicar → publica imediatamente no Instagram
```

### 3.2 Criar Post com Upload Manual

```
1. Menu → Novo Post
2. Arrastar imagem para o preview OU clicar "Anexar arquivo"
3. Para carrossel: repetir adicionando mais imagens
4. Preencher legenda, hashtags, etc.
5. Salvar/Agendar/Publicar
```

### 3.3 Criar Carrossel (2-10 imagens)

```
MODO IA:
1. Prompt: "5 dicas de produtividade"
2. Quantidade: clicar "5"
3. Clicar "Imagem Completa (5)" → gera 5 imagens em paralelo
4. Preview mostra carrossel com dots indicadores e navegação
5. Remover slides indesejados clicando no ícone de lixeira
6. Salvar como carrossel

MODO EDITOR VISUAL (recomendado para controle total):
1. Quantidade: clicar "5"
2. Clicar "Para Editor Visual (5)" → gera fundos limpos + redireciona ao editor
3. Editar cada slide no editor visual (ver Fase 4)
```

### 3.4 Gerenciar Posts (/posts)

```
FILTROS:
└── Todos | Rascunho | Agendado | Publicando | Publicado | Falha

CARD DE POST:
├── Thumbnail da imagem (ou ícone de vídeo/carrossel)
├── Status badge colorido
├── Data de agendamento/criação
├── Fonte (WEB/TELEGRAM/MCP)
└── Ações: Ver | Editar | Publicar | Agendar | Deletar

EDITAR POST (modal):
├── Editar legenda
├── Editar hashtags
└── Alterar data de agendamento (reagenda automaticamente)

AUTO-REFRESH:
└── A cada 5 segundos quando há posts com status "Publicando"
```

---

## FASE 4 — EDITOR VISUAL

### 4.1 Acessar o Editor

```
OPÇÃO 1 — Via menu lateral:
   Menu → Editor Visual (/posts/visual-editor)
   → Abre com 2 slides padrão (hero + content)

OPÇÃO 2 — Via Criar Post:
   Novo Post → clicar "Editor Visual" (card do lado direito)
   → Abre editor vazio

OPÇÃO 3 — Via geração automática:
   Novo Post → digitar prompt → "Para Editor Visual (N)"
   → Gera fundos com IA → abre editor com os slides carregados

OPÇÃO 4 — Via post existente:
   /posts/visual-editor?postId=xxx
   → Carrega estado completo do editor salvo no post
```

### 4.2 Interface do Editor

```
LAYOUT:
┌──────────────────────────────────────────────┐
│ HEADER: Brand selector | AR selector | Ações │
├─────────────┬────────────────────────────────┤
│ SIDEBAR     │      PREVIEW (1080px)           │
│ (controles) │                                 │
├─────────────┤   ┌────────────────────────┐   │
│             │   │      Slide Ativo       │   │
│             │   │  (renderizado ao vivo) │   │
│             │   └────────────────────────┘   │
├─────────────┴────────────────────────────────┤
│ SLIDE STRIP (tira de miniaturas drag & drop) │
│ [Slide 1] [Slide 2] [Slide 3] [+ Add]       │
└──────────────────────────────────────────────┘
```

### 4.3 Configurar o Slide Ativo — Passo a Passo

#### PASSO 1 — Escolher Template

```
Sidebar → aba Templates
├── Capa / Hook (hero) → para slides de abertura impactantes
├── Conteúdo (content) → label + título + subtítulo
├── Dado / Stat (stat) → número em destaque (ex: "+40%")
├── Citação (quote) → frase em itálico + autor
├── CTA Final (cta) → chamada para ação + handle
└── Lista / Steps (list) → rotulo + título + subtítulo longo

Clique no template desejado → campos do slide se adaptam
```

#### PASSO 2 — Adicionar Fundo

```
Sidebar → aba Fundo

OPÇÃO A — Gerar com IA:
1. Digitar prompt no campo "Descreva o fundo"
   Ex: "Fundo abstrato azul escuro com partículas, estilo tech"
2. Clicar "Gerar Fundo" → aguardar Gemini
3. Imagem aparece no preview

OPÇÃO B — Upload manual:
1. Clicar "Enviar imagem"
2. Selecionar PNG/JPG/WebP

OPÇÃO C — URL externa:
1. Colar URL diretamente no campo backgroundUrl

AJUSTES DO FUNDO:
├── Posição X/Y → sliders para reposicionar
├── Zoom → ampliar ou reduzir
├── Opacidade → transparência da imagem
├── Flip Horizontal → espelhar
└── Infinite Carousel → fundo contínuo do slide anterior
```

#### PASSO 3 — Overlay

```
Sidebar → aba Overlay
├── Opacidade → 0% (sem overlay) a 100% (fundo totalmente escuro)
└── Estilo:
    ├── Base → preto uniforme
    ├── Gradiente → transparente em cima, escuro embaixo
    └── Vinheta → escuro nas bordas, transparente no centro
```

#### PASSO 4 — Editar Conteúdo

```
Sidebar → aba Conteúdo
├── Rótulo/Label (ex: "Dica 3", "Passo 2")
├── Título → texto principal grande (ex: "Produtividade")
├── Subtítulo → texto de apoio
└── Stat → número em destaque (apenas template "stat")

POSIÇÃO NO SLIDE:
Grid 3×3 com 9 opções:
├── top-left | top-center | top-right
├── middle-left | middle-center | middle-right
└── bottom-left | bottom-center | bottom-right

ALINHAMENTO DE TEXTO:
└── Esquerda | Centro | Direita
```

#### PASSO 5 — Tipografia

```
TÍTULO:
├── Família: dropdown com 60 fontes do Google
├── Peso: 100 a 900 (slider ou botões)
├── Cor: color picker ou grid de cores predefinidas
├── Tamanho: slider px
└── Espaçamento entre letras: slider

SUBTÍTULO (configurações separadas):
├── Família
├── Peso
├── Cor
├── Tamanho
├── Espaçamento
└── Altura de linha (line-height)

WORD HIGHLIGHTS (destaque por palavra):
1. Clicar no título no preview (ou no campo de texto)
2. Selecionar a palavra que deseja destacar
3. Escolher cor, bold, italic, underline, strikethrough
```

#### PASSO 6 — Brand Integration

```
Header → Dropdown de Brands
└── Selecionar brand cadastrado → aplica automaticamente:
    ├── Logo no canto configurado
    ├── Cores do brand nas CSS variables dos templates
    └── Tom de voz na geração de legenda

LOGO:
Sidebar → aba Logo
├── Toggle "Mostrar Logo" (ON/OFF)
├── Posição: top-left | top-right | bottom-left | bottom-right
├── Tamanho: slider px
├── URL customizada (sobrescreve logo do brand)
└── Toggle "Mostrar Badge de Perfil"
```

#### PASSO 7 — Efeitos Avançados

```
GLASS EFFECT (vidro fosco):
├── Toggle ON/OFF
├── Cor do glass
└── Opacidade %

LABEL BADGE (pílula ao redor do rótulo):
├── Toggle ON/OFF
├── Cor de fundo
├── Cor do texto
└── Forma: pill | rounded | square

TEXT CARD (container ao redor de todo o texto):
├── Toggle ON/OFF
├── Cor de fundo
├── Opacidade %
├── Border radius
├── Padding
└── Sombra: none | soft | strong

CANTOS (textos nos 4 cantos do slide):
├── 4 campos: corner-top-left, top-right, bottom-left, bottom-right
├── Toggle individual por canto
├── Tamanho da fonte (global)
├── Distância da borda (px)
├── Opacidade (%)
├── Glass effect nas caixas de canto
├── Borda nas caixas de canto
└── Ícone no canto inferior direito: none | bookmark | arrow | heart | share | chat | sparkle

INDICADORES:
├── Toggle (mostrar/ocultar dots de progresso)
└── São automáticos: refletem o número do slide no total
```

#### PASSO 8 — Gerar Conteúdo com IA

```
Sidebar → aba IA

GERAR CONTEÚDO:
├── Baseado na legenda (campo abaixo do editor) ou no título atual
├── Clicar "Gerar Conteúdo" → Gemini retorna title + subtitle otimizados
└── Aplica automaticamente ao slide ativo

REFINAR COM INSTRUÇÃO NATURAL:
├── Campo de texto: "Deixe mais curto e direto"
│                   "Mude o tom para mais técnico"
│                   "Adicione um emoji relevante no título"
│                   "Coloque em inglês"
└── Clicar "Refinar" → Gemini reescreve title, subtitle, label

GERAR FUNDO (também disponível na aba Fundo):
└── Prompt descritivo → Gemini gera imagem de fundo
```

### 4.4 Gerenciar Slides

```
ADICIONAR SLIDE:
└── Clicar [+] na tira de slides → modal com seleção de template

REORDENAR SLIDES:
└── Drag & drop nas miniaturas da tira

DUPLICAR LAYOUT (copiar estilo para próximo slide):
└── Botão "Copiar Layout para Próximo" → transfere todos os estilos
    (mantém conteúdo do próximo, troca apenas visual)

REMOVER SLIDE:
└── Ícone lixeira na miniatura (mínimo 1 slide)

TEMPLATES SALVOS:
├── Botão "Salvar Estilo" → nomear e salvar configurações visuais
│   (sem conteúdo, apenas estilos)
└── Botão "Carregar Template" → aplicar ao slide ativo
```

### 4.5 Renderizar e Salvar

```
RENDERIZAR TODOS OS SLIDES:
1. Clicar "Renderizar Todos" (botão na toolbar)
2. Loop sequencial: cada slide → Puppeteer → PNG 1080px
3. Miniaturas na tira atualizam com o resultado renderizado
4. Progresso visível (X/Y slides)

SALVAR POST:
└── Clicar "Salvar Post" → `POST /api/posts` com editorState JSON completo
    (armazena estado do editor para edição futura)

PUBLICAR:
└── Clicar "Publicar" → renderiza se necessário → publica no Instagram
    (ou "Agendar" → selecionar data/hora)
```

---

## FASE 5 — REELS E VÍDEOS

### 5.1 Acessar a Página

```
Menu lateral → Reels / Vídeos (/posts/videos)
```

### 5.2 Configurações Globais (Aplicadas a Todos os Vídeos)

```
LEGENDA GLOBAL → aplica a todos os vídeos adicionados depois
HASHTAGS GLOBAIS → aplica a todos
MODO DE PUBLICAÇÃO:
├── REELS → vídeo vertical no feed principal
└── STORIES → publicação nos Stories (24h)

AGENDAMENTO EM SÉRIE:
├── Data/hora de início (ex: 2024-12-20 10:00)
└── Intervalo entre posts (ex: 60 = um por hora)

KEEP MEDIA → mantém vídeo no storage após publicação
```

### 5.3 Adicionar Vídeos

```
DRAG & DROP → arrastar arquivos MP4/MOV para a área pontilhada
OU
CLIQUE → botão "Selecionar Vídeos" → file picker (múltiplos)

FORMATOS: MP4, MOV, M4V
TAMANHO MÁXIMO: 150MB por arquivo
DURAÇÃO: seguir limites do Instagram Reels (máx 60s recomendado)
```

### 5.4 Configurar Cada Vídeo Individualmente

```
CARD DO VÍDEO:
├── Thumbnail com player nativo (preview local)
├── Nome do arquivo e tamanho
├── Status (Pendente → Enviando → Enviado → Salvando → Salvo)
├── Barra de progresso durante upload
├── Legenda individual (sobrescreve a global)
├── Hashtags individuais
├── Data/hora de agendamento
├── Modo de publicação (REELS/STORIES)
├── Toggle "Manter mídia"
└── Botão de remover da lista
```

### 5.5 Upload e Salvar

```
UPLOAD AUTOMÁTICO:
└── Ao adicionar o arquivo → inicia upload direto para MinIO
    (não precisa de ação manual)

SALVAR TODOS:
└── Clicar "Salvar Todos" → cria post para cada vídeo no banco
    ├── status DRAFT (se sem agendamento)
    └── status SCHEDULED (se com data/hora)

PUBLICAÇÃO:
└── Via fila BullMQ no horário configurado
    OU
└── Via /posts → selecionar vídeo → "Publicar Agora"
```

---

## FASE 6 — CALENDÁRIO

### 6.1 Visualização

```
Acesso: Menu → Calendário (/calendar)

GRADE MENSAL:
├── 7 colunas: Dom | Seg | Ter | Qua | Qui | Sex | Sáb
├── Dias numerados
├── Dia atual destacado com círculo azul
└── Dias de outros meses em cinza claro

EVENTOS NO CALENDÁRIO:
Cada post agendado/publicado aparece como bolha:
├── 🔵 Agendado (azul)
├── 🟢 Publicado (verde)
├── 🔴 Falhou (vermelho)
└── ⚫ Rascunho (cinza)

CLICAR NO DIA:
└── Painel lateral direito abre com lista dos posts do dia:
    ├── Thumbnail miniatura
    ├── Horário (hh:mm)
    ├── Título/caption truncado
    └── Badge de status
```

### 6.2 Navegação e Filtros

```
← → para mês anterior/próximo
[Hoje] para voltar ao mês atual

ESTATÍSTICAS DO MÊS (header):
├── Posts agendados neste mês
└── Posts publicados neste mês
```

---

## FASE 7 — TAREFAS

### 7.1 Criar Nova Tarefa

```
Menu → Tarefas → "Nova Tarefa" (/tasks/new)

CAMPOS:
├── Título (obrigatório)
├── Plataforma: YouTube | Instagram | Meta Ads | TikTok | Outro
├── Status: Pendente | Em Andamento | Concluído | Cancelado
├── Prioridade: Baixa | Média | Alta | Urgente
├── Data de Gravação (date picker)
├── Data de Publicação (date picker)
├── Projeto vinculado (dropdown de projetos)
├── Link Google Drive
└── Upload de arquivo

Clicar "Salvar"
```

### 7.2 Gerenciar Tarefas

```
LISTA (/tasks):
├── Filtros por status (pills no topo)
├── Cards com: título, plataforma badge, prioridade badge colorida, datas
├── Dropdown inline para mudar status sem abrir o detalhe
├── Botão deletar (com modal de confirmação)
└── Paginação: 20 por página (← →)

DETALHE DA TAREFA (/tasks/:id):
└── Editar todos os campos acima
```

### 7.3 Roteiro da Tarefa

```
Detalhe da tarefa → "Abrir Roteiro" → /tasks/:id/script

EDITOR DE ROTEIRO:
├── Campo de texto grande e expansível
├── Placeholder com dicas
├── Salvamento automático ou botão "Salvar Roteiro"
└── Formatação livre (texto plano ou markdown)
```

---

## FASE 8 — PROJETOS

### 8.1 Criar Projeto

```
Menu → Projetos → "Novo Projeto" (/projects/new)

CAMPOS:
├── Título (ex: "Curso de Marketing Digital")
├── Descrição (ex: "12 aulas sobre redes sociais")
└── Status: Planejamento | Em Andamento | Concluído | Arquivado

Clicar "Criar Projeto"
```

### 8.2 Gerenciar Módulos

```
Projeto → Detalhe (/projects/:id)

ADICIONAR MÓDULO:
└── Clicar "+ Adicionar Módulo" → novo módulo ao final da lista

CADA MÓDULO:
├── Título editável inline
├── Conteúdo (texto/notas) editável
├── Link Google Drive (para o material)
├── Upload de arquivo
├── Toggle "Gravado" (isRecorded) → visual muda para indicar concluído
├── Reordenar (drag & drop ou botões ↑↓)
└── Remover módulo

TAREFAS DO PROJETO:
└── Lista das tarefas vinculadas ao projeto na seção inferior
```

---

## FASE 9 — FUNIS DE VENDAS

### 9.1 Criar Funil

```
Menu → Funis → "Novo Funil" (/funnels/new)

CAMPOS:
├── Título (ex: "Funil de Lançamento do Produto X")
└── Descrição (ex: "Captura de leads → Webinar → Oferta")

Clicar "Criar Funil"
```

### 9.2 Construir o Funil com React Flow

```
Funil → Detalhe → Modo Flow (/funnels/:id)

INTERFACE:
├── Canvas infinito com zoom e pan
├── MiniMapa (canto inferior direito)
└── Controles de zoom (+/−/fit)

ADICIONAR ETAPA (Stage):
1. Clicar "Adicionar Etapa"
2. Digitar nome (ex: "Topo do Funil", "Captação", "Venda")
3. Selecionar cor na paleta de 8 cores
4. Confirmar → aparece como node no canvas

ADICIONAR PASSO A UMA ETAPA:
└── Clicar [+] dentro do header do node da etapa
    ├── Título do passo
    └── Tipo: Landing Page | Captura de Lead | Email | Vendas | Checkout |
             Upsell | Obrigado | Webinar | Vídeo | Post Social | Anúncio | Outro

CONECTAR ETAPAS:
└── Arrastar da âncora direita (→) de uma etapa para a âncora esquerda (←) de outra
    → Cria seta de conexão no canvas

GERENCIAR PASSOS:
├── Toggle de status: TODO (cinza) → IN_PROGRESS (amarelo) → DONE (verde)
├── Ícone ✏️ → editar (modal: título, descrição, link, tipo)
├── Ícone 🗑️ → remover passo (dentro da etapa)
├── Ícone 🔗 → abrir link em nova aba
└── Arrastar passo entre etapas diferentes (drag & drop)

BARRA DE PROGRESSO:
└── Calculada automaticamente: steps DONE / total steps da etapa
```

---

## FASE 10 — EQUIPE

### 10.1 Convidar Membro

```
Menu → Equipe (/team) → "Convidar Membro" (botão azul)

MODAL DE CONVITE:
├── Email do convidado (obrigatório)
├── Role:
│   ├── ADMIN → tudo exceto billing
│   ├── EDITOR → acesso às páginas marcadas
│   └── VIEWER → visualização apenas
└── Páginas Permitidas (checkboxes):
    ├── Dashboard
    ├── Posts
    ├── Calendário
    ├── Tarefas
    ├── Projetos
    └── Funis

Clicar "Enviar Convite"
```

### 10.2 Gerenciar Convites

```
LISTA DE CONVITES PENDENTES:
├── Email
├── Role (badge colorido)
├── Data de expiração
├── Status: Ativo (link ainda válido) | Expirado
└── Botão "Copiar Link" → copia URL do convite para compartilhar

ACEITAR CONVITE (perspectiva do convidado):
1. Recebe o link: https://app.seudominio.com/invite?token=uuid
2. Acessa o link → formulário de criação de conta
3. Cria nome + senha
4. Login automático com permissões da role configurada
```

### 10.3 Gerenciar Membros Ativos

```
LISTA DE MEMBROS:
├── Avatar (inicial do nome em circle)
├── Nome e email
├── Badge de role colorido
├── Páginas permitidas (tags compactas)
├── Botão "Editar Páginas" → dropdown inline de checkboxes
└── Botão "Remover Membro" (com confirmação)

EDITAR PÁGINAS DE UM MEMBRO:
└── Clicar "Editar" → dropdown abre com checkboxes
    ├── Marcar/desmarcar páginas
    └── Confirmar → salva imediatamente
```

### 10.4 Controle de Acesso (Como Funciona)

```
FRONTEND (Sidebar):
└── Filtra links visíveis com base em user.allowedPages

BACKEND (Middleware):
└── Cada rota verifica JWT + allowedPages antes de responder

REGRAS:
├── OWNER → vê e faz tudo sempre
├── ADMIN → vê tudo, pode gerenciar equipe
├── EDITOR/VIEWER → apenas páginas marcadas em allowedPages
└── Configurações → sempre visível para todos (profile/senha)
```

---

## FASE 11 — YOUTUBE CLIPS

### 11.1 Nova Análise

```
Menu → Clips (ícone Film) → "Novo Clip" (/clips/new)

1. Colar URL do YouTube (ex: https://youtu.be/xxxxxxxxxxx)
2. Selecionar idioma (pt-BR para português)
3. Clicar "Analisar"

O QUE ACONTECE:
├── yt-dlp baixa o vídeo
├── Whisper transcreve o áudio
├── IA identifica os melhores momentos
└── Status: PENDING → ANALYZING → ANALYZED
```

### 11.2 Ver Momentos Detectados

```
/clips/:id

LISTA DE MOMENTOS:
├── Timestamp início → fim (ex: 02:15 → 04:30)
├── Transcrição do trecho
├── Score de viralidade/impacto
└── Checkbox para seleção

AÇÕES:
├── Selecionar momentos individualmente
├── "Selecionar Todos"
└── "Gerar Clips Selecionados" ou "Gerar Todos"
```

### 11.3 Gerar Clips

```
Clicar "Gerar Clips"

O QUE ACONTECE:
├── Status: ANALYZED → CLIPPING
├── FFmpeg processa cada momento selecionado
├── Corta para formato vertical 1080×1920
├── Aplica legendas em open captions (burn-in)
├── Opcional: crop da face cam
└── Status: CLIPPING → READY

RESULTADO:
├── Clips MP4 disponíveis para download
├── Upload automático ao MinIO
└── Thumbnails com preview do frame
```

---

## FASE 12 — MCP SERVER (Integração com IDEs)

### 12.1 Opção HTTP (Claude.ai / Claude Desktop)

```
URL do servidor MCP:
├── Local: http://localhost:3002/mcp
└── VPS:   https://mcp.seudominio.com/mcp

CLAUDE.AI:
1. Personalizar → Conectores → + Adicionar
2. Colar URL do MCP

CLAUDE DESKTOP:
Settings → MCP Servers → Add Server → colar URL
```

### 12.2 Opção CLI via npx (Cursor, VSCode, Gemini)

```bash
# Gemini Antigravity (~/.gemini/antigravity/mcp_config.json)
{
  "mcpServers": {
    "openhive": {
      "command": "npx",
      "args": ["-y", "openhive-mcp-server@latest"],
      "env": {
        "OPENHIVE_API_URL": "http://localhost:3001",
        "OPENHIVE_API_TOKEN": "seu_INTERNAL_SERVICE_TOKEN"
      }
    }
  }
}

# Cursor (.cursor/mcp.json)
{
  "mcpServers": {
    "openhive": {
      "command": "npx",
      "args": ["-y", "openhive-mcp-server@latest"],
      "env": {
        "OPENHIVE_API_URL": "http://localhost:3001",
        "OPENHIVE_API_TOKEN": "seu_INTERNAL_SERVICE_TOKEN"
      }
    }
  }
}

# VSCode (.vscode/mcp.json)
{
  "servers": {
    "openhive": {
      "command": "npx",
      "args": ["-y", "openhive-mcp-server@latest"],
      "env": {
        "OPENHIVE_API_URL": "http://localhost:3001",
        "OPENHIVE_API_TOKEN": "seu_INTERNAL_SERVICE_TOKEN"
      }
    }
  }
}
```

### 12.3 Exemplos de Prompts MCP

```
CRIAR POST:
"Crie um post sobre IA generativa com uma imagem futurista e
legenda profissional em português. Agende para amanhã às 10h."

CRIAR CARROSSEL:
"Crie um carrossel de 5 slides sobre dicas de produtividade
usando o brand Buildix. Antes de criar, pesquise o site do brand."

CRIAR CARROSSEL MISTO (capa IA + slides template):
create_mixed_carousel({
  cover_prompt: "fundo abstrato azul com partículas",
  slides: [
    { title: "Dica 1", subtitle: "Explique...", template: "bold-gradient" },
    { title: "Dica 2", subtitle: "...", template: "minimal-dark" }
  ],
  brand_id: "uuid-do-brand"
})

CRIAR TAREFA:
"Crie uma tarefa de gravação para o YouTube sobre ChatGPT,
prioridade alta, gravar dia 20/12 e publicar dia 25/12."

ANALISAR VÍDEO:
analyze_youtube_video({
  url: "https://youtu.be/xxx",
  language: "pt-BR"
})
```

---

## FASE 13 — DEPLOY EM PRODUÇÃO

### 13.1 VPS com SSH (Mais Simples)

```bash
# Em uma VPS Ubuntu 22+ com Docker instalado:
git clone https://github.com/NetoNetoArreche/Projeto-Hive openhive
cd openhive

# Setup completo (gera .env, sobe containers, migrations, cria admin)
bash setup.sh --production

# 8 containers sobem:
# instapost-postgres, instapost-redis, instapost-minio
# instapost-api, instapost-web, instapost-bot
# instapost-mcp, renderer

# Verificar:
docker compose -f docker-compose.production.yml ps

# Acessar:
# http://SEU_IP:3000  → Dashboard
# http://SEU_IP:3001  → API
# http://SEU_IP:3002  → MCP
# http://SEU_IP:9001  → MinIO Console
```

### 13.2 Coolify (Deploy Automático via Git)

```
PASSOS:
1. VPS com Coolify instalado (curl -fsSL coolify install URL | bash)
2. No painel Coolify:
   Projects → Add New Project → "OpenHive"
3. + New → Resource → Docker Compose
   ├── Source: Public Repository
   ├── URL: https://github.com/NetoNetoArreche/Projeto-Hive.git
   ├── Branch: main
   └── Docker Compose: /docker-compose.prod.yml
4. Environment Variables (APENAS):
   ├── DB_PASSWORD=SuaSenhaForte1
   ├── REDIS_PASSWORD=SuaSenhaForte2
   ├── MINIO_SECRET_KEY=SuaSenhaForte3
   ├── JWT_SECRET=SuaSenhaForte4
   └── INTERNAL_SERVICE_TOKEN=SuaSenhaForte5
5. Deploy → aguardar ~10 min (build das imagens)
6. Configuration → General → Generate Domain para:
   ├── web (3000) → URL do dashboard
   ├── api (3001) → URL da API
   ├── minio (9000) → URL do storage
   └── mcp-server (3002) → URL do MCP (opcional)
7. Environment Variables → adicionar:
   ├── FRONTEND_URL=https://url-do-web
   └── MINIO_PUBLIC_URL=https://url-do-minio
8. Deploy novamente para aplicar URLs
9. Acessar URL do web → Registrar → Configurações

APÓS DEPLOY — Configurar Integrações:
├── Configurações → Gemini API Key → Salvar
├── Configurações → Facebook App (App ID + Secret) → Salvar
├── Configurações → Cloudinary → Salvar
└── Configurações → Contas Instagram → Adicionar Conta
```

### 13.3 Easypanel

```
PASSOS:
1. VPS com Easypanel instalado
2. Create Project → nome: "openhive"
3. + Service → Docker Compose
   ├── Source: Github (Public)
   ├── URL: https://github.com/NetoNetoArreche/Projeto-Hive.git
   └── Docker Compose Path: docker-compose.prod.yml
4. Ambiente → APAGAR tudo → colar APENAS:
   DB_PASSWORD=MinhaSenh4Forte1
   REDIS_PASSWORD=MinhaSenh4Forte2
   MINIO_SECRET_KEY=MinhaSenh4Forte3
   JWT_SECRET=MinhaSenh4Forte4
   INTERNAL_SERVICE_TOKEN=MinhaSenh4Forte5
5. Implantar → aguardar ~10 min
6. IP da VPS: aparece no canto inferior esquerdo do Easypanel
7. Criar 4 domínios via Domínios (usando sslip.io gratuito):
   ├── web.SEU_IP.sslip.io → porta 3000 → serviço web
   ├── api.SEU_IP.sslip.io → porta 3001 → serviço api
   ├── minio.SEU_IP.sslip.io → porta 9000 → serviço minio
   └── mcp.SEU_IP.sslip.io → porta 3002 → serviço mcp-server
8. Ambiente → adicionar ao final:
   FRONTEND_URL=https://web.SEU_IP.sslip.io
   MINIO_PUBLIC_URL=https://minio.SEU_IP.sslip.io
9. Implantar novamente
10. Acessar https://web.SEU_IP.sslip.io → Registrar
```

### 13.4 Nginx Reverse Proxy (Para Domínio Próprio)

```nginx
# /etc/nginx/sites-available/openhive
server {
    server_name app.seudominio.com;
    location / { proxy_pass http://127.0.0.1:3000; }
    # SSL: sudo certbot --nginx -d app.seudominio.com
}
server {
    server_name api.seudominio.com;
    location / { proxy_pass http://127.0.0.1:3001; }
}
server {
    server_name s3.seudominio.com;
    location / { proxy_pass http://127.0.0.1:9000; }
}
server {
    server_name mcp.seudominio.com;
    location / { proxy_pass http://127.0.0.1:3002; }
}
```

---

## REFERÊNCIA RÁPIDA — COMANDOS ÚTEIS

### Docker

```bash
# Status de todos os containers
docker compose ps

# Logs em tempo real de um serviço
docker compose logs -f api
docker compose logs -f web
docker compose logs -f redis

# Reiniciar um serviço
docker compose restart api

# Parar tudo (dados persistem)
docker compose down

# Parar E apagar TODOS os dados
docker compose down -v

# Reconstruir após mudanças de código
docker compose up -d --build
```

### Banco de Dados

```bash
# Abrir Prisma Studio (UI visual)
npx prisma studio --schema=packages/api/prisma/schema.prisma

# Rodar nova migration
npx prisma migrate dev --schema=packages/api/prisma/schema.prisma

# Deploy migrations em produção
npx prisma migrate deploy --schema=packages/api/prisma/schema.prisma

# Reset do banco (APAGA TUDO)
npx prisma migrate reset --schema=packages/api/prisma/schema.prisma
```

### Desenvolvimento

```bash
# Iniciar tudo
npm run dev

# Build de produção
npm run build

# Executar apenas o API
npm run dev --filter=api

# Executar apenas o Web
npm run dev --filter=web
```

---

## TROUBLESHOOTING COMUM

### Instagram não publica (erro 2207052)
```
Causa: Meta API rejeita a URL do MinIO como host não confiável
Solução:
1. Criar conta Cloudinary (gratuita)
2. Configurações → Cloudinary → preencher 3 campos → Salvar
3. Retentar publicação
```

### Imagem não gera (erro de API)
```
Causa: Gemini API key não configurada ou limite atingido
Solução:
1. Verificar Configurações → Geração de Imagens → chave OK?
2. Verificar cota em https://aistudio.google.com/
3. Trocar modelo (ex: de Pro para 2.5 Standard)
```

### Post fica "Publicando" infinitamente
```
Causa: Worker BullMQ falhou silenciosamente
Solução:
1. docker compose logs api → procurar erro
2. docker compose restart api
3. O post pode ir para status FAILED depois do retry (3x)
4. Tentar "Publicar Agora" novamente
```

### Renderer não funciona (carrossel HTML)
```
Causa: Container renderer não está rodando
Solução:
docker compose -f docker-compose.production.yml up renderer -d
```

### Banco não conecta
```
docker compose ps  → verificar se postgres está healthy
docker compose logs postgres → ver erros
docker compose down && docker compose up -d  → reiniciar
```

---

## ESTRUTURA DE CUSTOS (Estimativa Mensal)

| Componente | Custo | Notas |
|-----------|-------|-------|
| VPS Hetzner 2vCPU 4GB | ~€5–7/mês | Mínimo recomendado |
| Google Gemini API | Gratuito | Até limite diário (Flash) |
| Cloudinary | Gratuito | 25GB/mês storage + bandwidth |
| Domínio | ~R$50/ano | Opcional (sslip.io gratuito) |
| **TOTAL** | **~R$40/mês** | Sem domínio próprio |

---

*Guia gerado por auditoria completa do repositório OpenHive AI — Junho/2026.*
*Repositório: github.com/NetoNetoArreche/Projeto-Hive*
