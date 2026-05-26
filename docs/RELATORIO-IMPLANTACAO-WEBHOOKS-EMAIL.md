# Relatório de Implantação — Webhooks & Email Automation

## 1. Status dos Webhooks

| Plataforma | Webhook? | Status | Como funciona |
|---|---|---|---|
| **Telegram** | ✅ **Sim** | ✅ Ativo | `telegram-webhook` recebe updates. Token confere via `tokens[]`. |
| **Meta (WhatsApp/FB/IG)** | ✅ **Sim** | ✅ Ativo | `meta-webhook` recebe eventos unificados. |
| **TikTok** | ✅ **Sim** | ✅ Ativo v1 | `tiktok-webhook` — GET challenge + POST events c/ HMAC. |
| **LinkedIn** | ✅ **Sim** | ✅ Ativo v1 | `linkedin-webhook` — GET challenge HMAC + POST events c/ `X-LI-Signature`. |
| **EFI/PIX** | ✅ **Sim** | ✅ Ativo | `efi-webhook` — recebe confirmações de PIX, atualiza `subscriptions`. |
| **YouTube** | ❌ **Não** | ⏳ CRON | YouTube **não oferece webhook** para analytics. Dados via API REST (`collect-youtube-analytics`). Já integrado à fila `social_sync_tasks` (polling 4h). |
| **Twitter/X** | ❌ **Não** | ⏳ CRON | Twitter API v2 **não oferece webhook** para analytics. API REST (`sync-twitter`). Já integrado à fila `social_sync_tasks`. |
| **Google Analytics (GA4)** | ❌ **Não** | ⏳ On-demand | GA4 Data API **não oferece webhook**. `collect-google-analytics` só via clique do usuário. |
| **Google Cloud** | ❌ **Não** | ⏳ On-demand | Não há webhook. Integrações via API REST. |
| **NewsAPI.org** | ❌ **Não** | ✅ **CRON ativo** | **Não precisa de webhook.** NewsAPI é REST API. Já integrada ao `radar-api` (CRON 6h + diário 4am). As notícias alimentam o radar de tendências. |

> **Resumo**: YouTube, Twitter/X, Google Analytics e Google Cloud **não possuem webhooks**
> nas suas plataformas — não há o que "configurar". Eles já funcionam via CRON polling
> ou sincronização manual. NewsAPI já está funcionando perfeitamente via radar-api.

---

## 2. Plano de Implantação — Resend (Email Automation)

### Situação Atual
- ✅ UI do Resend já existe em `SettingsView.tsx` (linha 85)
- ✅ Formulário de credenciais em `useApiCredentials.ts` (linhas 109-110)
- ✅ `handle-new-subscriber` já envia e-mail de boas-vindas via Resend
- ❌ **Não há função dedicada** para disparo de newsletters
- ❌ **Não há função** para enviar recibos de pagamento
- ❌ **Não há CRON** para envio programado de matérias

### O que precisa ser criado

#### Fase 1: Função `send-email` (função base)

Criar `supabase/functions/send-email/index.ts`:
- Aceitar `{ to[], subject, html, text, template? }`
- Usar Resend API (`POST https://api.resend.com/emails`)
- Buscar `resend_api_key` de `api_credentials` ou `system_settings`
- Suporte a template HTML básico para newsletter
- Log de envios em tabela `email_logs`

#### Fase 2: Tabela `email_logs` + Config

- Migration: `20260527000000_email_logs.sql`
  - `id UUID PK`
  - `user_id UUID`
  - `to_email TEXT`
  - `subject TEXT`
  - `template TEXT` (newsletter, payment_receipt, renewal_notice)
  - `status TEXT` (sent, failed)
  - `error TEXT`
  - `sent_at TIMESTAMPTZ`

- Migration: `20260527010000_add_resend_system_settings.sql`
  - Se não existir, adicionar `resend_api_key` e `newsletter_from_email` em `system_settings`

#### Fase 3: Email de Recibo de Pagamento

Modificar `efi-webhook/index.ts`:
- Quando `status === "paid"`, chamar `send-email` com template `payment_receipt`
- Incluir: nome, valor, data, plano, QR code (se PIX), data de expiração da assinatura

#### Fase 4: Aviso de Renovação (CRON)

Criar `supabase/functions/check-renewals/index.ts`:
- CRON (pg_cron) rodando **diariamente às 08:00**
- Consultar `subscriptions` com `expires_at` nos próximos 7 dias
- Chamar `send-email` com template `renewal_notice` para cada assinante

#### Fase 5: Newsletter de Matérias (CRON)

Criar `supabase/functions/send-newsletter/index.ts`:
- CRON (pg_cron) rodando **diariamente às 06:00** e/ou **semanalmente**
- Buscar últimas trends/notícias do banco (tabela `trends`)
- Buscar assinantes ativos de `portal_subscribers`
- Chamar `send-email` em lote para todos
- Respeitar rate limit da Resend (10 emails/s no plano gratuito)

---

### Roadmap

```
Fase 1: send-email (função base)         ⬜ ~30 min
Fase 2: email_logs + config              ⬜ ~15 min
Fase 3: Recibo de pagamento (efi-hook)   ⬜ ~20 min
Fase 4: Aviso de renovação (CRON)        ⬜ ~25 min
Fase 5: Newsletter (CRON)                ⬜ ~30 min
                                        ─────────
                                Total   ⬜ ~2 horas
```

---

### Pré-requisitos

1. **Conta Resend** em https://resend.com (plano gratuito: 100 emails/dia)
2. **Domínio verificado** no Resend (ex: `webradiovitoria.com.br`)
3. **API Key** gerada no Resend Dashboard
4. Configurar `RESEND_API_KEY` nos secrets do Supabase:
   ```
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
   ```
5. Ou configurar via UI em Configurações > Resend (Email Automation)

---

### Autor(es) deste documento

Gerado automaticamente com base na auditoria do código-fonte em 26/05/2026.
