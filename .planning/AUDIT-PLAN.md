# Plano de Auditoria Geral — Social Canvas Hub

> **Data:** 2026-08-26  
> **Escopo:** Conexões API, Webhooks, Analytics, Agendamento, Rascunhos, Publicação e Verificação  
> **Status:** Em execução

---
  
use os dados falsos de analytics — misleading para decisões de negócio como rascunhos e substitua-os por dados de analytics reais em todo o sistema onde tiver dados de falback ou falsos substitua-os por dados reais e construa o sistema para capturar os dados e preencher os campos que tem dados falsos diretamente das apis das redes sosciais conectadas

## Índice

1. [Conexões API de Redes Sociais](#1-conexões-api-de-redes-sociais)
2. [Webhooks e Recebimento de Eventos](#2-webhooks-e-recebimento-de-eventos)
3. [Exibição de Dados e Métricas do Analytics](#3-exibição-de-dados-e-métricas-do-analytics)
4. [Agendamento de Publicações](#4-agendamento-de-publicações)
5. [Rascunhos](#5-rascunhos)
6. [Publicação e Verificação de Efeito (Post/Story/Reel/Feed)](#6-publicação-e-verificação-de-efeito)
7. [Erros, Gargalos, Bugs e Atrasos](#7-erros-gargalos-bugs-e-atrasos)
8. [Segurança e Hardening](#8-segurança-e-hardening)
9. [Cronograma de Execução](#9-cronograma-de-execução)

---

## 1. Conexões API de Redes Sociais

### 1.1 Fluxo OAuth — Inicialização

| Item | Arquivo | Verificação | Status |
|------|---------|-------------|--------|
| Geração de CSRF state | `src/utils/oauth.ts` | State é gerado mas **NUNCA é armazenado para verificação no callback** — vulnerabilidade de CSRF | 🔴 CRÍTICO |
| Validação de config por provider | `supabase/functions/social-oauth-init/index.ts` | `validateOAuthConfig()` valida antes de gerar URL | ✅ OK |
| Providers suportados | `supabase/functions/_shared/oauth/providers/` (16 arquivos) | Mapear quais providers estão completos vs stubs | ⬜ PENDENTE |
| Fallback para envs vazias | `social-oauth-init/index.ts` | `Deno.env.get()` cai em string vazia — deve falhar explicitamente | 🟡 MÉDIO |

**Ações:**
- [ ] Implementar armazenamento e verificação do `state` CSRF no callback
- [ ] Auditar os 16 providers OAuth individualmente
- [ ] Garantir que envs vazias causem erro, não silêncio

### 1.2 Fluxo OAuth — Callback e Troca de Tokens

| Item | Arquivo | Verificação | Status |
|------|---------|-------------|--------|
| Detecção frágil de platform | `src/pages/OAuthCallback.tsx` | Parse de URL path/query — frágil com variações | 🟡 MÉDIO |
| Verificação CSRF no callback | `src/pages/OAuthCallback.tsx` | **State NÃO é verificado** — qualquer redirect é aceito | 🔴 CRÍTICO |
| `client_secret` em query string | `supabase/functions/_shared/credentials.ts:88-91` | Meta `fb_exchange` envia secret na URL — aparece em logs | 🔴 CRÍTICO |
| Parsing de erro na troca | `server/functions/social-oauth-callback.js` | Falta parsing do body em caso de erro em alguns providers | 🟡 MÉDIO |

**Ações:**
- [ ] Adicionar verificação de `state` CSRF no callback OAuth
- [ ] Mover `client_secret` para POST body no token exchange do Meta
- [ ] Padronizar tratamento de erros em todos os providers de callback

### 1.3 Armazenamento e Renovação de Tokens

| Item | Arquivo | Verificação | Status |
|------|---------|-------------|--------|
| Tokens em plaintext no DB | `social_connections` table | Tokens não são criptografados no banco | 🔴 CRÍTICO |
| Bug: token stale pós-refresh (Threads) | `_shared/credentials.ts:311-313` | `ensureFreshToken()` atualiza token mas código continua usando o original | 🔴 ALTO |
| Bug: dados stale em `getPlatformCredentials` | `_shared/credentials.ts` | Retorna `connection` antigo depois do auto-refresh | 🔴 ALTO |
| Renovação Twitter | `server/functions/refresh-social-token.js` | Basic auth header correto | ✅ OK |
| Renovação YouTube | `_shared/platforms/youtube.ts` | Auto-refresh no 401 | ✅ OK |
| Segredo duplicado TikTok | `refresh-social-token.js:61` | Mesma chave `client_secret` usada duas vezes | 🟡 MÉDIO |

**Ações:**
- [ ] Criptografar tokens antes de armazenar no DB (AES-256-GCM)
- [ ] Corrigir bug de token stale no Threads — usar token retornado pelo refresh
- [ ] Corrigir `getPlatformCredentials` para retornar dados atualizados
- [ ] Revisar lookup de `client_secret` do TikTok

### 1.4 Credenciais por Plataforma

| Plataforma | Provider OAuth | Publisher | Token Refresh | Status Geral |
|-----------|---------------|-----------|---------------|-------------|
| Facebook/Meta | ✅ | ✅ `facebook.ts` | ✅ | 🟡 Precisa criptografia |
| Instagram | ✅ (via Meta) | ✅ `instagram.ts` | ✅ (via Meta) | ✅ |
| X/Twitter | ✅ | ✅ `x.ts` | ✅ | 🔴 Bug stack overflow |
| LinkedIn | ✅ | ✅ `linkedin.ts` | ✅ | ✅ |
| TikTok | ✅ | ✅ `tiktok.ts` | ✅ | 🟡 Unaudited = private |
| YouTube | ✅ | ✅ `youtube.ts` | ✅ | ✅ |
| Threads | ✅ | ✅ `threads.ts` | 🔴 Bug stale token | 🔴 ALTO |
| Pinterest | ✅ | ✅ `pinterest.ts` | ✅ | ✅ |
| Telegram | N/A (bot) | ✅ `telegram.ts` | N/A | ✅ |
| WhatsApp | ✅ | ✅ `whatsapp.ts` | ✅ | 🔴 Bug media upload |
| Spotify | ✅ | ✅ `spotify.ts` | ✅ | ✅ |
| Reddit | ✅ | Stub | ✅ | 🟡 Incompleto |
| Snapchat | ❌ | Stub | N/A | ⬜ Não implementado |
| Gettr | ❌ | Stub | N/A | ⬜ Não implementado |
| Google News | ❌ | Stub | N/A | ⬜ Não implementado |
| Kwai | ❌ | Stub | N/A | ⬜ Não implementado |
| Rumble | ❌ | Stub | N/A | ⬜ Não implementado |
| Truth Social | ❌ | Stub | N/A | ⬜ Não implementado |
| Site/Blog | N/A | Stub (fake success) | N/A | 🟡 Enganoso |

---

## 2. Webhooks e Recebimento de Eventos

### 2.1 Verificação de Assinatura

| Plataforma | Método | Arquivo | Status |
|-----------|--------|---------|--------|
| Meta/Facebook | HMAC-SHA256 + const-time compare | `_shared/security/verifyMetaSignature.ts` | ✅ Seguro |
| Twitter/X | HMAC-SHA1 | `server/lib/webhooks.js` | 🔴 SHA-1 depreciado |
| Todos os outros | ? | ? | ⬜ Não implementado |

**Ações:**
- [ ] Atualizar verificação Twitter para HMAC-SHA256 (SHA-1 depreciado)
- [ ] Implementar verificação de assinatura para LinkedIn, TikTok, YouTube
- [ ] Adicionar rate limiting nos endpoints de webhook
- [ ] Validar timestamp nos webhooks para evitar replay attacks

### 2.2 Processamento de Mensagens

| Item | Arquivo | Verificação | Status |
|------|---------|-------------|--------|
| Meta webhook handler | `supabase/functions/meta-webhook/index.ts` | GET verificação + POST processamento | ✅ OK |
| Omnichannel normalização | `_shared/omnichannel` | `processOmnichannelMessage` normaliza mensagens | ✅ OK |
| Tabela de eventos | `webhook_events` com RLS | Migrations SQL criam tabela corretamente | ✅ OK |
| Health check | `server/functions/webhook-health.js` | Verifica config de todos os providers | ✅ OK |
| Deduplicação | ? | Não há mecanismo claro de deduplicação de eventos recebidos | 🟡 MÉDIO |

**Ações:**
- [ ] Implementar deduplicação de eventos (webhook_id único)
- [ ] Adicionar retry queue para processamento de eventos
- [ ] Monitorar latência entre recebimento e processamento

---

## 3. Exibição de Dados e Métricas do Analytics

### 3.1 Coleta de Dados

| Item | Arquivo | Verificação | Status |
|------|---------|-------------|--------|
| Engine de analytics | `_shared/automation/analytics-engine.ts` | **DADOS FALSOS INSERIDOS** via `Math.random()` para Twitter, Kwai, Rumble, TruthSocial, Gettr | 🔴🔴 CRÍTICO |
| Fallback hard-coded | `analytics-engine.ts:82-84` | Sempre insere registro fake se não houver dados reais | 🔴🔴 CRÍTICO |
| Deduplicação 5min | `server/functions/collect-social-analytics.js` | Boa prática de dedup | ✅ OK |
| Timeout 15s | `collect-social-analytics.js` | Timeout adequado para APIs externas | ✅ OK |
| YouTube analytics | `collect-youtube-analytics.js` | Stub — não coleta dados | 🟡 MÉDIO |
| Google Analytics | `collect-google-analytics.js` | Stub — não coleta dados | 🟡 MÉDIO |
| WhatsApp analytics | `whatsapp-analytics.js` | Stub — retorna vazio | 🟡 MÉDIO |

**🔴 PROBLEMA CRÍTICO:**
```
analytics-engine.ts linhas 46-53, 58-73, 82-84:
- Twitter/X: Math.random() gera likes, comments, shares, views, reach FALSOS
- Kwai/Rumble/TruthSocial/Gettr: Mesmo padrão de dados aleatórios
- Fallback: Sempre insere 1 registro fake com engagement = Math.random() * 100

Os usuários NÃO CONSEGUEM distinguir dados reais de dados fabricados.
Métricas no dashboard podem ser completamente inventadas.
```

**Ações URGENTES:**
- [ ] **REMOVER** imediatamente toda geração de dados falsos (Math.random)
- [ ] Marcar plataformas sem API real como "Dados indisponíveis" em vez de inventar
- [ ] Implementar flag `is_real_data` em registros de analytics
- [ ] Adicionar indicador visual no dashboard: dados reais vs estimados
- [ ] Implementar coleta real para YouTube, Google Analytics, WhatsApp

### 3.2 Exibição no Dashboard

| Item | Arquivo | Verificação | Status |
|------|---------|-------------|--------|
| Hook principal | `src/hooks/useAnalytics.ts` | React Query com interfaces tipadas | ✅ OK |
| Dashboard analytics | `src/components/dashboard/AdvancedAnalytics.tsx` | Componente principal de analytics | ⬜ PENDENTE auditoria |
| Gráficos | `src/components/dashboard/AnalyticsChart.tsx` | Recharts area chart, responsivo | ✅ OK |
| Sub-componentes (28 arquivos) | `src/components/dashboard/analytics/` | Precisam auditoria individual | ⬜ PENDENTE |
| Tokens expostos na resposta | `server/functions/get-analytics.js` | Access tokens podem vir na resposta | 🔴 ALTO |

**Ações:**
- [ ] Auditorar todos os 28 sub-componentes de analytics
- [ ] Remover access tokens da resposta de analytics
- [ ] Implementar loading states e error boundaries
- [ ] Validar que gráficos não quebram com dados vazios/null
- [ ] Adicionar tooltips explicativos nas métricas

---

## 4. Agendamento de Publicações

### 4.1 Pipeline de Agendamento

| Item | Arquivo | Verificação | Status |
|------|---------|-------------|--------|
| Cron job (pg_cron) | `migrations/..._process_scheduled_posts_cron.sql` | Executa a cada 1 minuto | ✅ OK |
| Concorrência segura | `FOR UPDATE SKIP LOCKED` | Previne processamento duplicado | ✅ OK |
| SECURITY DEFINER | Migration SQL | Cron roda com privilégios elevados | ✅ OK |
| Processor batch | `supabase/functions/process-scheduled-posts/index.ts` | BATCH_SIZE=10, TIMEOUT=45s | 🟡 MÉDIO |
| Stale publishing | `process-scheduled-posts/index.ts` | STALE_PUBLISHING_MS=5min — posts presos são liberados | ✅ OK |
| Service role key | `process-scheduled-posts` | Usa service role key — correto para cron | ✅ OK |

### 4.2 Limites e Configurações

| Parâmetro | Valor Atual | Recomendação | Status |
|-----------|------------|--------------|--------|
| BATCH_SIZE | 10 | Adequado para início | ✅ |
| PLATFORM_TIMEOUT_MS | 45s | Pode ser pouco para YouTube/TikTok | 🟡 |
| STALE_PUBLISHING_MS | 5min | Adequado | ✅ |
| Frequência cron | 1 minuto | Adequado | ✅ |

**Ações:**
- [ ] Testar cenário de carga: 100+ posts agendados simultaneamente
- [ ] Implementar fila de retry com backoff exponencial
- [ ] Adicionar métricas de latência por plataforma
- [ ] Implementar alertas quando posts ficam > 10min sem publicar
- [ ] Testar comportamento com tokens expirados durante batch

---

## 5. Rascunhos

### 5.1 CRUD de Rascunhos

| Item | Arquivo | Verificação | Status |
|------|---------|-------------|--------|
| Interface | `useScheduledPosts.ts` | Estados: draft/scheduled/published/failed | ✅ OK |
| Auto-save | ? | Verificar se há auto-save de rascunhos | ⬜ PENDENTE |
| Conversão draft → scheduled | ? | Verificar validação antes de agendar | ⬜ PENDENTE |
| Exclusão de rascunhos | ? | Verificar se media é limpa do storage | ⬜ PENDENTE |
| Múltiplos plataformas | ? | Verificar como draft armazena seleção de plataformas | ⬜ PENDENTE |

### 5.2 Privacidade de Drafts

| Item | Plataforma | Comportamento | Status |
|------|-----------|---------------|--------|
| YouTube | YouTube | Draft → "private" visibility | ✅ Seguro |
| Facebook | Facebook | ? | ⬜ PENDENTE |
| Instagram | Instagram | ? | ⬜ PENDENTE |
| LinkedIn | LinkedIn | ? | ⬜ PENDENTE |

**Ações:**
- [ ] Verificar auto-save de rascunhos (frequência, debounce)
- [ ] Auditar limpeza de media ao excluir draft
- [ ] Testar conversão draft → publicação em todas as plataformas
- [ ] Garantir que drafts nunca são publicados acidentalmente
- [ ] Verificar persistência de drafts após refresh da página

---

## 6. Publicação e Verificação de Efeito

### 6.1 Publicação por Plataforma

| Plataforma | Tipo | Método | Verificação Pós-Pub | Status |
|-----------|------|--------|---------------------|--------|
| Facebook | Feed, Stories | Graph API v21.0 | ✅ Verifica status do post | ✅ |
| Instagram | Feed, Stories, Reels | Container + polling (`waitForContainerReady`) | ✅ Polling 5s × 24 = 2min max | ✅ |
| X/Twitter | Tweet, Media | INIT/APPEND/FINALIZE + tweet create | ⚠️ Polling com cálculo errado de timeout | 🟡 |
| LinkedIn | Post + media | Upload + create | ✅ Auto-resolve Person URN | ✅ |
| TikTok | Video | FILE_UPLOAD chunked 64MB | ✅ | ✅ |
| YouTube | Video, Shorts | Resumable upload + thumbnail | ✅ Auto-refresh 401 | ✅ |
| Threads | Post | Container + polling | ✅ Espera processamento | ✅ |
| Pinterest | Pin, Video | Pin create + video polling | ✅ | ✅ |
| Telegram | Text, photo, video, audio, album | sendMediaGroup | ✅ | ✅ |
| WhatsApp | Text, media, templates | Cloud API | 🔴 Media upload não usado | 🔴 ALTO |
| Spotify | Playlist | Create from audio/video | ✅ | ✅ |
| Reddit | ? | Stub | N/A | ⬜ Não implementado |
| Site | ? | Stub fake success | N/A | 🟡 Enganoso |

### 6.2 Bugs Críticos de Publicação

#### 🔴 BUG 1: Stack Overflow no Twitter/X (`x.ts:47`)
```
btoa(String.fromCharCode(...chunk)) 
→ Para chunks > ~500KB, o spread operator excede o max call stack
→ VÍDEOS GRANDES FALHAM SILENCIOSAMENTE no Twitter
```
**Correção:** Usar encoding base64 chunked em vez de spread operator.

#### 🔴 BUG 2: WhatsApp Media Upload Nunca Chamado (`whatsapp.ts:8-65`)
```
uploadWhatsAppMedia() está definida mas NUNCA chamada
Mensagens de mídia usam URL pública via "link"
→ Mídia privada/Interna NÃO PODE ser enviada via WhatsApp
```
**Correção:** Integrar `uploadWhatsAppMedia` no fluxo de publicação.

#### 🟡 BUG 3: Cálculo Errado de Timeout Twitter (`x.ts:86-103`)
```
Mensagem de erro diz "maxAttempts * 2" mas timeout real é "maxAttempts * checkAfter_secs"
→ Mensagem de timeout é enganosa
```

#### 🟡 BUG 4: Site Publisher Falso (`site.ts`)
```
Retorna success: true sem implementar nada
→ Callers acham que publicou com sucesso
```

### 6.3 Verificação Pós-Publicação

| Verificação | Implementada? | Detalhes |
|-------------|---------------|----------|
| Verificar status do post após criação | ✅ | Facebook/Instagram usam polling |
| Confirmar URL/permalink do post | ⚠️ | Nem todas as plataformas retornam URL |
| Retry automático em falha | ❌ | Não há mecanismo de retry automático |
| Notificação ao usuário | ⚠️ | Parcial — falhas atualizam status no DB |
| Rollback em falha parcial | ❌ | Post em 3 plataformas com 1 falha = inconsistente |

**Ações:**
- [ ] **CORRIGIR** stack overflow no Twitter (`x.ts`) — usar base64 chunked
- [ ] **CORRIGIR** WhatsApp media upload — integrar `uploadWhatsAppMedia`
- [ ] **CORRIGIR** timeout message no Twitter
- [ ] **REMOVER** fake success do site publisher
- [ ] Implementar verificação de URL/permalink pós-publicação em todas as plataformas
- [ ] Implementar retry com backoff exponencial (3 tentativas)
- [ ] Implementar status granular por plataforma (publicado/pendente/falhou)
- [ ] Adicionar notificação ao usuário quando publicação falha em alguma plataforma

---

## 7. Erros, Gargalos, Bugs e Atrasos

### 7.1 Bugs Críticos Encontrados

| # | Severidade | Arquivo | Descrição |
|---|-----------|---------|-----------|
| 1 | 🔴 CRÍTICO | `analytics-engine.ts` | Dados de analytics FALSOS via Math.random() |
| 2 | 🔴 CRÍTICO | `functionsAuth.js:6` | Secret JWT hardcoded como fallback |
| 3 | 🔴 CRÍTICO | `credentials.ts:88-91` | client_secret em query string (logs expostos) |
| 4 | 🔴 CRÍTICO | `oauth.ts` + `OAuthCallback.tsx` | CSRF state nunca verificado |
| 5 | 🔴 ALTO | `x.ts:47` | Stack overflow em vídeos grandes no Twitter |
| 6 | 🔴 ALTO | `whatsapp.ts` | Media upload definido mas nunca chamado |
| 7 | 🔴 ALTO | `credentials.ts:311-313` | Token stale pós-refresh no Threads |
| 8 | 🔴 ALTO | `supabaseShim.js:114` | ilike sem escape de padrões |
| 9 | 🟡 MÉDIO | `webhooks.js` | Twitter usa SHA-1 (depreciado) |
| 10 | 🟡 MÉDIO | `x.ts:86-103` | Mensagem de timeout incorreta |
| 11 | 🟡 MÉDIO | `site.ts` | Retorna fake success |
| 12 | 🟡 MÉDIO | `live.ts` | Stream keys fake com Math.random() |
| 13 | 🟡 MÉDIO | `refresh-social-token.js:61` | Client secret TikTok duplicado |
| 14 | 🟡 MÉDIO | `system-auth.ts` | Service role key no DB = risco circular |

### 7.2 Gargalos de Performance

| Gargalo | Impacto | Mitigação |
|---------|---------|-----------|
| Instagram polling 5s × 24 tentativas | 2 min de espera por post Instagram | Manter — requisito da API |
| YouTube resumable upload | Lento para vídeos grandes | Adicionar progresso ao usuário |
| TikTok chunked upload (64MB) | Lento para vídeos > 100MB | Chunked é correto; adicionar progresso |
| Batch SIZE=10 no scheduler | 100 posts = 10 batches sequenciais | Considerar aumentar ou paralelizar |
| Analytics coleta síncrona | Bloqueia outras operações | Migrar para queue |
| 97 packages no node_modules | Build lento | Tree shaking via Vite (já configurado) |

### 7.3 Atrasos Potenciais na Publicação

| Cenário | Causa | Impacto | Solução |
|---------|-------|---------|---------|
| Token expirado durante batch | Refresh falha | Posts da plataforma ficam presos | Retry automático com novo token |
| Rate limiting da API | Muitas publicações simultâneas | 429 errors → fila travada | Implementar backoff + queue per-platform |
| API da plataforma fora | Facebook/Instagram down | Batch inteiro falha | Retry com exponential backoff |
| pg_cron não executa | DB restart | Nenhum post é publicado | Monitoramento de cron health |
| Stale publishing > 5min | Post travado no "publishing" | Status inconsistente | Já tratado via STALE_PUBLISHING_MS |
| Internet instável | Edge Function timeout | Publicação parcial | Retry automático |

### 7.4 Test Coverage

| Área | Cobertura Atual | Mínimo Necessário |
|------|----------------|-------------------|
| Unit tests | 1 placeholder test | 80%+ em módulos críticos |
| Integration tests | 0 | Testes de fluxo OAuth completo |
| E2E tests | 0 | Testes de publicação por plataforma |
| Webhook tests | 0 | Testes de verificação de assinatura |
| **Total** | ~0% | **Escopo desta auditoria** |

---

## 8. Segurança e Hardening

### 8.1 Vulnerabilidades Encontradas

| # | Severidade | Vulnerabilidade | Arquivo | Correção |
|---|-----------|----------------|---------|----------|
| 1 | 🔴 CRÍTICO | JWT secret hardcoded | `functionsAuth.js:6` | Usar apenas env var, falhar se ausente |
| 2 | 🔴 CRÍTICO | Tokens plaintext no DB | `social_connections` | Criptografar AES-256-GCM |
| 3 | 🔴 CRÍTICO | client_secret em URL | `credentials.ts:88-91` | Mover para POST body |
| 4 | 🔴 ALTO | CSRF state não verificado | OAuth flow completo | Armazenar + verificar state |
| 5 | 🔴 ALTO | Service role key no DB | `system-auth.ts` | Mover para secrets manager |
| 6 | 🟡 MÉDIO | SHA-1 para webhook | `webhooks.js` | Atualizar para SHA-256 |
| 7 | 🟡 MÉDIO | Ilke sem escape | `supabaseShim.js:114` | Escapar caracteres especiais |
| 8 | 🟡 MÉDIO | Vite proxy SSL off | `vite.config.ts:38` | Apenas em dev — verificar |
| 9 | 🟡 MÉDIO | BackupCrypto SHA-256 raw | `backupCrypto.ts` | Usar PBKDF2/scrypt/Argon2 |
| 10 | 🟡 MÉDIO | CORS hardcoded URL | `_shared/cors.ts` | Usar env var para produção |

### 8.2 Dependências

| Dependência | Versão | Risco |
|------------|--------|-------|
| Express | 5.2.1 | ⚠️ Major version — verificar breaking changes |
| jsonwebtoken | ? | ✅ Estável |
| Supabase JS | ? | ✅ Oficial |
| 97 packages total | ? | ⬜ Rodar `npm audit` |

**Ações:**
- [ ] Rodar `npm audit` e corrigir vulnerabilidades
- [ ] Implementar criptografia de tokens
- [ ] Remover todos os secrets hardcoded
- [ ] Implementar rate limiting em todas as APIs
- [ ] Adicionar Content Security Policy
- [ ] Implementar audit log para ações sensíveis

---

## 9. Cronograma de Execução

### Fase 1 — Emergência (Dias 1-2)
- [ ] **URGENTE:** Remover dados falsos de analytics (`analytics-engine.ts`)
- [ ] **URGENTE:** Corrigir stack overflow no Twitter/X (`x.ts`)
- [ ] **URGENTE:** Corrigir token stale no Threads (`credentials.ts`)
- [ ] **URGENTE:** Corrigir WhatsApp media upload (`whatsapp.ts`)

### Fase 2 — Segurança (Dias 3-5)
- [ ] Remover JWT secret hardcoded
- [ ] Implementar criptografia de tokens no DB
- [ ] Implementar CSRF state verification
- [ ] Mover client_secret para POST body
- [ ] Rodar `npm audit` e corrigir

### Fase 3 — Confiabilidade (Dias 6-10)
- [ ] Implementar retry com backoff exponencial
- [ ] Implementar verificação pós-publicação em todas as plataformas
- [ ] Atualizar webhook Twitter para SHA-256
- [ ] Corrigir site.ts fake success
- [ ] Corrigir ilike escape no supabaseShim

### Fase 4 — Analytics (Dias 11-15)
- [ ] Implementar coleta real YouTube analytics
- [ ] Implementar coleta real Google Analytics
- [ ] Implementar coleta real WhatsApp analytics
- [ ] Limpar tokens da resposta de analytics
- [ ] Adicionar indicador real vs estimado no dashboard
- [ ] Auditoria dos 28 sub-componentes de analytics

### Fase 5 — Qualidade (Dias 16-20)
- [ ] Escrever testes unitários para publishers (mínimo 80%)
- [ ] Escrever testes de integração para OAuth flow
- [ ] Escrever testes E2E para publicação
- [ ] Implementar auto-save de rascunhos
- [ ] Teste de carga: 100+ posts simultâneos
- [ ] Monitoramento e alertas

### Fase 6 — Hardening (Dias 21-25)
- [ ] Implementar rate limiting em todas as APIs
- [ ] Implementar audit logging
- [ ] Implementar fila de retry per-platform
- [ ] Implementar alertas de latência
- [ ] Documentar runbook de operações
- [ ] Revisão final de segurança

---

## Resumo Executivo

| Categoria | Itens Críticos | Itens Altos | Itens Médios | Total |
|-----------|---------------|-------------|-------------|-------|
| API Conexões | 3 | 2 | 3 | 8 |
| Webhooks | 0 | 1 | 1 | 2 |
| Analytics | 2 | 1 | 3 | 6 |
| Agendamento | 0 | 0 | 2 | 2 |
| Rascunhos | 0 | 0 | 2 | 2 |
| Publicação | 2 | 2 | 3 | 7 |
| Segurança | 3 | 2 | 4 | 9 |
| **TOTAL** | **10** | **8** | **18** | **36** |

> **Esforço estimado:** 25 dias de desenvolvimento  
> **Prioridade máxima:** Dados falsos de analytics + bugs de publicação + segurança
