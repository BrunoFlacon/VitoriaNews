# PRD — CoverStudio Editor de Capas

> **Versão:** 1.0  
> **Data:** 2026-08-20  
> **Status:** Implementado (Fase 1)  
> **Plataforma:** React + HTML5 Canvas + Supabase  

---

## 1. Visão Geral

CoverStudio é um editor de capas (cover art) inspirado em Canva/Figma, construído com HTML5 Canvas puro (sem dependências externas de editor). O editor permite criar capas para thumbnails, transmissões ao vivo, reels/shorts, podcasts e feeds de redes sociais.

### 1.1 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| UI Framework | React 18 + TypeScript |
| Canvas Engine | HTML5 Canvas API (puro, sem biblioteca externa) |
| State Management | React Context + useReducer (undo/redo) |
| Estilo | Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL + Storage + Auth + Realtime) |
| AI Tools | `@imgly/background-removal` (ONNX/WebAssembly, client-side) |
| Exportação | Canvas API + jsPDF |
| Ícones | Lucide React |

### 1.2 Arquitetura de Arquivos

```
src/components/dashboard/studio/
├── CoverStudioView.tsx         — View principal, toolbar, layout flutuante
├── CoverCanvasEngine.tsx       — Motor de renderização Canvas (1178 linhas)
├── EditorContext.tsx            — Gerenciamento de estado + undo/redo
├── CanvasRulers.tsx            — Réguas horizontais/verticais
├── FloatingLayerToolbar.tsx    — Toolbar contextual flutuante
├── PresetSelector.tsx          — Predefinições de formato
├── StudioUploadsTab.tsx        — Upload e galeria de imagens
├── CoverAnalyticsView.tsx      — Dashboard de métricas
├── AudioWaveformOverlay.tsx    — Animação de onda (podcast)
├── lidojs-sidebar/
│   ├── Sidebar.tsx             — Sidebar esquerda (wrapper)
│   ├── RightSidebar.tsx        — Painel de propriedades (670 linhas)
│   ├── PanelHeader.tsx         — Header compartilhado
│   ├── textPresets.ts          — Predefinições de texto
│   ├── tabs/SidebarTab.tsx     — Barra de abas animada
│   └── panels/
│       ├── TextContent.tsx     — Adicionar texto
│       ├── ShapeContent.tsx    — Adicionar formas/linhas
│       ├── BackgroundContent.tsx — Cores/gradientes de fundo
│       ├── BadgeContent.tsx    — Adicionar badges
│       ├── ImageToolsContent.tsx — Ferramentas de imagem (IA)
│       └── FormatosContent.tsx — Predefinições de formato
├── lidojs-config/
│   ├── shapes.tsx              — Definições de 20 formas SVG + 12 linhas
│   └── palette.ts              — Utilitários de cor + fontes
└── image-tools/
    ├── removeBackground.ts     — Remoção de fundo via IA (ONNX)
    └── cutoutObject.ts         — Recorte poligonal de objetos
```

---

## 2. Modelo de Dados — CanvasLayer

Toda camada (layer) no canvas é representada pelo interface `CanvasLayer`:

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|:-----------:|-----------|
| `id` | `string` | ✅ | Identificador único |
| `name` | `string` | ✅ | Nome para exibição |
| `type` | `"text" \| "image" \| "badge" \| "shape" \| "logo"` | ✅ | Tipo da camada |
| `x`, `y` | `number` | ✅ | Posição no canvas (px) |
| `width`, `height` | `number` | ✅ | Dimensões no canvas (px) |
| `rotation` | `number` | ✅ | Rotação em graus |
| `opacity` | `number` | ✅ | Transparência (0-1) |
| `visible` | `boolean` | ✅ | Visibilidade |
| `locked` | `boolean` | ✅ | Bloqueio contra edição |
| `content` | `string` | ✅ | Texto, URL de imagem ou data URI |
| `fontSize` | `number` | ❌ | Tamanho da fonte (texto) |
| `fontFamily` | `string` | ❌ | Família da fonte (texto) |
| `fontWeight` | `string` | ❌ | Peso da fonte (texto) |
| `color` | `string` | ❌ | Cor de preenchimento/texto |
| `textAlign` | `"left" \| "center" \| "right"` | ❌ | Alinhamento do texto |
| `shadowColor` | `string` | ❌ | Cor da sombra |
| `shadowBlur` | `number` | ❌ | Raio do desfoque da sombra |
| `shadowOffsetX/Y` | `number` | ❌ | Deslocamento da sombra |
| `backgroundColor` | `string` | ❌ | Cor de fundo (badge/forma) |
| `badgeStyle` | `"live" \| "podcast" \| "exclusive" \| "news"` | ❌ | Estilo do badge |
| `shapeType` | `"rectangle" \| "circle" \| "star" \| "arrow" \| "divider" \| "svg"` | ❌ | Tipo da forma |
| `svgPath` | `string` | ❌ | Path SVG customizado |
| `strokeColor` | `string` | ❌ | Cor do contorno |
| `strokeWidth` | `number` | ❌ | Largura do contorno |
| `gradient` | `string` | ❌ | Gradiente JSON para formas |

