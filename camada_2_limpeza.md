# 🧹 Camada 2: Limpeza Arquitetural e Deprecation de Código Morto

Esta camada foca em isolar e remover stubs de códigos obsoletos (Stripe e Mercado Pago), preparando a base de código do dashboard Antigravity para receber o novo ecossistema EFI Bank de forma limpa.

## 📝 Ações a Executar

### 2.1. Desinstalação de Dependências Legadas de Pagamento
* **Ação:** Remover do `package.json` todas as bibliotecas relacionadas aos gateways descontinuados (observação: se não estiverem presentes no `package.json`, certifique-se apenas de que não constam em nenhuma importação).
* **Comando:**
```bash
npm uninstall stripe @stripe/stripe-js mercadopago @mercadopago/sdk-js
```

### 2.2. Expurgar Arquivos de Serviços Obsoletos
* **Arquivo alvo:** `src/services/paymentService.ts`
* **Ação:** Deletar ou comentar integralmente as funções mockadas que simulam checkouts do Stripe ou rotas do Mercado Pago. Este arquivo será substituído integralmente pelo novo provedor de dados de pagamento.
* **Impacto:** Eliminação imediata de alertas de linter e referências a pacotes inexistentes pós-desinstalação.

### 2.3. Limpeza UI/UX nos Wizards de Captura
* **Arquivos alvo:** `src/components/portal/SubscriberCapture.tsx` e `src/components/portal/PaymentGateway.tsx`
* **Ação:** Remover os componentes visuais temporários (stubs) que faziam alusão à escolha entre Stripe e Mercado Pago. O fluxo de onboarding do usuário deve temporariamente ocultar ou pular a etapa de faturamento direto até a conclusão da Camada 4.

### 2.4. Saneamento do Ambiente Cloud e Variáveis de Ambiente
* **Ação:** Acessar o console administrativo do provedor de hospedagem e do painel do Supabase.
* **Ação:** Remover as chaves globais desnecessárias:
  * `VITE_PAYMENT_GATEWAY`
  * `VITE_STRIPE_PUBLIC_KEY`
  * `VITE_STRIPE_SECRET_KEY`
  * `VITE_MP_PUBLIC_KEY`
  * `VITE_MP_ACCESS_TOKEN`
