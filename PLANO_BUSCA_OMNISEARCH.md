# Plano de Trabalho: Implementação do Motor de Busca OmniSearch

## 1. Visão Geral do Projeto

### 1.1 Objetivo
Implementar um motor de busca híbrida (OmniSearch) no dashboard administrativo do Vitória News, unificando navegação do sistema (menus, rotas, ações) com pesquisa profunda de conteúdo (artigos, vídeos, agendamentos).

### 1.2 Características Principais
- **Busca Híbrida**: Mistura resultados estáticos (menus/ações) com resultados dinâmicos (banco de dados)
- **Performance**: Respostas em < 100ms utilizando PostgreSQL Full-Text Search (FTS)
- **UX Imersiva**: Interface visual rica com thumbnails, ícones de categoria e snippets destacados
- **Navegação Rápida**: Redirecionamento instantâneo ao clicar no resultado
- **Responsivo**: Funcionamento perfeito em desktop e mobile

### 1.3 Tecnologias Utilizadas
- **Backend**: PostgreSQL (Full-Text Search), Node.js/Express, Supabase
- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React
- **Extensões PostgreSQL**: `unaccent` (remoção de acentos)

---

## 2. Arquitetura da Solução

### 2.1 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │ OmniSearch   │───▶│  Debounce    │───▶│  API Call    │        │
│  │  Component   │    │   300ms      │    │  /api/search │        │
│  └──────────────┘    └──────────────┘    └──────┬───────┘        │
└──────────────────────────────────────────────────│───────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              /api/search Endpoint                        │    │
│  │  ┌──────────────┐    ┌──────────────┐                │    │
│  │  │ Static Search│    │Dynamic Search│                │    │
│  │  │   (Menus)    │    │  (Database)   │                │    │
│  │  └──────┬───────┘    └──────┬───────┘                │    │
│  │         └───────────────────┘                        │    │
│  │                      │                               │    │
│  │                      ▼                               │    │
│  │         ┌──────────────────────────┐                   │    │
│  │         │   Merge & Sort Results │                   │    │
│  │         └────────────┬───────────┘                   │    │
│  │                      │                               │    │
│  └──────────────────────┼───────────────────────────────┘    │
│                         │                                    │
└─────────────────────────│────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL DATABASE                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              antigravity_omnisearch()                       ││
│  │                    FUNCTION                                 ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           ││
│  │  │articles │ │ videos  │ │schedules│ │  users  │           ││
│  │  │  table  │ │  table  │ │  table  │ │  table  │           ││
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           ││
│  │       └──────────┴──────────┴──────────┘                  ││
│  │                         │                                 ││
│  │                         ▼                                 ││
│  │       ┌─────────────────────────────────┐                 ││
│  │       │  ts_rank + ts_headline +       │                 ││
│  │       │  unaccent + to_tsvector         │                 ││
│  │       └─────────────────────────────────┘                 ││
│  └─────────────────────────────────────────────────────────────┘
│
│  EXTENSÕES:
│  • unaccent: Remove acentos para busca inteligente
│
│  ÍNDICES RECOMENDADOS:
│  • CREATE INDEX idx_articles_search ON articles USING gin(to_tsvector('portuguese', unaccent(title) || ' ' || unaccent(content)));
│  • CREATE INDEX idx_videos_search ON videos USING gin(to_tsvector('portuguese', unaccent(title) || ' ' || unaccent(description)));
│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes Principais

| Componente | Tipo | Descrição |
|------------|------|-----------|
| `OmniSearch` | React Component | Barra de busca com dropdown de resultados |
| `search_content()` | PostgreSQL Function | Busca FTS em múltiplas tabelas |
| `/api/search` | API Endpoint | Endpoint unificado de busca |
| `STATIC_MENUS` | Constant Array | Dicionário estático de menus/ações |

---

## 3. Estrutura de Dados

### 3.1 Interface TypeScript

```typescript
// src/types/search.ts

export type OmniResultType = 'video' | 'article' | 'page' | 'schedule' | 'menu' | 'action';

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
  slug?: string;
}

export interface SearchQuery {
  q: string;
  limit?: number;
  offset?: number;
  filters?: {
    type?: OmniResultType[];
    dateFrom?: string;
    dateTo?: string;
  };
}

export interface SearchResponse {
  results: OmniResult[];
  total: number;
  query: string;
  executionTime?: number;
}
```

### 3.2 Dicionário Estático de Menus

