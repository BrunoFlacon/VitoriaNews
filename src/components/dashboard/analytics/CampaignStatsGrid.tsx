import React, { memo } from "react";
import { 
  Eye, 
  MousePointerClick, 
  TrendingUp, 
  Percent, 
  BarChart3
} from "lucide-react";
import { SparklineCard } from "./SparklineCard";

interface CampaignStatsGridProps {
  adsStats?: {
    impressions: number;
    clicks: number;
    spend: number;
    reach?: number;
  };
  googleAdsStats?: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
  };
  dataSource?: string;
}

export const CampaignStatsGrid = memo(({ adsStats, googleAdsStats }: CampaignStatsGridProps) => {
  const hasData = !!(adsStats || googleAdsStats);

  if (!hasData) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Métricas de Tráfego e Campanhas (Ads)
          </p>
        </div>
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-card rounded-xl border border-dashed border-border/60">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-sm text-foreground mb-1">Nenhuma campanha</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Conecte contas de anúncios (Meta Ads, Google Ads) para acompanhar
            o desempenho das suas campanhas.
          </p>
        </div>
      </div>
    );
  }

  // Use only real data
  const impressions = (adsStats?.impressions || 0) + (googleAdsStats?.impressions || 0);
  const clicks = (adsStats?.clicks || 0) + (googleAdsStats?.clicks || 0);
  const conversions = googleAdsStats?.conversions || 0;
  
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const averageCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  const fmt = (v: number, isShort = false) => {
    if (v === 0) return "0";
    if (isShort && v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;
    if (isShort && v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (isShort && v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toLocaleString("pt-BR");
  };

  const campaignStats = [
    {
      label: "Visualizações de Campanha",
      value: impressions,
      icon: Eye,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      trend: 0,
    },
    {
      label: "Cliques de Campanha",
      value: clicks,
      icon: MousePointerClick,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      trend: 0,
    },
    {
      label: "Taxa de Conversão",
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      trend: 0,
    },
    {
      label: "CTR Médio",
      value: `${averageCtr.toFixed(2)}%`,
      icon: Percent,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      trend: 0,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Métricas de Tráfego e Campanhas (Ads)
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {campaignStats.map((stat, i) => (
          <div
            key={stat.label}
            className="p-4 md:p-6 rounded-xl bg-card shadow-xl border border-border/50 flex flex-col hover:border-primary/40 transition-all group animate-fade-in-up"
            style={{ animationDelay: `${(i + 4) * 0.05}s`, animationFillMode: "both" }}
          >
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div className={`p-2.5 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-xl md:text-3xl font-black text-white mb-0.5 md:mb-1">
                {typeof stat.value === "number" ? fmt(stat.value, true) : stat.value}
              </h3>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

CampaignStatsGrid.displayName = "CampaignStatsGrid";
