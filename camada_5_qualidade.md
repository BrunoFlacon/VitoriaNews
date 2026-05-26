# 💎 Camada 5: Polimento de Código, Tipagem Estrita e UX

Esta última camada garante a blindagem do código-fonte TypeScript contra comportamentos indefinidos em tempo de execução e aprimora a experiência final do usuário final na landing page.

## 📝 Ações a Executar

### 5.1. Roteamento de Exceções (Página 404 Dedicada)
* **Arquivo alvo:** `src/App.tsx`
* **Ação:** Remover o catch-all genérico que redirecionava rotas inválidas (`path="*"`) diretamente para a tela de perfil do dashboard.
* **Correção:** Renderizar um componente estruturado de erro ou página `NotFound.tsx` customizada com identidade escura padrão do Antigravity.

### 5.2. Eliminação de Castings de Tipagem Impróprios (as any)
* **Arquivo alvo:** `src/pages/PortalLanding.tsx`
* **Ação:** Executar o gerador de esquemas automático do Supabase CLI para injetar as definições exatas do banco de dados PostgreSQL diretamente nas chamadas do front-end.
* **Comando para Atualização de Tipos:**
```bash
supabase gen types typescript --local > src/types/supabase.ts
```

### 5.3. Externalização de Parâmetros de Redirecionamento
* **Arquivo alvo:** `src/pages/PortalLanding.tsx`
* **Problema:** Link de redirecionamento final para conversão de Leads via WhatsApp encontra-se codificado diretamente no elemento de clique (hardcoded).
* **Correção:** Mover a URL paramétrica para a variável de ambiente `VITE_WHATSAPP_CONVERSION_URL` ou consultá-la dinamicamente de uma tabela de chaves de configuração no banco global.

### 5.4. UX de Tipografia e Preload de Fontes
* **Arquivo alvo:** `index.html` e CSS correspondente.
* **Ação:** Adicionar tags de otimização no header do documento para descarregar o efeito FOUT (Flash of Unstyled Text) durante as transições de rota de usuários da Web Rádio Vitória.
* **Código:**
```html
<link rel="preload" href="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp5SR3q5.woff2" as="font" type="font/woff2" crossorigin>
```
