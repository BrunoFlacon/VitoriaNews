import React, { useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useOmniSearch } from '@/hooks/useOmniSearch';
import { SearchResults } from './SearchResults';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OmniSearchProps {
  isExpanded?: boolean;
  setIsExpanded?: (val: boolean) => void;
}

export function OmniSearch({ isExpanded, setIsExpanded }: OmniSearchProps) {
  const {
    query,
    results,
    isLoading,
    isOpen,
    setQuery,
    setIsOpen,
    clearSearch,
    duration
  } = useOmniSearch({ limit: 8 });

  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus no mobile quando expande
  useEffect(() => {
    if (isMobile && isExpanded && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isMobile, isExpanded]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (isMobile && setIsExpanded && !query) {
          setIsExpanded(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsOpen, isMobile, setIsExpanded, query]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        if (isMobile && setIsExpanded) setIsExpanded(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen, isMobile, setIsExpanded]);

  const handleClose = () => {
    clearSearch();
    if (isMobile && setIsExpanded) {
      setIsExpanded(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl z-50">
      <div className={cn(
        "relative flex items-center transition-all duration-300",
        isOpen && !isMobile ? "ring-2 ring-primary/20 rounded-xl" : ""
      )}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          placeholder="Pesquisar publicações, menus, agenda..."
          className="w-full h-10 md:h-12 pl-10 pr-10 bg-background md:bg-muted/30 border border-input md:border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />

        {isLoading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : query ? (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}

        {/* Botão fechar extra apenas para mobile quando está expandido (se aplicável ao layout do Header) */}
        {isMobile && isExpanded && !query && (
          <button
            onClick={handleClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Resultados Dropdown */}
      <AnimatePresence>
        {isOpen && (query.length >= 2 || results.length > 0) && (
          <SearchResults 
            results={results} 
            query={query} 
            isLoading={isLoading} 
            duration={duration} 
            onClose={handleClose} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