---

## 3. Ferramentas Detalhadas

### 3.1 Motor Canvas (`CoverCanvasEngine.tsx`)

#### 3.1.1 Renderização

| Capacidade | Descrição |
|------------|-----------|
| **Texto** | Renderiza com fonte, tamanho, cor, alinhamento, sombra e contorno/outline |
| **Badges** | Badges arredondados coloridos (live=vermelho, podcast=azul, exclusive=roxo, news=amarelo) |
| **Formas** | Retângulo, círculo, estrela (5 pontas), seta, divisor, formas SVG (Path2D) |
| **Gradientes** | Preenchimento de formas com gradientes JSON parseados para CanvasGradient |
| **Sombras** | Sombras canvas para textos e formas (`shadowColor`, `shadowBlur`, offsets) |
| **Imagens** | Desenha `HTMLImageElement` cacheado com CORS habilitado |
| **Fundo Sólido** | Preenche canvas com cor sólida |
| **Fundo Gradiente** | Parseia CSS `linear-gradient(angle, color1, color2)` para CanvasGradient |
| **Fundo Imagem** | Desenha imagem de fundo esticada nas dimensões do canvas |
| **Opacidade** | Cada camada renderizada com `ctx.globalAlpha` |
| **Rotação** | Cada camada rotacionada ao redor do seu centro |

#### 3.1.2 Interatividade

| Capacidade | Descrição |
|------------|-----------|
| **Seleção de camada** | Clique para selecionar; camada superior ganha no hit-test |
| **Arrasto de camada** | Clique e arraste para mover; respeita flag `locked` |
| **Resize 8 pontos** | Handles nos cantos e bordas (nw, n, ne, e, se, s, sw, w) — 8px quadrados |
| **Cursor dinâmico** | `crosshair` (vazio), `move` (hover), `not-allowed` (bloqueado), cursores de resize |
| **Menu contextual** | Botão direito muestra: Duplicar, Bloquear, Camadas, Excluir |

#### 3.1.3 Zoom & Pan

| Capacidade | Configuração |
|------------|-------------|
| **Zoom com scroll** | Rola para cima/baixo; faixa 0.2x a 3.0x, passo 0.1 |
| **Pan com Shift+scroll** | Segure Shift + scroll = pan horizontal/vertical |
| **Pan com botão do meio** | Clique do meio + arraste para pan |
| **Ajustar à tela** | Calcula zoom para caber no container com 60px de padding |
| **Zoom 100%** | Reseta zoom para 100% e pan para {0,0} |
| **Transform CSS** | Aplicado via `transform: scale(zoom) translate(px, py)` com `transformOrigin: center` |

#### 3.1.4 Snap / Guias de Alinhamento

| Capacidade | Descrição |
|------------|-----------|
| **Snap às bordas do canvas** | Encaixa nas bordas esquerda, direita, topo, fundo e centro |
| **Snap camada-a-camada** | Encaixa nas bordas e centros de todas as outras camadas visíveis |
| **Threshold de snap** | 5px em coordenadas do canvas |
| **Guias visuais** | Linhas tracejadas azuis (`#3B82F6`) durante arrasto/resize |
| **Multi-guias** | Mostra todas as guias na mesma distância |

#### 3.1.5 Zonas Seguras

