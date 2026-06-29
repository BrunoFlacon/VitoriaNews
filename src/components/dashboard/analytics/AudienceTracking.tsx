import React, { useRef } from "react";
import { 
  Users2, 
  RefreshCw, 
  Clock, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/lib/utils";

interface AudienceTrackingProps {
  audienceBreakdown: any[];
  lastUpdated?: string;
  globalPeakHour: string | null;
  audienceNetworkInfo: string;
  setAudienceNetworkInfo: (val: string) => void;
  audienceTypeInfo: string;
  setAudienceTypeInfo: (val: string) => void;
  audienceOnlineInfo: string;
  setAudienceOnlineInfo: (val: string) => void;
  searchQuery: string;
  onNavigate?: (tab: string) => void;
}

export const AudienceTracking = ({
  audienceBreakdown,
  lastUpdated,
  globalPeakHour,
  audienceNetworkInfo,
  setAudienceNetworkInfo,
  audienceTypeInfo,
  setAudienceTypeInfo,
  audienceOnlineInfo,
  setAudienceOnlineInfo,
  searchQuery,
  onNavigate
}: AudienceTrackingProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  if (!audienceBreakdown || audienceBreakdown.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-bold text-sm uppercase text-muted-foreground">Tracking Real-Time</h3>
        <div className="w-full text-center py-12 text-muted-foreground text-xs rounded-xl bg-card border border-border/50">
          Nenhum chat detectado. Conecte canais de mensageria para ver dados em tempo real.
        </div>
      </div>
    );
  }

  const allChannels = audienceBreakdown.flatMap(b => b.channels || []);
  const availablePlatforms = [...new Set(allChannels.map(ch => ch.platform).filter(Boolean))] as string[];
  const displayPlatformName = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

  const filtered = allChannels.filter(ch => {
    const checkAny = ch as any;
    const name = checkAny.channel_name || checkAny.page_name || checkAny.username || '';
    if (searchQuery && !(name).toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (audienceNetworkInfo !== 'all' && ch.platform !== audienceNetworkInfo) return false;
    if (audienceTypeInfo !== 'all' && ch.channel_type !== audienceTypeInfo) return false;
    if (audienceOnlineInfo === 'online' && !(ch.online_count > 0)) return false;
    return true;
  });

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow mb-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="font-display font-bold text-lg md:text-xl text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary" />
            Tracking Real-Time
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Monitoramento de presença e retenção de membros em canais e grupos sincronizados.</p>
          <div className="flex flex-wrap gap-4 mt-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                 <RefreshCw className="w-3 h-3" />
                 Sinc: {(() => { try { return new Date(lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })()}
              </span>
            )}
            {globalPeakHour && (
              <span className="text-xs text-indigo-400/70 flex items-center gap-1">
                 <Clock className="w-3 h-3" />
                 Pico: {globalPeakHour}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 self-end xl:self-auto">
          <div className="flex flex-wrap justify-end gap-2 shrink">
             <Select value={audienceNetworkInfo} onValueChange={setAudienceNetworkInfo}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/30 border-border shrink-0">
                  <SelectValue placeholder="Rede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {availablePlatforms.map(p => (
                    <SelectItem key={p} value={p}>{displayPlatformName(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
             <Select value={audienceTypeInfo} onValueChange={setAudienceTypeInfo}>
               <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/30 border-border shrink-0">
                 <SelectValue placeholder="Tipo" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos</SelectItem>
                 <SelectItem value="channel">Canal</SelectItem>
                 <SelectItem value="supergroup">Grupo</SelectItem>
               </SelectContent>
             </Select>
             <Select value={audienceOnlineInfo} onValueChange={setAudienceOnlineInfo}>
               <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/30 border-border shrink-0">
                 <SelectValue placeholder="Status" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Qualquer</SelectItem>
                 <SelectItem value="online">Online</SelectItem>
               </SelectContent>
             </Select>
          </div>
           
          <div className="flex gap-1 border-l border-border/50 pl-3 shrink-0">
            <button onClick={() => scroll('left')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
              <ChevronLeft className="w-4 h-4 text-primary" />
            </button>
            <button onClick={() => scroll('right')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
              <ChevronRight className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </div>
      
      <div ref={scrollRef} className="flex flex-row flex-nowrap gap-4 overflow-x-auto scrollbar-hide pr-2 pb-4 snap-x smooth-scroll">
        {filtered.length === 0 ? (
          <div className="w-full text-center py-12 text-muted-foreground text-xs">
            Nenhum chat detectado com os filtros atuais
          </div>
        ) : (
          filtered.map((origCh, idx) => {
            const ch = origCh as any;
            const dispName = ch.channel_name || ch.page_name || ch.username || 'Chat Live';
            return (
              <div key={origCh.id || idx} className="min-w-[280px] w-[280px] shrink-0 snap-center bg-card rounded-xl p-5 border border-border flex flex-col hover:border-primary/40 transition-colors group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {ch.profile_picture ? (
                        <SafeImage src={ch.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                          {(dispName)[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                        ch.online_count > 0 ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                      )} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white line-clamp-1">{dispName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          {ch.platform}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {ch.channel_type === 'supergroup' ? 'Grupo' : ch.channel_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto mb-4 p-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Membros</p>
                    <p className="text-xl font-bold text-white">
                      {ch.members_count?.toLocaleString('pt-BR') || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Ativos</p>
                    <p className={cn(
                      "text-xl font-bold",
                      ch.online_count > 0 ? "text-green-400" : "text-muted-foreground/50"
                    )}>
                      {ch.online_count > 0 ? ch.online_count.toLocaleString('pt-BR') : '0'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border/50 text-[10px]">
                   <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Atividade: <span className="text-white font-medium">{ch.members_count > 0 ? `${Math.round((ch.online_count / ch.members_count) * 100)}%` : "0%"}</span>
                   </div>
                   <button 
                     onClick={() => onNavigate?.('messaging')} 
                     className="text-primary font-bold hover:underline"
                   >
                     Inbox
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
