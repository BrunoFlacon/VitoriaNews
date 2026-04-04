import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TrendItem } from "@/hooks/useTrends";
import { 
  ExternalLink, 
  Plus, 
  TrendingUp, 
  Globe, 
  PlayCircle,
  Image as ImageIcon,
  Twitter,
  Instagram,
  Youtube,
  Linkedin as LinkedIn
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrendDetailDrawerProps {
  trend: TrendItem | null;
  isOpen: boolean;
  onClose: () => void;
  onProduce: (trend: TrendItem) => void;
}

// Gera a URL correta de busca para cada rede social
function getSocialUrl(trend: TrendItem): string {
  const kw = trend.keyword || '';
  const clean = kw.replace(/^#/, '').replace(/\s+/g, '');
  const encoded = encodeURIComponent(kw);
  const encodedClean = encodeURIComponent(clean);

  const src = trend.source || '';

  // URL já válida (notícia real do G1, NewsAPI, etc)
  if (trend.url && trend.url.startsWith('http') &&
      !trend.url.includes('google.com/search') &&
      !trend.url.includes('trends.google.com')) {
    return trend.url;
  }

  // Rede social: gera URL de busca da plataforma
  if (src.includes('Twitter') || src.includes('X /')) return `https://twitter.com/search?q=${encoded}&src=trend_click`;
  if (src.includes('Instagram'))  return `https://www.instagram.com/explore/tags/${encodedClean}/`;
  if (src.includes('TikTok'))     return `https://www.tiktok.com/tag/${encodedClean}`;
  if (src.includes('Facebook'))   return `https://www.facebook.com/search/top?q=${encoded}`;
  if (src.includes('Threads'))    return `https://www.threads.net/search?q=${encoded}`;
  if (src.includes('YouTube'))    return `https://www.youtube.com/results?search_query=${encoded}`;
  if (src.includes('LinkedIn'))   return `https://www.linkedin.com/search/results/content/?keywords=${encoded}`;
  if (src.includes('Pinterest'))  return `https://www.pinterest.com/search/pins/?q=${encoded}`;
  if (src.includes('WhatsApp'))   return `https://api.whatsapp.com/send?text=${encoded}`;

  // Fallback: busca Google
  return `https://www.google.com/search?q=${encoded}`;
}

function getSourceLabel(source: string): string {
  const map: Record<string, string> = {
    'G1': 'G1 Globo',
    'NewsAPI': 'Top Headlines',
    'Google Trends': 'Google Trends Brasil',
    'X / Twitter': 'Buscar no X (Twitter)',
    'Instagram': 'Ver no Instagram',
    'TikTok': 'Ver no TikTok',
    'Facebook': 'Buscar no Facebook',
    'Threads': 'Ver no Threads',
    'YouTube': 'Buscar no YouTube',
    'LinkedIn': 'Ver no LinkedIn',
    'Pinterest': 'Ver no Pinterest',
    'WhatsApp': 'Compartilhar no WhatsApp',
  };
  return map[source] || 'Ver na Fonte';
}

function getPublishedAt(trend: TrendItem): string {
  const pub = trend.metadata?.published_at;
  if (pub) {
    const d = new Date(pub);
    return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return new Date(trend.detected_at).toLocaleDateString('pt-BR');
}

const SVG_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%230d0d0d'/%3E%3Ctext x='400' y='300' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='28' font-weight='bold' fill='%23333'%3ESem capa disponível%3C/text%3E%3C/svg%3E`;

export const TrendDetailDrawer = ({ trend, isOpen, onClose, onProduce }: TrendDetailDrawerProps) => {
  if (!trend) return null;

  const finalUrl = getSocialUrl(trend);
  const btnLabel = getSourceLabel(trend.source);
  const pubDate  = getPublishedAt(trend);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl bg-[#0a0a0a] border-white/10 text-white overflow-y-auto custom-scrollbar shadow-2xl">
        <SheetHeader className="space-y-4 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-primary/10 text-primary border-primary/20">
              {trend.source}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-white/5 border-white/10">
              {trend.category}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-bold bg-white/5 border-white/10 capitalize">
              {pubDate}
            </Badge>
          </div>
          <SheetTitle className="text-2xl font-black font-display tracking-tight leading-tight text-white">
            {trend.keyword}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-sm leading-relaxed">
            {trend.description || `Tendência identificada pelo radar de inteligência artificial em tempo real na plataforma ${trend.source}.`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* CAPA MULTIMÍDIA */}
          <div className="relative group rounded-2xl overflow-hidden border border-white/10 aspect-video bg-white/5">
            <img
              src={trend.thumbnail_url || SVG_FALLBACK}
              alt={trend.keyword}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                if (!t.dataset.fallback) { t.dataset.fallback = 'true'; t.src = SVG_FALLBACK; }
              }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              {trend.category === 'Vídeo' ? <PlayCircle className="w-4 h-4 text-primary" /> : <ImageIcon className="w-4 h-4 text-primary" />}
              <span className="text-[10px] font-bold uppercase tracking-wider">{trend.source}</span>
            </div>
          </div>

          {/* MÉTRICAS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Impacto (Score)</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-primary">{Math.floor(trend.score)}%</span>
                <TrendingUp className="w-4 h-4 text-green-500 mb-1" />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Fonte</p>
              <div className="flex items-end gap-2">
                <span className="text-lg font-black text-white leading-tight">{trend.source}</span>
              </div>
            </div>
          </div>

          {/* AÇÕES */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest ml-1">Ações</h4>
            <Button
              onClick={() => onProduce(trend)}
              className="w-full py-6 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Criar este Conteúdo Agora
            </Button>

            {/* Botão principal: abre o link real sem redirecionamento */}
            <a
              href={finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                window.open(finalUrl, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center justify-center w-full gap-2 py-4 px-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              {btnLabel}
            </a>

            {/* Busca cruzada nas redes sociais */}
            {trend.source !== 'X / Twitter' && trend.source !== 'Instagram' && trend.source !== 'TikTok' && (
              <div className="grid grid-cols-3 gap-2">
                <a href={`https://twitter.com/search?q=${encodeURIComponent(trend.keyword)}&src=trend_click`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs transition-all">
                  <Twitter className="w-3.5 h-3.5" /> X
                </a>
                <a href={`https://www.instagram.com/explore/tags/${encodeURIComponent(trend.keyword.replace(/\s+/g, '').replace(/^#/, ''))}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs transition-all">
                  <Instagram className="w-3.5 h-3.5" /> Insta
                </a>
                <a href={`https://www.tiktok.com/tag/${encodeURIComponent(trend.keyword.replace(/\s+/g, '').replace(/^#/, ''))}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs transition-all">
                  🎵 TikTok
                </a>
              </div>
            )}
          </div>

          {/* DESCRIÇÃO CONTEXTUAL */}
          {trend.description && (
            <div className="space-y-3 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Contexto</h4>
                <Globe className="w-3 h-3 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {trend.description}
              </p>
            </div>
          )}
        </div>

        <SheetFooter className="mt-10 flex-row gap-2 sm:justify-start">
          <p className="text-[10px] text-muted-foreground/30 uppercase font-medium">Radar ID: {trend.id}</p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