| Capacidade | Descrição |
|------------|-----------|
| **Sobreposição** | Retângulo tracejado vermelho: 15% topo, 85% fundo, 8% lados |
| **Label** | "MARGEM SEGURA (REELS / SHORTS)" em texto vermelho |

#### 3.1.6 Cutout Poligonal (Recorte de Objeto)

| Capacidade | Descrição |
|------------|-----------|
| **Modo cutout** | Ativado pelo botão "BG Remover" na toolbar flutuante |
| **Desenho poligonal** | Clique para adicionar vértices; pontos restritos aos limites da imagem |
| **Feedback visual** | Overlay escurecido fora do polígono, linha tracejada verde, vértices coloridos |
| **Fechar polígono** | Clique perto do primeiro ponto (<15px) ou duplo-clique |
| **Processamento** | Chama `clipImageToPolygon()` que gera novo data URI transparente |
| **Cancelar** | Tecla Escape limpa todos os pontos |

#### 3.1.7 Edição Inline de Texto

| Capacidade | Descrição |
|------------|-----------|
| **Duplo-clique** | Em camada de texto → abre overlay de edição inline |
| **Posicionamento** | Overlay posicionado exatamente sobre o texto no canvas (coords de tela) |
| **Toolbar flutuante** | Seletor de fonte, tamanho, negrito, alinhamento, cor, confirmar/cancelar |
| **Escala** | Fonte do textarea escalada pelo `displayScale` do zoom |
| **Atalhos** | Enter confirma, Escape cancela |

---

### 3.2 Toolbar Superior (`CoverStudioView.tsx`)

| Ferramenta | Ícone | Descrição |
|------------|-------|-----------|
| **Hamburger / Painel Esquerdo** | `Menu` | Alterna painel de ferramentas flutuante |
| **Nome do Projeto** | `Palette` | Editável inline; Enter/Escape para salvar/cancelar |
| **Desfazer** | `Undo2` | Ctrl+Z; desabilitado quando não há histórico |
| **Refazer** | `Redo2` | Ctrl+Y / Ctrl+Shift+Z |
| **Réguas** | `Ruler` | Alterna réguas horizontais/verticais |
| **Zonas Seguras** | `Grid` | Alterna sobreposição de zonas seguras |
| **Zoom Out** | `ZoomOut` | Diminui zoom em 0.1 (mín 0.2) |
| **Zoom Display** | Texto | Mostra zoom atual como porcentagem |
| **Zoom In** | `ZoomIn` | Aumenta zoom em 0.1 (máx 3.0) |
| **Ajustar à Tela** | `RefreshCw` | Auto-escala para caber no container |
| **Zoom 100%** | `Maximize` | Reseta zoom e pan |
| **Tamanho do Documento** | `Settings2` | Mostra dimensões; abre diálogo de resize |
| **Métricas** | `BarChart3` | Alterna para visualização de analytics |
| **Importar** | `Upload` | Seletor para `.json`, `.canvas.json` |
| **Salvar Template** | `Package` | Salva no Supabase com `is_template: true` |
| **Exportar** | `Download` | Dropdown com opções de exportação |
| **Painel Direito** | `PanelRightOpen/Close` | Mostra/esconde painel de propriedades |

---

### 3.3 Formatos de Exportação

| Formato | Extensão | Descrição |
|---------|----------|-----------|
| **PNG** | `.png` | Alta qualidade, fundo transparente via `exportAsDataURL()` |
| **JPEG** | `.jpg` | Comprimido 92%, sem transparência |
| **PDF** | `.pdf` | Via `jsPDF`; detecta landscape/portrait automaticamente |
| **Projeto** | `.canvas.json` | JSON com nome, versão, canvas, fundo, camadas |
| **Template** | Supabase DB | Insere em `cover_projects` com `is_template: true` |

---

### 3.4 Diálogo de Resize (9 Predefinições)

| Predefinição | Tamanho |
|-------------|---------|
| YouTube Thumbnail | 1280×720 |
| YouTube Banner | 2560×1440 |
| Instagram Post (1:1) | 1080×1080 |
| Instagram Story (9:16) | 1080×1920 |
| Facebook Cover | 820×312 |
| Twitter Header | 1500×500 |
| LinkedIn Banner | 1584×396 |
| A4 (300dpi) | 2480×3508 |
| Custom | Livre |

