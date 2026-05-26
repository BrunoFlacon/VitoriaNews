# ⚡ Camada 3: Refatoração de Performance e Otimização do Build

Camada voltada para a melhoria de experiência de carregamento (Core Web Vitals - LCP e FID) e correção do fluxo síncrono/assíncrono no empacotamento do Vite.

## 📝 Ações a Executar

### 3.1. Otimização do Empacotamento Manual (Manual Chunking) e basicSsl Condicional
* **Arquivo alvo:** `vite.config.ts`
* **Problema:** O plugin `basicSsl` está sendo importado de forma irrestrita, gerando certificados autoassinados inadequados para build final de produção e ausência de code-splitting para as ~75 dependências.
* **Correção:** Modificar a configuração para isolar ambientes e quebrar pacotes pesados de UI e Data em chunks apartados.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from "path";
import { componentTagger } from "lovable-tagger";
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  return {
    server: {
      host: true,
      port: 8081,
      strictPort: true,
      hmr: {
        overlay: false,
      }
    },
    plugins: [
      mode === 'development' ? basicSsl() : null,
      react(),
      mode === 'development' && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-core': ['react', 'react-dom', 'react-router-dom'],
            'ui-framework': ['framer-motion', 'lucide-react'],
            'data-layer': ['@tanstack/react-query', '@supabase/supabase-js', 'zustand']
          }
        }
      }
    }
  };
});
```

### 3.2. Padronização do Fluxo de Queries com TanStack Query
* **Arquivo alvo:** `src/contexts/AuthContext.tsx`
* **Problema:** Utilização de `Promise.race` + `setTimeout` manual para forçar timeout de requisições de autenticação e perfis, criando colisões com a política global de retries do TanStack Query.
* **Correção:** Migrar a busca do perfil para dentro de um hook `useQuery`, definindo a propriedade `retry` e `staleTime` de forma nativa pela biblioteca de gerenciamento de estado assíncrono.