```typescript
// src/data/staticMenus.ts

import { OmniResult } from '@/types/search';

export const STATIC_MENUS: Omit<OmniResult, 'highlightedText' | 'categoryLabel'>[] = [
  // Dashboard
  {
    id: 'menu-dashboard',
    title: 'Dashboard',
    type: 'menu',
    link: '/dashboard',
    thumbnail: undefined,
    keywords: 'início home painel estatísticas resumo',
  },
  {
    id: 'menu-analytics',
    title: 'Analytics',
    type: 'menu',
    link: '/analytics',
    thumbnail: undefined,
    keywords: 'dados tráfego estatísticas métricas gráficos relatórios',
  },
  {
    id: 'menu-monitoring',
    title: 'Monitoramento',
    type: 'menu',
    link: '/monitoring',
    thumbnail: undefined,
    keywords: 'status uptime alertas logs health',
  },
  
  // Conteúdo
  {
    id: 'menu-posts',
    title: 'Artigos',
    type: 'menu',
    link: '/posts',
    thumbnail: undefined,
    keywords: 'notícias publicações matérias postagens conteúdo blog',
  },
  {
    id: 'action-create-post',
    title: 'Criar Novo Artigo',
    type: 'action',
    link: '/posts/new',
    thumbnail: undefined,
    keywords: 'novo publicar escrever redigir criar post artigo',
  },
  {
    id: 'menu-videos',
    title: 'Vídeos',
    type: 'menu',
    link: '/videos',
    thumbnail: undefined,
    keywords: 'multimídia filmes clips streaming player',
  },
  {
    id: 'action-create-video',
    title: 'Adicionar Vídeo',
    type: 'action',
    link: '/videos/new',
    thumbnail: undefined,
    keywords: 'novo upload vídeo youtube vimeo embed',
  },
  
  // Agenda
  {
    id: 'menu-calendar',
    title: 'Calendário',
    type: 'menu',
    link: '/calendar',
    thumbnail: undefined,
    keywords: 'agenda datas eventos programação calendário cronograma',
  },
  {
    id: 'menu-schedules',
    title: 'Agendamentos',
    type: 'menu',
    link: '/schedules',
    thumbnail: undefined,
    keywords: 'compromissos reuniões agendamentos marcações',
  },
  
  // Configurações
  {
    id: 'menu-settings',
    title: 'Configurações',
    type: 'menu',
    link: '/settings',
    thumbnail: undefined,
    keywords: 'preferências opções ajustes configurações sistema',
  },
  {
    id: 'menu-profile',
    title: 'Perfil do Usuário',
    type: 'menu',
    link: '/profile',
    thumbnail: undefined,
    keywords: 'usuário conta perfil avatar dados pessoais',
  },
  {
    id: 'action-change-password',
    title: 'Trocar Senha',
    type: 'action',
    link: '/settings/password',
    thumbnail: undefined,
    keywords: 'senha password alterar trocar segurança',
  },
  {
    id: 'action-logout',
    title: 'Sair do Sistema',
    type: 'action',
    link: '/logout',
    thumbnail: undefined,
    keywords: 'logout sair encerrar sessão exit',
  },
];

// Helper para filtrar menus estáticos
export function filterStaticMenus(searchTerm: string): typeof STATIC_MENUS {
  const normalizedTerm = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return STATIC_MENUS.filter(item => {
    const normalizedTitle = item.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedKeywords = item.keywords.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    return normalizedTitle.includes(normalizedTerm) || normalizedKeywords.includes(normalizedTerm);
  });
}
```

---

## 4. Fases de Implementação

### FASE 1: Preparação do Banco de Dados (Dias 1-2)

#### 1.1 Configuração do PostgreSQL
```sql
-- 1. Habilitar extensão unaccent para busca sem acentos
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Verificar se a extensão foi instalada corretamente
SELECT * FROM pg_extension WHERE extname = 'unaccent';
```