**Recursos do diálogo:**
- Seletor de predefinição (dropdown)
- Inputs de largura/altura com trava de proporção
- Grid visual de predefinições rápidas (CoverPreset cards)

---

### 3.5 Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+Z` | Desfazer |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Refazer |
| `Delete` | Excluir camada selecionada |
| `Escape` | Cancelar cutout / desselecionar |
| `Enter` (edição inline) | Confirmar texto |
| `Escape` (edição inline) | Cancelar edição |

---

### 3.6 Painel Flutuante Esquerdo (7 Abas)

#### 3.6.1 Formatos (`FormatosContent`)
- 5 predefinições de formato com ícone, nome, proporção, descrição e tags de plataforma
- Highlight do formato ativo
- Aplicação com um clique

#### 3.6.2 Texto (`TextContent`)
- **Adicionar Título:** 64px bold Inter branco "TITULO"
- **Adicionar Subtítulo:** 40px bold Inter amarelo "Subtitulo"
- **Adicionar Texto Pequeno:** 26px normal Inter cinza "Texto descritivo"
- **8 Predefinições de estilo:** Impact, Oswald, Playfair, Montserrat, Bebas Neue, Poppins, Raleway, Lato

#### 3.6.3 Formas (`ShapeContent`)
- **12 linhas/setas** de `LINE_DEFINITIONS`
- **20 formas SVG** de `SHAPE_DEFINITIONS` (corações, estrelas, flores, setas, etc.)
- Auto-dimensionamento: ~25% do menor lado do canvas
- Renderização via `Path2D` com escala do viewBox 64×64

#### 3.6.4 Fundo (`BackgroundContent`)
- **25 cores sólidas** predefinidas
- **Seletor de cor customizado** (`<input type="color">`)
- **16 gradientes predefinidos** (CSS linear-gradient)

#### 3.6.5 Badges (`BadgeContent`)
- 8 badges prontos: AO VIVO, PODCAST, EXCLUSIVO, NOTICIA, EPISODIO, ULTIMA HORA, PREMIERE, NOVO
- Cores e ícones específicos por tipo
- Criados em 220×65px, posição (100, 60)

#### 3.6.6 Upload (`StudioUploadsTab`)
- Upload com drag-and-drop (area tracejada)
- Formatos: PNG, JPG, WEBP (até 10MB)
- Upload para Supabase Storage + persistência na tabela `media`
- Grade de galeria (2 colunas, máx 20, mais recentes primeiro)
- Clique na imagem = adiciona como camada centralizada (80% do canvas)

#### 3.6.7 Ferramentas (`ImageToolsContent`)
- **Remover Fundo (IA):** `@imgly/background-removal` (ONNX/WebAssembly, 100% client-side)
  - Progresso: "Carregando modelo" → "Decodificando" → "Analisando com IA" → "Aplicando máscara" → "Codificando resultado"
  - Funciona sem servidor, sem API key
- **Recortar Objeto:** Ativa modo cutout poligonal no engine
- Dicas de uso e aviso de seleção

---

### 3.7 Painel de Propriedades Direito (`RightSidebar.tsx`)

#### 3.7.1 Propriedades da Página (nenhuma camada selecionada)
- Inputs de largura/altura do canvas
- Botão "Aplicar Proporção" (escala todas as camadas)
- Seletor de cor de fundo
- Toggle de clip de conteúdo

#### 3.7.2 Controles de Transformação (todas as camadas)
- Posição X, Y (inputs numéricos)
- Largura, Altura (inputs numéricos, mín 1)
- Rotação (slider -180° a +180° + input numérico)

#### 3.7.3 Propriedades de Texto
- Conteúdo (input de texto)
- Tamanho da fonte
- Cor da fonte (color picker com hex)
- Família da fonte (10 opções: Inter, Impact, Oswald, Playfair, Montserrat, Bebas Neue, Poppins, Raleway, Lato, Source Code Pro)
- Negrito toggle
- Alinhamento (Esquerda/Centro/Direita)
- Cor da sombra + blur
- Cor do contorno + largura

#### 3.7.4 Propriedades de Forma
- Tipo da forma (somente leitura)
- Cor de preenchimento
- Cor do contorno + largura
- Cor da sombra + blur

