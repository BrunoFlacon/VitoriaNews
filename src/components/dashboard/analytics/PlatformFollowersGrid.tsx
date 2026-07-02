import React, { memo } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPlatformDetails } from "@/components/icons/platform-metadata";
import { ArrowUpRight, ArrowDownRight, Users } from "lucide-react";

interface PlatformFollowersGridProps {
  groupedFollowers?: any[];
  dataSource?: string;
}

export const PlatformFollowersGrid = memo(({ groupedFollowers = [], dataSource }: PlatformFollowersGridProps) => {
  const isDemo = dataSource === "demo" || groupedFollowers.length === 0;

  const platformsToDisplay = [
    { id: "facebook", name: "Facebook", defaultFollowers: 20020, defaultGrowth: 8.5 },
    { id: "instagram", name: "Instagram", defaultFollowers: 22277, defaultGrowth: 12.4 },
    { id: "linkedin", name: "LinkedIn", defaultFollowers: 0, defaultGrowth: 0 },
    { id: "telegram", name: "Telegram", defaultFollowers: 89, defaultGrowth: 4.8 },
  ];

  return (
    <Card className="p-5 shadow-xl border border-border/50 bg-card hover:shadow-2xl transition-all">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Crescimento de Seguidores por Canal
        </h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {platformsToDisplay.map((p) => {
          const details = getPlatformDetails(p.id);
          const PlatformIcon = details.icon;

          // Find matching group from live stats
          const group = groupedFollowers.find((g: any) => g.platform === p.id);
          const followers = group ? group.totalFollowers : p.defaultFollowers;
          
          // Simulated growth
          const growth = group?.profiles[0]?.growth ?? p.defaultGrowth;
          const isPositive = growth > 0;
          const isNeutral = growth === 0;

          return (
            <div
              key={p.id}
              className="p-4 rounded-xl bg-[#0a0b14]/50 border border-border/30 hover:border-primary/30 transition-all flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-2 rounded-lg text-white", details.color)}>
                    <PlatformIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">{p.name}</h4>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Audiência</p>
                  </div>
                </div>
                {!isNeutral && (
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-0.5",
                    isPositive 
                      ? "bg-green-500/10 text-green-400 border-green-500/20" 
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  )}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isPositive ? "+" : ""}{growth}%
                  </span>
                )}
              </div>

              <div className="mt-2">
                <p className="text-2xl font-black text-white">
                  {followers.toLocaleString("pt-BR")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {p.id === "youtube" ? "inscritos ativos" : "seguidores totais"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
});

PlatformFollowersGrid.displayName = "PlatformFollowersGrid";
