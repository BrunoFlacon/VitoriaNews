# Plano de Implantação - Motor de Busca OmniSearch

## Visão Geral

Este documento detalha o plano de implantação do motor de busca **OmniSearch** para o projeto Social Canvas Hub (Vitória News Dashboard). O objetivo é implementar uma barra de pesquisa funcional que funcione perfeitamente tanto no desktop quanto no mobile.

---

## 1. Objetivos do Projeto

### 1.1 Metas Principais
- ✅ Busca híbrida (menus estáticos + conteúdo dinâmico)
- ✅ Resposta em menos de 100ms
- ✅ Interface visual rica com thumbnails e snippets
- ✅ Navegação rápida para resultados
- ✅ Funcionamento perfeito em desktop e mobile

### 1.2 Características Específicas do Sistema

| Funcionalidade | Descrição |
|----------------|-----------|
| **Gerenciamento de Publicações** | Criação, edição e publicação de artigos e vídeos |
| **Integração WhatsApp** | Bot de atendimento e envio de mensagens em massa |
| **Analytics Dashboard** | Métricas de engajamento, tráfego e crescimento |
| **Calendário Editorial** | Agendamento e programação de conteúdo |
| **Biblioteca de Mídia** | Gerenciamento de imagens, vídeos e documentos |
| **Configurações do Portal** | SEO, identidade visual, menus e navegação |
| **Gestão de Usuários** | Permissões, perfis e controle de acesso |
| **Integrações Externas** | Meta Pixel, Spotify, Giphy, etc. |

---

## 2. Arquitetura da Solução

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  OmniSearch  │──│    Hook      │──│    Tipos/Interfaces      │  │
│  │  Component   │  │  useSearch   │  │    (OmniResult)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/JSON
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Supabase/Edge)                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Edge Function / RPC                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │   Handler    │──│  Validação   │──│    Controller    │  │   │
│  │  │   HTTP       │  │  Input (Zod) │  │    (Business)     │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SQL/RPC
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATABASE (PostgreSQL)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Function    │──│  FTS Vector  │──│   Indexes    │              │
│  │  SQL (RPC)   │  │  (tsvector)  │  │   (GIN/GIST)   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Tabelas Indexadas                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌──────────┐        │   │
│  │  │ articles│ │ videos  │ │  pages    │ │schedules │        │   │
│  │  └─────────┘ └─────────┘ └───────────┘ └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo de Dados

1. **Input do Usuário** → Digitação com debounce (300ms)
2. **Validação** → Mínimo 2 caracteres
3. **Chamada API** → Edge Function Supabase
4. **Busca em Paralelo**:
   - Menus/Ações Estáticos (filtrado local)
   - Conteúdo Dinâmico (PostgreSQL FTS)
5. **Merge e Rank** → Combinação e ordenação por relevância
6. **Renderização** → Exibição em dropdown com thumbnails e snippets

---

## 3. Estrutura de Dados

### 3.1 Tipos TypeScript

```typescript
// src/types/omniSearch.ts

export type OmniResultType = 
  | 'video' 
  | 'article' 
  | 'page' 
  | 'schedule' 
  | 'menu' 
  | 'action';

export interface OmniResult {
  id: string;
  title: string;
  type: OmniResultType;
  link: string;
  thumbnail?: string;
  highlightedText: string;
  categoryLabel: string;
  rank?: number;
  snippet?: string;
  keywords?: string; // Para busca em menus estáticos
}

export interface OmniSearchResponse {
  results: OmniResult[];
  total: number;
  query: string;
  duration: number;
}

export interface OmniSearchState {
  query: string;
  results: OmniResult[];
  isLoading: boolean;
  isOpen: boolean;
  error: string | null;
}
```

### 3.2 Interface da API

```typescript
// GET /api/omnisearch?q={searchTerm}&limit=10

// Request
interface OmniSearchRequest {
  q: string;        // Termo de busca (mín 2 chars)
  limit?: number;   // Máximo de resultados (default: 10)
  type?: string;    // Filtro por tipo (opcional)
}

// Response
interface OmniSearchApiResponse {
  success: boolean;
  data: {
    results: OmniResult[];
    total: number;
    query: string;
    duration: number; // ms
  };
  error?: string;
}
```

---

## 4. Database Schema & SQL

### 4.1 Extensões Necessárias

```sql
-- 1. Habilitar extensão unaccent para ignorar acentuação
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Verificar se extensão está instalada
SELECT * FROM pg_extension WHERE extname = 'unaccent';
```

### 4.2 Função Principal de Busca