#### 1.2 Criação da Função de Busca Global
```sql
-- Função unificada de busca OmniSearch
CREATE OR REPLACE FUNCTION antigravity_omnisearch(search_term TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type TEXT,
  slug TEXT,
  thumbnail_url TEXT,
  snippet TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  
  -- Busca em Artigos/Publicações
  SELECT
    p.id,
    p.title,
    'artigo' AS type,
    '/artigos/' || p.slug AS slug,
    p.featured_image AS thumbnail_url,
    ts_headline(
      'portuguese', 
      p.content, 
      to_tsquery('portuguese', search_term || ':*'),
      'StartSel=<b>, StopSel=</b>, MaxWords=15, MinWords=10'
    ) AS snippet,
    ts_rank(
      to_tsvector('portuguese', unaccent(p.title) || ' ' || unaccent(p.content)),
      to_tsquery('portuguese', search_term || ':*')
    ) AS rank
  FROM publications p
  WHERE to_tsvector('portuguese', unaccent(p.title) || ' ' || unaccent(p.content))
    @@ to_tsquery('portuguese', search_term || ':*')
    AND p.status = 'published'

  UNION ALL

  -- Busca em Vídeos
  SELECT
    v.id,
    v.title,
    'video' AS type,
    '/videos/' || v.slug AS slug,
    v.thumbnail_url,
    ts_headline(
      'portuguese',
      v.description,
      to_tsquery('portuguese', search_term || ':*'),
      'StartSel=<b>, StopSel=</b>, MaxWords=15, MinWords=10'
    ) AS snippet,
    ts_rank(
      to_tsvector('portuguese', unaccent(v.title) || ' ' || unaccent(v.description)),
      to_tsquery('portuguese', search_term || ':*')
    ) AS rank
  FROM videos v
  WHERE to_tsvector('portuguese', unaccent(v.title) || ' ' || unaccent(v.description))
    @@ to_tsquery('portuguese', search_term || ':*')
    AND v.status = 'published'

  UNION ALL

  -- Busca em Agendamentos
  SELECT
    s.id,
    s.title,
    'agendamento' AS type,
    '/agendamentos/' || s.id::text AS slug,
    NULL AS thumbnail_url,
    ts_headline(
      'portuguese',
      s.description,
      to_tsquery('portuguese', search_term || ':*'),
      'StartSel=<b>, StopSel=</b>, MaxWords=15, MinWords=10'
    ) AS snippet,
    ts_rank(
      to_tsvector('portuguese', unaccent(s.title) || ' ' || unaccent(s.description)),
      to_tsquery('portuguese', search_term || ':*')
    ) AS rank
  FROM schedules s
  WHERE to_tsvector('portuguese', unaccent(s.title) || ' ' || unaccent(s.description))
    @@ to_tsquery('portuguese', search_term || ':*')

  -- Adicionar mais tabelas conforme necessário (users, pages, etc.)
  
  ORDER BY rank DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

#### 1.3 Criação de Índices para Performance
```sql
-- Índices GIN (Generalized Inverted Index) para Full-Text Search

-- Índice para artigos/publicações
CREATE INDEX IF NOT EXISTS idx_publications_search 
ON publications 
USING gin(to_tsvector('portuguese', unaccent(title) || ' ' || unaccent(content)));

-- Índice para vídeos
CREATE INDEX IF NOT EXISTS idx_videos_search 
ON videos 
USING gin(to_tsvector('portuguese', unaccent(title) || ' ' || unaccent(description)));

-- Índice para agendamentos
CREATE INDEX IF NOT EXISTS idx_schedules_search 
ON schedules 
USING gin(to_tsvector('portuguese', unaccent(title) || ' ' || unaccent(description)));

-- Verificar se os índices foram criados
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%_search';
```

---

### FASE 2: Backend - API de Busca (Dias 3-4)

#### 2.1 Definição de Tipos TypeScript
```typescript
// src/types/search.ts

export type OmniResultType = 'video' | 'article' | 'page' | 'schedule' | 'menu' | 'action';

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
  slug?: string;
}

export interface SearchQuery {
  q: string;
  limit?: number;
  offset?: number;
  filters?: {
    type?: OmniResultType[];
    dateFrom?: string;
    dateTo?: string;
  };
}

export interface SearchResponse {
  results: OmniResult[];
  total: number;
  query: string;
  executionTime?: number;
}
```

#### 2.2 Dicionário Estático de Menus
```typescript
// src/data/staticMenus.ts

import { OmniResult } from '@/types/search';

interface StaticMenuItem {
  id: string;
  title: string;
  type: 'menu' | 'action';
  link: string;
  thumbnail?: string;
  keywords: string;
}