#### 3.7.5 Propriedades de Imagem/Logo
- Exibição da fonte (hostname ou "Dados locais")
- Substituir imagem (file picker que preserva bounds)
- Preview thumbnail (máx 96px)

#### 3.7.6 Propriedades de Badge
- Texto do badge
- Estilo do badge (dropdown)

#### 3.7.7 Controles Comuns
- Opacidade (slider 0-1, step 0.05)
- Ações de camada: Topo, Cima, Baixo, Fundo, Bloquear, Duplicar, Excluir

---

### 3.8 Toolbar Flutuante Contextual (`FloatingLayerToolbar.tsx`)

Aparece centralizada acima da camada selecionada (oculto durante edição inline de texto).

| Para | Ferramentas |
|------|------------|
| **Imagem** | BG Remover |
| **Texto** | Negrito, Alinhar E/C/D, Tamanho da fonte |
| **Todas** | Duplicar, Bloquear, Visibilidade, Subir, Descer, Excluir |

---

### 3.9 Réguas (`CanvasRulers.tsx`)

| Capacidade | Descrição |
|------------|-----------|
| **Régua horizontal** | Canvas-based na borda superior |
| **Régua vertical** | Canvas-based na borda esquerda |
| **Caixa de canto** | 22×22px na interseção |
| **Ticks maiores** | Em intervalos adaptativos baseados no zoom |
| **Ticks menores** | 1/5 do intervalo maior |
| **Highlight do canvas** | Região azul mostrando onde o design está visível |
| **Crosshair do cursor** | Linha azul tracejada em ambas as réguas |
| **Intervalo adaptativo** | 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000 |
| **HiDPI** | Usa `devicePixelRatio` para rendering nítido |
| **Throttling rAF** | Cursor usa `requestAnimationFrame` |

---

### 3.10 Gerenciamento de Estado (`EditorContext.tsx`)

| Capacidade | Descrição |
|------------|-----------|
| **Undo/Redo** | Stack de snapshots `CanvasLayer[][]` com índice |
| **Batch History** | `requestIdleCallback` (timeout 300ms, fallback `setTimeout`) agrupa atualizações rápidas |
| **addLayer** | Adiciona camada ao final do array |
| **removeLayer** | Remove por ID; limpa seleção |
| **updateLayer** | Merge de updates parciais |
| **selectLayer** | Define camada selecionada |
| **duplicateLayer** | Cópia com offset +30px, suffix "(Copia)" |
| **moveLayerOrder** | Reordena na stack: up, down, top, bottom |
| **setCanvasSize** | Define dimensões do canvas |
| **setBackgroundColor** | Define cor de fundo |
| **setBackgroundGradient** | Define gradiente CSS |
| **scaleAllLayers** | Escala proporcionalmente todas as camadas ao novo tamanho |

---

### 3.11 Predefinições de Formato (`PresetSelector.tsx`)

| ID | Nome | Proporção | Tamanho | Categoria | Plataformas |
|----|------|-----------|---------|-----------|-------------|
| `youtube_video` | Video Horizontal | 16:9 | 1920×1080 | video | YouTube, Facebook, LinkedIn |
| `youtube_live` | Transmissão Ao Vivo | 16:9 | 1920×1080 | live | YouTube Live, Facebook Live, Twitch |
| `reels_shorts` | Videos Curtos & Stories | 9:16 | 1080×1920 | short | Shorts, Reels, TikTok, Stories |
| `spotify_podcast` | Podcast & Audio | 1:1 | 1440×1440 | audio | Spotify, Apple Podcasts, Web Radio |
| `instagram_feed` | Feed Instagram & FB | 4:5 | 1080×1350 | video | Instagram, Facebook |

---

### 3.12 Onda de Áudio (`AudioWaveformOverlay.tsx`)

| Capacidade | Descrição |
|------------|-----------|
| **Animação contínua** | Canvas rendering a ~60fps |
| **Estilo Barras** | Barras verticais com modulação senoidal |
| **Estilo Onda** | Linha senoidal contínua |
| **Estilo Pontos** | Pontos distribuídos |
| **Ícone pulsante** | `Radio` com `animate-pulse` |

**Props:** `color`, `barCount` (32), `height` (80), `style` ("bars")

---

### 3.13 Ferramentas de Imagem

#### 13.13.1 Remoção de Fundo (`removeBackground.ts`)