```sql
-- ============================================
-- FUNÇÃO: omni_search
-- Busca unificada em todo o conteúdo do sistema
-- ============================================

CREATE OR REPLACE FUNCTION omni_search(
    p_search_term TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    type TEXT,
    slug TEXT,
    thumbnail_url TEXT,
    snippet TEXT,
    rank REAL
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_tsquery tsquery;
BEGIN
    -- Validar entrada
    IF p_search_term IS NULL OR length(trim(p_search_term)) < 2 THEN
        RETURN;
    END IF;

    -- Preparar tsquery para busca por prefixo
    v_tsquery := to_tsquery('portuguese', 
        regexp_replace(trim(p_search_term), '\s+', ' & ', 'g') || ':*'
    );

    RETURN QUERY
    
    -- ========================================
    -- BUSCA EM ARTIGOS/PUBLICAÇÕES
    -- ========================================
    SELECT 
        a.id,
        a.title,
        'article'::TEXT as type,
        '/dashboard/content/edit/' || a.id::TEXT as slug,
        a.featured_image as thumbnail_url,
        ts_headline(
            'portuguese',
            COALESCE(a.content, ''),
            v_tsquery,
            'StartSel=<b>, StopSel=</b>, MaxWords=20, MinWords=5, ShortWord=2'
        ) as snippet,
        ts_rank(
            to_tsvector('portuguese', unaccent(COALESCE(a.title, '')) || ' ' || unaccent(COALESCE(a.content, ''))),
            v_tsquery
        ) as rank
    FROM publications a
    WHERE a.status = 'published'
        AND to_tsvector('portuguese', unaccent(COALESCE(a.title, '')) || ' ' || unaccent(COALESCE(a.content, ''))) @@ v_tsquery

    UNION ALL

    -- ========================================
    -- BUSCA EM VÍDEOS
    -- ========================================
    SELECT 
        v.id,
        v.title,
        'video'::TEXT as type,
        '/dashboard/videos/edit/' || v.id::TEXT as slug,
        v.thumbnail_url,
        ts_headline(
            'portuguese',
            COALESCE(v.description, ''),
            v_tsquery,
            'StartSel=<b>, StopSel=</b>, MaxWords=20, MinWords=5, ShortWord=2'
        ) as snippet,
        ts_rank(
            to_tsvector('portuguese', unaccent(COALESCE(v.title, '')) || ' ' || unaccent(COALESCE(v.description, ''))),
            v_tsquery
        ) as rank
    FROM videos v
    WHERE v.status = 'published'
        AND to_tsvector('portuguese', unaccent(COALESCE(v.title, '')) || ' ' || unaccent(COALESCE(v.description, ''))) @@ v_tsquery

    UNION ALL

    -- ========================================
    -- BUSCA EM AGENDAMENTOS
    -- ========================================
    SELECT 
        s.id,
        s.title,
        'schedule'::TEXT as type,
        '/dashboard/schedule/edit/' || s.id::TEXT as slug,
        NULL::TEXT as thumbnail_url,
        ts_headline(
            'portuguese',
            COALESCE(s.description, ''),
            v_tsquery,
            'StartSel=<b>, StopSel=</b>, MaxWords=20, MinWords=5, ShortWord=2'
        ) as snippet,
        ts_rank(
            to_tsvector('portuguese', unaccent(COALESCE(s.title, '')) || ' ' || unaccent(COALESCE(s.description, ''))),
            v_tsquery
        ) as rank
    FROM schedules s
    WHERE to_tsvector('portuguese', unaccent(COALESCE(s.title, '')) || ' ' || unaccent(COALESCE(s.description, ''))) @@ v_tsquery

    ORDER BY rank DESC
    LIMIT p_limit;

END;
$$;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice GIN para busca full-text em publicações
CREATE INDEX IF NOT EXISTS idx_publications_fts 
ON publications USING GIN (
    to_tsvector('portuguese', unaccent(COALESCE(title, '')) || ' ' || unaccent(COALESCE(content, '')))
);

-- Índice GIN para busca full-text em vídeos
CREATE INDEX IF NOT EXISTS idx_videos_fts 
ON videos USING GIN (
    to_tsvector('portuguese', unaccent(COALESCE(title, '')) || ' ' || unaccent(COALESCE(description, '')))
);

-- Índice GIN para busca full-text em agendamentos
CREATE INDEX IF NOT EXISTS idx_schedules_fts 
ON schedules USING GIN (
    to_tsvector('portuguese', unaccent(COALESCE(title, '')) || ' ' || unaccent(COALESCE(description, '')))
);

-- Comentário da função
COMMENT ON FUNCTION omni_search(TEXT, INTEGER) IS 
'Função de busca unificada no sistema. Busca em publicações, vídeos e agendamentos usando PostgreSQL Full-Text Search.';
```

---

## 5. Estrutura de Arquivos do Projeto

```
src/
├── api/
│   └── omnisearch/
│       └── route.ts              # Edge Function Supabase (opcional)
├── components/
│   ├── dashboard/
│   │   └── Header.tsx            # Header atual - será modificado
│   └── search/
│       ├── OmniSearch.tsx        # Componente principal
│       ├── SearchResults.tsx     # Lista de resultados
│       ├── SearchResultItem.tsx  # Item individual
│       └── SearchInput.tsx       # Input com debounce
├── hooks/
│   └── useOmniSearch.ts          # Hook de busca
├── lib/
│   ├── constants/
│   │   └── staticMenus.ts        # Menus estáticos para busca
│   └── utils/
│       └── search.ts             # Funções auxiliares
├── services/
│   └── omnisearch.ts             # Serviço de chamada API
├── types/
│   └── omnisearch.ts             # Tipos TypeScript
└── styles/
    └── search-highlight.css      # Estilos do highlight
```