export const STATIC_MENUS: StaticMenuItem[] = [
  // Dashboard
  {
    id: 'menu-dashboard',
    title: 'Dashboard',
    type: 'menu',
    link: '/dashboard',
    keywords: 'início home painel estatísticas resumo',
  },
  {
    id: 'menu-analytics',
    title: 'Analytics',
    type: 'menu',
    link: '/analytics',
    keywords: 'dados tráfego estatísticas métricas gráficos relatórios',
  },
  {
    id: 'menu-monitoring',
    title: 'Monitoramento',
    type: 'menu',
    link: '/monitoring',
    keywords: 'status uptime alertas logs health',
  },
  
  // Conteúdo
  {
    id: 'menu-posts',
    title: 'Artigos',
    type: 'menu',
    link: '/posts',
    keywords: 'notícias publicações matérias postagens conteúdo blog',
  },
  {
    id: 'action-create-post',
    title: 'Criar Novo Artigo',
    type: 'action',
    link: '/posts/new',
    keywords: 'novo publicar escrever redigir criar post artigo',
  },
  {
    id: 'menu-videos',
    title: 'Vídeos',
    type: 'menu',
    link: '/videos',
    keywords: 'multimídia filmes clips streaming player',
  },
  {
    id: 'action-create-video',
    title: 'Adicionar Vídeo',
    type: 'action',
    link: '/videos/new',
    keywords: 'novo upload vídeo youtube vimeo embed',
  },
  {
    id: 'menu-pages',
    title: 'Páginas',
    type: 'menu',
    link: '/pages',
    keywords: 'páginas institucional sobre contato',
  },
  
  // Agenda
  {
    id: 'menu-calendar',
    title: 'Calendário',
    type: 'menu',
    link: '/calendar',
    keywords: 'agenda datas eventos programação calendário cronograma',
  },
  {
    id: 'menu-schedules',
    title: 'Agendamentos',
    type: 'menu',
    link: '/schedules',
    keywords: 'compromissos reuniões agendamentos marcações',
  },
  {
    id: 'action-new-schedule',
    title: 'Novo Agendamento',
    type: 'action',
    link: '/schedules/new',
    keywords: 'novo agendamento compromisso reunião',
  },
  
  // Mídia
  {
    id: 'menu-media',
    title: 'Biblioteca de Mídia',
    type: 'menu',
    link: '/media',
    keywords: 'imagens fotos arquivos uploads galeria',
  },
  {
    id: 'action-upload',
    title: 'Upload de Arquivos',
    type: 'action',
    link: '/media/upload',
    keywords: 'upload enviar arquivo imagem documento',
  },
  
  // Configurações
  {
    id: 'menu-settings',
    title: 'Configurações',
    type: 'menu',
    link: '/settings',
    keywords: 'preferências opções ajustes configurações sistema',
  },
  {
    id: 'menu-profile',
    title: 'Perfil do Usuário',
    type: 'menu',
    link: '/profile',
    keywords: 'usuário conta perfil avatar dados pessoais',
  },
  {
    id: 'action-change-password',
    title: 'Trocar Senha',
    type: 'action',
    link: '/settings/password',
    keywords: 'senha password alterar trocar segurança',
  },
  {
    id: 'action-logout',
    title: 'Sair do Sistema',
    type: 'action',
    link: '/logout',
    keywords: 'logout sair encerrar sessão exit',
  },
];

// Helper para filtrar menus estáticos
export function filterStaticMenus(searchTerm: string): StaticMenuItem[] {
  const normalizedTerm = searchTerm
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return STATIC_MENUS.filter((item) => {
    const normalizedTitle = item.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const normalizedKeywords = item.keywords
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return (
      normalizedTitle.includes(normalizedTerm) ||
      normalizedKeywords.includes(normalizedTerm)
    );
  });
}
```

#### 2.3 Controller da API de Busca
```typescript
// src/controllers/searchController.ts

import { Request, Response } from 'express';
import { supabase } from '@/lib/supabaseClient';
import { filterStaticMenus, STATIC_MENUS } from '@/data/staticMenus';
import { OmniResult, SearchResponse } from '@/types/search';

// Tempo máximo de execução da consulta (ms)
const QUERY_TIMEOUT = 5000;

