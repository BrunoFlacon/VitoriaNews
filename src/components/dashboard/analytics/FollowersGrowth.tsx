import React, { useRef } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
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
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { cn } from "@/lib/utils";

interface FollowersGrowthProps {
  groupedFollowers: any[];
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  platformActiveProfile: Record<string, string>;
  setPlatformActiveProfile: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onNavigate?: (tab: string, subtab?: string) => void;
}

export const FollowersGrowth = ({
  groupedFollowers,
  selectedProfileId,
  setSelectedProfileId,
  platformActiveProfile,
  setPlatformActiveProfile,
  onNavigate
}: FollowersGrowthProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  };
  const renderTrend = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const isPositive = numValue > 0;
    return (
      <div className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
        isPositive ? "bg-green-500/10 text-green-400 border-green-500/10" : "bg-red-500/10 text-red-400 border-red-500/10"
      )}>
        {isPositive ? "+" : ""}{numValue}%
      </div>
    );
  };

  const sortedPlatforms = [...socialPlatforms].sort((a, b) => {
    const groupA = groupedFollowers?.find((g: any) => g.platform === a.id);
    const isConnA = !!groupA && groupA.profiles && groupA.profiles.length > 0;
    const groupB = groupedFollowers?.find((g: any) => g.platform === b.id);
    const isConnB = !!groupB && groupB.profiles && groupB.profiles.length > 0;
    if (isConnA && !isConnB) return -1;
    if (!isConnA && isConnB) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h3 className="font-display font-bold text-lg md:text-xl text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Crescimento de Seguidores
        </h3>
        <div className="flex items-center gap-4">
          {selectedProfileId && (
            <button 
              onClick={() => setSelectedProfileId(null)}
              className="text-xs text-primary hover:underline font-bold"
            >
              Limpar Filtro
            </button>
          )}
          <div className="flex gap-1 border-l border-border/50 pl-4">
            <button onClick={() => scroll('left')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
              <ChevronLeft className="w-4 h-4 text-primary" />
            </button>
            <button onClick={() => scroll('right')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
              <ChevronRight className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </div>
      
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x smooth-scroll">
        {sortedPlatforms.map((platformInfo) => {
          const PlatformIcon = platformInfo.icon;
          const group = groupedFollowers?.find((g: any) => g.platform === platformInfo.id);
          const isConnected = !!group && group.profiles && group.profiles.length > 0;
          
          if (!isConnected) {
            return (
              <div key={platformInfo.id} className="w-[280px] shrink-0 snap-center bg-card rounded-xl p-5 border border-border/40 transition-all opacity-60 grayscale-[0.5] flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${platformInfo.color}`}>
                      <PlatformIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white line-through opacity-50">{platformInfo.name}</h4>
                      <p className="text-[10px] text-muted-foreground">Inativo</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate?.('settings', 'api')} 
                  className="w-full mt-4 py-2 rounded-lg bg-muted/30 text-xs font-bold hover:bg-muted/50 transition-all"
                >
                  Configurar API
                </button>
              </div>
            );
          }

          const activeProfile = platformActiveProfile[group.platform];
          const displayedProfile = activeProfile 
            ? group.profiles.find((p: any) => `${p.platform}-${p.username || p.platform_user_id}` === activeProfile)
            : null;
          
          const totalCount = displayedProfile ? displayedProfile.currentFollowers : group.totalFollowers;

          return (
            <div key={group.platform} className="w-[280px] shrink-0 snap-center bg-card rounded-xl p-5 border border-border hover:border-primary/50 transition-all group overflow-hidden relative">
               <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${platformInfo.color}`}>
                      <PlatformIcon className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <h4 className="font-bold text-sm text-white">{platformInfo.name}</h4>
                     <p className="text-xs text-muted-foreground">{group.profiles.length} perfil(is)</p>
                   </div>
                 </div>
                 {renderTrend(displayedProfile?.growth || group.profiles[0]?.growth || "0")}
               </div>
               
               <p className="text-2xl font-bold text-white">
                  {(totalCount || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {platformInfo.id === 'youtube' ? "inscritos" : "seguidores"} {displayedProfile ? "no perfil" : "totais"}
                </p>

               <div className="mt-4 pt-4 border-t border-border">
                 {group.profiles.length > 1 ? (
                   <Select 
                     value={activeProfile || "all"} 
                     onValueChange={(val) => {
                       setPlatformActiveProfile(prev => ({ ...prev, [group.platform]: val === "all" ? "" : val }));
                       if (val !== "all") setSelectedProfileId(val);
                       else setSelectedProfileId(null);
                     }}
                   >
                     <SelectTrigger className="h-8 text-[10px] bg-muted/30 border-none">
                       <SelectValue placeholder="Selecionar perfil" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="all">Visão Consolidada</SelectItem>
                        {group.profiles.map((prof: any, pIdx: number) => {
                           const pId = `${prof.platform}-${prof.username || prof.platform_user_id}`;
                           const displayName = prof.page_name || prof.username || 'Perfil';
                           return (
                             <SelectItem key={pIdx} value={pId}>
                               {prof.page_name ? displayName : `@${displayName}`}
                             </SelectItem>
                           );
                         })}
                     </SelectContent>
                   </Select>
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                       {group.profiles[0]?.profileImage ? (
                           <SafeImage src={group.profiles[0].profileImage} alt="" className="w-4 h-4 rounded-full object-cover" fallbackLetter={(group.profiles[0]?.page_name || group.profiles[0]?.username || 'T')[0].toUpperCase()} />
                        ) : (
                         <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px]">{(group.profiles[0]?.page_name || group.profiles[0]?.username || 'T')[0].toUpperCase()}</div>
                      )}
                      <span className="truncate">{group.profiles[0]?.page_name ? group.profiles[0].page_name : `@${group.profiles[0]?.username || 'Perfil'}`}</span>
                    </div>
                  )}
               </div>

               {displayedProfile && (
                 <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10 space-y-1.5"
                 >
                    <div className="flex justify-between items-center text-[10px]">
                       <span className="text-muted-foreground">Posts Totais</span>
                       <span className="font-bold text-white">{(displayedProfile.postsCount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                       <span className="text-muted-foreground">Engajamento Médio</span>
                       <span className="font-bold text-primary">{(displayedProfile.avgEngagement || 0).toFixed(1)}%</span>
                    </div>
                 </motion.div>
               )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
