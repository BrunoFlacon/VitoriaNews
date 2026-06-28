# Auditoria da API de Conexão WhatsApp & Plano de Correção, Backup e Reestruturação
### Repositórios auditados: `BrunoFlacon/social-canvas-hub` e `BrunoFlacon/VitoriaNews`
### Referência arquitetural incorporada: `IsraelHenriquee/youtube-painel-api-oficial`

> **Metodologia:** análise estática do código-fonte completo de ambos os repositórios (clone direto via GitHub, sem acesso a runtime/produção). Todos os achados abaixo são rastreáveis a arquivo e linha específicos. Onde não foi possível confirmar comportamento em produção (ex.: conteúdo real de variáveis de ambiente, dados no Supabase), isso está marcado explicitamente como **suposição a validar**.

---

## 0. Sumário Executivo

Os dois repositórios compartilham essencialmente a mesma base de código (mesma estrutura de pastas, mesmos documentos internos, mesmo motor de bot). O `social-canvas-hub` está **mais atualizado**; o `VitoriaNews` ficou **defasado** em pontos críticos (webhook sem validação de assinatura, coletor de métricas sem suporte a WhatsApp).

Os quatro pedidos feitos foram todos confirmados como problemas reais (ou lacunas reais) no código, com causa-raiz identificada:

| Pedido | Situação encontrada |
|---|---|
| **1. Corrigir fotos de perfil e métricas (membros, mensagens, posts)** | Confirmado. Causa raiz: campos de métricas calculados corretamente em um ponto do código, mas **nunca gravados** na tabela que a tela de Analytics lê; "Membros" não existe como conceito real no WhatsApp e está lendo um campo que nunca é preenchido; fotos de perfil usam URLs que expiram por desenho (Meta) e o cache tem fallback silenciosamente inseguro. |
| **2. Migrar para API oficial vinculada a cada Página do Facebook individualmente** | Parcialmente implementado, mas com uma **regressão arquitetural deliberada**: o sistema já usa a API oficial (Cloud API) para *envio manual/campanhas*, mas o **bot de resposta automática usa um único token global** para todas as Páginas, e o webhook atribui mensagens recebidas ao "primeiro usuário do sistema" em vez do dono real da Página/número. |
| **3. BotZap responder de forma independente por perfil de WhatsApp** | Não implementado. O banco de dados, o motor do bot e a tela de configuração foram construídos assumindo **um único número de WhatsApp por usuário**, mesmo depois de uma migração (`20260322100000_allow_multiple_social_profiles.sql`) que já permite múltiplas conexões. |
| **4. Backup automático criptografado + exportação compatível com o WhatsApp** | Funcionalidade inexistente hoje no dashboard. Desenhada do zero nas Seções 4-6 deste documento, incorporando padrões de modelagem de conversas extraídos de um terceiro repositório usado como referência arquitetural. |

Este documento também incorpora a análise de um terceiro repositório (`IsraelHenriquee/youtube-painel-api-oficial`), usado como **referência de arquitetura** — não como código a copiar literalmente (é Vue/Nuxt; o nosso projeto é React) — mas como modelo de dados e pipeline webhook→banco→tempo real a replicar dentro do nosso próprio stack (Seções 2.6 e 6).

Além disso, foi identificado um **incidente de segurança ativo**: dados de sessão do WhatsApp Web (biblioteca não-oficial `whatsapp-web.js`) estão commitados publicamente em **ambos** os repositórios.

---

## 1. 🔴 Achados Críticos de Segurança (resolver antes de qualquer outra coisa)

### 1.1. Sessão do WhatsApp Web exposta publicamente (CRÍTICO)

Ambos os repositórios contêm a pasta `.wwebjs_auth/session-agente-ia/` (~57 MB cada), que é o perfil de navegador Chrome/Puppeteer usado pela biblioteca não-oficial `whatsapp-web.js`. Isso inclui:
- `IndexedDB/https_web.whatsapp.com_0.indexeddb.leveldb/*` — dados de sessão do WhatsApp Web;
- `Login Data`, `Network/Cookies`, `Local Storage/leveldb/*` — cookies e tokens de sessão do navegador.

**Por que isso é grave:** se essa sessão ainda for válida, qualquer pessoa com acesso ao repositório público pode potencialmente restaurar a sessão e operar o WhatsApp daquele número (ler/enviar mensagens em nome da empresa), sem precisar escanear QR code novamente.

**Causa raiz:** o `.gitignore` do `social-canvas-hub` só ignora `scripts/Bot_Zap/.wwebjs_auth/`, mas a pasta foi commitada na **raiz** do projeto (`./.wwebjs_auth/`), fora do padrão do `.gitignore`. O `VitoriaNews` tem o mesmo problema.

**Correção imediata:**
1. No app do WhatsApp do número afetado → **Dispositivos conectados** → remover qualquer sessão "Bot_Zap"/"agente-ia" desconhecida, mesmo que pareça já estar offline.
2. Remover a pasta do histórico do Git com `git filter-repo` (ou BFG Repo-Cleaner) em **ambos** os repositórios — `git rm` simples não basta, o histórico continua público.
3. Corrigir o `.gitignore` para cobrir `.wwebjs_auth/` e `.wwebjs_cache/` em qualquer nível (`**/.wwebjs_auth/`), não só dentro de `scripts/Bot_Zap/`.
4. Rotacionar `META_SYSTEM_USER_TOKEN` e `META_APP_SECRET` por precaução, já que a presença de um bot baseado em `whatsapp-web.js` confirma que a migração para a API oficial foi parcial/híbrida em algum momento.

### 1.2. Webhook do WhatsApp sem validação de assinatura (`VitoriaNews`)

`supabase/functions/whatsapp-webhook/index.ts` no `VitoriaNews` **não verifica** o header `x-hub-signature-256`. O `social-canvas-hub` já corrigiu isso (função `verifyHmacSignature`, linhas 12–31), mas o `VitoriaNews` não recebeu o mesmo patch.

**Impacto:** qualquer pessoa pode enviar um POST forjado para esse endpoint simulando uma mensagem do WhatsApp, injetando dados falsos na tabela `messages` ou acionando respostas do bot para números arbitrários.

**Correção:** portar a função `verifyHmacSignature` do `social-canvas-hub` para o `VitoriaNews`.

### 1.3. Webhook retorna HTTP 400 em erro (`VitoriaNews`)

O mesmo arquivo retorna `status: 400` no `catch`. A Meta interpreta respostas de erro como falha de entrega e, após falhas repetidas, **pode desativar a inscrição do webhook automaticamit**. O `social-canvas-hub` já corrigiu isso retornando sempre `200` (linha 152). Replicar a correção.

### 1.4. Pastas de backup completas commitadas (`VitoriaNews`)

O repositório contém `_conflict_backup/`, `_restore_backup/`, `_system_backup_20260610_033738/` e `backup_migrations/` — cópias inteiras de `src/` e `supabase/` guardadas como pastas dentro do próprio Git. Isso:
- multiplica qualquer segredo/sessão vazada (o mesmo `.wwebjs_auth` deve existir dentro dessas pastas também);
- infla o repositório (78 MB) e dificulta auditoria;
- gera arquivos de migração SQL duplicados com nomes quase idênticos (ex.: `20260602_facebook_audit_completo.sql` e `20260602000001_facebook_audit_completo.sql`), o que é uma fonte provável de migrações aplicadas fora de ordem.

**Correção:** mover esse histórico para tags/branches do Git (que já fazem esse trabalho) e remover as pastas do working tree e do histórico.

---

## 2. Auditoria — API de Conexão WhatsApp

### 2.1. O que já está correto

- **Envio de campanhas/mensagens manuais** (`supabase/functions/_shared/platforms/whatsapp.ts`, função `publishToWhatsApp`) já usa a **Cloud API oficial** (`graph.facebook.com/v21.0/{phone_number_id}/messages`) com o token resolvido **por conexão** via `getMetaCredentials(supabase, userId, "whatsapp", targetProfileId)` — isso já respeita "uma página, um token, um número".
- **Recebimento de mensagens** (`supabase/functions/whatsapp-webhook/index.ts` no `social-canvas-hub`) já é o webhook oficial da Cloud API, com verificação de assinatura HMAC e suporte a mídia, localização, contatos, mensagens interativas, etc.
- A migração `20260322100000_allow_multiple_social_profiles.sql` já alterou a constraint de `social_connections` para `UNIQUE(user_id, platform, platform_user_id)` — ou seja, **o banco já permite múltiplos números de WhatsApp por usuário**.

### 2.2. O que está quebrado: a resposta automática do bot não usa a API oficial "por página"