---

## 6. Implementação Passo a Passo

### Fase 1: Preparação do Banco de Dados (Dia 1)

#### 1.1 Verificar Extensões
```sql
-- Verificar extensões instaladas
SELECT * FROM pg_extension;

-- Se unaccent não estiver instalado:
CREATE EXTENSION IF NOT EXISTS unaccent;
```

#### 1.2 Criar Função de Busca
- Executar o script SQL da seção 4.2 no SQL Editor do Supabase
- Testar a função:

```sql
-- Teste básico
SELECT * FROM omni_search('teste', 5);

-- Teste com acentos
SELECT * FROM omni_search('notícia', 10);

-- Teste de performance
EXPLAIN ANALYZE SELECT * FROM omni_search('política', 10);
```

### Fase 2: Backend e API (Dia 2)

#### 2.1 Criar Edge Function (Opcional)

```typescript
// supabase/functions/omnisearch/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchTerm, limit = 10 } = await req.json()
    
    // Validar input
    if (!searchTerm || searchTerm.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Search term must be at least 2 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Chamar a função SQL
    const { data, error } = await supabaseClient.rpc('omni_search', {
      p_search_term: searchTerm,
      p_limit: limit
    })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        query: searchTerm,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

#### 2.2 Criar Serviço de Busca (Alternativa Client-Side)

```typescript
// src/services/omnisearch.ts
import { supabase } from '@/lib/supabase/client';
import type { OmniResult, OmniSearchResponse } from '@/types/omnisearch';

// Dicionário de menus estáticos para busca
const STATIC_MENUS: OmniResult[] = [
  {
    id: 'menu-analytics',
    title: 'Analytics',
    type: 'menu',
    link: '/dashboard/analytics',
    highlightedText: 'Visualize métricas e estatísticas do portal',
    categoryLabel: 'Menu',
    keywords: 'dados tráfego estatísticas gráficos métricas'
  },
  {
    id: 'menu-content',
    title: 'Conteúdo',
    type: 'menu',
    link: '/dashboard/content',
    highlightedText: 'Gerencie artigos e publicações',
    categoryLabel: 'Menu',
    keywords: 'artigos posts notícias publicações blog'
  },
  {
    id: 'menu-videos',
    title: 'Vídeos',
    type: 'menu',
    link: '/dashboard/videos',
    highlightedText: 'Biblioteca de vídeos e lives',
    categoryLabel: 'Menu',
    keywords: 'vídeos lives streaming youtube player'
  },
  {
    id: 'menu-schedule',
    title: 'Agenda',
    type: 'menu',
    link: '/dashboard/schedule',
    highlightedText: 'Calendário editorial e agendamentos',
    categoryLabel: 'Menu',
    keywords: 'calendário agenda programação eventos datas'
  },
  {
    id: 'menu-messaging',
    title: 'Mensagens',
    type: 'menu',
    link: '/dashboard/messaging',
    highlightedText: 'WhatsApp e chatbot',
    categoryLabel: 'Menu',
    keywords: 'whatsapp chat bot mensagens conversas atendimento'
  },
  {
    id: 'menu-media',
    title: 'Mídia',
    type: 'menu',
    link: '/dashboard/media',
    highlightedText: 'Biblioteca de imagens e arquivos',
    categoryLabel: 'Menu',
    keywords: 'imagens fotos arquivos mídia galeria upload'
  },
  {
    id: 'menu-settings',
    title: 'Configurações',
    type: 'menu',
    link: '/dashboard/settings',
    highlightedText: 'Configurações do portal',
    categoryLabel: 'Menu',
    keywords: 'configurações opções preferências ajustes'
  },
  {
    id: 'action-create-post',
    title: 'Criar Nova Publicação',
    type: 'action',
    link: '/dashboard/content/new',
    highlightedText: 'Crie um novo artigo ou notícia',
    categoryLabel: 'Ação',
    keywords: 'novo criar escrever publicar post artigo'
  },
  {
    id: 'action-create-video',
    title: 'Enviar Vídeo',
    type: 'action',
    link: '/dashboard/videos/new',
    highlightedText: 'Adicione um novo vídeo à biblioteca',
    categoryLabel: 'Ação',
    keywords: 'novo enviar upload vídeo adicionar'
  },
  {
    id: 'action-profile',
    title: 'Meu Perfil',
    type: 'action',
    link: '/dashboard/settings/profile',
    highlightedText: 'Edite seu perfil e informações',
    categoryLabel: 'Ação',
    keywords: 'perfil usuário conta dados pessoal'
  }
];

/**
 * Busca em menus estáticos
 */
function searchStaticMenus(query: string): OmniResult[] {
  const lowerQuery = query.toLowerCase().trim();
  
  return STATIC_MENUS.filter(item => {
    // Busca em título
    if (item.title.toLowerCase().includes(lowerQuery)) return true;
    // Busca em keywords
    if (item.keywords?.toLowerCase().includes(lowerQuery)) return true;
    // Busca em texto destacado
    if (item.highlightedText.toLowerCase().includes(lowerQuery)) return true;
    return false;
  }).map(item => ({
    ...item,
    // Adiciona highlight visual no título
    title: highlightText(item.title, lowerQuery)
  }));
}

