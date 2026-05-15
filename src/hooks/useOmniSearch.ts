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
    debounceMs = 400,
    minQueryLength = 3,
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

    if (!searchQuery || searchQuery.trim().length < minQueryLength) {
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
        setIsOpen(true); // Manter aberto para mostrar "Sem resultados"
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
    setDuration(0);
  }, []);

  const refresh = useCallback(() => {
    performSearch(query);
  }, [performSearch, query]);

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
