import React from "react";
import { 
  Clock, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageCircle, 
  Check, 
  Activity 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getPlatformDetails, socialPlatforms } from "@/components/icons/platform-metadata";

interface AnalyticsDetailedReportsProps {
  bestTimes: any[];
  bestTimesFilter: string;
  setBestTimesFilter: (val: string) => void;
  filteredTopContent: any[];
  topContentFilter: string;
  setTopContentFilter: (val: string) => void;
  messageStats?: any;
  audienceBreakdown?: any[];
}

export const AnalyticsDetailedReports = ({
  bestTimes,
  bestTimesFilter,
  setBestTimesFilter,
  filteredTopContent,
  topContentFilter,
  setTopContentFilter,
  messageStats,
  audienceBreakdown
}: AnalyticsDetailedReportsProps) => {
  
  const dayOrder: Record<string, number> = {
    'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2,
    'Quarta-feira': 3, 'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6,
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
  };

  const currentBestTimes = bestTimesFilter === 'all' 
    ? (bestTimes || [])
    : (bestTimes || []).filter(bt => bt.platform === bestTimesFilter);

  const sortedBestTimes = [...currentBestTimes].sort((a, b) => (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99)).slice(0, 7);

  const displayContent = filteredTopContent.filter((item: any) => 
    topContentFilter === 'all' || (item.platforms || item.allPlatforms || []).includes(topContentFilter)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MELHORES HORARIOS */}
        <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              Melhores Horários
            </h3>
            <Select value={bestTimesFilter} onValueChange={setBestTimesFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/30 border-border">
                <SelectValue placeholder="Rede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {socialPlatforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 flex-1">
            {sortedBestTimes.length > 0 ? sortedBestTimes.map((bt: any, i: number) => {
              const pd = bt.platform ? getPlatformDetails(bt.platform) : null;
              const PIcon = pd?.icon || Activity;
              return (
                <div key={bt.day + bt.time} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-sm relative">
                      {i + 1}
                      {pd && (
                        <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-lg border-2 border-card", pd.color)}>
                           <PIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-white text-sm">{bt.day}</h4>
                      <p className="text-xs text-muted-foreground">{bt.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">{bt.engagement}</p>
                    <p className="text-[10px] text-muted-foreground">Índice Eng.</p>
                  </div>
                </div>
              );
            }) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center py-10 px-4 bg-muted/10 rounded-2xl border border-dashed border-border/60">
                <Clock className="w-8 h-8 text-purple-500/40 mb-2.5 animate-pulse" />
                <p className="font-semibold text-xs text-foreground mb-1">Sem métricas de horários capturadas</p>
                <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
                  Para analisar seus horários ideais de engajamento, sincronize suas contas na aba de configurações.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* MELHORES PUBLICACOES */}
        <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Top Performance
            </h3>
            <Select value={topContentFilter} onValueChange={setTopContentFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/30 border-border">
                <SelectValue placeholder="Rede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {socialPlatforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar flex-1">
            {displayContent.length > 0 ? displayContent.map((item: any) => (
              <div key={item.id} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    {item.platforms && item.platforms.map((p: string) => {
                      const pf = getPlatformDetails(p);
                      return <pf.icon key={p} className={cn("w-4 h-4", pf.textColor)} />;
                    })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : '--'}
                  </span>
                </div>
                
                <p className="text-sm text-white line-clamp-2 mb-3 leading-relaxed">{item.content}</p>
                
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{(item.views || 0).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{(item.engagement || 0).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center py-10 px-4 bg-muted/10 rounded-2xl border border-dashed border-border/60">
                <TrendingUp className="w-8 h-8 text-green-500/40 mb-2.5 animate-pulse" />
                <p className="font-semibold text-xs text-foreground mb-1">Nenhum post em destaque</p>
                <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
                  Quando seus conteúdos forem publicados e acumularem visualizações, seus principais posts aparecerão listados aqui.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* DISPAROS & ENTREGA */}
      <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
        <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2 mb-6">
          <MessageCircle className="w-4 h-4 text-blue-500" />
          Engine de Entrega (Massivo)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-muted/20 border border-border/50 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sucesso de Entrega</p>
                <p className="text-4xl font-bold text-green-400">
                  {messageStats?.successRate || 0}%
                </p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#22c55e"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={226}
                    strokeDashoffset={226 - (226 * (messageStats?.successRate || 0)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Confirmadas</p>
                <p className="text-2xl font-bold text-green-400">{(messageStats?.totalSent || 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Falhas</p>
                <p className="text-2xl font-bold text-red-500">{(messageStats?.totalFailed || 0).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold mb-4">Split por Plataforma</p>
            <div className="space-y-4">
              {messageStats?.platformStats && Object.entries(messageStats.platformStats).length > 0 ? (
                Object.entries(messageStats.platformStats).map(([platform, stats]: [string, any]) => {
                  const details = getPlatformDetails(platform);
                  const total = (messageStats.totalSent || 1);
                  const percent = Math.round(((stats.sent || 0) / total) * 100);
                  return (
                    <div key={platform} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold flex items-center gap-2">
                           <details.icon className={cn("w-3.5 h-3.5", details.textColor)} />
                           {details.name}
                        </span>
                        <span className="text-muted-foreground">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-500", details.color)} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                  Sem disparos registrados
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