/**
 * Adiciona highlight visual em texto
 */
function highlightText(text: string, query: string): string {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<b>$1</b>');
}

/**
 * Busca unificada (estática + dinâmica)
 */
export async function omniSearch(
  query: string, 
  limit: number = 10
): Promise<OmniSearchResponse> {
  const startTime = performance.now();
  
  if (!query || query.trim().length < 2) {
    return {
      results: [],
      total: 0,
      query: query || '',
      duration: 0
    };
  }

  try {
    // Busca em paralelo
    const [staticResults, { data: dynamicResults, error }] = await Promise.all([
      // Busca em menus estáticos
      searchStaticMenus(query),
      
      // Busca dinâmica no banco
      supabase.rpc('omni_search', {
        p_search_term: query,
        p_limit: Math.ceil(limit / 2) // Metade para conteúdo dinâmico
      })
    ]);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Mapear resultados dinâmicos
    const mappedDynamicResults: OmniResult[] = (dynamicResults || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      type: item.type as OmniResultType,
      link: item.slug,
      thumbnail: item.thumbnail_url,
      highlightedText: item.snippet || '',
      categoryLabel: getCategoryLabel(item.type),
      rank: item.rank
    }));

    // Mesclar e ordenar resultados
    const combinedResults: OmniResult[] = [
      ...staticResults.slice(0, Math.ceil(limit / 2)),
      ...mappedDynamicResults
    ]
    .sort((a, b) => (b.rank || 0) - (a.rank || 0))
    .slice(0, limit);

    const duration = performance.now() - startTime;

    return {
      results: combinedResults,
      total: combinedResults.length,
      query,
      duration: Math.round(duration)
    };

  } catch (error) {
    console.error('OmniSearch error:', error);
    
    // Fallback: retornar apenas menus estáticos em caso de erro
    const staticResults = searchStaticMenus(query).slice(0, limit);
    
    return {
      results: staticResults,
      total: staticResults.length,
      query,
      duration: 0
    };
  }
}

/**
 * Obtém label de categoria baseado no tipo
 */
function getCategoryLabel(type: string): string {
  const labels: Record<string, string> = {
    'article': 'Artigo',
    'video': 'Vídeo',
    'schedule': 'Agenda',
    'menu': 'Menu',
    'action': 'Ação'
  };
  return labels[type] || 'Conteúdo';
}

export default omniSearch;
```

### 4.4 Testes da Função

```sql
-- Teste 1: Busca simples
SELECT * FROM omni_search('notícia', 5);

-- Teste 2: Busca com acentos
SELECT * FROM omni_search('política', 10);

-- Teste 3: Busca por prefixo
SELECT * FROM omni_search('vid', 5);

-- Teste 4: Verificar performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM omni_search('teste', 10);

-- Teste 5: Contagem de resultados
SELECT type, COUNT(*) 
FROM omni_search('a', 100)
GROUP BY type;
```

---

## 5. Frontend - Componentes React

### 5.1 Hook useOmniSearch

```typescript
// src/hooks/useOmniSearch.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { omniSearch } from '@/services/omnisearch';
import type { OmniResult, OmniSearchResponse } from '@/types/omnisearch';

interface UseOmniSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
}

interface UseOmniSearchReturn {
  query: string;
  results: OmniResult[];
  isLoading: boolean;
  isOpen: boolean;
  error: string | null;
  duration: number;
  setQuery: (query: string) => void;
  setIsOpen: (isOpen: boolean) => void;
  clearSearch: () => void;
  refresh: () => void;
}

export function useOmniSearch(options: UseOmniSearchOptions = {}): UseOmniSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    limit = 10
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OmniResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    // Cancelar busca anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!searchQuery || searchQuery.length < minQueryLength) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await omniSearch(searchQuery, limit);
      
      if (response.results.length > 0) {
        setResults(response.results);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
      
      setDuration(response.duration);
    } catch (err) {
      console.error('Search error:', err);
      setError('Erro ao buscar resultados');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [minQueryLength, limit]);

  // Debounce effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch, debounceMs]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
  }, []);

  const refresh = useCallback(() => {
    performSearch(query);
  }, [query, performSearch]);

  return {
    query,
    results,
    isLoading,
    isOpen,
    error,
    duration,
    setQuery,
    setIsOpen,
    clearSearch,
    refresh
  };
}
```

### 5.2 Componente OmniSearch

```typescript
// src/components/search/OmniSearch.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { Search, Command, X, Loader2 } from 'lucide-react';
import { useOmniSearch } from '@/hooks/useOmniSearch';
import { SearchResults } from './SearchResults';
import { cn } from '@/lib/utils';

interface OmniSearchProps {
  className?: string;
  placeholder?: string;
  maxResults?: number;
}

