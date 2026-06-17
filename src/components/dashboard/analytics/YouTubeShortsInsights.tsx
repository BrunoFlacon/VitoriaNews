import React from "react";
import { PieChart, Pie, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { Eye, Users, UserPlus, Activity } from "lucide-react";

interface YouTubeShortsInsightsProps {
  funnelData?: { impressions: number; views: number; watchTimeHours: number };
  trafficData?: { name: string; value: number }[];
  engagementRate?: number;
  spectators?: { newViewers: number; returningViewers: number; subscribers: number };
}

const DEFAULT_TRAFFIC = [
  { name: "Pesquisa do YouTube", value: 87.5 },
  { name: "Páginas de hashtag", value: 8.3 },
  { name: "Feed dos Shorts", value: 4.2 },
];
const TRAFFIC_COLORS = ["#a855f7", "#60a5fa", "#9ca3af"];

export const YouTubeShortsInsights = ({ funnelData, trafficData, engagementRate, spectators }: YouTubeShortsInsightsProps) => {
  const funnel = funnelData || { impressions: 624, views: 17, watchTimeHours: 0.15 };
  const traffic = trafficData && trafficData.length > 0 ? trafficData : DEFAULT_TRAFFIC;
  const hasTrafficData = trafficData !== undefined && trafficData.length > 0;
  const hasFunnelData = funnelData !== undefined;
  const hasEngagementData = engagementRate !== undefined;
  const hasSpectatorsData = spectators !== undefined;
  const engRate = engagementRate ?? 38.2;
  const spec = spectators || { newViewers: 0, returningViewers: 0, subscribers: 0 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Eye className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Impressões e tempo de exibição</h3>
            <p className="text-[10px] text-muted-foreground">{hasFunnelData ? "Funil de descoberta" : "Configure nas APIs YouTube para ver dados"}</p>
          </div>
        </div>
        <div className="flex flex-col items-center flex-1 justify-center gap-0">
          <div className="w-full relative group">
            <svg className="w-full h-14 drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 40">
              <polygon points="0,0 100,0 85,40 15,40" fill="#a855f7" fillOpacity={hasFunnelData ? 0.9 : 0.3} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[9px] uppercase font-bold tracking-wider opacity-80 text-white">Impressões</p>
              <p className="text-lg font-bold text-white">{funnel.impressions.toLocaleString()}</p>
            </div>
          </div>
          {hasFunnelData && (
          <div className="flex items-center justify-center py-1.5">
            <span className="bg-card border border-border/50 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground shadow-sm">
              {funnel.impressions > 0 ? ((funnel.views / funnel.impressions) * 100).toFixed(1) : "—"}% taxa de cliques
            </span>
          </div>
          )}
          <div className="w-[70%] relative group">
            <svg className="w-full h-12 drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 40">
              <polygon points="0,0 100,0 85,40 15,40" fill="#a855f7" fillOpacity={hasFunnelData ? 0.75 : 0.25} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[9px] uppercase font-bold tracking-wider opacity-80 text-white">Visualizações</p>
              <p className="text-base font-bold text-white">{funnel.views.toLocaleString()}</p>
            </div>
          </div>
          {hasFunnelData && (
          <div className="flex items-center justify-center py-1.5">
            <span className="bg-card border border-border/50 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground shadow-sm">
              {funnel.views > 0 && funnel.watchTimeHours > 0 ? `Duração média: ${Math.round((funnel.watchTimeHours * 60) / funnel.views)}s` : "Duração média: —"}
            </span>
          </div>
          )}
          <div className="w-[50%] relative group">
            <svg className="w-full h-10 drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 40">
              <polygon points="0,0 100,0 80,40 20,40" fill="#a855f7" fillOpacity={hasFunnelData ? 0.6 : 0.2} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[8px] uppercase font-bold tracking-wider opacity-90 text-white text-center leading-tight">Tempo (horas)</p>
              <p className="text-sm font-bold text-white">{funnel.watchTimeHours.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-6">
        <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-bold text-sm text-white">Como acham seus Shorts</h3>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 shrink-0">
              <PieChart width={64} height={64}>
                <Pie
                  data={traffic}
                  cx="50%" cy="50%"
                  innerRadius={20}
                  outerRadius={30}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={false}
                  stroke="none"
                >
                  {traffic.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={TRAFFIC_COLORS[idx]} fillOpacity={hasTrafficData ? 1 : 0.3} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="text-xs">
              <p className="font-bold text-white">Origens de tráfego</p>
              <p className="text-muted-foreground">Visualizações</p>
            </div>
          </div>
          <div className="space-y-2">
            {traffic.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TRAFFIC_COLORS[idx], opacity: hasTrafficData ? 1 : 0.3 }} />
                <span className="flex-1 text-muted-foreground">{entry.name}</span>
                <span className="font-bold text-white">{entry.value}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-bold text-sm text-white">Engajamento</h3>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden bg-muted/30 shadow-inner">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-500" style={{ width: `${Math.min(engRate, 100)}%`, opacity: hasEngagementData ? 1 : 0.3 }} />
          </div>
          <div className="flex justify-between text-xs mt-3">
            <div>
              <p className="font-bold text-lg text-purple-400">{engRate}%</p>
              <p className="text-muted-foreground">Continuaram</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-muted-foreground">{(100 - engRate).toFixed(1)}%</p>
              <p className="text-muted-foreground">Pularam</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:border-purple-500/30 transition-all cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <UserPlus className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-bold text-sm text-white">Novos espectadores</h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">Últimos 28 dias</p>
          <div className="flex justify-between items-end border-b border-border/50 pb-2">
            <span className="text-xs text-muted-foreground">Shorts</span>
            <span className="text-2xl font-bold text-white">{hasSpectatorsData ? spec.newViewers.toLocaleString() : "—"}</span>
          </div>
        </Card>

        <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:border-purple-500/30 transition-all cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-bold text-sm text-white">espectadores comuns</h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">Últimos 28 dias</p>
          <div className="flex justify-between items-end border-b border-border/50 pb-2">
            <span className="text-xs text-muted-foreground">Shorts</span>
            <span className="text-2xl font-bold text-white">{hasSpectatorsData ? spec.returningViewers.toLocaleString() : "—"}</span>
          </div>
        </Card>

        <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:border-purple-500/30 transition-all cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <UserPlus className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-bold text-sm text-white">Inscritos</h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">Últimos 28 dias</p>
          <div className="flex justify-between items-end border-b border-border/50 pb-2">
            <span className="text-xs text-muted-foreground">Shorts</span>
            <span className="text-2xl font-bold text-white">{hasSpectatorsData ? spec.subscribers.toLocaleString() : "—"}</span>
          </div>
        </Card>
      </div>
    </div>
  );
};