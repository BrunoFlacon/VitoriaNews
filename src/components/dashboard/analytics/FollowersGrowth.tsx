import React from "react";
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
  scrollContainer: (id: string, direction: 'left' | 'right') => void;
  onNavigate?: (tab: string, subtab?: string) => void;
}

export const FollowersGrowth = ({
  groupedFollowers,
  selectedProfileId,
  setSelectedProfileId,
  platformActiveProfile,
  setPlatformActiveProfile,
  scrollContainer,
  onNavigate
}: FollowersGrowthProps) => {
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
    <Card className="p-6 shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h3 className="font-display font-black text-xl text-foreground flex items-center gap-2 uppercase tracking-wider">
          <Users className="w-6 h-6 text-primary" />
          Crescimento de Seguidores
        </h3>
        <div className="flex items-center gap-4">
          {selectedProfileId && (
            <button 
              onClick={() => setSelectedProfileId(null)}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
            >
              Limpar Filtro
            </button>
          )}
          <div className="flex gap-1 border-l border-white/10 pl-4">
            <button onClick={() => scrollContainer('follower-scroll', 'left')} className="p-2 rounded-lg hover:bg-white/10 border border-white/10 transition-all">
              <ChevronLeft className="w-4 h-4 text-primary" />
            </button>
            <button onClick={() => scrollContainer('follower-scroll', 'right')} className="p-2 rounded-lg hover:bg-white/10 border border-white/10 transition-all">
              <ChevronRight className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </div>
      
      <div id="follower-scroll" className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x smooth-scroll">
        {sortedPlatforms.map((platformInfo) => {
          const PlatformIcon = platformInfo.icon;
          const group = groupedFollowers?.find((g: any) => g.platform === platformInfo.id);
          const isConnected = !!group && group.profiles && group.profiles.length > 0;
          
          if (!isConnected) {
            return (
              <div key={platformInfo.id} className="w-[300px] shrink-0 snap-center bg-white/5 rounded-2xl p-6 border border-white/5 opacity-40 grayscale flex flex-col justify-between min-h-[160px]">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${platformInfo.color}`}>
                      <PlatformIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight line-through opacity-50">{platformInfo.name}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Inativo</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate?.('settings', 'api')} 
                  className="w-full mt-6 py-2 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
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
            <div key={group.platform} className="w-[300px] shrink-0 snap-center bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-primary/40 transition-all group relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-xl ${platformInfo.color} group-hover:scale-110 transition-transform`}>
                      <PlatformIcon className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <h4 className="font-black text-sm uppercase tracking-tight">{platformInfo.name}</h4>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.profiles.length} perfil(is)</p>
                   </div>
                 </div>
                 {renderTrend(displayedProfile?.growth || group.profiles[0]?.growth || "0")}
               </div>
               
               <p className="text-4xl font-black font-display tracking-tighter text-foreground mb-1">
                  {(totalCount || 0).toLocaleString()}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {platformInfo.id === 'youtube' ? "inscritos" : "seguidores"} {displayedProfile ? "no perfil" : "totais"}
                </p>

               <div className="mt-6 pt-6 border-t border-white/5">
                 {group.profiles.length > 1 ? (
                   <Select 
                     value={activeProfile || "all"} 
                     onValueChange={(val) => {
                       setPlatformActiveProfile(prev => ({ ...prev, [group.platform]: val === "all" ? "" : val }));
                       if (val !== "all") setSelectedProfileId(val);
                       else setSelectedProfileId(null);
                     }}
                   >
                     <SelectTrigger className="h-9 text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10">
                       <SelectValue placeholder="Selecionar perfil" />
                     </SelectTrigger>
                     <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                        <SelectItem value="all">Visão Consolidada</SelectItem>
                        {group.profiles.map((prof: any, pIdx: number) => {
                          const pId = `${prof.platform}-${prof.username || prof.platform_user_id}`;
                          return (
                            <SelectItem key={pIdx} value={pId}>
                              @{prof.username || 'Perfil'}
                            </SelectItem>
                          );
                        })}
                     </SelectContent>
                   </Select>
                 ) : (
                   <div className="flex items-center gap-3">
                      {group.profiles[0]?.profileImage ? (
                         <SafeImage src={group.profiles[0].profileImage} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black">@</div>
                     )}
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-60 truncate">@{group.profiles[0]?.username}</span>
                   </div>
                 )}
               </div>

               {displayedProfile && (
                 <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2"
                 >
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                       <span className="text-muted-foreground">Posts Totais</span>
                       <span className="text-foreground">{(displayedProfile.postsCount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                       <span className="text-muted-foreground">Engajamento Médio</span>
                       <span className="text-primary">{(displayedProfile.avgEngagement || 0).toFixed(1)}%</span>
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
