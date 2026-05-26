# 🪐 Plano Mestre de Implementação em Camadas (Antigravity)

Este diretório contém os arquivos de especificação técnica Markdown (.md) para a correção estrutural e atualização do sistema da Web Rádio Vitória hospedado na infraestrutura Antigravity.

## 🗺️ Visão Geral do Rollout de Engenharia
O projeto foi segmentado de maneira estritamente modular e desacoplada em 5 camadas isoladas. Esta arquitetura de transição garante que o sistema nunca sofra interrupções abruptas (zero-downtime) e impede deploys parciais que deixem a esteira de produção em estado instável ou quebrado.

## 🗂️ Navegação pelos Arquivos de Camada

### [Camada 1: Segurança Crítica](file:///c:/wamp64/www/lovableproj/social-canvas-hub/camada_1_seguranca.md)
* **Ação:** Remoção de credenciais expostas no cliente, desinstalação do driver `pg` no front-end, e ativação emergencial de cabeçalhos CSP contra ataques de injeção XSS.

### [Camada 2: Limpeza e Deprecation](file:///c:/wamp64/www/lovableproj/social-canvas-hub/camada_2_limpeza.md)
* **Ação:** Purga completa dos stubs inativos do Stripe e Mercado Pago do repositório, higienização do arquivo global de serviços de faturamento e limpeza de variáveis de ambiente legadas.

### [Camada 3: Performance e Build](file:///c:/wamp64/www/lovableproj/social-canvas-hub/camada_3_performance.md)
* **Ação:** Reestruturação do arquivo de compilação `vite.config.ts`, implementação de barramento condicional para o plugin SSL de desenvolvimento e ativação de Manual Chunking para otimização de bundle inicial.

### [Camada 4: Infraestrutura EFI Bank](file:///c:/wamp64/www/lovableproj/social-canvas-hub/camada_4_efi_bank.md)
* **Ação:** Criação do esquema de dados no banco do Supabase via migrações SQL estruturadas, implementação de barreiras de políticas RLS, e escrita das Supabase Edge Functions seguras com faturamento preciso de centavos via PIX.

### [Camada 5: Polimento e UX](file:///c:/wamp64/www/lovableproj/social-canvas-hub/camada_5_qualidade.md)
* **Ação:** Correção de rotas cegas com a criação de uma tela 404 estável, substituição de asserções `as any` por tipagens nativas geradas e melhoria em latências de fontes web.

---
Plano gerado em conformidade com as diretrizes de reestruturação do Antigravity Dashboard — Maio de 2026.