```typescript
removeImageBackground(
  imageSource: string | File | Blob,
  options?: RemoveBackgroundOptions
): Promise<string>
```

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `onProgress` | `(stage, current, total) => void` | — | Callback de progresso |
| `format` | `'image/png' \| 'image/jpeg' \| 'image/webp'` | `'image/png'` | Formato de saída |
| `quality` | `number` | `0.8` | Qualidade (0-1) |

**Detalhes técnicos:**
- Executa 100% client-side via ONNX Runtime WebAssembly
- Dynamic import para evitar crash do Vite dev server
- Hack de SharedArrayBuffer para compatibilidade
- Conversão data URI → Blob para contornar CSP `connect-src`
- Roda em CPU (não GPU/WebGPU)

#### 13.13.2 Recorte Poligonal (`cutoutObject.ts`)

```typescript
clipImageToPolygon(
  imageDataUri: string,
  polygon: Point[],
  width: number,
  height: number
): Promise<string>
```

- Recebe data URI da imagem + array de pontos do polígono
- Recorta a imagem mantendo apenas a área dentro do polígono
- Retorna novo data URI com fundo transparente

---

### 3.14 Layout Flutuante

| Elemento | Posição | Largura | z-index |
|----------|---------|---------|---------|
| **Toolbar Superior** | Fixa no topo | 100% | z-20 |
| **Painel Esquerdo** | Absoluto, canto esquerdo | 340px (conteúdo) + 52px (abas) | z-30 |
| **Painel Direito** | Absoluto, canto direito | 280px | z-30 |
| **Toolbar Flutuante** | Centralizada no topo | Auto | z-20 |
| **Réguas** | Integradas ao canvas | 22px cada | z-[5] |
| **Barra de Status** | Fixa embaixo | 100% (28px) | z-20 |

---

## 4. APIs e Integrações

| API | Uso | Localização |
|-----|-----|-------------|
| **Supabase Auth** | Autenticação de usuários | `useSocialConnections.ts` |
| **Supabase Storage** | Upload de imagens para bucket `media` | `StudioUploadsTab.tsx` |
| **Supabase PostgreSQL** | Persistência de uploads (`media`), templates (`cover_projects`) | `StudioUploadsTab.tsx`, `CoverStudioView.tsx` |
| **Supabase Realtime** | Atualizações em tempo real (não diretamente no editor) | Contexts/Hooks |
| **Canvas API** | Renderização, exportação, hit-testing | `CoverCanvasEngine.tsx` |
| **jsPDF** | Exportação PDF | `CoverStudioView.tsx` (dynamic import) |
| **@imgly/background-removal** | Remoção de fundo via IA | `removeBackground.ts` |
| **Path2D** | Renderização de formas SVG complexas | `CoverCanvasEngine.tsx` |

---

## 5. Métricas e Analytics (`CoverAnalyticsView.tsx`)

| Métrica | Descrição |
|---------|-----------|
| **Total de Impressões** | Soma de impressões de todas as capas |
| **Total de Cliques** | Soma de cliques |
| **CTR Médio** | Cliques / Impressões × 100 |
| **Filtros** | Todos, video, live, short, audio, spotify |
| **Ranking** | Tabela ordenável com thumbnail, título, plataforma, impressões, cliques, CTR |

---

## 6. Melhorias Pendentes

| # | Item | Prioridade | Status |
|---|------|:----------:|--------|
| 1 | Import .psd/.psb (Photoshop) | Alta | Não implementado |
| 2 | Uploads persistem na tabela `media` | Alta | ✅ Implementado |
| 3 | Sidebar → menu hamburger flutuante | Alta | ✅ Implementado |
| 4 | Painel de propriedades flutuante | Alta | ✅ Implementado |
| 5 | Duplo-clique → edição inline | Alta | ✅ Implementado |
| 6 | Toolbar flutuante contextual | Alta | ✅ Implementado |
| 7 | Fit-to-screen zoom | Alta | ✅ Implementado |
| 8 | Snap / guias de alinhamento | Alta | ✅ Implementado |
| 9 | Panning com shift+scroll | Média | ✅ Implementado |
| 10 | Exportação PDF | Alta | ✅ Implementado |
| 11 | Fix violations de performance | Alta | 🔧 Em andamento |
