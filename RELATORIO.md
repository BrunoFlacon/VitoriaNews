# Relatório de Alterações — Sessão 09/06/2026

## 1. Navegação do Calendário para o Carrossel

**Arquivos:** `src/pages/Dashboard.tsx`, `src/components/dashboard/StoriesLivesView.tsx`

**Problema:** Clicar em um post do tipo carrossel no Calendário redirecionava para a aba "Create Post", que não suporta edição de carrosséis.

**Solução:**
- Criado estado `storiesSubTab` no Dashboard
- `onEditPost` agora verifica se `media_type === 'carousel'` e redireciona para Stories & Lives com a sub-aba "Carrossel" pré-selecionada
- `StoriesLivesView` aceita prop `defaultTab` e sincroniza via `useEffect`

---

## 2. Ferramenta de Reposicionamento de Imagem no Carrossel

**Arquivo:** `src/components/dashboard/CarrosselView.tsx`

**Problema:** O preview do carrossel usava `object-cover` sem controles, podendo cortar partes importantes da imagem.

**Solução:** Adicionado painel "Ajuste de Imagem" abaixo do preview com:
- **Zoom** — slider de 50% a 200% com indicador percentual
- **Arrastar** — drag-to-pan diretamente na imagem de preview (mouse down/move/up)
- **Modo de ajuste** — botões "Cortar" (`object-cover`) e "Ajustar" (`object-contain`)
- **Redefinir** — volta ao estado original (escala 1, posição zero, cover)

Os valores são armazenados por slide (`Record<slideId, SlideTransform>`), preservados durante a edição.

---

## 3. Integração do Kanban com o Fluxo de Publicação

### 3.1. Migration no Banco

**Arquivo:** `supabase/migrations/20260609000003_tasks_publish_flow.sql`

```sql
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS published_post_id UUID REFERENCES public.scheduled_posts(id);
```

### 3.2. ProjectsView — Seletor de Plataformas

**Arquivo:** `src/components/dashboard/ProjectsView.tsx`

- No formulário de criação/edição de tarefa, adicionada seção "Publicar nas plataformas"
- 7 plataformas disponíveis: Instagram, Facebook, X (Twitter), LinkedIn, Telegram, WhatsApp, Site
- Botões toggle com ícones do `platformMetadata` (mesmos ícones usados no resto do app)
- Indicação visual quando a plataforma está selecionada (borda + cor primary)
- Aviso quando nenhuma plataforma está selecionada

### 3.3. ProjectsView — Publicação na Coluna "Concluído"

- Tarefas na coluna **Concluído** exibem badges com os ícones das plataformas selecionadas
- Botão **"Publicar"** (ícone de envio, cor verde) que:
  1. Valida se há plataformas selecionadas
  2. Monta o conteúdo: `título + "\n\n" + descrição`
  3. Chama `usePublisher.publishNow()` — mesmo fluxo usado pelo CreatePostPanel
  4. Em caso de sucesso, vincula o `published_post_id` à tarefa
  5. Mostra badge **"Publicado"** com ✅
- Estado de loading por tarefa (`publishingTaskId`)
- Se a tarefa já foi publicada, o botão "Publicar" é substituído pelo badge "Publicado"

### 3.4. Fluxo Completo

```
Tarefa "Concluído" → [Publicar]
    → publishNow(content, platforms)
    → cria scheduled_posts com status='scheduled'
    → chama edge function publish-post
    → dispatcher → plataforma específica (instagram.ts, facebook.ts, x.ts, etc.)
    → resultado → notificação + badge na tarefa
```

O mesmo pipeline usado para posts normais, incluindo publicação no site (quando implementado).

---

## 4. Verificação de Build

- `npx tsc --noEmit` → **0 erros**
- `npx vite build` → **0 erros**

---

## Arquivos Alterados

| Arquivo | Tipo |
|---|---|
| `src/pages/Dashboard.tsx` | Navegação carrossel + storiesSubTab |
| `src/components/dashboard/StoriesLivesView.tsx` | Prop defaultTab |
| `src/components/dashboard/CarrosselView.tsx` | Reposicionamento de imagem |
| `src/components/dashboard/ProjectsView.tsx` | Publicação de tarefas |
| `supabase/migrations/20260609000003_tasks_publish_flow.sql` | Migration (nova) |

## Pendente

- Commit e push (aguardando autorização)
- `supabase migration up` para aplicar a migration no banco remoto
