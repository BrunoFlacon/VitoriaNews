import React from "react";
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
  scrollContainer: (id: string, direction: 'left' | 'right') => void;
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
  scrollContainer,
  onNavigate
}: AudienceTrackingProps) => {
  if (!audienceBreakdown || audienceBreakdown.length === 0) return null;

  const allChannels = audienceBreakdown.flatMap(b => b.channels || []);
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
    <Card className="p-6 shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl mb-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="font-display font-black text-xl text-foreground flex items-center gap-2 uppercase tracking-wider">
            <Users2 className="w-6 h-6 text-primary" />
            Tracking Real-Time
          </h3>
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
              Monitoramento de presença e retenção de membros em canais e grupos sincronizados.
            </p>
            <div className="flex flex-wrap gap-4 mt-1">
              {lastUpdated && (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-primary/60 uppercase tracking-widest">
                   <RefreshCw className="w-3 h-3" />
                   Sinc: {new Date(lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {globalPeakHour && (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                   <Clock className="w-3 h-3" />
                   Pico: {globalPeakHour}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 self-end xl:self-auto">
          <div className="flex flex-wrap justify-end gap-2 shrink">
             <Select value={audienceNetworkInfo} onValueChange={setAudienceNetworkInfo}>
               <SelectTrigger className="w-[120px] h-8 text-[10px] font-black uppercase tracking-wider bg-white/5 border-white/10 shrink-0">
                 <SelectValue placeholder="Rede" />
               </SelectTrigger>
               <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                 <SelectItem value="all">Todas</SelectItem>
                 <SelectItem value="telegram">Telegram</SelectItem>
                 <SelectItem value="whatsapp">WhatsApp</SelectItem>
               </SelectContent>
             </Select>
             <Select value={audienceTypeInfo} onValueChange={setAudienceTypeInfo}>
               <SelectTrigger className="w-[120px] h-8 text-[10px] font-black uppercase tracking-wider bg-white/5 border-white/10 shrink-0">
                 <SelectValue placeholder="Tipo" />
               </SelectTrigger>
               <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                 <SelectItem value="all">Todos</SelectItem>
                 <SelectItem value="channel">Canal</SelectItem>
                 <SelectItem value="supergroup">Grupo</SelectItem>
               </SelectContent>
             </Select>
             <Select value={audienceOnlineInfo} onValueChange={setAudienceOnlineInfo}>
               <SelectTrigger className="w-[120px] h-8 text-[10px] font-black uppercase tracking-wider bg-white/5 border-white/10 shrink-0">
                 <SelectValue placeholder="Status" />
               </SelectTrigger>
               <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                 <SelectItem value="all">Qualquer</SelectItem>
                 <SelectItem value="online">Online</SelectItem>
               </SelectContent>
             </Select>
          </div>
           
          <div className="flex gap-1 border-l border-white/10 pl-3 shrink-0">
            <button onClick={() => scrollContainer('audience-scroll', 'left')} className="p-2 rounded-lg hover:bg-white/10 border border-white/10 transition-all">
              <ChevronLeft className="w-4 h-4 text-primary" />
            </button>
            <button onClick={() => scrollContainer('audience-scroll', 'right')} className="p-2 rounded-lg hover:bg-white/10 border border-white/10 transition-all">
              <ChevronRight className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </div>
      
      <div id="audience-scroll" className="flex flex-row flex-nowrap gap-6 overflow-x-auto scrollbar-hide pr-2 pb-6 snap-x smooth-scroll">
        {filtered.length === 0 ? (
          <div className="w-full text-center py-20 text-[10px] font-black uppercase tracking-[0.2em] opacity-30">
            Nenhum chat detectado com os filtros atuais
          </div>
        ) : (
          filtered.map((origCh, idx) => {
            const ch = origCh as any;
            const dispName = ch.channel_name || ch.page_name || ch.username || 'Chat Live';
            return (
              <div key={idx} className="min-w-[300px] w-[300px] shrink-0 snap-center bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5 flex flex-col hover:border-primary/40 transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {ch.profile_picture ? (
                        <SafeImage src={ch.profile_picture} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-xl" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl border border-primary/20">
                          {(dispName)[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0f172a] shadow-lg",
                        ch.online_count > 0 ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                      )} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-foreground line-clamp-1 uppercase tracking-tight">{dispName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/80 bg-primary/10 px-2 py-0.5 rounded">
                          {ch.platform}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                          {ch.channel_type === 'supergroup' ? 'Grupo' : ch.channel_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Membros</p>
                    <p className="text-2xl font-black font-display text-foreground tracking-tighter">
                      {ch.members_count?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ativos</p>
                    <p className={cn(
                      "text-2xl font-black font-display tracking-tighter",
                      ch.online_count > 0 ? "text-green-400" : "text-muted-foreground/50"
                    )}>
                      {ch.online_count > 0 ? ch.online_count.toLocaleString() : '0'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <Clock className="w-3 h-3 text-primary/50" />
                      <span className="opacity-60">Atividade:</span> 
                      <span className="text-foreground">
                        {ch.members_count > 0 ? `${Math.round((ch.online_count / ch.members_count) * 100)}%` : "0%"}
                      </span>
                   </div>
                   <button 
                     onClick={() => onNavigate?.('messaging')} 
                     className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-foreground hover:bg-primary px-3 py-1.5 rounded-lg transition-all"
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