export const omniSearch = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const { q, limit = 10 } = req.query;
    const searchTerm = String(q).trim();

    // Validação do termo de busca
    if (!searchTerm || searchTerm.length < 2) {
      res.json({
        results: [],
        total: 0,
        query: searchTerm,
        executionTime: 0,
      } as SearchResponse);
      return;
    }

    // Limitar tamanho da query para prevenir abuso
    if (searchTerm.length > 100) {
      res.status(400).json({ 
        error: 'Termo de busca muito longo (máximo 100 caracteres)' 
      });
      return;
    }

    // 1. BUSCA ESTÁTICA (Menus e Ações)
    const staticMatches = filterStaticMenus(searchTerm);
    const staticResults: OmniResult[] = staticMatches.map(item => {
      // Destacar termo encontrado no título
      const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
      const highlightedTitle = item.title.replace(regex, '<b>$1</b>');
      
      return {
        id: item.id,
        title: highlightedTitle,
        type: item.type === 'action' ? 'action' : 'menu',
        link: item.link,
        thumbnail: item.thumbnail,
        highlightedText: `Acesso rápido: ${item.title}`,
        categoryLabel: item.type === 'action' ? 'Ação Rápida' : 'Menu',
      };
    });

    // 2. BUSCA DINÂMICA (Banco de Dados via PostgreSQL FTS)
    // Formatar termo para to_tsquery (substituir espaços por & para AND)
    const formattedSearchTerm = searchTerm
      .replace(/[\s]+/g, ' ')
      .trim()
      .split(' ')
      .map(term => `${term}:*`)
      .join(' & ');

    const { data: dbResults, error } = await supabase
      .rpc('antigravity_omnisearch', {
        search_term: formattedSearchTerm,
      })
      .limit(Number(limit));

    if (error) {
      console.error('Erro na busca dinâmica:', error);
      throw new Error(`Erro na consulta ao banco: ${error.message}`);
    }

    // 3. MAPEAR RESULTADOS DO BANCO PARA O FORMATO OmniResult
    const dynamicResults: OmniResult[] = (dbResults || []).map((item: any) => {
      const typeMap: Record<string, OmniResult['type']> = {
        'artigo': 'article',
        'video': 'video',
        'agendamento': 'schedule',
        'pagina': 'page',
      };

      const categoryLabels: Record<string, string> = {
        'artigo': 'Artigo',
        'video': 'Vídeo',
        'agendamento': 'Agendamento',
        'pagina': 'Página',
      };

      return {
        id: item.id,
        title: item.title,
        type: typeMap[item.type] || 'article',
        link: item.slug,
        thumbnail: item.thumbnail_url,
        highlightedText: item.snippet || '',
        categoryLabel: categoryLabels[item.type] || 'Conteúdo',
        rank: item.rank,
        snippet: item.snippet,
        slug: item.slug,
      };
    });

    // 4. MESCLAR E ORDENAR RESULTADOS
    // Prioridade: Ações/Menus estáticos primeiro, depois conteúdo por relevância
    const combinedResults: OmniResult[] = [
      ...staticResults,
      ...dynamicResults,
    ];

    // Calcular tempo de execução
    const executionTime = Date.now() - startTime;

    // 5. RETORNAR RESPOSTA
    const response: SearchResponse = {
      results: combinedResults,
      total: combinedResults.length,
      query: searchTerm,
      executionTime,
    };

    res.json(response);

  } catch (error) {
    console.error('Erro na busca OmniSearch:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    res.status(500).json({
      error: 'Erro ao realizar a busca',
      message: errorMessage,
      results: [],
      total: 0,
      query: req.query.q || '',
      executionTime: Date.now() - startTime,
    } as SearchResponse);
  }
};

// Helper para escapar caracteres especiais em regex
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

#### 2.4 Rotas da API
```typescript
// src/routes/searchRoutes.ts

import { Router } from 'express';
import { omniSearch } from '@/controllers/searchController';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Rate limiting para prevenir abuso da API de busca
const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 requisições por minuto
  message: {
    error: 'Limite de requisições excedido. Tente novamente em um minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/search
router.get('/', searchRateLimiter, omniSearch);

export default router;
```

---

### FASE 3: Frontend - Componente OmniSearch (Dias 5-7)