O documento interno `docs/META_OMNICHANNEL_SPEC.md` descreve uma decisão arquitetural deliberada de **abandonar tokens dinâmicos por conexão** em favor de um único `META_SYSTEM_USER_TOKEN` estático para todas as Páginas/números ("modelo de Uso Próprio"). Isso está implementado em `supabase/functions/_shared/bot-engine.ts`:

```ts
// bot-engine.ts, linha ~252-260
export async function sendMetaGraphMessage(msg: NormalizedMessage, replyText: string) {
  const SYSTEM_TOKEN = Deno.env.get("META_SYSTEM_USER_TOKEN");
  // ... usa SEMPRE o mesmo token, independente de qual número/página recebeu a mensagem
```

Isso **contradiz diretamente** o pedido de "API vinculada a cada página do Facebook individualmente":
- Se cada Página/WABA tiver seu próprio token (caso comum quando números pertencem a Business Managers diferentes, ou quando o System User não tem acesso a todos os ativos), o bot **falha silenciosamente** para os números fora do alcance desse token único.
- Não há como saber, pela API, qual Página originou cada resposta — todas saem "como a mesma identidade".

Pior: a função `processOmnichannelMessage` (mesma arquivo) resolve o dono da conversa assim:

```ts
// bot-engine.ts, linha ~340-343
if (!userId) {
  const { data: adminUsers } = await supabase.from("profiles").select("id").limit(1);
  userId = adminUsers?.[0]?.id;
}
```

Ou seja: se a mensagem recebida não casar com nenhuma `social_connections.platform_user_id` conhecida, ela é atribuída ao **primeiro usuário cadastrado no sistema**, não ao dono real daquele número. Em um cenário multiusuário (vários clientes, cada um com sua própria Página/WhatsApp), isso é um vazamento de roteamento: a mensagem do cliente A pode acabar sendo processada com as configurações/IA do cliente B.

### 2.3. Conexão self-service por Página está desativada

`supabase/functions/whatsapp-tech-provider-auth/index.ts` retorna **HTTP 410 (Gone)** deliberadamente:

```ts
return new Response(JSON.stringify({
  status: "deprecated",
  message: "O fluxo de Tech Provider foi desativado...",
}), { status: 410, ... });
```

E o componente `src/components/dashboard/settings/WhatsAppEmbeddedSignup.tsx` exibe ao usuário:
> "⚠️ Fluxo descontinuado: A Meta descontinuou o Embedded Signup (Tech Provider). Configure manualmente preenchendo os campos de API do WhatsApp abaixo."

Isso significa que **vincular um novo número de WhatsApp a uma Página específica hoje é 100% manual** (colar Access Token, WABA ID, Phone Number ID, App ID à mão), sem nenhuma validação de que aquele número realmente pertence àquela Página/WABA. Qualquer erro de digitação cria uma conexão "fantasma" que parece conectada mas nunca vai receber webhooks corretos.

### 2.4. Escopos de OAuth genéricos para WhatsApp

`supabase/functions/_shared/oauth/providers/meta.ts` não tem um branch dedicado para `platform === "whatsapp"` — cai no mesmo `scope` do Facebook (`pages_show_list,pages_read_engagement,pages_manage_posts`), que **não inclui** `whatsapp_business_management` nem `whatsapp_business_messaging`. Mesmo que o fluxo de Embedded Signup volte a ser usado no futuro, esse escopo está incompleto.

### 2.5. Casos de uso pedidos que ainda não existem

| Caso de uso pedido | Status |
|---|---|
| Responder mensagens diretas de seguidores | ✅ Existe (mas com o problema de token único da seção 2.2) |
| Responder mensagens originadas de **anúncios** (Click-to-WhatsApp) | ⚠️ Parcial — a Cloud API envia um campo `referral` (origem do anúncio) no payload da mensagem quando ela vem de um anúncio, mas `whatsapp-webhook/index.ts` **descarta esse campo**, então hoje não há como diferenciar "lead de anúncio" de "contato orgânico" |
| Avisar seguidores sobre **novas publicações** | ❌ Não existe nenhuma função que envie notificação proativa de novo post via WhatsApp. Isso exigiria *Message Templates* pré-aprovados pela Meta (a Cloud API não permite texto livre para iniciar conversa fora da janela de 24h) — não há nenhuma função `notify-new-post-whatsapp` ou equivalente no projeto |

---

### 2.6. Referência externa analisada: `IsraelHenriquee/youtube-painel-api-oficial`

Apesar do nome, o conteúdo desse repositório é um **painel de atendimento estilo WhatsApp Web**, integrado à API Oficial da Meta através de um BSP (Business Solution Provider) chamado **Datafy API** — uma camada que expõe a Cloud API de forma simplificada (token único por número, sem o trâmite completo de App Review/Embedded Signup direto com a Meta).

**Stack do repositório:** Nuxt 4 (Vue 3, `<script setup>`) + Supabase (Postgres) + Pusher Channels (tempo real) + Pinia (cache local). É uma stack diferente da nossa (React/Vite), mas os **padrões de modelagem de dados e tratamento de webhook são diretamente aproveitáveis**, independente da linguagem/framework.

**Padrões do repositório que resolvem, por desenho, problemas já identificados no nosso sistema:**

| Padrão no repositório de referência | Problema nosso que ele resolve |
|---|---|
| Tabela `conversations` com `unique(phone_number_id, wa_id)` — uma linha por **contato por número** | Resolve, no nível do esquema, o "vazamento" entre múltiplos números do mesmo usuário (seção 3.4) — cada conversa já nasce isolada por número conectado, em vez de ser agrupada só pelo telefone do contato |
| `messages.status` com CHECK `sent/delivered/read/failed`, populado a partir de `value.statuses[]` do webhook (`webhookParser.ts` + `webhook.post.ts`) | É exatamente a peça que falta para corrigir "Entregues"/"Taxa de Sucesso" (seção 3.3) — confirma que `value.statuses[]` é a fonte de dado correta e mostra um parser de referência completo |
| `messages.wa_message_id` único + `upsert(..., { onConflict: 'wa_message_id', ignoreDuplicates: true })` | Proteção de idempotência contra reentrega de webhook (a Meta reenvia o mesmo evento em caso de timeout) |
| `media_sha256` gravado junto com a mídia recebida | Permite verificar integridade de mídia — reaproveitável no sistema de backup/exportação (Fase 4, abaixo), para garantir que o arquivo exportado não foi corrompido |
| Tempo real via **Pusher Channels** (`message:new`, `message:status`), eventos granulares por conversa | O nosso projeto **já tem** Supabase Realtime ligado em `messages`/`messaging_channels` (`MessagingView.tsx`, linhas ~632-641), mas hoje é grosseiro: qualquer mudança na tabela dispara um refetch geral de todas as mensagens do usuário, em vez de atualizar só a conversa afetada — ver Seção 6.4 |
| Acesso ao banco **só pelo servidor** (service role), RLS habilitada sem policies | Modelo mais simples que o nosso (RLS por policy/linha), mas o nosso já é mais granular — não recomendamos regredir, só manter o padrão atual nas tabelas novas |
| Provedor BSP (Datafy) com **um token por número/instância** | Reforça a recomendação da Fase 2 (token por conexão, não token global) — mesmo falando direto com a Meta (sem BSP), o princípio "1 número = 1 credencial" é o mesmo |

**O que não recomendamos copiar diretamente:**
- O webhook desse repositório está documentado como **sem verificação de assinatura** ("a Datafy não envia header de assinatura por ora — endpoint aberto"). Isso pode ser aceitável quando um BSP já autentica a origem por outro canal, mas **não deve ser replicado** no nosso `whatsapp-webhook`/`meta-webhook`, que falam direto com a Meta e precisam manter a validação HMAC (`x-hub-signature-256`) já implementada no `social-canvas-hub`.
- Trocar a Graph API direta por um BSP terceirizado (Datafy ou similar) é uma decisão de produto/custo (mensalidade do BSP vs. gestão própria de tokens), não uma correção técnica obrigatória — citado aqui só como padrão de referência.

A Seção 6 deste documento detalha como incorporar esses padrões dentro da nossa arquitetura React + Supabase atual, **sem reescrever o frontend em Vue/Nuxt** e **sem remover nenhuma ferramenta multicanal que já funciona**.

---

## 3. Auditoria — Fotos de Perfil e Métricas (Membros / Mensagens / Posts)

### 3.1. "Membros" sempre zerado

