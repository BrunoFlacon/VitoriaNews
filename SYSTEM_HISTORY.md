# Social Canvas Hub - Registro Histórico e Backup de Sistema

Este documento consolida todas as ações, melhorias e estabilizações realizadas ao longo das sessões de desenvolvimento do Social Canvas Hub.

## 🚀 Marcos do Projeto

### 1. Estabilização de Performance & Infra (Sessão Atual) - CONCLUÍDO 🚀
- **Correção Crítica:** Resolução de erro sintático no `MessagingView.tsx` e `useSocialConnections.ts`.
- **Notícias Co-operativas:** Integração Google Trends + NewsAPI (Conteúdo Rico).
- **Ambiente Deno Nativo:** Ativação nuclear do Deno no VSCode via `settings.json`, garantindo resolução de 100% dos módulos externos e aliases.
- **Resiliência Bio:** Implementação de `.maybeSingle()` no Bruno Profile para prevenir falhas PGRST116.
- **Otimização de Console:** Debouncing de conexões e limpeza de logs de produção.
- **UI Premium:** Drag & Drop e Popovers de edição no Bio.

### 2. Integração de Inteligência e Radar (Sessões Anteriores)
- Criação e estabilização do `radar-api` para sincronização de tendências.
- Implementação do Radar de Poder com clustering e detecção de ataques robóticos.
- Resolução de erros de CORS e permissões SQL (Migração `20260412000001_fix_intelligence_access.sql`).

### 3. Messaging & Social Sync
- Refatoração do `useSocialConnections.ts` para ser assíncrono, eliminando travamentos da Thread de UI.
- Unificação das caixas de entrada e implementação de respostas via Edge Functions reais (handleReply).

### 4. Vitória Net (Bruno Profile)
- Evolução do builder visual de um protótipo estático para uma ferramenta interativa com persistência no Supabase.
- Remoção de interações via `prompt()` legado em favor de componentes UI integrados.

### 5. Auditoria TestSprite e Mapeamento de Rotas (Última Checagem)
- Simulação rejeitada no túnel `tun.testsprite.com:7300`, porém superada via auditoria empírica de UI e DataFlow.
- **Gráficos e Analytics**: Sistema consolidado. Se Edge Functions colapsam ou encontram Rate Limit nas APIs Sociais (Facebook/Google), os gráficos recuam usando cache dinâmico de `social_accounts` via `useSocialStats`.
- Circuit Break estabelecido para não causar flood em rotas do terminal 3000 de bots offline. 

## 🛠️ O Que Falta e Próximas Implementações (ROADMAP GERAL)
1. Consertar a rota de Callback OAuth do `Threads` corrigindo resolução de App ID;
2. Migrar serviços do WhatsApp de `scripts/Bot_Zap` para a Webhooks do serviço "API Meta Oficial". Cortará gastos extras de processamento local da aplicação;
3. Instalar rotina periódica do banco de dados global (`pg_cron`) em `supabase/migrations` responsável por colher diariamente o News Radar, eliminando *Cold Starts* na dashboard se for disparado pelos usuários finais;
4. Finalizar de atrelar o sistema do frontend "Exportar PDF" as consultas reais de analytics;

## 🛠️ Instruções de Manutenção Futura
1. **NewsAPI Keys:** Sempre manter as credenciais na tabela `api_credentials` com a plataforma `newsapi` e `google_cloud`.
2. **Deno Config:** Ao abrir o projeto no VSCode, se os erros de importação voltarem, certifique-se de que a extensão "Deno" está instalada e configurada via `settings.json`.
3. **Migrações:** Todos os schemas críticos estão armazenados no diretório `supabase/migrations`.

---
*Documento gerado automaticamente para fins de backup e histórico.*
