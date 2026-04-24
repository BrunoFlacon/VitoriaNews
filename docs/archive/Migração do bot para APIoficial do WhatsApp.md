# Plano de Implementação - Migração para API Oficial do WhatsApp

Este plano visa substituir a biblioteca legada `whatsapp-web.js` pela API Oficial do WhatsApp Business (Meta Graph API).

## Proposta de Mudanças

### 1. Backend do Robô (`scripts/Bot_Zap`)

- **server.js**: 
    - Remover instâncias do `whatsapp-web.js` e `puppeteer`.
    - Implementar novo endpoint de **Webhook** (`/api/whatsapp/webhook`) para receber eventos da Meta.
    - Atualizar a lógica de envio de mensagens para usar chamadas via `https` à Graph API.
- **package.json**: Remover dependências pesadas (`whatsapp-web.js`, `qrcode`) e simplificar o projeto.

### 2. Infraestrutura Supabase

- **Edge Function**: Criar uma nova função `whatsapp-webhook` para servir como o endpoint público da Meta, garantindo escalabilidade e recebimento de mensagens 24/7.

### 3. Dashboard (Configurações)

- **SettingsView.tsx**: Adicionar campos para `WhatsApp Business Token`, `Phone Number ID` e `Account ID`.

## Open Questions 

> [!IMPORTANT]
> Você já possui uma conta no **Meta for Developers** com o App de WhatsApp criado e as credenciais (`Access Token`, `Phone Number ID`)? Se não, posso guiá-lo na criação ou implementar a estrutura primeiro para você preencher depois.

## Plano de Verificação

### Testes Manuais
- Enviar mensagem de teste para o número oficial e verificar se o robô responde via IA.
- Validar se o status "Online" no Dashboard reflete a conexão da API oficial.