export const OmniSearch: React.FC<OmniSearchProps> = ({
  className,
  placeholder = 'Pesquisar artigos, menus, vídeos...',
  maxResults = 10
}) => {
  const {
    query,
    results,
    isLoading,
    isOpen,
    error,
    duration,
    setQuery,
    setIsOpen,
    clearSearch
  } = useOmniSearch({ limit: maxResults });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Atalho de teclado (Ctrl+K ou Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K ou Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, [setQuery]);

  const handleClear = useCallback(() => {
    clearSearch();
    inputRef.current?.focus();
  }, [clearSearch]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative w-full max-w-2xl mx-auto',
        className
      )}
    >
      {/* Input Container */}
      <div className={cn(
        'relative flex items-center transition-all duration-200',
        isOpen ? 'rounded-t-xl' : 'rounded-xl'
      )}>
        {/* Icone de Busca */}
        <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
        
        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn(
            'w-full bg-[#1a1b2e] border border-gray-700/50',
            'py-3 pl-12 pr-20 text-sm text-white',
            'placeholder:text-gray-500',
            'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500',
            'transition-all duration-200',
            isOpen ? 'rounded-t-lg' : 'rounded-lg'
          )}
        />

        {/* Ações do Input */}
        <div className="absolute right-3 flex items-center gap-2">
          {/* Loading */}
          {isLoading && (
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          )}
          
          {/* Botão Limpar */}
          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          
          {/* Atalho de Teclado (mostrado quando vazio) */}
          {!query && !isLoading && (
            <kbd className="hidden md:flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 bg-gray-800 rounded border border-gray-700">
              <Command className="w-3 h-3" />
              <span>K</span>
            </kbd>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Resultados */}
      <SearchResults
        results={results}
        isOpen={isOpen}
        isLoading={isLoading}
        query={query}
        duration={duration}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
};

export default OmniSearch;
```

### 5.3 Componente SearchResults

```typescript
// src/components/search/SearchResults.tsx
import React from 'react';
import { FileText, Video, Calendar, Settings, Zap, Play, Search } from 'lucide-react';
import type { OmniResult } from '@/types/omnisearch';
import { cn } from '@/lib/utils';

interface SearchResultsProps {
  results: OmniResult[];
  isOpen: boolean;
  isLoading: boolean;
  query: string;
  duration?: number;
  onClose: () => void;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  article: { 
    icon: <FileText size={16} />, 
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    label: 'Artigo'
  },
  video: { 
    icon: <Play size={16} />, 
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
    label: 'Vídeo'
  },
  schedule: { 
    icon: <Calendar size={16} />, 
    color: 'text-green-400 bg-green-400/10 border-green-400/20',
    label: 'Agenda'
  },
  menu: { 
    icon: <Settings size={16} />, 
    color: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
    label: 'Menu'
  },
  action: { 
    icon: <Zap size={16} />, 
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    label: 'Ação'
  }
};

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isOpen,
  isLoading,
  query,
  duration,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-[#121322] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-[100]">
      {/* Header com status */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-[#1a1b2e]/50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Search className="w-3 h-3" />
          <span>
            {isLoading ? 'Buscando...' : `${results.length} resultados para "${query}"`}
          </span>
        </div>
        {duration !== undefined && !isLoading && (
          <span className="text-[10px] text-gray-600">
            {duration}ms
          </span>
        )}
      </div>

      {/* Lista de resultados */}
      <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="w-10 h-10 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">
              Nenhum resultado encontrado para "{query}"
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Tente usar termos diferentes ou verificar a ortografia
            </p>
          </div>
        ) : (
          results.map((item, index) => (
            <SearchResultItem 
              key={item.id} 
              item={item} 
              query={query}
              onClick={onClose}
              isFirst={index === 0}
            />
          ))
        )}
      </div>

      {/* Footer com atalhos */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800/50 bg-[#1a1b2e]/30">
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">↓↑</kbd>
            <span>navegar</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">↵</kbd>
            <span>selecionar</span>
          </span>
        </div>
        <span className="text-[10px] text-gray-600">
          OmniSearch
        </span>
      </div>
    </div>
  );
};

// Componente de item individual
interface SearchResultItemProps {
  item: OmniResult;
  query: string;
  onClick: () => void;
  isFirst: boolean;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ 
  item, 
  query, 
  onClick,
  isFirst 
}) => {
  const config = typeConfig[item.type] || typeConfig.menu;

  return (
    <a
      href={item.link}
      onClick={(e) => {
        // Navegação SPA - prevenir reload
        e.preventDefault();
        // Aqui você usaria o router do seu framework
        // router.push(item.link);
        onClick();
      }}
      className={cn(
        'flex items-start gap-4 p-4 border-b border-gray-800/50',
        'hover:bg-[#1f2038] transition-colors group',
        'focus:outline-none focus:bg-[#1f2038] focus:ring-2 focus:ring-purple-500/50',
        isFirst && 'border-t-0'
      )}
    >
      {/* Thumbnail/Icon */}
      <div className="relative flex-shrink-0 w-16 h-12 bg-[#0a0a14] rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center group-hover:border-gray-700 transition-colors">
        {item.thumbnail ? (
          <img 
            src={item.thumbnail} 
            alt="" 
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className={cn("p-1.5 rounded", config.color)}>
            {config.icon}
          </span>
        )}
        
        {/* Overlay para vídeos */}
        {item.type === 'video' && item.thumbnail && (
          <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
            <div className="w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
              <span className="text-white text-xs ml-0.5">▶</span>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {/* Header: Badge + Título */}
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide",
            config.color
          )}>
            {config.label}
          </span>
          <h4 
            className="text-sm font-medium text-gray-200 truncate group-hover:text-purple-300 transition-colors"
            dangerouslySetInnerHTML={{ __html: item.title }}
          />
        </div>

        {/* Snippet */}
        {item.highlightedText && (
          <p 
            className="text-xs text-gray-400 line-clamp-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: item.highlightedText }}
          />
        )}

        {/* Link/URL */}
        <span className="text-[10px] text-gray-600 mt-1 block truncate font-mono">
          {item.link}
        </span>
      </div>
    </a>
  );
};

