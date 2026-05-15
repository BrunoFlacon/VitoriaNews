import { TrendingUp, Activity, BarChart3, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PoliticalTrend } from "@/lib/social-sdk/types";

interface TrendCardProps {
  trend: PoliticalTrend;
}

export const TrendCard = ({ trend }: TrendCardProps) => {
  if (!trend) return null;

  const getSentimentColor = (sentiment: string | undefined) => {
    const s = (sentiment || 'mixed').toLowerCase();
    switch (s) {
      case 'positivo': 
      case 'positive': return 'text-green-500 bg-green-500/10';
      case 'negativo':
      case 'negative': return 'text-red-500 bg-red-500/10';
      default: return 'text-blue-500 bg-blue-500/10';
    }
  };

  const t = trend as any;
  const isNews = t.sub_source === 'NewsAPI' || t.source === 'News';

  const CardWrapper = t.url ? 'a' : 'div';
  const wrapperProps = t.url ? { href: t.url, target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <CardWrapper {...wrapperProps} className="block w-full h-full">
      <Card className="bg-card/50 border-white/5 hover:bg-card/80 transition-all group overflow-hidden relative h-full flex flex-col cursor-pointer">
        
        {/* Imagem em destaque para Notícias */}
        {t.thumbnail_url && isNews ? (
          <div className="relative w-full h-32 overflow-hidden border-b border-white/5">
            <img 
              src={t.thumbnail_url} 
              alt={trend.keyword} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
        ) : (
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity z-0">
            <TrendingUp className="w-12 h-12" />
          </div>
        )}

        {/* Fundo sutil para tendências não-notícias com imagem */}
        {t.thumbnail_url && !isNews && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img 
              src={t.thumbnail_url} 
              alt="" 
              className="w-full h-full object-cover opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-500 scale-110 group-hover:scale-100" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
          </div>
        )}

        <CardHeader className="pb-2 relative z-10 flex-1">
          <div className="flex justify-between items-start mb-2">
            <Badge className={getSentimentColor(trend.sentiment)}>
              {trend.sentiment || (isNews ? 'Notícia' : 'Neutro')}
            </Badge>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] font-black uppercase text-primary tracking-tighter bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                {t.source || 'Radar'}
              </span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">
                {trend.detected_at ? (
                  <>
                    {new Date(trend.detected_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {new Date(trend.detected_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </>
                ) : (
                  'Agora'
                )}
              </span>
            </div>
          </div>
          <CardTitle className="text-sm md:text-base font-black mt-1 group-hover:text-primary transition-colors leading-tight line-clamp-3">
            {trend.keyword || 'Desconhecido'}
          </CardTitle>
          {t.description && (
            <p className="text-[10px] md:text-xs text-muted-foreground mt-2 line-clamp-3 opacity-80 group-hover:opacity-100 transition-opacity">
              {t.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="relative z-10 mt-auto pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Alcance</span>
                <span className="text-sm font-black text-white">{(trend.mentions || Math.floor(Math.random() * 5000)).toLocaleString()}</span>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Relevância</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-primary">{t.score ? t.score : ((trend.velocity || 8) * 10).toFixed(0)}%</span>
                  <BarChart3 className="w-3 h-3 text-primary" />
                </div>
              </div>
            </div>
            {t.url && (
              <ExternalLink className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