A tela de Analytics define o KPI assim (`src/components/dashboard/analytics/platform-detail/platformConfigs.ts`, linha 54):
```ts
{ key: "members", label: "Membros", ... }
```
E o cálculo (`PlatformKPIGrid.tsx`, função `computeKpiValue`):
```ts
case "members":
  return latest.followers ?? null;
```
Para WhatsApp, `followers` vem de `conn.followers_count` (`collect-social-analytics/index.ts`, linha 721) — um campo que **nenhuma API do WhatsApp jamais preenche**, porque WhatsApp não tem conceito de "seguidores". Resultado: esse campo fica travado em `0` (valor padrão da coluna) para sempre, a menos que alguém o edite manualmente.

> **Causa raiz:** o conceito de "Membros" foi copiado do Telegram/Instagram sem adaptação. Para WhatsApp, a métrica que faz sentido é **número de contatos únicos que já trocaram mensagem** — e essa informação já existe na tabela `messages`, só não está sendo agregada.

### 3.2. "Mensagens Enviadas" sempre zero na tela de detalhe (mesmo estando correto em outro lugar)

O número de mensagens **é** calculado corretamente em `collect-social-analytics/index.ts`, linha 684-686 e 722:
```ts
const [officialMsgs, scheduledCount] = await Promise.all([
  adminClient.from("messages").select("id", { count: "exact", head: true })...,
  adminClient.from("scheduled_posts").select("id", { count: "exact", head: true })...
]);
...
posts_count: (officialMsgs.count || 0) + (scheduledCount.count || 0),
```
Esse valor é gravado corretamente em `social_accounts.posts_count` (linha 1230). **Porém**, o snapshot histórico gravado em `account_metrics` — que é exatamente a tabela que a tela de detalhe por plataforma lê (`usePlatformDetail.ts`, linha 128) — **omite esse campo**:
```ts
// collect-social-analytics/index.ts, linha 1260-1271
await adminClient.from("account_metrics").insert({
  user_id: uid, social_account_id: account?.id || null, platform: conn.platform,
  followers: upsertPayload.followers_count,
  views: upsertPayload.views,
  likes: upsertPayload.likes,
  shares: upsertPayload.shares,
  comments: upsertPayload.comments,
  engagement_rate: upsertPayload.engagement_rate,
  collected_at: new Date().toISOString()
  // 🔴 posts_count, reach, profile_visits, new_followers NÃO estão aqui
});
```
A coluna `posts_count` existe na tabela (`ALTER TABLE account_metrics ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0`, migração `20260413000000_align_metrics_schema.sql`), então o valor gravado é o **default `0`**, não `NULL`. Por isso a tela mostra "0", e não "—" (que apareceria se o frontend tratasse ausência de coletor).

**Esse é o bug isolado de maior impacto**: ele afeta `posts_count` (e portanto "Mensagens Enviadas" no WhatsApp/Telegram, e "Posts" em qualquer outra rede que dependa do histórico) em **todas as plataformas**, não só WhatsApp — basta uma linha de correção.

### 3.3. "Entregues" e "Taxa de Sucesso" sempre zero

```ts
case "messagesDelivered":
  return latest.reach ?? null;
case "successRate": {
  const sent = latest.posts_count || 1;
  const delivered = latest.reach || 0;
  return (delivered / sent) * 100;
}
```
`reach` é um conceito de alcance de posts do Facebook/Instagram — nunca é definido no branch `case "whatsapp"` do coletor, e também não é gravado em `account_metrics` (mesma omissão do item 3.2). Mas mesmo corrigindo a gravação, **não existe nenhuma fonte de dado real para "entregue"**: nem `whatsapp-webhook/index.ts` nem `meta-webhook/index.ts` processam o array `change.value.statuses` que a Cloud API envia com os eventos de confirmação de entrega/leitura/falha (`sent` → `delivered` → `read` / `failed`). Hoje esse evento chega no webhook e é simplesmente ignorado (o código só itera `change.value.messages`).

### 3.4. Contagem de mensagens "vaza" entre números diferentes do mesmo usuário

A query de contagem de mensagens (seção 3.2) filtra apenas por:
```ts
.eq("user_id", uid).eq("platform", "whatsapp")
```
**Sem filtrar por qual número/conexão.** Como confirmado na seção 2.1, o banco já suporta múltiplos números de WhatsApp por usuário (`UNIQUE(user_id, platform, platform_user_id)`) — então, se Bruno (ou um cliente) tiver 2 números conectados, **os dois vão exibir o mesmo total combinado** (soma dos dois), em vez do total individual de cada um.

A causa raiz é mais profunda: a tabela `messages` tem uma coluna `channel_id uuid REFERENCES messaging_channels(id)` (migração `20260308212816...sql`, linha 5) criada exatamente para resolver esse tipo de problema — mas `logInteraction()` em `bot-engine.ts` (linha 205-225 e 427-443) **nunca preenche esse campo** ao gravar uma mensagem. Sem esse vínculo, é impossível separar as métricas por número mesmo que a query seja corrigida.

### 3.5. Fotos de perfil: por que "quebram" com o tempo

1. O endpoint oficial `GET /{phone_number_id}/whatsapp_business_profile?fields=profile_picture_url` (usado em `collect-social-analytics/index.ts`, linha 705) **por desenho da Meta** retorna uma URL de CDN de curta duração — ela não é destinada a ser salva diretamente, só a ser baixada imediatamente.
2. O projeto já tem uma defesa para isso: `cacheProfileImage()` (`supabase/functions/_shared/media.ts`) baixa a imagem e a re-hospeda no Supabase Storage, devolvendo uma signed URL. **Porém:**
   - Se o download falhar por qualquer motivo transitório (timeout, erro de rede, content-type inesperado), a função retorna `null`, e o código que chama (`collect-social-analytics/index.ts`, linha 1192-1204) cai no fallback `lastPic || metrics.profile_picture` — e se for a *primeira* sincronização (`lastPic` ainda nulo), o sistema acaba salvando a **URL crua e efêmera da Meta direto no banco**, que vai quebrar em poucos minutos/horas.
   - A signed URL gerada por `cacheProfileImage` tem validade fixa de **365 dias** (`createSignedUrl(filePath, 365 * 24 * 60 * 60)`, linha 55 de `media.ts`), sem nenhuma rotina de renovação. Qualquer foto que não seja re-cacheada (por exemplo, se a foto remota parar de mudar e a condição de "mudou desde a última vez" nunca disparar de novo) vai parar de carregar exatamente 1 ano após o último cache bem-sucedido.

### 3.6. `VitoriaNews` nem coleta métricas de WhatsApp

O `collect-social-analytics/index.ts` do `VitoriaNews` (versão mais antiga/divergente) **não tem nenhum `case "whatsapp"`** no switch de plataformas — então, nesse repositório, fotos/métricas de WhatsApp nunca são atualizadas por essa função. Adicionalmente, esse coletor usa números **aleatórios** (`Math.random()`) como métrica de "views" em vários blocos (Facebook, TikTok-equivalentes, Kwai/Rumble/Gettr/Truth Social) — um problema de integridade de dados mais amplo que vale a pena registrar, mesmo fora do escopo direto do WhatsApp.

### 3.7. O controle de bot do WhatsApp (com contadores de posts/respostas) está desconectado da tela

`src/components/dashboard/settings/WhatsAppBotControl.tsx` é um componente completo (avatar do bot, switch on/off, contador "Posts do Bot", contador "Total de Respostas") — mas uma busca em todo o `src/` confirma que **ele não é importado em nenhuma página**. A configuração real do bot acontece em `src/pages/RobotBuilder.tsx`, que não tem nem o switch visual nem os contadores desse componente. Ou seja, parte do trabalho de UI para resolver justamente o pedido do Bruno já existe, mas está órfã/desconectada.

---

## 4. Plano de Correção

Organizado em 3 fases, na mesma ordem dos 3 pedidos. As correções de segurança (Seção 1) devem ser feitas **antes ou em paralelo**, independentemente da fase.

### FASE 1 — Fotos de Perfil e Métricas