export default SearchResults;
```

### 5.4 Estilos CSS (Global)

```css
/* src/styles/search-highlight.css */

/* ============================================
   OmniSearch - Highlight Styles
   ============================================ */

/* Destaque padrão das buscas */
.omni-search-highlight,
.group b,
[data-highlight="true"] {
  font-weight: 600;
  color: #c084fc; /* purple-400 */
  background: linear-gradient(135deg, rgba(192, 132, 252, 0.15), rgba(192, 132, 252, 0.05));
  padding: 0 3px;
  border-radius: 3px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

/* Hover state no item */
.group:hover .omni-search-highlight,
.group:hover b {
  color: #d8b4fe; /* purple-300 */
  background: linear-gradient(135deg, rgba(216, 180, 254, 0.2), rgba(216, 180, 254, 0.1));
}

/* Result item hover animation */
.omni-result-item {
  position: relative;
  overflow: hidden;
}

.omni-result-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #c084fc, #a855f7);
  transform: scaleY(0);
  transition: transform 0.2s ease;
}

.omni-result-item:hover::before {
  transform: scaleY(1);
}

/* Scrollbar personalizada para resultados */
.omni-results-scroll::-webkit-scrollbar {
  width: 6px;
}

.omni-results-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.omni-results-scroll::-webkit-scrollbar-thumb {
  background: rgba(192, 132, 252, 0.3);
  border-radius: 3px;
}

.omni-results-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(192, 132, 252, 0.5);
}

/* Animação de entrada */
@keyframes omniSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.omni-dropdown-animate {
  animation: omniSlideIn 0.2s ease-out forwards;
}

/* Foco acessível */
.omni-search-input:focus-visible {
  outline: 2px solid #c084fc;
  outline-offset: 2px;
}

/* Responsividade mobile */
@media (max-width: 640px) {
  .omni-search-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.9);
    padding: 1rem;
    display: flex;
    flex-direction: column;
  }
  
  .omni-search-results-mobile {
    flex: 1;
    margin-top: 1rem;
    max-height: none;
  }
}
```

### 5.5 Integração com Header Existente

```typescript
// src/components/dashboard/Header.tsx (modificação)

import React, { useState, useEffect } from 'react';
import { Bell, Menu, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OmniSearch } from '@/components/search/OmniSearch';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, className }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        'lg:left-64', // Ajuste conforme largura da sidebar
        isScrolled 
          ? 'bg-[#0f0f1a]/95 backdrop-blur-md shadow-lg border-b border-gray-800/50' 
          : 'bg-transparent',
        className
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Menu Button (Mobile) */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          {/* Logo/Brand (opcional no header) */}
          <span className="lg:hidden text-lg font-bold text-white">
            VN
          </span>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <div className="hidden md:block flex-1 max-w-2xl mx-8">
          <OmniSearch 
            placeholder="Pesquisar artigos, vídeos, menus... (Ctrl+K)"
            maxResults={10}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <Bell className="w-5 h-5" />
            {/* Badge de notificações */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0f0f1a]" />
          </Button>

          {/* User Profile */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-[#0f0f1a] border-b border-gray-800 p-4 z-50">
          <OmniSearch 
            placeholder="Pesquisar..."
            maxResults={8}
          />
        </div>
      )}
    </header>
  );
};

export default Header;
```

---

## 6. Testes

### 6.1 Testes Unitários

```typescript
// src/__tests__/omnisearch.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { omniSearch } from '@/services/omnisearch';
import { useOmniSearch } from '@/hooks/useOmniSearch';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

describe('OmniSearch Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar array vazio para query menor que 2 caracteres', async () => {
    const result = await omniSearch('a', 10);
    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('deve retornar menus estáticos quando houver erro no banco', async () => {
    const { supabase } = await import('@/lib/supabase/client');
    vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('DB Error'));

    const result = await omniSearch('analytics', 10);
    
    // Deve retornar menus estáticos como fallback
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].type).toBe('menu');
  });
});

