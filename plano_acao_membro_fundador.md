# Plano de Ação: Lançamento "Membro Fundador" + Migração EFI Bank

## Fase 1: Caixa Rápido — Membros Fundadores (Agora)

### Objetivo
Gerar receita imediata via PIX manual para custear servidores e desenvolvimento, oferecendo exclusividade e preço congelado vitalício com renovação anual sem aumentos.

### Ações
1. **Crie a estrutura para colocar o Qr code ou a linha pix para ser copiada no site, use o Nubank PJ**
2. **Divulgar a oferta** (esta parte de divulgação deixe pronta mas é a ultima coisa que vamos fazer só vamos entrar nesta fase quando o sistema todo estiver funcionando e os membros fundadores estiverem recebendo os benefícios) 
Os planos de Membro Fundador nos canais da Web Rádio Vitória são:
   - WhatsApp Channel
   - Telegram
   - Instagram
   - Site (pré-lançamento)
3. **Tabela de preços para Membros Fundadores:** 
   - Trimestral: R$ 59,92 (R$ 10 de desconto)
   - Anual: R$ 222,22 (Vamos Forçar a venda à vista do preço anual para fundadores)
4. **Promessa:** Preço congelado vitalício para quem assinar agora facilidade para pagamentos parcelados em 3x no cartão com juros por conta do comprador se tiver juros 
5. **Registrar cada venda** manualmente montando uma estrutura no painel administrativo (Faturamento > Membros Fundadores)

### Ferramenta de Gestão
- Use a aba **"Membros Fundadores"** no painel administrativo para registrar cada PIX recebido
- O sistema já calcula total arrecadado e mantém histórico
- Marque como "Pago" manualmente após confirmar o PIX no app do banco 
- adicione um crud para administrar membros fundadores add novo, editar, excluir, visualizar e pesquisa por nome, email, cpf, metodo de pagamento, status de pagamento, data de inicio, data de fim e plano e a migração de plano de pagamento quando o sistema de pagamento de cartao estiver funcionando e atualize os dados de plano do membros fundadores de PIX para plano de cartão

---

## Fase 2: Transição — Desenvolvimento (Dias 1-25)

### Objetivo
Usar o fôlego financeiro para implementar a integração completa com EFI Bank.
- Realizar testes em todo o portal e no sistema de pagamento 
- Fazer ações de marketing para vender o plano membro fundador
### Ações Técnicas

#### 2.1. Credenciais EFI Bank
Crie um manual de instruções passo a passo para:
1. Criar conta no [Efí Bank](https://sejaefi.com.br) (antigo Gerencianet)
2. Gerar Client ID e Client Secret no painel da EFI
3. Configurar a chave PIX no painel da EFI
4. Fazer upload do certificado PFX e converter para Base64
5. Configurar no Supabase:
   ```bash
   supabase secrets set EFI_CLIENT_ID="seu_client_id"
   supabase secrets set EFI_CLIENT_SECRET="seu_client_secret"
   supabase secrets set EFI_PIX_KEY="sua_chave_pix"
   supabase secrets set EFI_CERTIFICATE_BASE64="base64_do_pfx"
   supabase secrets set EFI_SANDBOX="false"
   ```
6. Opcional: salvar as mesmas credenciais no painel administrativo (Gateway > EFI Bank) para referência

#### 2.2. Edge Functions — já implementadas
- `efi-create-charge/index.ts` — Cria cobrança PIX via API da EFI
- `efi-webhook/index.ts` — Recebe confirmação de pagamento e libera acesso

#### 2.3. Testar fluxo completo
1. Usar ambiente sandbox (`EFI_SANDBOX="true"`) para testes
2. Criar cobrança de R$ 0,01 para validar o fluxo
3. Confirmar que o webhook está recebendo notificações da EFI
4. Verificar se a tabela `payment_charges` é atualizada para "paid"
5. Verificar se a tabela `subscriptions` é criada/renovada

6. Crie uma página de fluxo de caixa mensal e anual com gráficos de vendas que mostre o panorama geral do sistema e ranking de vendas dos melhores membros fundadores (quem mais indicou e quem mais contribuiu com o site) no painel administrativo que mostre os valores detalhados assim como é uma tesouraria mostre o quanto foi arrecadado com os membros fundadores, que estão usando o sistema desde o inicio.
- Adicione as seguintes colunas:
- foto vinda do perfil do instagram e com botão para a pessoa alterar a foto do perfil, esta foto deve ser usada em todas as paginas onde aparece o perfil do membro fundador vai ter uma pagina com o mural de todos os fundadores.
- Nome do Membro Fundador
- Email
- Instagram
- Whatsapp
- CPF
- Método de Pagamento
- Valor
- Plano
- Status do Pagamento
- Data de Inicio
- Data de Fim

## Fase 3: Migração — Membros Fundadores para Recorrência (Dias 25-30)

### Objetivo
Deixe pronto a estrutura para Transferir os Membros Fundadores do PIX manual para a recorrência automática via EFI Bank e informando assinante por assinante.

### Ações

#### 3.1. Gatilho de Comunicação (Dia 25)
Enviar mensagem personalizada para cada Membro Fundador:

> "Olá [Nome]! Seu acesso pioneiro está terminando. Nosso novo sistema de assinaturas já está no ar! Para não perder seu acesso e manter seus benefícios de Membro Fundador, cadastre seu cartão de crédito na nossa plataforma no novo sistema de pagamentos.🔒"

#### 3.2. Links Personalizados
Gerar link de checkout para cada membro via Edge Function `efi-create-charge`

#### 3.3. Validação
- Após o pagamento no checkout EFI, o webhook confirma e a subscription é ativada
- O preço congelado é respeitado (campo `frozen_price` nos registros de Membro Fundador)

---

## Resumo da Arquitetura

```
Front-end (React)
  └── SubscriberCapture.tsx → chama paymentService.createPayment()
                                 └── supabase.functions.invoke('efi-create-charge')
                                       └── API EFI Bank → gera QR Code PIX

EFI Bank
  └── Webhook → POST → supabase.functions.invoke('efi-webhook')
                        └── Atualiza payment_charges SET status='paid'
                        └── Cria/atualiza subscriptions
                        └── Atualiza portal_subscribers metadata

Painel Admin
  └── Faturamento > Gateway → Credenciais EFI Bank (Client ID, Secret, PIX Key)
  └── Faturamento > Membros Fundadores → Gestão manual dos primeiros assinantes
  └── Faturamento > Financeiro → Relatório de assinantes e receitas
```

## Fluxo de Caixa Esperado

| Item | Valor |
|------|-------|
| Custo servidores/mês | ~R$ 50-250 |
| Preço médio Membro Fundador | R$ 22,92/mês |
| Meta mínima de membros | 5 (cobre servidores) |
| Meta média de membros | 700 |
| Meta maxima de membros | 2000 |
| Meta ideal | 25+ (fôlego financeiro) |