| # | Ação | Arquivo(s) | Esforço |
|---|---|---|---|
| 1.1 | Adicionar `posts_count`, `reach`, `profile_visits`, `new_followers` ao `insert` em `account_metrics` (os valores já existem em `upsertPayload`/`metrics`, só faltam ser incluídos no payload) | `collect-social-analytics/index.ts` (linha ~1260) | Baixo (1 linha por campo) |
| 1.2 | Criar colunas dedicadas para métricas de mensageria (`messages_sent_count`, `messages_delivered_count`, `unique_contacts_count`) em `account_metrics`, em vez de reaproveitar `followers`/`posts_count`/`reach` | Nova migração SQL | Médio |
| 1.3 | Redefinir "Membros" do WhatsApp como **contatos únicos**: `SELECT COUNT(DISTINCT recipient_phone) FROM messages WHERE channel_id = :connection_id` (depende do item 3.1 da Fase 3 para o `channel_id` existir de fato) | `collect-social-analytics/index.ts` | Médio |
| 1.4 | Capturar `change.value.statuses` nos webhooks (`sent`/`delivered`/`read`/`failed`) e gravar em `messages` (nova coluna `delivered_at`, `read_at`, `failed_reason`) para alimentar "Entregues"/"Taxa de Sucesso" com dados reais | `whatsapp-webhook/index.ts`, `meta-webhook/index.ts` | Médio-Alto |
| 1.5 | Filtrar a contagem de mensagens por `channel_id`/conexão, não apenas por `platform`, eliminando a soma cruzada entre números (depende da Fase 3) | `collect-social-analytics/index.ts` | Baixo, após 3.1/3.2 |
| 1.6 | `cacheProfileImage`: adicionar retry com backoff; nunca persistir a URL crua da Meta como valor final (manter o último cache válido em caso de falha); avaliar tornar o bucket `media`/pasta `profiles/` público de leitura (são apenas fotos de perfil, não dados sensíveis) para eliminar o problema de expiração em 365 dias, ou implementar um cron que renove as signed URLs antes do vencimento | `_shared/media.ts` | Médio |
| 1.7 | Atualizar `computeKpiValue` (`PlatformKPIGrid.tsx`) para ler as novas colunas específicas de mensageria quando `platform === 'whatsapp'`/`'telegram'`, em vez de reaproveitar campos de redes sociais tradicionais | `PlatformKPIGrid.tsx` | Baixo |
| 1.8 | Portar o `case "whatsapp"` do coletor de métricas para o `VitoriaNews` (hoje inexistente lá) ou consolidar os dois repositórios (ver Seção 5) | `VitoriaNews/supabase/functions/collect-social-analytics/index.ts` | Médio |

### FASE 2 — API Oficial Vinculada a Cada Página do Facebook

| # | Ação | Arquivo(s) | Esforço |
|---|---|---|---|
| 2.1 | Trocar `sendMetaGraphMessage` para resolver o token **por conexão** via `getMetaCredentials(supabase, userId, "whatsapp", connectionId)` — a mesma função já usada com sucesso em `publishToWhatsApp` — em vez do `META_SYSTEM_USER_TOKEN` global | `_shared/bot-engine.ts` | Médio |
| 2.2 | Remover o fallback "primeiro usuário do sistema" em `processOmnichannelMessage`; se a mensagem recebida não casar com nenhuma `social_connections.platform_user_id` conhecida, registrar um alerta/log de "número não mapeado" em vez de atribuir a um usuário arbitrário | `_shared/bot-engine.ts` | Baixo-Médio |
| 2.3 | Adicionar branch dedicado para `platform === "whatsapp"` em `getAuthUrl`, incluindo os escopos `whatsapp_business_management` e `whatsapp_business_messaging` | `_shared/oauth/providers/meta.ts` | Baixo |
| 2.4 | Substituir a entrada manual "às cegas" de Phone Number ID/WABA ID por uma validação no backend: ao salvar uma conexão manual de WhatsApp, chamar `GET /{phone_number_id}?fields=display_phone_number` com o token informado e confirmar que a resposta é válida antes de gravar | Nova rota/edge function de validação | Médio |
| 2.5 | Capturar o campo `referral` (origem de anúncio Click-to-WhatsApp) do payload da Cloud API e gravar em `messages.metadata.ad_referral`, permitindo identificar/segmentar leads vindos de anúncios | `whatsapp-webhook/index.ts` | Baixo |
| 2.6 | Criar função `notify-new-post-whatsapp`, acionada após a publicação de um post, que envia um **Message Template pré-aprovado** (a Cloud API exige template para iniciar conversa fora da janela de 24h) para a lista de contatos com opt-in daquele número específico — usando o token daquela conexão, não o token global | Nova edge function | Alto |

> **Observação:** o reativamento de um fluxo de auto-descoberta "Página → número de WhatsApp vinculado" tipo Embedded Signup não é trivial porque a própria Meta descontinuou esse fluxo de Tech Provider para a maioria dos casos de uso simples (conforme o aviso já presente no próprio código). A alternativa realista de curto prazo é manter a entrada manual, mas **validada** (item 2.4), e documentar claramente para o usuário onde encontrar o Phone Number ID/WABA ID corretos no painel da Meta para cada Página.

### FASE 3 — BotZap Independente por Perfil de WhatsApp

| # | Ação | Arquivo(s) | Esforço |
|---|---|---|---|
| 3.1 | Migração SQL: adicionar `connection_id uuid REFERENCES social_connections(id) ON DELETE CASCADE` (nullable, para retrocompatibilidade) à tabela `bot_settings`; trocar `UNIQUE(user_id, platform)` por `UNIQUE(user_id, platform, connection_id)` | Nova migração | Médio |
| 3.2 | Adicionar `channel_id uuid REFERENCES social_connections(id)` (ou reaproveitar a coluna existente que referencia `messaging_channels`, criando o vínculo equivalente para WhatsApp) à tabela `messages`; popular esse campo em `logInteraction()` resolvendo a conexão a partir do `phoneNumberId`/`recipientId` do payload recebido | `_shared/bot-engine.ts`, migração SQL | Médio |
| 3.3 | Atualizar `getSmartResponse()` para aceitar `connectionId` opcional e filtrar `bot_settings` por `(user_id, platform, connection_id)` antes de cair no fallback genérico por plataforma | `_shared/bot-engine.ts` | Baixo-Médio |
| 3.4 | Garantir que `processOmnichannelMessage` resolve e propaga o `connectionId` (a busca em `social_connections` por `platform_user_id` já existe — falta apenas guardar e repassar o `id` da conexão encontrada) | `_shared/bot-engine.ts` | Baixo |
| 3.5 | Reativar/reconstruir `WhatsAppBotControl.tsx`, renderizando **um card por conexão de WhatsApp** (loop sobre `social_connections` filtradas por `platform === 'whatsapp'`), cada um com seu próprio switch, prompt de IA, palavras-chave/fluxos e contadores — gravando em `bot_settings` com o `connection_id` daquele número | `WhatsAppBotControl.tsx`, página onde for integrado | Médio-Alto |
| 3.6 | Atualizar `RobotBuilder.tsx` para exibir um seletor de número/perfil quando a plataforma selecionada tiver múltiplas conexões (`platform === 'whatsapp'` hoje; preparar para outras plataformas multi-conta no futuro), em vez de assumir uma única configuração por plataforma | `src/pages/RobotBuilder.tsx` | Médio-Alto |

> **Dependência:** a Fase 3 só tem efeito prático completo depois da Fase 2 (item 2.1) — não faz sentido ter configurações de bot independentes por número se todas elas ainda respondem usando o mesmo token/identidade.

#### ⚠️ Achado adicional encontrado ao preparar a migração 3.1: `bot_settings` tem definições conflitantes no histórico

Ao escrever o SQL real da migração 3.1, encontramos que a tabela `bot_settings` foi definida **três vezes** em migrações diferentes:

| Migração | Efeito sobre a unicidade |
|---|---|
| `20260417233200_create_bot_settings.sql` (original) | `UNIQUE(user_id, platform)` — 1 config por usuário **por plataforma** (o que o resto deste plano assume) |
| `20260424000000_add_missing_columns.sql` | `CREATE TABLE IF NOT EXISTS` — inofensivo, roda depois da original, é no-op |
| `20260424210930_4424c95b-f364-4970-8f78-eb919f271b9d.sql` | Roda **depois** da original e executa `CREATE UNIQUE INDEX IF NOT EXISTS bot_settings_user_unique ON public.bot_settings (user_id)` — índice único só em `user_id`, **sem considerar a plataforma** |

Se esse terceiro índice estiver realmente ativo em produção (ele só falharia na criação se, naquele momento, algum usuário já tivesse 2+ linhas em `bot_settings`), o efeito é um bug **independente do WhatsApp**: o banco permitiria apenas **uma linha de `bot_settings` por usuário no total**, impedindo configurar bot em mais de uma plataforma (ex.: WhatsApp e Telegram) ao mesmo tempo. Isso não pode ser confirmado por análise estática do código — depende do estado real do banco em produção.

**Passo 1 — Diagnóstico (rodar primeiro, somente leitura, sem risco):**
```sql
-- Lista constraints únicas (UNIQUE) da tabela
select conname as constraint_name, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.bot_settings'::regclass and contype = 'u';

-- Lista índices únicos da tabela (cobre o caso do bot_settings_user_unique)
select indexname, indexdef
from pg_indexes
where tablename = 'bot_settings' and schemaname = 'public' and indexdef ilike '%unique%';
```
Revise o resultado antes de seguir para o passo 2 — idealmente rode isso (e a migração abaixo) primeiro em um ambiente de staging/branch de desenvolvimento do Supabase, não direto em produção.

