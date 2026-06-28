# Auditoria da API de Conexão WhatsApp & Plano de Correção
### Repositórios: `BrunoFlacon/social-canvas-hub` e `BrunoFlacon/VitoriaNews`

> **Metodologia:** análise estática do código-fonte completo de ambos os repositórios (clone direto via GitHub, sem acesso a runtime/produção). Todos os achados abaixo são rastreáveis a arquivo e linha específicos. Onde não foi possível confirmar comportamento em produção (ex.: conteúdo real de variáveis de ambiente, dados no Supabase), isso está marcado explicitamente como **suposição a validar**.

---

## 0. Sumário Executivo

Os dois repositórios compartilham essencialmente a mesma base de código (mesma estrutura de pastas, mesmos documentos internos, mesmo motor de bot). O `social-canvas-hub` está **mais atualizado**; o `VitoriaNews` ficou **defasado** em pontos críticos (webhook sem validação de assinatura, coletor de métricas sem suporte a WhatsApp).

Os três pedidos feitos foram todos confirmados como problemas reais no código, com causa-raiz identificada:

| Pedido | Situação encontrada |
|---|---|
| **1. Corrigir fotos de perfil e métricas (membros, mensagens, posts)** | Confirmado. Causa raiz: campos de métricas calculados corretamente em um ponto do código, mas **nunca gravados** na tabela que a tela de Analytics lê; "Membros" não existe como conceito real no WhatsApp e está lendo um campo que nunca é preenchido; fotos de perfil usam URLs que expiram por desenho (Meta) e o cache tem fallback silenciosamente inseguro. |
| **2. Migrar para API oficial vinculada a cada Página do Facebook individualmente** | Parcialmente implementado, mas com uma **regressão arquitetural deliberada**: o sistema já usa a API oficial (Cloud API) para *envio manual/campanhas*, mas o **bot de resposta automática usa um único token global** para todas as Páginas, e o webhook atribui mensagens recebidas ao "primeiro usuário do sistema" em vez do dono real da Página/número. |
| **3. BotZap responder de forma independente por perfil de WhatsApp** | Não implementado. O banco de dados, o motor do bot e a tela de configuração foram construídos assumindo **um único número de WhatsApp por usuário**, mesmo depois de uma migração (`20260322100000_allow_multiple_social_profiles.sql`) que já permite múltiplas conexões. |

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

---

## 5. Consolidação entre os dois repositórios

Os arquivos centrais (`bot-engine.ts`, `collect-social-analytics/index.ts`, `whatsapp-webhook/index.ts`) **divergiram** entre `social-canvas-hub` e `VitoriaNews`, com o segundo ficando atrás em segurança (sem HMAC) e funcionalidade (sem coleta de métricas de WhatsApp, sem integração do bot ao webhook). Antes de aplicar as correções acima, vale decidir:

- **Opção A (recomendada):** tratar `social-canvas-hub` como fonte única de verdade para a lógica compartilhada (`_shared/`) e portar/sincronizar manualmente para o `VitoriaNews` até que ambos compartilhem o mesmo código de backend (ex.: via submódulo git, pacote npm privado, ou simplesmente copiando o diretório `_shared/` em cada deploy).
- **Opção B:** se os dois projetos servem propósitos genuinamente diferentes (ex.: `VitoriaNews` é o portal de notícias com seu próprio bot legado, `social-canvas-hub` é o dashboard), confirmar isso explicitamente e then aplicar cada correção da Fase 1/2/3 **duas vezes**, uma em cada repositório, já que hoje eles não compartilham o mesmo projeto Supabase/deploy (a confirmar).

---

## 6. Checklist de Validação Pós-Correção

