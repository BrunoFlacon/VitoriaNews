# Social Canvas Hub — Setup do Banco Local PostgreSQL

## Sumario

- [Status Atual](#status-atual)
- [Arquitetura](#arquitetura)
- [Como Usar](#como-usar)
- [Comandos  Uteis](#comandos-uteis)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Solucao de Problemas](#solucao-de-problemas)

---

## Status Atual

| Item | Status | Detalhe |
|------|--------|---------|
| PostgreSQL 18.4 | OK | Rodando em `localhost:5433` |
| Senha postgres | OK | `123456` |
| Database | OK | `ghtkdkauseesambzqfrd` |
| Tabelas criadas | OK | **131 tabelas** publicas |
| Migrations aplicadas | OK | **178/178** executadas com sucesso |
| Stubs Auth Supabase | OK | `auth.uid()`, `auth.users()`, `auth.role()` |
| Stubs Storage | OK | `storage.buckets`, `storage.objects` |
| Server Express (proxy) | OK | `http://localhost:3001` |
| Client local (frontend) | OK | `src/integrations/supabase/local-client.ts` |
| Switch script | OK | `scripts/switch-db.ps1` |
| Variavel .env | OK | `VITE_USE_LOCAL_DB=true/false` |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     Navegador (React SPA)                │
│                                                         │
│  supabase.from('tabela').select()                       │
│         │                                               │
│         ├── VITE_USE_LOCAL_DB=true  → localDb (fetch)   │
│         └── VITE_USE_LOCAL_DB=false → Supabase remoto   │
│                                                         │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┴────────────────┐
    │ LOCAL (porta 3001)              │
    │                                 │
    │  server/index.js                │
    │  ├── GET    /api/:table         │
    │  ├── GET    /api/:table/:id     │
    │  ├── POST   /api/:table         │
    │  ├── PATCH  /api/:table/:id     │
    │  ├── DELETE /api/:table/:id     │
    │  └── POST   /api/query          │
    │         │                       │
    │    Pool PG (porta 5433)         │
    └─────────────────────────────────┘
```

---

## Como Usar

### 1. Alternar entre Local e Supabase

```powershell
# Ver status atual
.\scripts\switch-db.ps1 status

# Usar banco local (para desenvolvimento com quota excedida)
.\scripts\switch-db.ps1 local

# Voltar para Supabase remoto (quando quota liberar)
.\scripts\switch-db.ps1 supabase
```

### 2. Iniciar o servidor local (quando estiver em modo LOCAL)

```bash
# Terminal 1: Servidor proxy PostgreSQL
npm run db:server

# Terminal 2: App Vite (em outro terminal)
npm run dev

# Ou ambos juntos:
npm run dev:all
```

### 3. Conectar diretamente no PG

```powershell
$env:PGPASSWORD="123456"; & "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
  -h localhost -p 5433 -U postgres -d ghtkdkauseesambzqfrd
```

### 4. Recriar o banco do zero (se precisar)

```bash
npm run db:setup
```

---

## Comandos Uteis

```bash
# npm scripts
npm run db:server     # Inicia o servidor proxy em http://localhost:3001
npm run db:setup      # Recria stubs + migrations
npm run db:switch     # Alterna entre local/supabase (passa argumento)
npm run dev:all       # Inicia server + Vite juntos

# PowerShell - acesso ao banco
$env:PGPASSWORD="123456"
psql -h localhost -p 5433 -U postgres -d ghtkdkauseesambzqfrd

# Dentro do psql:
# \dt                lista tabelas
# \d+ nome_tabela     descreve tabela
# \l                 lista databases
# \c nome_db         conecta em outro database
# \du                lista usuarios
# \df                lista funcoes
```

---

## Estrutura de Arquivos

```
social-canvas-hub/
├── .env                           # Config: VITE_USE_LOCAL_DB, credenciais
├── server/
│   └── index.js                   # Express + pg (proxy API local)
├── scripts/
│   ├── setup-local-db.sql         # Stubs Auth + Storage para compatibilidade
│   ├── setup-local-db.ps1         # Script para setup completo do banco
│   └── switch-db.ps1              # Alterna entre Local e Supabase
├── supabase/migrations/           # 178 migrations SQL aplicadas
└── src/integrations/supabase/
    ├── client.ts                  # Cliente principal (escolhe remoto ou local)
    ├── local-client.ts            # Implementacao local (fetch para server)
    └── types.ts                   # Tipos do banco
```

---

## Solucao de Problemas

| Problema | Solucao |
|----------|---------|
| `ECONNREFUSED localhost:5433` | PostgreSQL 18 nao esta rodando. Va em `services.msc` e inicie `postgresql-x64-18` |
| `ECONNREFUSED localhost:3001` | Rode `npm run db:server` em outro terminal |
| `password authentication failed` | Confirme a senha no `.env`: `VITE_LOCAL_DB_PASS="123456"` |
| Erro 402 no app | Mude para modo local: `.\scripts\switch-db.ps1 local` |
| Tabela nao encontrada | Rode `npm run db:setup` para recriar as migrations |
| `VITE_` nao funciona | Vite so expoe variaveis com prefixo `VITE_`. Confirme `.env` |