**Passo 2 — Migração 3.1 (defensiva: descobre e remove qualquer constraint/índice único antigo antes de criar o correto, em vez de assumir um nome fixo):**
```sql
begin;

-- 1) Coluna nova de vínculo por conexão (nullable = retrocompatível com configs já existentes)
alter table public.bot_settings
  add column if not exists connection_id uuid references public.social_connections(id) on delete cascade;

-- 2) Remove qualquer constraint/índice único existente que cubra (user_id) ou (user_id, platform)
--    — cobre os cenários conflitantes encontrados no histórico, sem chutar um nome específico
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.bot_settings'::regclass and contype = 'u'
  loop
    execute format('alter table public.bot_settings drop constraint if exists %I', r.conname);
  end loop;

  for r in
    select indexname from pg_indexes
    where tablename = 'bot_settings' and schemaname = 'public' and indexdef ilike '%unique%'
  loop
    execute format('drop index if exists public.%I', r.indexname);
  end loop;
end $$;

-- 3) Constraint correta: 1 configuração por usuário + plataforma + conexão
--    (connection_id pode ser NULL = configuração "padrão" da plataforma, retrocompatível)
alter table public.bot_settings
  add constraint bot_settings_user_platform_connection_key unique (user_id, platform, connection_id);

create index if not exists idx_bot_settings_connection on public.bot_settings (connection_id);

commit;
```

> Se o diagnóstico do Passo 1 mostrar algo muito diferente do esperado (ex.: nenhuma constraint única encontrada, ou uma constraint com nome/colunas que não aparecem nas migrações revisadas aqui), pare e avalie manualmente antes de rodar o Passo 2 — o `DO $$ ... $$` acima remove **todas** as constraints/índices únicos da tabela, então vale confirmar que não há nenhum outro propósito legítimo para algum deles antes de remover.

---

### FASE 4 — Backup Automático, Exportação Criptografada e Segurança Avançada de Conversas

> Funcionalidade nova (não existe hoje no dashboard). Pedido explícito: backup automático por número e por conversa individual, em arquivos criptografados, com exportação sob demanda compatível com o formato do próprio WhatsApp.

#### 4.A. O que "compatível com o backup do WhatsApp" significa na prática

O backup nativo do WhatsApp (`msgstore.db.crypt14`/`.crypt15`) é um banco SQLite cifrado com protocolo **proprietário e não documentado publicamente** pela Meta — replicar esse formato byte a byte exigiria engenharia reversa de um mecanismo de segurança de terceiros, o que é frágil (quebra a cada atualização do app), não recomendado e desnecessário. A boa notícia é que o WhatsApp **já tem** um formato de exportação aberto e estável: a função nativa "**Exportar conversa**" (Configurações da conversa → Exportar conversa), que gera um `.txt` (texto simples, formato `[DD/MM/AAAA HH:MM:SS] Nome: mensagem`) acompanhado, opcionalmente, de um `.zip` com a mídia. **Esse** é o formato que vamos replicar — é genuinamente compatível, porque é literalmente o mesmo que o WhatsApp produz.

#### 4.B. Modelo de dados novo

```sql
-- Catálogo de backups gerados (completo por número, ou de uma conversa específica)
create table public.whatsapp_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  conversation_id uuid null,             -- null = backup completo do número; preenchido após a Fase 6 (whatsapp_conversations)
  scope text not null check (scope in ('full_number','single_conversation')),
  format text not null check (format in ('encrypted_json','whatsapp_txt_zip','pdf')),
  storage_path text not null,            -- caminho no bucket privado whatsapp-backups
  checksum_sha256 text not null,         -- hash do arquivo final (íntegro/criptografado)
  encryption_key_id text null,           -- referência à chave usada (Vault/KMS) — null para format='whatsapp_txt_zip' sem senha
  size_bytes bigint not null default 0,
  message_count integer not null default 0,
  retention_class text not null default 'daily' check (retention_class in ('daily','weekly','monthly','manual_export')),
  expires_at timestamptz null,           -- null = nunca expira (ex.: exportação manual)
  created_at timestamptz not null default now()
);

create index idx_whatsapp_backups_conn on public.whatsapp_backups (connection_id, created_at desc);

alter table public.whatsapp_backups enable row level security;
create policy "Users manage own backups" on public.whatsapp_backups
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Log de auditoria de acesso (quem criou/baixou/descriptografou/apagou cada backup)
create table public.whatsapp_backup_access_log (
  id uuid primary key default gen_random_uuid(),
  backup_id uuid not null references whatsapp_backups(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null check (action in ('created','downloaded','decrypted','deleted')),
  ip_address text null,
  created_at timestamptz not null default now()
);
alter table public.whatsapp_backup_access_log enable row level security;
create policy "Users view own backup logs" on public.whatsapp_backup_access_log
  for select to authenticated using (auth.uid() = user_id);
```

#### 4.C. Backup automático (estilo WhatsApp Business / Messenger)

Nova Edge Function agendada (cron diário, mesmo padrão de agendamento já usado por `collect-social-analytics`): **`backup-whatsapp-conversations`**.

1. Para cada conexão WhatsApp ativa (`social_connections`, `platform='whatsapp'`):
   - Para cada conversa com mensagens novas desde o último backup, serializa o histórico (mensagens + status de entrega + metadados de mídia) em JSON estruturado, criptografa (ver 4.D) e salva em `whatsapp-backups/{connection_id}/{conversation_id}/{AAAA-MM-DD}.json.enc`.
   - Periodicamente (ex.: semanal), gera também um backup **consolidado do número inteiro** (`scope: 'full_number'`) — equivalente ao backup diário/automático do WhatsApp Business App.
2. Retenção rotativa (estilo Google Drive/iCloud do WhatsApp): manter os últimos N diários / M semanais; backups de exportação manual (`manual_export`) nunca expiram automaticamente.
3. Função de limpeza agendada **`cleanup-expired-backups`** remove do Storage e da tabela tudo com `expires_at < now()`.

> Isso replica o comportamento do app oficial — backup automático, criptografado, com retenção rotativa — com a diferença de que o backup vive na nossa própria infraestrutura (Supabase Storage), não no Google Drive/iCloud do usuário. (O Messenger não tem um "backup automático" equivalente para o usuário final — o mais próximo é a ferramenta de exportação de dados "Baixe suas informações" da Meta, que é manual e pontual, não automática/recorrente; por isso o desenho abaixo se baseia no modelo do WhatsApp, que é o que tem um backup automático real.)

#### 4.D. Exportação individual sob demanda

Botão "Exportar conversa" na tela de mensagens (`ChatWindow.tsx`), por contato/conversa, com 3 formatos:

| Formato | Conteúdo | Compatibilidade |
|---|---|---|
| **`.txt` + mídia em `.zip`** | Texto simples `[DD/MM/AAAA HH:MM:SS] Nome: mensagem`; mídia salva como arquivos separados referenciados no texto | **Genuinamente compatível** — é o mesmo formato que o próprio app do WhatsApp gera em "Exportar conversa" |
| **JSON criptografado (full-fidelity)** | Todos os campos (status de entrega, IDs de mensagem, timestamps, metadados de mídia, hash sha256) | Formato interno nosso — não abre no WhatsApp, é para restauração/auditoria |
| **PDF** | "Extrato de conversa" legível, para fins de compliance/jurídico | Adicional de conveniência (não é um formato do WhatsApp) |

Para exportações que o **próprio usuário** baixa, oferecer a opção de proteger o arquivo com **senha definida por ele** (ex.: zip com senha AES-256) — assim, quem mais pode abrir aquele export específico fica sob o controle do usuário, independente da chave mestra interna do sistema.

#### 4.E. Criptografia e gestão de chaves

- Algoritmo: **AES-256-GCM** (autenticado — backups corrompidos/forjados não passam como válidos).
- Chave: nunca hardcoded. Curto prazo: uma chave mestra única em segredo de ambiente (`WHATSAPP_BACKUP_MASTER_KEY`, 32 bytes, cadastrada via `supabase secrets set`, nunca em `.env` commitado — ver Seção 1). Médio prazo: criptografia em envelope (uma chave de dados por backup, criptografada por uma chave mestra guardada no Supabase Vault/KMS), permitindo rotacionar a chave mestra sem re-criptografar tudo de uma vez.
- Nunca gravar a chave de criptografia junto com o arquivo de backup.

#### 4.F. Ferramentas e scripts de segurança a adicionar ao repositório