- [ ] Sessão de WhatsApp Web removida dos "Dispositivos Conectados" e da história do Git em ambos os repositórios.
- [ ] Webhook do `VitoriaNews` valida HMAC e sempre responde 200.
- [ ] Conectar **dois** números de WhatsApp diferentes ao mesmo usuário e confirmar que "Mensagens Enviadas"/"Membros" mostram valores **distintos** para cada um (não mais a soma combinada).
- [ ] Enviar uma mensagem de teste para cada número e confirmar que o BotZap responde usando o token/identidade da Página correta (verificar no painel da Meta qual app/token efetivamente enviou).
- [ ] Pausar o bot em um número e confirmar que o outro continua respondendo normalmente (prova de independência por perfil).
- [ ] Forçar uma sincronização de métricas e confirmar, via SQL direto (`select * from account_metrics order by collected_at desc limit 5`), que `posts_count`/`reach` não estão mais zerados por padrão.
- [ ] Aguardar/simular uma confirmação de entrega (`statuses`) da Meta e confirmar que "Entregues"/"Taxa de Sucesso" deixam de ser 0%.
- [ ] Revisar uma foto de perfil de WhatsApp recém-sincronizada após forçar falha de rede propositalmente, confirmando que o sistema mantém a última foto válida em vez de salvar uma URL efêmera.

---

## 7. Apêndice — Principais Arquivos Citados

```
social-canvas-hub/
├── docs/META_OMNICHANNEL_SPEC.md                      # decisão arquitetural do token único
├── docs/PlanoResumido_BotZap_Ominichanel.md
├── docs/archive/Migração do bot para APIoficial...md  # plano original de migração
├── supabase/functions/
│   ├── whatsapp-webhook/index.ts                      # recebimento oficial (HMAC ok)
│   ├── whatsapp-tech-provider-auth/index.ts            # retorna 410 (descontinuado)
│   ├── meta-webhook/index.ts                           # webhook unificado FB/IG/WA
│   ├── collect-social-analytics/index.ts               # coletor de métricas (bug principal)
│   └── _shared/
│       ├── bot-engine.ts                               # motor do BotZap (token único)
│       ├── credentials.ts                              # getMetaCredentials (por conexão, correto)
│       ├── media.ts                                    # cacheProfileImage (expira em 365d)
│       ├── oauth/providers/meta.ts                     # escopos OAuth (sem branch WhatsApp)
│       └── platforms/whatsapp.ts                       # envio oficial de campanhas (correto)
├── src/
│   ├── pages/RobotBuilder.tsx                          # config do bot (1 por plataforma)
│   └── components/dashboard/
│       ├── settings/WhatsAppBotControl.tsx             # UI órfã, não usada
│       ├── settings/WhatsAppEmbeddedSignup.tsx         # fluxo descontinuado
│       └── analytics/platform-detail/
│           ├── platformConfigs.ts                      # define KPIs "Membros"/"Mensagens..."
│           ├── PlatformKPIGrid.tsx                      # mapeamento KPI → campo (bug)
│           └── usePlatformDetail.ts                     # lê account_metrics
└── supabase/migrations/
    ├── 20260308212816_...sql                            # cria messages.channel_id (não usado)
    ├── 20260322100000_allow_multiple_social_profiles.sql # permite múltiplas conexões
    ├── 20260413000000_align_metrics_schema.sql           # cria account_metrics.posts_count
    ├── 20260417233200_create_bot_settings.sql            # UNIQUE(user_id, platform) — sem conexão
    └── 20260604_fix_schema_estruturas.sql                # cria account_metrics.reach etc.

VitoriaNews/
├── supabase/functions/whatsapp-webhook/index.ts         # versão antiga, sem HMAC, sem bot
├── supabase/functions/collect-social-analytics/index.ts # sem case "whatsapp"
└── _conflict_backup/, _restore_backup/, _system_backup_*/ # cópias completas commitadas
```

---

**Próximo passo sugerido:** começar pela Seção 1 (segurança) e pelo item 1.1 da Fase 1 (correção de uma linha, alto impacto visível no dashboard), depois seguir para a Fase 3 (schema de `bot_settings`/`messages`), já que a Fase 2 depende dela para ter efeito prático completo.
