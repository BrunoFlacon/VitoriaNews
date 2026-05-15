import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Video, Calendar, LayoutDashboard, Zap, ExternalLink, MessageCircle, Newspaper, Share2, Settings, Bell, Bot, Activity, File, Search, Users } from 'lucide-react';
import { OmniResult, OmniResultType } from '@/types/omnisearch';
import { socialPlatforms } from '@/components/icons/platform-metadata';

interface SearchResultsProps {
  results: OmniResult[];
  query: string;
  isLoading: boolean;
  duration: number;
  onClose: () => void;
}

export function SearchResults({ results, query, isLoading, duration, onClose }: SearchResultsProps) {
  if (isLoading) {
    return null; 
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-[100] max-h-[70vh] flex flex-col"
    >
      <div className="overflow-y-auto overscroll-contain flex-1 p-2">
        {results.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>Nenhum resultado encontrado para "{query}"</p>
            <p className="text-xs mt-2 opacity-70">Tente buscar por menus, artigos, ou vídeos.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {results.map((result, index) => (
              <SearchResultItem 
                key={result.id || index} 
                result={result} 
                onClose={onClose} 
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer do Dropdown */}
      <div className="bg-muted/30 border-t border-border px-4 py-2 text-xs text-muted-foreground flex justify-between items-center">
        <span>{results.length} resultados</span>
        {duration > 0 && <span>{duration}ms</span>}
      </div>
    </motion.div>
  );
}

interface SearchResultItemProps {
  result: OmniResult;
  onClose: () => void;
}

function SearchResultItem({ result, onClose }: SearchResultItemProps) {
  const navigate = useNavigate();

  const getIcon = (type: OmniResultType, title: string) => {
    const lowerTitle = title.toLowerCase();
    
    // 1. Tentar encontrar ícone por plataforma (usando platform-metadata)
    const platform = socialPlatforms.find(p => 
      lowerTitle.includes(p.id) || 
      lowerTitle.includes(p.name.toLowerCase())
    );

    if (platform) {
      return <platform.icon className="w-5 h-5" />;
    }

    // 2. Fallback para tipos de conteúdo e menus do sistema
    switch (type as any) {
      case 'article': return <FileText className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'schedule': return <Calendar className="w-4 h-4" />;
      case 'menu': {
        if (lowerTitle.includes('mensagens')) return <MessageCircle className="w-4 h-4" />;
        if (lowerTitle.includes('notícias')) return <Newspaper className="w-4 h-4" />;
        if (lowerTitle.includes('redes')) return <Share2 className="w-4 h-4" />;
        if (lowerTitle.includes('config')) return <Settings className="w-4 h-4" />;
        if (lowerTitle.includes('notific')) return <Bell className="w-4 h-4" />;
        if (lowerTitle.includes('bot')) return <Bot className="w-4 h-4" />;
        if (lowerTitle.includes('radar') || lowerTitle.includes('tendência')) return <Activity className="w-4 h-4" />;
        if (lowerTitle.includes('público') || lowerTitle.includes('seguidor')) return <Users className="w-4 h-4" />;
        if (lowerTitle.includes('segurança')) return <Settings className="w-4 h-4" />;
        if (lowerTitle.includes('seo')) return <Search className="w-4 h-4" />;
        return <LayoutDashboard className="w-4 h-4" />;
      }
      case 'action': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'page': {
        if (lowerTitle.includes('documento') || lowerTitle.includes('arquivo')) return <File className="w-4 h-4" />;
        return <ExternalLink className="w-4 h-4" />;
      }
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    // Use navigate do react-router para mudar o search param
    navigate(result.link);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group"
    >
      {/* Thumbnail ou Ícone */}
      <div className="mt-0.5 shrink-0">
        {result.thumbnail ? (
          <img 
            src={result.thumbnail} 
            alt="" 
            className="w-10 h-10 object-cover rounded-md border border-border"
          />
        ) : (
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground border border-border group-hover:bg-background transition-colors">
            {getIcon(result.type, result.title)}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 
            className="text-sm font-medium text-foreground truncate"
            dangerouslySetInnerHTML={{ __html: result.title }}
          />
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
            {result.categoryLabel}
          </span>
        </div>
        
        {result.highlightedText && (
          <p 
            className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed search-highlight"
            dangerouslySetInnerHTML={{ __html: result.highlightedText }}
          />
        )}
      </div>
    </div>
  );
}