| Ferramenta | Função |
|---|---|
| `scripts/security/scan-secrets.sh` | Roda `gitleaks`/`trufflehog` no working tree e no histórico antes de cada push — detecta tokens, `.env`, sessões `.wwebjs_auth` esquecidas |
| `scripts/security/purge-wwebjs-history.sh` | Script de remediação única para remover `.wwebjs_auth/` do histórico do Git (via `git filter-repo`) nos dois repositórios — referência: Seção 1.1 |
| `_shared/security/verifyMetaSignature.ts` | Extrai `verifyHmacSignature` (hoje só em `whatsapp-webhook` do `social-canvas-hub`) para um utilitário compartilhado, usado por **todos** os webhooks da Meta nos dois repositórios |
| `_shared/security/backupCrypto.ts` | Funções de criptografia/decriptação AES-256-GCM usadas pela Fase 4 (usa Web Crypto API nativa do Deno — não precisa de dependência externa) |
| `scripts/security/rotate-backup-key.ts` | Rotaciona a chave mestra de criptografia dos backups (gera nova KEK, re-criptografa as DEKs, nunca os dados em si) |
| `scripts/security/check-token-expiry.ts` | Job agendado que varre `social_connections`/credenciais por tokens perto de expirar e gera alerta, evitando renovação manual reativa |
| Hook de pre-commit (`husky` + `lint-staged` + `gitleaks`) | Bloqueia commit de `.env`, `.wwebjs_auth/`, chaves privadas, antes mesmo do push |
| `whatsapp_backup_access_log` (tabela, seção 4.B) | Log de auditoria de quem criou/baixou/descriptografou/apagou cada backup |

#### 4.G. Mudanças de UI

- Nova aba "Backups" em Configurações → WhatsApp (por número, alinhada à Fase 3): histórico de backups automáticos, download, configuração de retenção.
- Botão "Exportar conversa" em cada conversa, com seletor de formato e opção de senha.
- Indicador "Último backup: há X horas" por número conectado.

> **Dependência:** o backup "por conversa individual" fica muito mais simples depois da Seção 6 (criação de `whatsapp_conversations`) — sem ela, é preciso reconstruir o agrupamento por `recipient_phone` a cada execução, do mesmo jeito que a tela de mensagens faz hoje (ver Seção 6.2).

---

## 5. Inventário de Lacunas — Ferramentas, Pacotes e Configurações que Faltam

Lista consolidada de tudo que precisa ser **instalado/configurado** (além do código em si) para que as Fases 1 a 4 funcionem de ponta a ponta.

### 5.1. Dependências de software a adicionar

| Pacote/Ferramenta | Para quê | Onde |
|---|---|---|
| `jszip` (ou equivalente Deno) | Gerar o `.zip` de mídia no export estilo WhatsApp (4.D) | Edge Function `export-whatsapp-conversation` |
| Web Crypto API nativa do Deno (`crypto.subtle`) | AES-256-GCM dos backups — **não precisa instalar nada**, já vem no runtime | `_shared/security/backupCrypto.ts` |
| `gitleaks` (binário via CI — não é dependência npm) | Scanner de segredos no CI/pre-commit | `.github/workflows/`, `scripts/security/` |
| `husky` + `lint-staged` | Hooks de pre-commit (bloquear `.env`, `.wwebjs_auth`) | raiz do projeto (`package.json`) |
| Nenhuma lib nova de PDF | Exportação em PDF já é coberta pelo pipeline de geração de documentos já existente no projeto | - |

### 5.2. Variáveis de ambiente / segredos novos (Supabase Edge Functions)

| Variável | Função |
|---|---|
| `WHATSAPP_BACKUP_MASTER_KEY` | Chave mestra (32 bytes) para AES-256-GCM dos backups |
| `WHATSAPP_BACKUP_RETENTION_DAILY` / `_WEEKLY` / `_MONTHLY` | Quantos backups manter por categoria de retenção (ex.: 7/4/12) |
| `WHATSAPP_BUSINESS_SCOPE` (opcional) | Override de escopo OAuth para a Fase 2.3 (`whatsapp_business_management,whatsapp_business_messaging`) caso seja preciso ajustar sem deploy |

> Cadastrar sempre via `supabase secrets set` — nunca em `.env` commitado (ver Seção 1).

### 5.3. Infraestrutura Supabase a criar/habilitar

| Item | Necessário para |
|---|---|
| Bucket de Storage **privado** `whatsapp-backups` | Armazenar os arquivos criptografados de backup (confirmar que **não** está marcado como público, diferente do bucket `media` usado hoje para fotos de perfil) |
| Bucket de Storage **privado** `whatsapp-exports` (ou subpasta do mesmo bucket) | Armazenar exportações sob demanda antes do download, com expiração curta (ex.: 24h) |
| `whatsapp_conversations` adicionada à publicação `supabase_realtime` (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`) | Tempo real granular por conversa (Seção 6.4) — a tabela `messages` **já está** na publicação hoje, então essa parte não é nova, só falta estender para a tabela nova |

### 5.4. Cron Jobs / agendamentos novos

| Job | Frequência sugerida | Função |
|---|---|---|
| `backup-whatsapp-conversations` | Diário (madrugada) | Backups incrementais por conversa (4.C) |
| `backup-whatsapp-full-number` | Semanal | Backup consolidado por número |
| `cleanup-expired-backups` | Diário | Aplica a política de retenção |
| `check-token-expiry` | Diário | Alerta de tokens Meta perto de expirar (4.F) |

### 5.5. Migrações SQL novas (resumo consolidado)

- `xxxx_add_whatsapp_conversations.sql` (Seção 6.2)
- `xxxx_add_messages_delivery_status.sql` (Fase 1.4 / Seção 6.2 — coluna nova `delivery_status`, **sem** tocar na coluna `status` já usada pelo ciclo de vida de envio)
- `xxxx_add_bot_settings_connection_id.sql` (Fase 3.1)
- `xxxx_create_whatsapp_backups.sql` (4.B)
- `xxxx_create_whatsapp_backup_access_log.sql` (4.B)

> A correção do item 1.1 (gravar `posts_count`/`reach` em `account_metrics`) não exige migração — é ajuste de código numa Edge Function já existente, mas vale registrar no changelog de deploy.

---

## 6. Plano de Reestruturação do Módulo WhatsApp (arquitetura tipo `youtube-painel-api-oficial`)

### 6.1. O que "idêntico" significa na prática (leitura obrigatória antes de executar)

O repositório de referência é **Nuxt 4 + Vue 3 + Pinia + Pusher**, falando com um BSP (Datafy). O nosso projeto é **React + Vite + TypeScript + Supabase Edge Functions (Deno)**, falando direto com a Graph API da Meta. São stacks diferentes por decisão de produto, não por acidente.

**Recomendação técnica:** não reescrever o frontend em Vue/Nuxt. Misturar dois frameworks dentro do mesmo dashboard (ex.: via iframe ou Module Federation) é tecnicamente possível, mas cria duplicação de autenticação, inconsistência visual com o resto do dashboard, e mais infraestrutura para manter — sem nenhum ganho funcional real, já que o que importa para o usuário final é o **comportamento**, não a linguagem por trás. A recomendação é replicar a **arquitetura** (modelo de dados, pipeline webhook → banco → tempo real → tela, disciplina de segurança) dentro do nosso próprio stack — isso entrega "funciona igual" sem o risco de uma reescrita paralela.

> Se ainda assim o objetivo for reaproveitar o **código Vue como está** (não só o padrão), a alternativa é hospedar esse painel como um micro-frontend separado (deploy próprio do Nuxt), embutido via iframe autenticado dentro de uma aba do dashboard. Isso é viável, mas recomendamos só se houver um motivo de peso (ex.: reaproveitar literalmente o repositório do Israel Henrique sem adaptação) — listamos como Opção B no item 6.6.

### 6.2. Diagnóstico: o que já existe no nosso projeto (não é do zero)

Boa notícia: o dashboard **já tem** uma tela de mensagens funcional — não estamos partindo do zero:

- `src/components/dashboard/MessagingView.tsx` (3055 linhas) — tela principal, já com Realtime, envio, listagem.
- `src/components/dashboard/messaging/ChatList.tsx` / `ChatWindow.tsx` — componentes de lista de conversas e janela de mensagens, já com abas "Tudo/Privado/Grupos/Canais/Listas".
- Realtime via Supabase **já ligado**: `messages` já está em `supabase_realtime` desde a criação da tabela, e `MessagingView.tsx` já assina mudanças (`postgres_changes`) em `messages` e `messaging_channels`.

**O que está, de fato, defasado em relação ao padrão do repositório de referência:**

1. **Não existe uma tabela `conversations`.** As conversas individuais (WhatsApp, Instagram DM, Messenger) são recalculadas **no cliente, a cada carregamento**, agrupando `messages` por `recipient_phone || recipient_name` (`MessagingView.tsx`, linhas 303-349, função `.reduce()`). Isso tem duas consequências:
   - **Não considera qual número/conexão recebeu a mensagem** — se o mesmo contato escrever para dois números de WhatsApp diferentes do mesmo usuário, as mensagens dos dois números são **misturadas na mesma conversa** na tela (o mesmo problema de cross-contaminação encontrado nas métricas, seção 3.4, mas agora visível na própria caixa de entrada).
   - É um trabalho de agrupamento refeito do zero a cada render/fetch, em vez de uma entidade persistida — exatamente o ponto em que o repositório de referência (tabela `conversations`, `unique(phone_number_id, wa_id)`) é mais robusto.
2. **Tempo real é grosseiro**, não granular: a assinatura em `messages` (linha 640) dispara um `refetchMessages()` geral a **qualquer** mudança na tabela do usuário, em vez de eventos específicos por conversa (`message:new`/`message:status`, como no repositório de referência). Funciona, mas refaz trabalho desnecessário e não escala bem com volume.
3. **Não há distinção entre status de envio e status de entrega.** A coluna `messages.status` hoje guarda o **ciclo de vida do envio pelo nosso sistema** (`draft`/`scheduled`/`sent`/`failed`) — não tem `delivered`/`read` (confirmação da Meta). Por isso a tela (`ChatWindow.tsx`, linha 380) só mostra um ícone genérico de "enviado", nunca o duplo-check azul de "lido" que o WhatsApp real tem — porque esse dado nunca chegou a ser capturado (mesma causa-raiz da seção 3.3).

### 6.3. Nova modelagem de dados (aditiva — não remove nem renomeia nada existente)

```sql
-- Nova tabela, equivalente à "conversations" do repositório de referência
create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  contact_wa_id text not null,             -- número do contato
  contact_name text null,
  avatar_url text null,
  last_message_preview text null,
  last_message_at timestamptz null,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, contact_wa_id)    -- a mesma proteção do repositório de referência: 1 conversa por contato POR NÚMERO
);

