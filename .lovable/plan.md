# Plano: Fluxo de Aprovacao Editorial + Indicadores Visuais no Calendario

## O que sera feito

continue a geração da instrução anterior e implemente o plano a seguir

### 1. Novo status "pending_approval" no fluxo editorial

Adicionar um novo status ao fluxo de publicacoes para suportar o ciclo jornalistico: **Rascunho -> Aguardando Aprovacao -> Aprovado/Agendado -> Publicado**.

**Migracao de banco de dados:**

- Nenhuma alteracao de schema necessaria: o campo `status` da tabela `scheduled_posts` ja e do tipo `text`, entao novos valores como `pending_approval` e `rejected` podem ser usados diretamente.

**Arquivo: `src/hooks/useScheduledPosts.ts**`

- Expandir o tipo `status` para incluir `'pending_approval' | 'rejected'`
- Adicionar funcoes `submitForApproval(postId)` e `approvePost(postId)` / `rejectPost(postId, reason)`

### 2. Atualizar statusConfig no CalendarView

**Arquivo: `src/components/dashboard/CalendarView.tsx**`

Adicionar configs para os novos status:

- `pending_approval`: icone `Clock` com cor laranja, label "Aguardando Aprovacao"
- `rejected`: icone `AlertCircle` com cor vermelha escura, label "Rejeitado"

Adicionar acoes no dropdown de cada post:

- "Enviar para aprovacao" (quando status e `draft`)
- "Aprovar" e "Rejeitar" (quando status e `pending_approval`)

### 3. Indicadores visuais ricos nos quadradinhos do calendario

**Arquivo: `src/components/dashboard/CalendarView.tsx**`

Substituir os pontos coloridos simples por mini-icones de status nos quadradinhos dos dias:

- Cada post mostrara um pequeno icone (CheckCircle2, Clock, Edit, AlertCircle, etc.) colorido dentro do quadradinho do dia
- Agrupar por status quando houver muitos posts (ex: "2x publicado, 1x rascunho")
- Mostrar contagem total quando houver mais de 4 posts no dia

### 4. Painel de aprovacao no CreatePostPanel

**Arquivo: `src/components/dashboard/CreatePostPanel.tsx**`

- Adicionar botao "Enviar para Aprovacao" ao lado de "Salvar Rascunho"
- Quando o post estiver com status `pending_approval`, mostrar botoes "Aprovar" e "Rejeitar" (simulando o papel do editor)
- Campo de motivo de rejeicao ao rejeitar

### 5. Acoes de aprovacao no dialogo de detalhes

**Arquivo: `src/components/dashboard/CalendarView.tsx**`

No dialogo de detalhes do post, adicionar botoes contextuais:

- Post `draft`: "Enviar para Aprovacao"
- Post `pending_approval`: "Aprovar" e "Rejeitar"
- Post `rejected`: Mostrar motivo da rejeicao + "Editar e Reenviar"

---

## Detalhes Tecnicos

### Arquivos editados:

- `src/hooks/useScheduledPosts.ts` - Novos status e funcoes (submitForApproval, approvePost, rejectPost)
- `src/components/dashboard/CalendarView.tsx` - Novos status no statusConfig, icones ricos nos dias, acoes de aprovacao
- `src/components/dashboard/CreatePostPanel.tsx` - Botao "Enviar para Aprovacao"

### Fluxo editorial completo:

1. Jornalista cria pauta (rascunho) no calendario
2. Desenvolve conteudo no painel de criacao
3. Clica "Enviar para Aprovacao"
4. Editor ve posts com status "Aguardando Aprovacao" no calendario (icone laranja)
5. Editor aprova (muda para "scheduled") ou rejeita (muda para "rejected" com motivo)
6. Se rejeitado, jornalista edita e reenvia
7. Se aprovado, pode publicar imediatamente ou aguardar agendamento

### Indicadores visuais nos quadradinhos:

- Cada dia mostrara ate 4 mini-icones coloridos representando os posts daquele dia
- Se houver mais de 4 posts, mostra 3 icones + badge "+N"
- Icones usados: CheckCircle2 (publicado/verde), Clock (agendado/azul), Edit (rascunho/amarelo), AlertCircle (falha/vermelho), Loader2 (aguardando aprovacao/laranja), X (rejeitado/vermelho escuro)