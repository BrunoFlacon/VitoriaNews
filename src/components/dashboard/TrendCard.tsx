import { TrendingUp, Activity, BarChart3 } from "lucide-react";
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

  return (
    <Card className="bg-card/50 border-white/5 hover:bg-card/80 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity z-0">
        <TrendingUp className="w-12 h-12" />
      </div>
      
      {/* News Thumbnail Enrichment */}
      {(trend as any).thumbnail_url && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img 
            src={(trend as any).thumbnail_url} 
            alt="" 
            className="w-full h-full object-cover opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-500 scale-110 group-hover:scale-100" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>
      )}

      <CardHeader className="pb-2 relative z-10">
        <div className="flex justify-between items-start">
          <Badge className={getSentimentColor(trend.sentiment)}>
            {trend.sentiment || 'Neuro'}
          </Badge>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] font-black uppercase text-primary tracking-tighter bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
              {(trend as any).source || 'Radar'}
            </span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">
              {trend.detected_at ? (
                <>
                  {new Date(trend.detected_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {new Date(trend.detected_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </>
              ) : (
                'Data ignorada'
              )}
            </span>
          </div>
        </div>
        <CardTitle className="text-base font-black mt-3 group-hover:text-primary transition-colors leading-tight line-clamp-2">
          {trend.keyword || 'Desconhecido'}
        </CardTitle>
        {(trend as any).description && (
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 opacity-60 group-hover:opacity-100 transition-opacity">
            {(trend as any).description}
          </p>
        )}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Menções</span>
            <span className="text-xl font-black text-white">{(trend.mentions || 0).toLocaleString()}</span>
          </div>
          <div className="h-8 w-[1px] bg-white/5" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Impacto</span>
            <div className="flex items-center gap-1">
              <span className="text-xl font-black text-primary">{((trend.velocity || 0) * 10).toFixed(0)}%</span>
              <BarChart3 className="w-3 h-3 text-primary" />
            </div>
          </div>
        </div>
        
        {(trend as any).url && (
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
            <a 
              href={(trend as any).url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[9px] font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1"
            >
              Ver Fonte Completa <TrendingUp className="w-3 h-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
