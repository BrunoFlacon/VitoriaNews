# Relatório de Auditoria de Sistemas - Social Canvas Hub

Como analista de sistemas, realizei uma varredura técnica aprofundada nos principais módulos do sistema. Abaixo estão os erros identificados, gargalos de performance e validações de funcionalidade.

---

## 1. Varredura de Componentes Críticos

### 1.1 Hub de Mensagens (`MessagingView.tsx`)
- **Status**: Funcional, mas com alta complexidade técnica.
- **Gargalo**: O arquivo possui quase 3.000 linhas de código, centralizando lógica de UI, estado, upload de arquivos e integração de API.
- **Risco**: Dificuldade de manutenção e possíveis memory leaks em sessões longas devido ao grande número de listeners e sub-componentes inline.
- **Achado Técnico**: Identificada uma função recursiva `safeUpsert` (Linha 844) criada para contornar a ausência de colunas no banco de dados. Isso indica que a interface está "tentando adivinhar" o schema em vez de confiar em uma estrutura fixa.

### 1.2 Radar AI & Trends (`TrendsView.tsx`)
- **Status**: Excelente performance.
- **Otimização**: O uso de `contain: "layout style"` nas propriedades de CSS demonstra uma preocupação avançada com o ciclo de renderização do navegador, evitando reflows desnecessários.
- **Achado Técnico**: O hook `useTrends` possui um fallback inteligente para o banco local caso a Edge Function `radar-api` falhe ou sofra timeout.

---

## 2. Auditoria de Backend (Edge Functions)

### 2.1 Coleta de Analytics (`collect-social-analytics`)
- **Gargalo**: O sistema processa usuários um por um (`USER_BATCH_SIZE = 1`). Embora seguro contra timeouts do Supabase (limite de 2 minutos), torna o processamento de grandes bases de usuários extremamente lento.
- **Risco**: A paginação recursiva da Graph API (`fetchGraphPaginated`) pode entrar em loop infinito se o parâmetro `nextUrl` não for devidamente invalidado ou se houver um erro de circularidade na API externa.

---

## 3. Estrutura de Banco de Dados

- **Integridade**: As tabelas core (`messaging_channels`, `messages`, `trends`) estão devidamente criadas com RLS (Row Level Security).
- **Gargalo**: Falta de índices compostos em colunas frequentemente filtradas como `(user_id, platform, channel_id)`, o que pode causar lentidão em consultas de histórico de mensagens conforme a base cresce.

---

## 4. Conclusão da Auditoria

| Ferramenta | Funcionamento | Saúde Técnica | Recomendação |
| :--- | :---: | :---: | :--- |
| **Dashboard Central** | ✅ OK | 🟡 Regular | Modularizar sub-painéis em componentes menores. |
| **Radar AI News** | ✅ OK | 🟢 Excelente | Manter o sistema de cache atual. |
| **BotZap** | ✅ OK | 🟡 Regular | Migrar lógica de contorno de schema para migrations SQL. |
| **Analytics Engine** | ✅ OK | 🟢 Bom | Aumentar batch size conforme a performance do backend permitir. |

---

## 5. Próximos Passos Sugeridos
1. **Refatoração**: Extrair os diálogos e formulários de `MessagingView.tsx` para arquivos separados em `src/components/dashboard/messaging/`.
2. **Migrations**: Executar um comando `ALTER TABLE` para garantir que as colunas `invite_link` e `is_online` existam em todos os ambientes, removendo a necessidade do `safeUpsert`.
3. **Indexação**: Adicionar índices nas chaves estrangeiras para otimizar o carregamento das abas do Dashboard.
