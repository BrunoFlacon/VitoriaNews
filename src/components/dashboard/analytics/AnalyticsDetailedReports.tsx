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
    'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6,
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
  };

  const currentBestTimes = bestTimesFilter === 'all' 
    ? (bestTimes || [])
    : (bestTimes || []).filter(bt => bt.platform === bestTimesFilter);

  const sortedBestTimes = [...currentBestTimes].sort((a, b) => (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99)).slice(0, 7);

  const displayContent = filteredTopContent.filter((item: any) => 
    topContentFilter === 'all' || (item.platforms || []).includes(topContentFilter)
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* MELHORES HORARIOS */}
        <Card className="p-8 shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-black text-xl text-foreground flex items-center gap-3 uppercase tracking-wider">
              <Clock className="w-6 h-6 text-purple-500" />
              Melhores Horários
            </h3>
            <Select value={bestTimesFilter} onValueChange={setBestTimesFilter}>
              <SelectTrigger className="w-[160px] h-9 text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10">
                <SelectValue placeholder="Rede" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                <SelectItem value="all">Todas</SelectItem>
                {socialPlatforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 flex-1">
            {sortedBestTimes.length > 0 ? sortedBestTimes.map((bt: any, i: number) => {
              const pd = bt.platform ? getPlatformDetails(bt.platform) : null;
              const PIcon = pd?.icon || Activity;
              return (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 font-black text-xl relative">
                      {i + 1}
                      {pd && (
                        <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center shadow-lg border-2 border-[#0f172a]", pd.color)}>
                           <PIcon className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight text-foreground">{bt.day}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{bt.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-400 tracking-tighter">{bt.engagement}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Índice Eng.</p>
                  </div>
                </div>
              );
            }) : (
              <div className="h-full flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] opacity-30 italic py-20">
                Sem métricas capturadas
              </div>
            )}
          </div>
        </Card>

        {/* MELHORES PUBLICACOES */}
        <Card className="p-8 shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-black text-xl text-foreground flex items-center gap-3 uppercase tracking-wider">
              <TrendingUp className="w-6 h-6 text-green-500" />
              Top Performance
            </h3>
            <Select value={topContentFilter} onValueChange={setTopContentFilter}>
              <SelectTrigger className="w-[160px] h-9 text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10">
                <SelectValue placeholder="Rede" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                <SelectItem value="all">Todas</SelectItem>
                {socialPlatforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar flex-1">
            {displayContent.length > 0 ? displayContent.map((item: any) => (
              <div key={item.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {item.platforms && item.platforms.map((p: string) => {
                      const pf = getPlatformDetails(p);
                      return <pf.icon key={p} className={cn("w-4 h-4", pf.textColor)} />;
                    })}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : '--'}
                  </span>
                </div>
                
                <p className="text-sm font-medium text-foreground line-clamp-2 mb-4 leading-relaxed">{item.content}</p>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs font-black tracking-tighter">{(item.views || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-400">
                    <Heart className="w-4 h-4" />
                    <span className="text-xs font-black tracking-tighter">{(item.engagement || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="h-full flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] opacity-30 py-20">
                Sem posts em destaque
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* DISPAROS & ENTREGA */}
      <Card className="p-8 shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl">
        <h3 className="font-display font-black text-xl text-foreground flex items-center gap-3 uppercase tracking-wider mb-8">
          <MessageCircle className="w-6 h-6 text-blue-500" />
          Engine de Entrega (Massivo)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Sucesso de Entrega</p>
                <p className="text-5xl font-black text-green-400 tracking-tighter">
                  {messageStats?.successRate || 0}%
                </p>
              </div>
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke="#22c55e"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={264}
                    strokeDashoffset={264 - (264 * (messageStats?.successRate || 0)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Confirmadas</p>
                <p className="text-3xl font-black text-green-400 tracking-tighter">{(messageStats?.totalSent || 0).toLocaleString()}</p>
              </div>
              <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Falhas</p>
                <p className="text-3xl font-black text-red-500 tracking-tighter">{(messageStats?.totalFailed || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Split por Plataforma</p>
            <div className="space-y-6">
              {messageStats?.platformStats && Object.entries(messageStats.platformStats).length > 0 ? (
                Object.entries(messageStats.platformStats).map(([platform, stats]: [string, any]) => {
                  const details = getPlatformDetails(platform);
                  const total = (messageStats.totalSent || 1);
                  const percent = Math.round((stats.sent / total) * 100);
                  return (
                    <div key={platform} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                           <details.icon className={cn("w-4 h-4", details.textColor)} />
                           {details.name}
                        </span>
                        <span className="text-xs font-black tracking-widest text-primary">{percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-700", details.color)} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-[10px] font-black uppercase tracking-[0.2em] opacity-30 italic">
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
