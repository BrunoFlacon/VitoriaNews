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
      <div className={`flex items-center text-[11px] font-extrabold uppercase tracking-wider space-x-1 px-3 py-1.5 rounded-full border ${
        isNeutral 
          ? "bg-slate-500/10 text-slate-400 border-slate-500/20" 
          : isPositive 
            ? "bg-green-500/15 text-green-400 border-green-500/30" 
            : "bg-red-500/15 text-red-400 border-red-500/30"
      }`}>
        {isPositive ? (
          <ArrowUpRight className="w-3.5 h-3.5 text-green-400 shrink-0" />
        ) : isNeutral ? (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-0.5 shrink-0" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5 text-red-400 shrink-0" />
        )}
        <span>{isPositive ? "+" : ""}{numValue}%</span>
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
    { label: "Visualizações", value: engagement.views, icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10", sparkField: 'views' as const, growth: computeGrowth('views') },
    { label: "Engajamento", value: engagement.likes + engagement.comments, icon: Heart, color: "text-purple-400", bg: "bg-purple-500/10", sparkField: 'engagement' as const, growth: computeGrowth('engagement') },
    { label: "Alcance", value: engagement.reach, icon: Users, color: "text-green-400", bg: "bg-green-500/10", sparkField: 'reach' as const, growth: computeGrowth('reach') },
    { label: "Compartilhados", value: engagement.shares, icon: Share2, color: "text-orange-400", bg: "bg-orange-500/10", sparkField: 'shares' as const, growth: computeGrowth('shares') },
  ];

  const fmt = (v: number) => isDemo && v === 0 ? "—" : v.toLocaleString('pt-BR');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {topStats.map((stat, i) => {
          const { values: sparkValues, labels: sparkLabels } = extractSparkData(chartData, stat.sparkField);
          const growthNum = typeof stat.growth === 'string' ? parseFloat(stat.growth) : stat.growth;
          const sparkColor = growthNum > 0 ? "#22c55e" : growthNum < 0 ? "#ef4444" : "#94a3b8";
          
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
                {renderTrend(stat.growth)}
              </div>
              <div className="mb-4">
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-0.5 md:mb-1">
                  {fmt(stat.value)}
                </h3>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{stat.label}</p>
              </div>
              <div className="mt-auto">
                <SparklineCard data={sparkValues} labels={sparkLabels} color={sparkColor} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Status de Publicação Group */}
        <div className="md:col-span-8 p-4 rounded-2xl border border-border/50 bg-[#0a0c16]/40 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border/10 pb-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400">Status de Publicação</p>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Conteúdos & Cronograma</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Posts", val: overview.totalPosts, color: "text-slate-300" },
              { label: "Publicados", val: overview.publishedPosts, color: "text-green-400" },
              { label: "Agendados", val: overview.scheduledPosts, color: "text-yellow-400" },
              { label: "Rascunhos", val: overview.draftPosts, color: "text-blue-400" },
              { label: "Falhas", val: overview.failedPosts, color: "text-red-400" },
              { label: "Sucesso", val: `${overview.publishRate}%`, color: "text-emerald-400" },
            ].map((item, i) => (
              <div 
                key={i}
                className="p-3 rounded-xl bg-card border border-border/30 text-center flex flex-col justify-center hover:bg-muted/10 transition-colors"
              >
                <p className="text-[9px] font-medium text-muted-foreground uppercase mb-1">{item.label}</p>
                <p className={`text-lg font-black ${item.color}`}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status de Mensageria Group */}
        <div className="md:col-span-4 p-4 rounded-2xl border border-border/50 bg-[#0a0c16]/40 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border/10 pb-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-purple-400">Status de Mensageria</p>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Canais & Disparos</span>
          </div>
          <div className="grid grid-cols-2 gap-3 h-full pb-3">
            {[
              { label: "Msgs OK", val: messageStats?.totalSent || 0, color: "text-green-400" },
              { label: "Msgs Erro", val: messageStats?.totalFailed || 0, color: "text-red-500" },
            ].map((item, i) => (
              <div 
                key={i}
                className="p-3 rounded-xl bg-card border border-border/30 text-center flex flex-col justify-center hover:bg-muted/10 transition-colors"
              >
                <p className="text-[9px] font-medium text-muted-foreground uppercase mb-1">{item.label}</p>
                <p className={`text-lg font-black ${item.color}`}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
