import React from "react";
import { 
  Eye, 
  Heart, 
  Users, 
  Share2, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";
import { SparklineCard } from "./SparklineCard";

interface ChartDataPoint {
  name: string;
  views: number;
  engagement: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  posts: number;
}

interface StatsGridProps {
  engagement: {
    views: number;
    likes: number;
    comments: number;
    reach: number;
    shares: number;
    growth: number;
  };
  overview: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    draftPosts: number;
    failedPosts: number;
    publishRate: number;
  };
  messageStats?: {
    totalSent: number;
    totalFailed: number;
  };
  chartData?: ChartDataPoint[];
  dataSource?: string;
}

const extractSparkData = (data: ChartDataPoint[] | undefined, field: keyof ChartDataPoint): { values: number[]; labels: string[] } => {
  if (!data || data.length < 2) return { values: [], labels: [] };
  return {
    values: data.map(d => Number(d[field]) || 0),
    labels: data.map(d => d.name),
  };
};

export const StatsGrid = ({ engagement, overview, messageStats, chartData, dataSource }: StatsGridProps) => {
  const isDemo = dataSource === 'demo';

  const renderTrend = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return null;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return null;
    const isPositive = numValue > 0;
    const isNeutral = numValue === 0;

    return (
      <div className={`flex items-center text-[10px] font-black uppercase tracking-widest space-x-1 px-2.5 py-1 rounded-full ${
        isNeutral ? "bg-white/5 text-muted-foreground" : 
        isPositive ? "bg-green-500/10 text-green-400 border border-green-500/10" : "bg-red-500/10 text-red-400 border border-red-500/10"
      }`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : !isNeutral && <ArrowDownRight className="w-3 h-3" />}
        <span>{numValue > 0 ? "+" : ""}{numValue}%</span>
      </div>
    );
  };

  const computeGrowth = (field: keyof ChartDataPoint): number => {
    if (!chartData || chartData.length < 2) return 0;
    const values = chartData.map(d => Number(d[field]) || 0);
    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 100);
  };

  const sparkFields = [
    { field: 'views' as const, growth: computeGrowth('views') },
    { field: 'engagement' as const, growth: computeGrowth('engagement') },
    { field: 'reach' as const, growth: computeGrowth('reach') },
    { field: 'shares' as const, growth: computeGrowth('shares') },
  ];

  const topStats = [
    { label: "Visualizações", value: engagement.views, icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10", sparkField: 'views' as const },
    { label: "Engajamento", value: engagement.likes + engagement.comments, icon: Heart, color: "text-purple-400", bg: "bg-purple-500/10", sparkField: 'engagement' as const },
    { label: "Alcance", value: engagement.reach, icon: Users, color: "text-green-400", bg: "bg-green-500/10", sparkField: 'reach' as const },
    { label: "Compartilhados", value: engagement.shares, icon: Share2, color: "text-orange-400", bg: "bg-orange-500/10", sparkField: 'shares' as const },
  ];

  const fmt = (v: number) => isDemo && v === 0 ? "—" : v.toLocaleString('pt-BR');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {topStats.map((stat, i) => {
          const { values: sparkValues, labels: sparkLabels } = extractSparkData(chartData, stat.sparkField);
          return (
          <div
            key={stat.label}
            className="p-4 md:p-6 rounded-xl bg-card shadow-xl border-border flex flex-col hover:border-primary/40 transition-all group animate-fade-in-up"
            style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}
          >
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div className={`p-2 md:p-3 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              {renderTrend(engagement.growth)}
            </div>
            <div>
              <h3 className="text-2xl md:text-4xl font-bold text-white mb-0.5 md:mb-1">
                {fmt(stat.value)}
              </h3>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{stat.label}</p>
            </div>
            <SparklineCard data={sparkValues} labels={sparkLabels} color={stat.color === "text-blue-400" ? "#3b82f6" : stat.color === "text-purple-400" ? "#8b5cf6" : stat.color === "text-green-400" ? "#22c55e" : "#f59e0b"} />
          </div>
          );
        })}
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Posts", val: overview.totalPosts, color: "text-primary" },
          { label: "Publicados", val: overview.publishedPosts, color: "text-green-400" },
          { label: "Agendados", val: overview.scheduledPosts, color: "text-blue-400" },
          { label: "Rascunhos", val: overview.draftPosts, color: "text-yellow-400" },
          { label: "Falhas", val: overview.failedPosts, color: "text-red-400" },
          { label: "Msgs OK", val: messageStats?.totalSent || 0, color: "text-indigo-400" },
          { label: "Msgs Erro", val: messageStats?.totalFailed || 0, color: "text-red-600" },
          { label: "Sucesso", val: `${overview.publishRate}%`, color: "text-primary" },
        ].map((item, i) => (
          <div 
            key={i}
            className="p-3 md:p-4 rounded-xl bg-card border border-border/50 text-center flex flex-col justify-center hover:bg-muted/20 transition-colors animate-fade-in"
            style={{ animationDelay: `${0.4 + (i * 0.05)}s`, animationFillMode: 'both' }}
          >
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{item.label}</p>
            <p className={`text-lg md:text-xl font-bold ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