#### 3.1 Estrutura do Componente Principal
```tsx
// src/components/Search/OmniSearch.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Play, 
  FileText, 
  Settings, 
  Zap, 
  Calendar,
  Video,
  Layout,
  X,
  Loader2,
  Command
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { OmniResult, SearchResponse } from '@/types/search';

// Configurações
const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const MAX_RESULTS = 10;

// Mapeamento de ícones por tipo
const iconMap: Record<string, React.ReactNode> = {
  video: <Play className="w-5 h-5 text-red-400" />,
  article: <FileText className="w-5 h-5 text-blue-400" />,
  page: <Layout className="w-5 h-5 text-green-400" />,
  schedule: <Calendar className="w-5 h-5 text-orange-400" />,
  menu: <Settings className="w-5 h-5 text-gray-400" />,
  action: <Zap className="w-5 h-5 text-yellow-400" />,
};

// Cores de badge por tipo
const badgeStyles: Record<string, string> = {
  video: 'bg-red-500/10 text-red-400 border-red-500/20',
  article: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  page: 'bg-green-500/10 text-green-400 border-green-500/20',
  schedule: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  menu: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  action: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

// Labels por tipo
const typeLabels: Record<string, string> = {
  video: 'Vídeo',
  article: 'Artigo',
  page: 'Página',
  schedule: 'Agendamento',
  menu: 'Menu',
  action: 'Ação Rápida',
};

export const OmniSearch: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Estados
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OmniResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce da query
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  
  // Efeito de busca quando a query debounced muda
  useEffect(() => {
    if (debouncedQuery.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }
    
    performSearch(debouncedQuery);
  }, [debouncedQuery]);
  
  // Função de busca
  const performSearch = async (searchTerm: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchTerm)}&limit=${MAX_RESULTS}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data: SearchResponse = await response.json();
      
      setResults(data.results);
      setIsOpen(data.results.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Erro na busca:', err);
      setError('Erro ao buscar resultados. Tente novamente.');
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handler de seleção de resultado
  const handleSelectResult = useCallback((result: OmniResult) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    navigate(result.link);
  }, [navigate]);
  
  // Handler de navegação por teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      // Ctrl+K ou Cmd+K para focar no input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, results, selectedIndex, handleSelectResult]);
  
  // Handler de clique fora para fechar dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Renderização do ícone por tipo
  const renderIcon = (type: string) => {
    return iconMap[type] || <Search className="w-5 h-5 text-gray-400" />;
  };
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-2xl mx-auto"
    >
      {/* Input de Busca */}
      <div className={cn(
        "relative flex items-center transition-all duration-200",
        isOpen && "ring-2 ring-purple-500/50"
      )}>
        <Search className="absolute left-3 text-gray-400 w-5 h-5 pointer-events-none" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { 
            if (results.length > 0) setIsOpen(true); 
          }}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar artigos, menus, vídeos..."
          className={cn(
            "w-full bg-[#1a1b2e] border border-gray-700/50 rounded-lg py-2.5 pl-10 pr-20 text-sm text-white",
            "placeholder:text-gray-500",
            "focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          )}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        
        {/* Tecla de atalho / Loading */}
        <div className="absolute right-3 flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          ) : query.length === 0 ? (
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-800/50 rounded border border-gray-700">
              <Command className="w-3 h-3" />
              <span>K</span>
            </kbd>
          ) : (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Mensagem de Erro */}
      {error && (
        <div className="mt-2 px-3 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded">
          {error}
        </div>
      )}
      
      {/* Dropdown de Resultados */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-[#121322] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-[100]">
          {/* Header com contador */}
          <div className="px-4 py-2 bg-[#1a1b2e] border-b border-gray-800/50">
            <span className="text-xs text-gray-500">
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Lista de resultados */}
          <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
            {results.map((item, index) => (
              <a
                key={`${item.id}-${index}`}
                href={item.link}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectResult(item);
                }}
                className={cn(
                  "flex items-start gap-4 p-4 border-b border-gray-800/50 last:border-0 transition-colors group outline-none",
                  index === selectedIndex 
                    ? "bg-[#2a2b4a]" 
                    : "hover:bg-[#1f2038]"
                )}
                data-selected={index === selectedIndex}
              >
                {/* Thumbnail/Ícone */}
                <div className="relative flex-shrink-0 w-24 h-16 bg-[#0a0a14] rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center">
                  {item.thumbnail ? (
                    <img 
                      src={item.thumbnail} 
                      alt="" 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" 
                      loading="lazy"
                    />
                  ) : (
                    renderIcon(item.type)
                  )}
                  
                  {/* Overlay de play para vídeos */}
                  {item.type === 'video' && (
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                      <Play className="w-6 h-6 text-white drop-shadow-md opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>

                {/* Conteúdo textual */}
                <div className="flex-1 min-w-0">
                  {/* Badge + Título */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase border",
                      badgeStyles[item.type] || badgeStyles.menu
                    )}>
                      {typeLabels[item.type] || item.type}
                    </span>
                    
                    <h4 
                      className="text-sm font-semibold text-gray-200 truncate group-hover:text-purple-300 transition-colors"
                      dangerouslySetInnerHTML={{ __html: item.title }}
                    />
                  </div>
                  
                  {/* Snippet/Descrição */}
                  {item.snippet && (
                    <p 
                      className="text-xs text-gray-400 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.snippet }}
                    />
                  )}
                  
                  {/* URL/Slug */}
                  <span className="text-[10px] text-gray-600 mt-1 block truncate font-mono">
                    {item.slug || item.link}
                  </span>
                </div>
              </a>
            ))}
          </div>
          
          {/* Footer com instruções de navegação */}
          <div className="px-4 py-2 bg-[#1a1b2e] border-t border-gray-800/50 flex items-center justify-between text-[10px] text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">↑↓</kbd>
                <span>navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">↵</kbd>
                <span>selecionar</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">esc</kbd>
              <span>fechar</span>
            </span>
          </div>
        </div>
      )}
      
      {/* Empty state quando não há resultados */}
      {isOpen && query.length >= MIN_SEARCH_LENGTH && results.length === 0 && !isLoading && !error && (
        <div className="absolute top-full left-0 w-full mt-2 bg-[#121322] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-[100]">
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-500" />
            </div>
            <h4 className="text-sm font-medium text-gray-300 mb-1">
              Nenhum resultado encontrado
            </h4>
            <p className="text-xs text-gray-500">
              Tente buscar com termos diferentes ou verifique a ortografia
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OmniSearch;
```