alter table public.whatsapp_conversations enable row level security;
create policy "Users manage own whatsapp conversations" on public.whatsapp_conversations
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.whatsapp_conversations;

-- Extensão aditiva da tabela messages já existente — nenhuma coluna é removida/renomeada
alter table public.messages
  add column if not exists conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  add column if not exists delivery_status text check (delivery_status in ('sent','delivered','read','failed')),
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;
```

> `conversation_id` é uma coluna **nova e separada** de `channel_id` (que continua existindo e servindo aos grupos/canais do Telegram, sem nenhuma alteração). `delivery_status` também é nova e separada da coluna `status` já usada pelo ciclo de vida de envio — nenhum código existente que lê `messages.status` precisa mudar.

### 6.4. Webhook: popular a nova tabela em paralelo ao que já funciona

Em `whatsapp-webhook/index.ts` (e, depois, em `meta-webhook/index.ts`):
1. Ao receber uma mensagem (`change.value.messages[]`), além do fluxo atual (gravar em `messages`, acionar o BotZap — Fase 2/3), fazer um `upsert` em `whatsapp_conversations` por `(connection_id, contact_wa_id)`, igual ao `upsertConversation()` do repositório de referência, e gravar o `conversation_id` resultante na linha de `messages`.
2. Processar `change.value.statuses[]` (hoje ignorado — seção 3.3) e fazer `update messages set delivery_status = ..., delivered_at = ..., read_at = ... where wa_message_id = ...`.

Nada do comportamento atual (BotZap, registro em `messages`, métricas) é removido — essas duas ações são **adicionadas** ao mesmo handler.

### 6.5. Frontend: refatorar a derivação de conversas, sem tocar nos canais/grupos

Em `MessagingView.tsx`, **somente** o bloco de `individualChats` (linhas 303-349, hoje um `.reduce()` client-side sobre `messages`) passa a ser uma consulta a `whatsapp_conversations` (com paginação), filtrada por `connection_id` quando aplicável. O bloco `channelChats` (linhas 261-301, Telegram grupos/canais via `messaging_channels`) **permanece exatamente como está** — essa parte já funciona e não tem relação com o problema descrito.

Tempo real (substituindo a assinatura grosseira da linha 638-641 **apenas para a parte de conversas individuais**, mantendo a assinatura de `messaging_channels` como está):

```ts
// src/hooks/useWhatsAppRealtime.ts — granular por conversa, equivalente ao Pusher message:new/message:status
useEffect(() => {
  if (!activeConversationId) return;
  const channel = supabase
    .channel(`whatsapp-conversation-${activeConversationId}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` },
      handleNewMessage)
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` },
      handleStatusUpdate) // delivery_status: sent -> delivered -> read
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [activeConversationId]);
```

Com `delivery_status` populado (6.4) e exposto na tela, `ChatWindow.tsx` passa a poder renderizar os tiques reais de "enviado/entregue/lido" (hoje só existe um ícone genérico, linha 380), e a métrica "Entregues"/"Taxa de Sucesso" da Fase 1 passa a ter uma fonte de dado real e granular por conversa.

### 6.6. Ordem de execução recomendada (para não quebrar nada que já funciona)

| Etapa | Ação | Risco de regressão |
|---|---|---|
| 1 | Criar `whatsapp_conversations` e as colunas novas em `messages` (migração aditiva) | Nenhum — tabela nova, colunas novas, nada existente é tocado |
| 2 | Atualizar `whatsapp-webhook` para popular a tabela nova **em paralelo** ao fluxo atual | Baixo — é uma adição ao handler existente, não uma substituição |
| 3 | Refatorar **só** o bloco `individualChats` de `MessagingView.tsx` para ler de `whatsapp_conversations` | Médio — testar a paridade visual antes de remover o `.reduce()` antigo; manter os dois caminhos atrás de uma flag até validar |
| 4 | Ligar o tempo real granular (6.5) na tela de conversas individuais | Baixo — assinatura nova, a antiga pode ser removida só depois de validar |
| 5 | Atualizar `collect-social-analytics` (Fase 1.3/1.5) para ler `whatsapp_conversations`/`delivery_status` em vez de contar `messages` cruamente | Médio — depende das etapas 1-2 estarem em produção e com dados reais acumulados |
| 6 (opcional, depois) | Generalizar `whatsapp_conversations` para outras plataformas de mensagem direta (Instagram Direct, Messenger), caso façam sentido no mesmo padrão | Avaliar caso a caso — fora do escopo imediato do pedido |

Em nenhum momento essa sequência remove o suporte a Telegram (grupos/canais via `messaging_channels`), Facebook, Instagram, ou qualquer outra ferramenta multicanal já em funcionamento — todas as etapas são aditivas ou restritas ao caminho específico de conversas individuais de WhatsApp.

---

## 7. Consolidação entre os dois repositórios

Os arquivos centrais (`bot-engine.ts`, `collect-social-analytics/index.ts`, `whatsapp-webhook/index.ts`) **divergiram** entre `social-canvas-hub` e `VitoriaNews`, com o segundo ficando atrás em segurança (sem HMAC) e funcionalidade (sem coleta de métricas de WhatsApp, sem integração do bot ao webhook). Antes de aplicar as correções acima, vale decidir:

- **Opção A (recomendada):** tratar `social-canvas-hub` como fonte única de verdade para a lógica compartilhada (`_shared/`) e portar/sincronizar manualmente para o `VitoriaNews` até que ambos compartilhem o mesmo código de backend (ex.: via submódulo git, pacote npm privado, ou simplesmente copiando o diretório `_shared/` em cada deploy).
- **Opção B:** se os dois projetos servem propósitos genuinamente diferentes (ex.: `VitoriaNews` é o portal de notícias com seu próprio bot legado, `social-canvas-hub` é o dashboard), confirmar isso explicitamente e then aplicar cada correção da Fase 1/2/3 **duas vezes**, uma em cada repositório, já que hoje eles não compartilham o mesmo projeto Supabase/deploy (a confirmar).

---

## 8. Checklist de Validação Pós-Correção

### Segurança e métricas (Fases 1-3)
- [ ] Rodar o diagnóstico SQL da Fase 3.1 em `bot_settings` **antes** de qualquer ALTER, e confirmar o resultado num ambiente de staging antes de aplicar em produção.
- [ ] Sessão de WhatsApp Web removida dos "Dispositivos Conectados" e da história do Git em ambos os repositórios.
- [ ] Webhook do `VitoriaNews` valida HMAC e sempre responde 200.
- [ ] Conectar **dois** números de WhatsApp diferentes ao mesmo usuário e confirmar que "Mensagens Enviadas"/"Membros" mostram valores **distintos** para cada um (não mais a soma combinada).
- [ ] Enviar uma mensagem de teste para cada número e confirmar que o BotZap responde usando o token/identidade da Página correta (verificar no painel da Meta qual app/token efetivamente enviou).
- [ ] Pausar o bot em um número e confirmar que o outro continua respondendo normalmente (prova de independência por perfil).
- [ ] Forçar uma sincronização de métricas e confirmar, via SQL direto (`select * from account_metrics order by collected_at desc limit 5`), que `posts_count`/`reach` não estão mais zerados por padrão.
- [ ] Aguardar/simular uma confirmação de entrega (`statuses`) da Meta e confirmar que "Entregues"/"Taxa de Sucesso" deixam de ser 0%.
- [ ] Revisar uma foto de perfil de WhatsApp recém-sincronizada após forçar falha de rede propositalmente, confirmando que o sistema mantém a última foto válida em vez de salvar uma URL efêmera.

### Backup e exportação (Fase 4)
- [ ] Rodar `backup-whatsapp-conversations` manualmente uma vez e confirmar, via SQL, que `whatsapp_backups` recebeu novas linhas com `checksum_sha256` preenchido.
- [ ] Baixar um backup, descriptografar com a chave mestra e confirmar que o JSON resultante corresponde ao histórico real daquela conversa.
- [ ] Exportar uma conversa individual em `.txt + .zip` e abrir em um leitor de texto comum, confirmando que o formato é legível e equivalente ao "Exportar conversa" nativo do WhatsApp.
- [ ] Confirmar que o bucket `whatsapp-backups` está marcado como **privado** (não acessível por URL pública) no painel do Supabase Storage.
- [ ] Simular a expiração de um backup (`expires_at` no passado) e confirmar que `cleanup-expired-backups` o remove do Storage e da tabela.
- [ ] Confirmar que `whatsapp_backup_access_log` registra uma linha a cada download/decriptação feita pela interface.

### Reestruturação do módulo de conversas (Seção 6)
- [ ] Conectar dois números e confirmar que mensagens do mesmo contato para números diferentes aparecem em **duas conversas separadas** na tela de Mensagens (não mais misturadas).
- [ ] Confirmar que a aba "Grupos"/"Canais" (Telegram) continua funcionando exatamente como antes da refatoração (nenhuma regressão multicanal).
- [ ] Abrir uma conversa e confirmar que o tique de status muda de "enviado" para "entregue" para "lido" conforme os eventos `statuses` chegam (validando `delivery_status`).
- [ ] Medir o número de refetches disparados ao trocar de conversa antes/depois da Seção 6.5, confirmando que a atualização em tempo real ficou mais granular (não dispara refetch geral a cada mudança).

---

## 9. Apêndice — Principais Arquivos Citados

```
social-canvas-hub/
├── docs/META_OMNICHANNEL_SPEC.md                      # decisão arquitetural do token único
├── docs/PlanoResumido_BotZap_Ominichanel.md
├── docs/archive/Migração do bot para APIoficial...md  # plano original de migração
├── supabase/functions/
│   ├── whatsapp-webhook/index.ts                      # recebimento oficial (HMAC ok) — Seção 6.4: estender
│   ├── whatsapp-tech-provider-auth/index.ts            # retorna 410 (descontinuado)
│   ├── meta-webhook/index.ts                           # webhook unificado FB/IG/WA
│   ├── collect-social-analytics/index.ts               # coletor de métricas (bug principal)
│   ├── backup-whatsapp-conversations/index.ts          # 🆕 Fase 4.C
│   ├── backup-whatsapp-full-number/index.ts            # 🆕 Fase 4.C
│   ├── cleanup-expired-backups/index.ts                # 🆕 Fase 4.C
│   ├── export-whatsapp-conversation/index.ts           # 🆕 Fase 4.D (export sob demanda)
│   ├── check-token-expiry/index.ts                     # 🆕 Fase 4.F
│   └── _shared/
│       ├── bot-engine.ts                               # motor do BotZap (token único)
│       ├── credentials.ts                              # getMetaCredentials (por conexão, correto)
│       ├── media.ts                                    # cacheProfileImage (expira em 365d)
│       ├── oauth/providers/meta.ts                     # escopos OAuth (sem branch WhatsApp)
│       ├── platforms/whatsapp.ts                       # envio oficial de campanhas (correto)
│       └── security/
│           ├── verifyMetaSignature.ts                  # 🆕 Fase 4.F (extraído/compartilhado)
│           └── backupCrypto.ts                         # 🆕 Fase 4.F (AES-256-GCM)
├── src/
│   ├── pages/RobotBuilder.tsx                          # config do bot (1 por plataforma)
│   ├── hooks/useWhatsAppRealtime.ts                    # 🆕 Seção 6.5 (tempo real granular)
│   └── components/dashboard/
│       ├── MessagingView.tsx                           # tela de mensagens (3055 linhas) — Seção 6.5: refatorar só individualChats
│       ├── messaging/ChatList.tsx                      # lista de conversas (já existe)
│       ├── messaging/ChatWindow.tsx                     # janela de mensagens — linha 380: tique genérico (Seção 6.5)
│       ├── settings/WhatsAppBotControl.tsx             # UI órfã, não usada
│       ├── settings/WhatsAppEmbeddedSignup.tsx         # fluxo descontinuado
│       └── analytics/platform-detail/
│           ├── platformConfigs.ts                      # define KPIs "Membros"/"Mensagens..."
│           ├── PlatformKPIGrid.tsx                      # mapeamento KPI → campo (bug)
│           └── usePlatformDetail.ts                     # lê account_metrics
└── supabase/migrations/
    ├── 20260308212816_...sql                            # cria messages.channel_id (não usado p/ WhatsApp)
    ├── 20260322100000_allow_multiple_social_profiles.sql # permite múltiplas conexões
    ├── 20260413000000_align_metrics_schema.sql           # cria account_metrics.posts_count
    ├── 20260417233200_create_bot_settings.sql            # UNIQUE(user_id, platform) — sem conexão
    ├── 20260424210930_4424c95b-...sql                     # ⚠️ cria índice único só em user_id — ver achado na Fase 3.1
    ├── 20260604_fix_schema_estruturas.sql                # cria account_metrics.reach etc.
    ├── xxxx_add_whatsapp_conversations.sql                # 🆕 Seção 6.3
    ├── xxxx_add_messages_delivery_status.sql              # 🆕 Seção 6.3 / Fase 1.4
    ├── xxxx_add_bot_settings_connection_id.sql            # 🆕 Fase 3.1
    ├── xxxx_create_whatsapp_backups.sql                   # 🆕 Fase 4.B
    └── xxxx_create_whatsapp_backup_access_log.sql         # 🆕 Fase 4.B

VitoriaNews/
├── supabase/functions/whatsapp-webhook/index.ts         # versão antiga, sem HMAC, sem bot
├── supabase/functions/collect-social-analytics/index.ts # sem case "whatsapp"
└── _conflict_backup/, _restore_backup/, _system_backup_*/ # cópias completas commitadas

youtube-painel-api-oficial/ (referência externa — Israel Henrique, Nuxt/Vue, não é nosso código)
├── README.md                                            # arquitetura BSP (Datafy) + Pusher + Supabase
├── docs/WEBHOOKS.md                                      # mapeamento payload Meta → conversations/messages
├── docs/ROADMAP.md                                       # fases do projeto de referência
├── supabase/schema.sql                                   # tabelas conversations/messages — modelo replicado na Seção 6.3
├── server/api/webhook.post.ts                            # upsert de conversa + status — modelo replicado na Seção 6.4
└── server/utils/webhookParser.ts                         # parser de value.statuses[]/message_echoes — referência da Seção 2.6
```

---

**Próximo passo sugerido:** começar pela Seção 1 (segurança) e pelo item 1.1 da Fase 1 (correção de uma linha, alto impacto visível no dashboard); em seguida, a Seção 6.3 (criar `whatsapp_conversations`) destrava, em cascata, a Fase 3 (BotZap por perfil), a Fase 1.3/1.5 (métricas corretas por número) e a Fase 4 (backup por conversa) — é a peça de schema que mais coisas depende dela. A Fase 2 (token por Página) pode ser feita em paralelo, já que não depende das demais. Reforçando: todas as etapas descritas são aditivas — em nenhum momento este plano remove Telegram, Facebook, Instagram ou qualquer outra ferramenta multicanal já em funcionamento.