describe('useOmniSearch Hook', () => {
  it('deve iniciar com estado inicial correto', () => {
    const { result } = renderHook(() => useOmniSearch());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve atualizar query quando setQuery é chamado', () => {
    const { result } = renderHook(() => useOmniSearch());

    act(() => {
      result.current.setQuery('teste');
    });

    expect(result.current.query).toBe('teste');
  });

  it('deve limpar busca quando clearSearch é chamado', async () => {
    const { result } = renderHook(() => useOmniSearch());

    act(() => {
      result.current.setQuery('teste');
    });

    await waitFor(() => {
      expect(result.current.query).toBe('teste');
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isOpen).toBe(false);
  });
});
```

### 6.2 Testes E2E (Cypress/Playwright)

```typescript
// e2e/omnisearch.spec.ts
import { test, expect } from '@playwright/test';

test.describe('OmniSearch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="omni-search"]');
  });

  test('deve abrir ao clicar no input', async ({ page }) => {
    const searchInput = page.locator('[data-testid="omni-search-input"]');
    await searchInput.click();
    
    await expect(page.locator('[data-testid="omni-search-results"]')).toBeVisible();
  });

  test('deve abrir com atalho Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k');
    
    const searchInput = page.locator('[data-testid="omni-search-input"]');
    await expect(searchInput).toBeFocused();
  });

  test('deve buscar resultados ao digitar', async ({ page }) => {
    const searchInput = page.locator('[data-testid="omni-search-input"]');
    
    await searchInput.fill('analytics');
    
    // Aguarda debounce (300ms)
    await page.waitForTimeout(400);
    
    // Verifica se resultados apareceram
    const results = page.locator('[data-testid="omni-search-result-item"]');
    await expect(results.first()).toBeVisible();
  });

  test('deve navegar com teclado', async ({ page }) => {
    const searchInput = page.locator('[data-testid="omni-search-input"]');
    
    await searchInput.fill('menu');
    await page.waitForTimeout(400);
    
    // Pressiona arrow down
    await page.keyboard.press('ArrowDown');
    
    // Primeiro item deve estar focado
    const firstItem = page.locator('[data-testid="omni-search-result-item"]').first();
    await expect(firstItem).toHaveAttribute('data-focused', 'true');
  });

  test('deve fechar ao pressionar Escape', async ({ page }) => {
    const searchInput = page.locator('[data-testid="omni-search-input"]');
    
    await searchInput.click();
    await page.keyboard.press('Escape');
    
    await expect(page.locator('[data-testid="omni-search-results"]')).toBeHidden();
  });

  test('deve exibir estado vazio quando não há resultados', async ({ page }) => {
    const searchInput = page.locator('[data-testid="omni-search-input"]');
    
    await searchInput.fill('xyznonexistent');
    await page.waitForTimeout(400);
    
    await expect(page.locator('[data-testid="omni-search-empty"]')).toBeVisible();
    await expect(page.locator('text=Nenhum resultado encontrado')).toBeVisible();
  });
});
```

---

## 7. Cronograma de Implementação

### Semana 1: Fundação

| Dia | Tarefa | Responsável | Status |
|-----|--------|-------------|--------|
| 1 | Configurar extensão unaccent no PostgreSQL | Dev | ⬜ |
| 1 | Criar função SQL omni_search | Dev | ⬜ |
| 1 | Criar índices GIN para FTS | Dev | ⬜ |
| 2 | Criar tipos TypeScript | Dev | ⬜ |
| 2 | Implementar serviço omniSearch | Dev | ⬜ |
| 3 | Criar hook useOmniSearch | Dev | ⬜ |
| 3 | Testes unitários do hook | Dev | ⬜ |
| 4 | Implementar componente OmniSearch | Dev | ⬜ |
| 4 | Implementar componente SearchResults | Dev | ⬜ |
| 5 | Criar estilos CSS | Dev | ⬜ |
| 5 | Integrar com Header existente | Dev | ⬜ |

### Semana 2: Refinamento

| Dia | Tarefa | Status |
|-----|--------|--------|
| 6 | Testes E2E com Playwright | ⬜ |
| 6 | Testes em dispositivos móveis | ⬜ |
| 7 | Otimização de performance | ⬜ |
| 7 | Ajustes de acessibilidade (ARIA) | ⬜ |
| 8 | Documentação final | ⬜ |
| 8 | Code review | ⬜ |
| 9 | Deploy em staging | ⬜ |
| 9 | Testes de aceitação | ⬜ |
| 10 | Deploy em produção | ⬜ |
| 10 | Monitoramento pós-deploy | ⬜ |

---

## 8. Checklist de Qualidade

### Performance
- [ ] Tempo de resposta < 100ms para 90% das requisições
- [ ] Debounce de 300ms implementado
- [ ] Índices GIN criados no banco
- [ ] Cache de resultados estáticos

### UX/UI
- [ ] Design responsivo (mobile-first)
- [ ] Feedback visual de loading
- [ ] Estados vazio tratados
- [ ] Navegação por teclado completa
- [ ] Animações suaves

### Acessibilidade
- [ ] Atributos ARIA aplicados
- [ ] Contraste de cores adequado
- [ ] Suporte a leitores de tela
- [ ] Foco visível em elementos interativos

### Segurança
- [ ] Sanitização de inputs
- [ ] Rate limiting implementado
- [ ] SQL injection prevenido (parametrização)
- [ ] XSS protection em highlights

---

## 9. Troubleshooting

### Problemas Comuns

#### 1. Busca lenta (> 200ms)
**Causas:**
- Índices GIN não criados
- Tabela muito grande sem particionamento
- Query complexa demais

**Soluções:**
```sql
-- Verificar se índices existem
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('publications', 'videos', 'schedules');