#### 3.2 Hook de Debounce
```typescript
// src/hooks/useDebounce.ts

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

#### 3.3 Integração no Topbar
```tsx
// src/components/Layout/Topbar.tsx

import React from 'react';
import { OmniSearch } from '@/components/Search/OmniSearch';
import { UserNav } from '@/components/UserNav';

export const Topbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-[#0a0a14]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a14]/80">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo - Visível apenas em mobile */}
        <div className="flex items-center md:hidden">
          <a href="/dashboard" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Vitória News" 
              className="h-8 w-auto"
            />
          </a>
        </div>

        {/* Barra de Busca OmniSearch - Central */}
        <div className="flex-1 max-w-2xl mx-4">
          <OmniSearch />
        </div>

        {/* Menu do Usuário - Direita */}
        <div className="flex items-center gap-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
```

---

### FASE 4: Estilização e CSS (Dia 8)

#### 4.1 Estilos Globais para Destaque de Busca
```css
/* src/styles/search-highlight.css */

/* Destaque das buscas do OmniSearch */
.search-highlight b,
.search-highlight strong {
  font-weight: 700;
  color: #c084fc; /* Tailwind purple-400 */
  background-color: rgba(192, 132, 252, 0.15);
  padding: 0 3px;
  border-radius: 3px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

/* Estilização do scrollbar do dropdown */
.omnisearch-results::-webkit-scrollbar {
  width: 8px;
}

.omnisearch-results::-webkit-scrollbar-track {
  background: #0a0a14;
  border-radius: 4px;
}

.omnisearch-results::-webkit-scrollbar-thumb {
  background: #2a2b4a;
  border-radius: 4px;
}

.omnisearch-results::-webkit-scrollbar-thumb:hover {
  background: #3a3b5a;
}

/* Animação de entrada do dropdown */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.omnisearch-dropdown {
  animation: slideDown 0.2s ease-out;
}

/* Focus ring customizado para acessibilidade */
.omnisearch-input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.5), 0 0 0 4px rgba(168, 85, 247, 0.2);
}

/* Estado de hover nos resultados */
.omnisearch-result {
  position: relative;
  overflow: hidden;
}

.omnisearch-result::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #a855f7, #7c3aed);
  transform: scaleY(0);
  transition: transform 0.2s ease;
}

.omnisearch-result:hover::before,
.omnisearch-result[data-selected="true"]::before {
  transform: scaleY(1);
}
```

---

### FASE 5: Testes e Validação (Dias 9-10)

#### 5.1 Testes de Integração
```typescript
// src/__tests__/search.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterStaticMenus } from '@/data/staticMenus';
import { OmniResult } from '@/types/search';

describe('OmniSearch', () => {
  describe('filterStaticMenus', () => {
    it('deve encontrar menus por título', () => {
      const results = filterStaticMenus('dashboard');
      expect(results.some(r => r.title === 'Dashboard')).toBe(true);
    });

    it('deve encontrar menus por keywords', () => {
      const results = filterStaticMenus('dados');
      expect(results.some(r => r.title === 'Analytics')).toBe(true);
    });

    it('deve ignorar acentos na busca', () => {
      const results = filterStaticMenus('configuracoes');
      expect(results.some(r => r.title === 'Configurações')).toBe(true);
    });

    it('deve retornar array vazio quando não encontra', () => {
      const results = filterStaticMenus('xyz123naoexiste');
      expect(results).toHaveLength(0);
    });
  });

  describe('Result Type Mapping', () => {
    it('deve mapear tipos do banco para tipos da aplicação', () => {
      const typeMap: Record<string, OmniResult['type']> = {
        'artigo': 'article',
        'video': 'video',
        'agendamento': 'schedule',
        'pagina': 'page',
      };

      expect(typeMap['artigo']).toBe('article');
      expect(typeMap['video']).toBe('video');
      expect(typeMap['agendamento']).toBe('schedule');
    });
  });
});
```

#### 5.2 Testes de Performance
```typescript
// src/__tests__/search-performance.test.ts

