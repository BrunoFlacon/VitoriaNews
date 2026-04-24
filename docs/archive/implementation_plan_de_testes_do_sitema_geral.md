# Plano de Auditoria Profunda e Testes (TestSprite)

Esta solicitação visa realizar uma bateria abrangente de testes autônomos (TestSprite), revisões de arquitetura, otimização de banco de dados e atualização de todo o histórico do projeto ("O que falta e o que fizemos").

## Alterações Propostas e Metodologia

### 1. Execução Automatizada (TestSprite MCP)
- **Frontend Test Plan**: O plano base já foi gerado na nuvem. Iremos iniciar o `testsprite_generate_code_and_execute` para simular usuários na plataforma (ações no frontend, checagem das renderizações, menus, links, gráficos).
- **Backend Test Plan**: Iremos gerar e rodar o plano para o Backend focado na comunicação com o Supabase (Edge Functions, REST apis).
- **Captura de Lags**: O próprio motor retornará quaisquer engasgos de reflow que ainda restarem no frontend.

### 2. Revisão Arquitetural e Banco de Dados (Manual/Heurística)
- **Análise DB x Layout**: Verificação linha a linha se as views (ex: MessagingView, Settings, Radar, Analytics, BrunoProfile) estão consumindo o Banco de Dados através das queries mais rápidas e da tipagem correta.
- **Auditoria de APIs**: Confirmação visual de todas as integrações (`sync-telegram-chats`, Google Trends, WhatsApp, etc). Identificar hard-coded limiters ou potenciais brechas na RLS.

### 3. Histórico e Relatórios (Documentação)
- Um relatório gigantesco em forma de *Artifact* ao final mostrando: O status atual, O que construimos com sucesso, Vulnerabilidades detectadas e Recomendações Críticas.
- Atualização massiva do arquivo `SYSTEM_HISTORY.md` listando o "Tudo que fizemos" e "O que falta" de modo organizado.

## User Review Required

> [!WARNING]
> O TestSprite ativará instâncias de navegador por debaixo dos panos para clicar e enviar informações nas suas rotas. Como o seu projeto está com APIs reais ativadas, alguns dados de lixo (testes automatizados) poderão ser imputados temporariamente (como drafts de mensagens).

## Perguntas em Aberto

- Você me autoriza a iniciar a bateria de simulação autônoma de frontend/backend via TestSprite e dar prosseguimento ao mapeamento completo?

## Verification Plan

### Testes Automatizados
- Execução do `testsprite_generate_code_and_execute` em modo de desenvolvimento na porta `8081`.

### Checagem Manual
- Ao final, gerarei um Walkthrough interativo detalhado cobrindo performance, UI render lags, falhas em conexões de APIs de terceiros, e sugerindo as exatas refatorações para os fechamentos do sistema social.