-- Recriar índices se necessário
REINDEX INDEX idx_publications_fts;

-- Analisar tabelas para otimizador
ANALYZE publications;
ANALYZE videos;
ANALYZE schedules;
```

#### 2. Resultados não aparecem
**Causas:**
- Extensão unaccent não instalada
- Função SQL com erro
- Problema de CORS na API

**Soluções:**
```sql
-- Verificar extensão
SELECT * FROM pg_extension WHERE extname = 'unaccent';

-- Verificar função
SELECT pg_get_functiondef('omni_search'::regprocedure);

-- Testar função diretamente
SELECT * FROM omni_search('teste', 5);
```

#### 3. Destaque (highlight) não funciona
**Causas:**
- CSS não carregado
- dangerouslySetInnerHTML bloqueado
- Escape de HTML

**Soluções:**
```css
/* Verificar se CSS está carregado */
@import './search-highlight.css';

/* No componente */
<p 
  className="omni-search-highlight"
  dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(item.highlightedText) 
  }} 
/>
```

---

## 10. Referências

### Documentação
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [React Query - useQuery](https://tanstack.com/query/latest/docs/react/reference/useQuery)

### Recursos
- [Design System - Command Palette](https://www.cmdk.com/)
- [Algolia Search UI Patterns](https://www.algolia.com/doc/guides/building-search-ui/ui-and-ux-patterns/)
- [Tailwind UI - Search](https://tailwindui.com/components/application-ui/navigation/command-palettes)

---

## 11. Apêndice A: Dicionário de Menus Estáticos

```typescript
// src/lib/constants/staticMenus.ts

import type { OmniResult } from '@/types/omnisearch';

export const STATIC_MENUS: OmniResult[] = [
  // Dashboard
  {
    id: 'menu-dashboard',
    title: 'Dashboard',
    type: 'menu',
    link: '/dashboard',
    highlightedText: 'Visão geral do sistema e métricas',
    categoryLabel: 'Menu',
    keywords: 'início home overview visão geral métricas'
  },
  
  // Conteúdo
  {
    id: 'menu-content',
    title: 'Conteúdo',
    type: 'menu',
    link: '/dashboard/content',
    highlightedText: 'Gerencie artigos e publicações',
    categoryLabel: 'Menu',
    keywords: 'artigos posts notícias publicações blog texto'
  },
  {
    id: 'action-new-post',
    title: 'Novo Artigo',
    type: 'action',
    link: '/dashboard/content/new',
    highlightedText: 'Crie uma nova publicação',
    categoryLabel: 'Ação',
    keywords: 'criar novo escrever publicar post artigo'
  },
  
  // Vídeos
  {
    id: 'menu-videos',
    title: 'Vídeos',
    type: 'menu',
    link: '/dashboard/videos',
    highlightedText: 'Biblioteca de vídeos e lives',
    categoryLabel: 'Menu',
    keywords: 'vídeos lives streaming youtube player mídia'
  },
  
  // Agenda
  {
    id: 'menu-schedule',
    title: 'Agenda',
    type: 'menu',
    link: '/dashboard/schedule',
    highlightedText: 'Calendário editorial e agendamentos',
    categoryLabel: 'Menu',
    keywords: 'calendário agenda programação eventos datas cronograma'
  },
  
  // Mensagens
  {
    id: 'menu-messaging',
    title: 'Mensagens',
    type: 'menu',
    link: '/dashboard/messaging',
    highlightedText: 'WhatsApp e chatbot',
    categoryLabel: 'Menu',
    keywords: 'whatsapp chat bot mensagens conversas atendimento suporte'
  },
  
  // Mídia
  {
    id: 'menu-media',
    title: 'Mídia',
    type: 'menu',
    link: '/dashboard/media',
    highlightedText: 'Biblioteca de imagens e arquivos',
    categoryLabel: 'Menu',
    keywords: 'imagens fotos arquivos mídia galeria upload files'
  },
  
  // Analytics
  {
    id: 'menu-analytics',
    title: 'Analytics',
    type: 'menu',
    link: '/dashboard/analytics',
    highlightedText: 'Métricas e estatísticas avançadas',
    categoryLabel: 'Menu',
    keywords: 'analytics métricas estatísticas dados relatórios gráficos'
  },
  
  // Configurações
  {
    id: 'menu-settings',
    title: 'Configurações',
    type: 'menu',
    link: '/dashboard/settings',
    highlightedText: 'Configurações do portal e sistema',
    categoryLabel: 'Menu',
    keywords: 'configurações opções preferências ajustes sistema'
  },
  {
    id: 'action-profile',
    title: 'Meu Perfil',
    type: 'action',
    link: '/dashboard/settings/profile',
    highlightedText: 'Edite seu perfil e informações pessoais',
    categoryLabel: 'Ação',
    keywords: 'perfil usuário conta dados pessoal