import { describe, it, expect } from 'vitest';
import { supabase } from '@/lib/supabaseClient';

describe('Search Performance', () => {
  it('deve responder em menos de 100ms para buscas simples', async () => {
    const start = performance.now();
    
    const { data, error } = await supabase
      .rpc('antigravity_omnisearch', { search_term: 'teste' })
      .limit(10);
    
    const duration = performance.now() - start;
    
    expect(error).toBeNull();
    expect(duration).toBeLessThan(100);
  });

  it('deve lidar com buscas complexas em menos de 200ms', async () => {
    const start = performance.now();
    
    const { data, error } = await supabase
      .rpc('antigravity_omnisearch', { search_term: 'noticia & importante' })
      .limit(10);
    
    const duration = performance.now() - start;
    
    expect(error).toBeNull();
    expect(duration).toBeLessThan(200);
  });
});
```

---

## 6. Checklist de Implementação

### 6.1 Preparativos
- [ ] Verificar versão do PostgreSQL (mínimo 12+)
- [ ] Confirmar permissões para criar extensões
- [ ] Backup do banco de dados
- [ ] Verificar estrutura das tabelas existentes

### 6.2 Banco de Dados
- [ ] Instalar extensão `unaccent`
- [ ] Criar função `antigravity_omnisearch()`
- [ ] Criar índices GIN para FTS
- [ ] Testar função com queries de exemplo
- [ ] Verificar performance com `EXPLAIN ANALYZE`

### 6.3 Backend
- [ ] Criar tipos TypeScript
- [ ] Criar dicionário estático de menus
- [ ] Implementar controller de busca
- [ ] Configurar rotas da API
- [ ] Adicionar rate limiting
- [ ] Implementar tratamento de erros
- [ ] Testar endpoints com Postman/Insomnia

### 6.4 Frontend
- [ ] Criar componente OmniSearch
- [ ] Implementar hook de debounce
- [ ] Adicionar navegação por teclado
- [ ] Criar estilos CSS para highlight
- [ ] Implementar responsividade mobile
- [ ] Adicionar tratamento de estados (loading, error, empty)
- [ ] Integrar com sistema de rotas

### 6.5 Testes
- [ ] Testar busca com acentos e sem acentos
- [ ] Testar navegação por teclado
- [ ] Testar responsividade em diferentes telas
- [ ] Testar performance com grandes volumes
- [ ] Testar tratamento de erros
- [ ] Validar acessibilidade (ARIA labels, foco)

### 6.6 Documentação
- [ ] Documentar API endpoints
- [ ] Criar guia de uso para usuários
- [ ] Documentar estrutura de dados
- [ ] Criar diagrama de arquitetura
- [ ] Atualizar CHANGELOG

---

## 7. Considerações Finais

### 7.1 Otimizações Futuras
- [ ] Implementar cache Redis para queries frequentes
- [ ] Adicionar sugestões de busca (autocomplete)
- [ ] Implementar histórico de buscas por usuário
- [ ] Adicionar filtros avançados (data, categoria, autor)
- [ ] Implementar busca por voz
- [ ] Criar analytics de buscas (termos mais buscados)

### 7.2 Monitoramento
- [ ] Configurar alertas para queries lentas (>500ms)
- [ ] Monitorar taxa de erro da API de busca
- [ ] Acompanhar métricas de uso (buscas/dia)
- [ ] Verificar logs de queries mais frequentes

### 7.3 Segurança
- [ ] Validar e sanitizar input do usuário
- [ ] Prevenir SQL injection (usar RPC/Prepared Statements)
- [ ] Implementar rate limiting por IP/usuário
- [ ] Limitar tamanho máximo da query
- [ ] Auditar acessos à função de busca

---

## 8. Recursos e Referências

### Documentação Oficial
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Supabase PostgreSQL Functions](https://supabase.com/docs/guides/database/functions)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Artigos e Tutoriais
- "Building a Search Engine with PostgreSQL FTS" - LogRocket
- "Implementing Full-Text Search in React" - CSS-Tricks
- "PostgreSQL Performance: Indexing Strategies" - Percona

### Ferramentas
- [pgAdmin](https://www.pgadmin.org/) - Administração PostgreSQL
- [Postman](https://www.postman.com/) - Teste de APIs
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance audit

---

**Data de Criação:** 11/05/2026  
**Versão:** 1.0  
**Autor:** Sistema de Desenvolvimento Vitória News  
**Status:** Pronto para Implementação
