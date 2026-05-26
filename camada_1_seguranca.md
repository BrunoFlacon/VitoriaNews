# 🛡️ Camada 1: Contenção de Segurança Crítica (Hotfixes)

Este arquivo contém as ações imediatas e obrigatórias para estancar as vulnerabilidades críticas do sistema, minimizando riscos de vazamento e exploração de chaves públicas/privadas sem afetar as regras de negócio vigentes.

## 📝 Ações a Executar

### 1.1. Remoção de Credenciais Hardcoded
* **Arquivo alvo:** `src/integrations/supabase/client.ts`
* **Vulnerabilidade:** Exposição do identificador e da chave anon do Supabase como fallback em texto puro no repositório.
* **Correção:** Remover os fallbacks (`|| 'https://...'`). Utilizar estritamente variáveis de ambiente injetadas pelo pipeline de CI/CD.

```typescript
// ✅ CORREÇÃO APLICADA
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas corretamente no Antigravity.');
}
```

### 1.2. Purga Completa do Driver PostgreSQL do Client-Side
* **Ação:** Executar a remoção imediata das dependências Node.js expostas no front-end.
* **Comando:**
```bash
npm uninstall pg @types/pg
```
* **Justificativa:** O pacote `pg` é um driver nativo de comunicação TCP para bancos PostgreSQL rodando em ambiente Node.js. No browser, ele aumenta drasticamente o bundle final e indica que houve tentativas (ou código morto) de conexão direta sem passar pelo Supabase Client (REST/PostgREST), gerando um vetor massivo de XSS e injeção SQL.

### 1.3. Implementação da Content Security Policy (CSP)
* **Ação:** Criar ou atualizar o arquivo `public/_headers` para forçar cabeçalhos HTTP rígidos de segurança.
* **Configuração Recomendada:**
```plaintext
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' *.supabase.co; connect-src 'self' *.supabase.co wss://*.supabase.co; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com;
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 1.4. Correção e Proteção do Cache de Perfil do Usuário
* **Arquivo alvo:** `src/contexts/AuthContext.tsx`
* **Vulnerabilidade:** Persistência indeterminada e sem expiração (TTL) de dados sensíveis de perfil no `localStorage` sob a chave `auth_cached_profile`.
* **Correção:** Substituir o uso de `localStorage` por `sessionStorage` para isolar os dados por aba/sessão do navegador, ou implementar validação de expiração temporal de no máximo 30 minutos.
