import React, { memo } from "react";
import { 
  Eye, 
  MousePointerClick, 
  TrendingUp, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight 
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

export const CampaignStatsGrid = memo(({ adsStats, googleAdsStats, dataSource }: CampaignStatsGridProps) => {
  const isDemo = dataSource === "demo" || (!adsStats && !googleAdsStats);

  // Aggregated Values
  const impressions = (adsStats?.impressions || 0) + (googleAdsStats?.impressions || 0);
  const clicks = (adsStats?.clicks || 0) + (googleAdsStats?.clicks || 0);
  const conversions = googleAdsStats?.conversions || Math.round(clicks * 0.076); // mock conversion rate of 7.6% if not provided
  
  // Rates
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 7.6;
  const averageCtr = impressions > 0 ? (clicks / impressions) * 100 : 3.2;

  // Formatting function
  const fmt = (v: number, isShort = false) => {
    if (isDemo && v === 0) return "—";
    if (isShort && v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;
    if (isShort && v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (isShort && v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toLocaleString("pt-BR");
  };

  // Sparkline simulated data
  const generateSimulatedSpark = (base: number, points = 7) => {
    const values = [];
    let current = base;
    for (let i = 0; i < points; i++) {
      const change = (Math.random() - 0.45) * (base * 0.15);
      current = Math.max(0, current + change);
      values.push(Math.round(current));
    }
    return values;
  };

  const campaignStats = [
    {
      label: "Visualizações de Campanha",
      value: impressions || (isDemo ? 120000000000 : 0), // 120B fallback as in screenshot
      icon: Eye,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      sparkValues: generateSimulatedSpark(1000),
      trend: 12.4,
    },
    {
      label: "Cliques de Campanha",
      value: clicks || (isDemo ? 18500 : 0), // 18.5k fallback as in screenshot
      icon: MousePointerClick,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      sparkValues: generateSimulatedSpark(500),
      trend: 8.2,
    },
    {
      label: "Taxa de Conversão",
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      sparkValues: generateSimulatedSpark(76),
      trend: 3.5,
    },
    {
      label: "CTR Médio",
      value: `${averageCtr.toFixed(2)}%`,
      icon: Percent,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      sparkValues: generateSimulatedSpark(32),
      trend: -0.4,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Métricas de Tráfego e Campanhas (Ads)</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {campaignStats.map((stat, i) => {
          const isPositive = stat.trend > 0;
          return (
            <div
              key={stat.label}
              className="p-4 md:p-6 rounded-xl bg-card shadow-xl border border-border/50 flex flex-col hover:border-primary/40 transition-all group animate-fade-in-up"
              style={{ animationDelay: `${(i + 4) * 0.05}s`, animationFillMode: "both" }}
            >
              <div className="flex justify-between items-start mb-4 md:mb-6">
                <div className={`p-2.5 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
                </div>
                <div className={`flex items-center text-[10px] font-extrabold uppercase tracking-wider space-x-0.5 px-2.5 py-1 rounded-full border ${
                  isPositive 
                    ? "bg-green-500/15 text-green-400 border-green-500/30" 
                    : "bg-red-500/15 text-red-400 border-red-500/30"
                }`}>
                  {isPositive ? (
                    <ArrowUpRight className="w-3 h-3 text-green-400 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-400 shrink-0" />
                  )}
                  <span>{isPositive ? "+" : ""}{stat.trend}%</span>
                </div>
              </div>
              <div className="mb-4">
                <h3 className="text-xl md:text-3xl font-black text-white mb-0.5 md:mb-1">
                  {typeof stat.value === "number" ? fmt(stat.value, true) : stat.value}
                </h3>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{stat.label}</p>
              </div>
              <div className="mt-auto">
                <SparklineCard 
                  data={stat.sparkValues} 
                  labels={Array.from({ length: stat.sparkValues.length }, (_, idx) => `D${idx+1}`)} 
                  color={isPositive ? "#22c55e" : "#ef4444"} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

CampaignStatsGrid.displayName = "CampaignStatsGrid";
