# Plano de Arquitetura - Hub Híbrido de Bots e Resoluções Sistêmicas

A pedido, o plano original foi expandido. Nós implementaremos uma arquitetura robusta unificada capaz de suportar APIs Oficiais para contas profissionais e Scrapers Convencionais para contas de teste/uso pessoal nativo sem derrubar a usabilidade atual.

## Alterações Funcionais Propostas

### 🔴 1. WhatsApp Híbrido (O Core)
- **Estrutura "Dual-Engine":** Modificaremos as Configurações de API (`SettingsView / ApiCredentials`) para adicionar uma "Chave Seletora de Motor" no módulo do WhatsApp.
   - **Opção A (QR-Code):** Mantém conectividade com a base legada `Bot_Zap` (que utiliza instâncias virtuais para web scraping Pessoal). Excelente para uso individual onde Webhooks da Meta não chegam.
   - **Opção B (Cloud Business):** Usa a Meta Graph API. Extremamente rápido. Iremos criar o gateway `webhook-whatsapp` em Edge Functions para receber essa notificação da nuvem, eliminando queda do Terminal Local nas contas empresariais.

### 🔴 2. Central de Controles de Inteligência Artificial Compartilhada (Nova Página "Robô")
Construiremos uma tela dedicada interativa no dashboard (`/robot-builder` ou semelhante) para dar vida às regras do seu robô universal.
- **Filtros de Interatividade (Toggles Ligar/Desligar)**: 
  - Responder Canais / Comunidades
  - Responder Grupos 
  - Responder Inbox Privado
  - Responder Listas de Transmissão
  - **Responder Comentários em Posts (Todos formatos: Reels, Shorts, Feed, Threads)**
- **Inteligência Controlada (Engenharia de Prompt):** A página permitirá que você cadastre "Fluxos de Diálogos e Coordenadas" fechados. A IA (OpenAI/Claude) só entrará em ação minimamente para lidar com abstrações que fujam da sua árvore de respostas programada.
- **Escalabilidade Multi-App:** Essa configuração será replicada simultaneamente para o *Instagram Inbox, Threads, Facebook Messenger e Telegram*. 
- **Preparação Multimídia:** O esquema do banco já preparará as propriedades JSON para (futuramente) o bot disparar mídias, áudios e localizações utilizando o sistema unificado como gatilho.

### 🟢 3. Finalização das Correções Pendentes
Ao lado da super estrutura de bots, finalizaremos as pontas soltas antigas:
1. **Deno vs Node (Visual Studio Code):** Injeção de `// @ts-nocheck` nas heads das APIs Supabase (`collect-google-trends` e `get-analytics`) para calar os apitos falsos de erros Deno no seu VSCode.
2. **Exportação de PDF (Analytics):** Injeção de biblioteca visual (ex: `html2pdf.js` ou equivalente) na UI do `AdvancedAnalytics.tsx` para baixar o relatório final completo.
3. **Threads OAuth App_ID:** Trocar o `import.meta.env.VITE_META_APP_ID` para uma identificação customizada no fluxo de callback a fim de suportarmos a autenticação em sandbox oficial do Threads v21.

## Executando Agora (Fase Inicial)
- O usuário aprovou e solicitou que eu inicie imediatamente com a Fase 3 "Finalização das Correções Pendentes" oriundas do relatório e passe progressivamente para a construção das lógicas.

## Perguntas em Aberto
O plano de unificação multi-canal (Inteligência, Grupos, Compartilhamentos, Dual WhatsApp) listado acima reflete perfeitamente a sua solicitação? Posso começar a executar a primeira etapa (ajustes menores no DB e construção dos Menus Toggle nos Settings)?
