import { memo, useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AccountMetric, PostMetric } from "./usePlatformDetail";

interface PlatformChartsExpandedProps {
  platformId: string;
  metrics: AccountMetric[];
  posts: PostMetric[];
  loading: boolean;
}

const colorMap: Record<string, string> = {
  facebook: '#1877F2', instagram: '#E4405F', youtube: '#FF0000',
  tiktok: '#69C9D0', twitter: '#1DA1F2', linkedin: '#0A66C2',
  whatsapp: '#25D366', telegram: '#2CA5E0', threads: '#6366f1',
};

const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString('pt-BR')}
        </p>
      ))}
    </div>
  );
};

const EngagementDonut = memo(({ metrics, chartColor }: { metrics: AccountMetric[]; chartColor: string }) => {
  const latest = metrics[metrics.length - 1];
  if (!latest) return null;
  const data = [
    { name: 'Curtidas', value: latest.likes || 0 },
    { name: 'Comentários', value: latest.comments || 0 },
    { name: 'Compartilhamentos', value: latest.shares || 0 },
  ].filter(d => d.value > 0);
  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

  return (
    <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
      <p className="text-sm font-bold mb-4">Composição de Engajamento</p>
      <div className="flex items-center gap-4">
        <PieChart width={160} height={160}>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <RechartsTooltip content={<CustomTooltip />} />
        </PieChart>
        <div className="space-y-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-bold text-white">{((d.value / total) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
EngagementDonut.displayName = "EngagementDonut";

const PostsByTypeChart = memo(({ posts }: { posts: PostMetric[] }) => {
  const grouped = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => {
      const mt = (p.media_type || 'unknown').toLowerCase();
      counts[mt] = (counts[mt] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  if (grouped.length === 0) return null;

  const mediaColors: Record<string, string> = {
    photo: '#3b82f6', video: '#ef4444', text: '#8b5cf6',
    carousel: '#22c55e', reel: '#ec4899', story: '#f59e0b',
    unknown: '#6b7280',
  };

  return (
    <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
      <p className="text-sm font-bold mb-4">Posts por Tipo de Mídia</p>
      <div className="space-y-2">
        {grouped.map(({ type, count }) => {
          const total = grouped.reduce((s, g) => s + g.count, 0);
          const pct = (count / total) * 100;
          return (
            <div key={type} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="capitalize text-muted-foreground">{type}</span>
                <span className="font-bold text-white">{count}</span>
              </div>
              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: mediaColors[type] || '#6b7280' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
PostsByTypeChart.displayName = "PostsByTypeChart";

const ActivityHeatmap = memo(({ posts, chartColor }: { posts: PostMetric[]; chartColor: string }) => {
  const heatmapData = useMemo(() => {
    const grid: Record<string, number> = {};
    const now = new Date();
    posts.forEach(p => {
      if (!p.published_at) return;
      const d = new Date(p.published_at);
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const diff = now.getTime() - d.getTime();
      const weekIndex = Math.floor(diff / weekMs);
      if (weekIndex >= 0 && weekIndex < 52) {
        const key = `${weekIndex}-${d.getDay()}`;
        grid[key] = (grid[key] || 0) + 1;
      }
    });
    return grid;
  }, [posts]);

  const maxVal = Math.max(...Object.values(heatmapData), 1);

  return (
    <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
      <p className="text-sm font-bold mb-4">Heatmap de Atividade (52 semanas)</p>
      <div className="flex gap-0.5">
        <div className="flex flex-col gap-0.5 mr-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="w-6 h-3 text-[6px] text-muted-foreground flex items-center justify-end pr-1">{d}</div>
          ))}
        </div>
        <div className="flex gap-0.5 overflow-x-auto">
          {Array.from({ length: 52 }).map((_, week) => (
            <div key={week} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }).map((_, day) => {
                const key = `${week}-${day}`;
                const val = heatmapData[key] || 0;
                const intensity = val / maxVal;
                return (
                  <div
                    key={day}
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: val > 0 ? `${chartColor}${Math.round(intensity * 200).toString(16).padStart(2, '0')}` : 'hsl(222, 30%, 12%)' }}
                    title={`${val} posts`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[8px] text-muted-foreground">Menos</span>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(222, 30%, 12%)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: `${chartColor}40` }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: `${chartColor}80` }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartColor }} />
        <span className="text-[8px] text-muted-foreground">Mais</span>
      </div>
    </div>
  );
});
ActivityHeatmap.displayName = "ActivityHeatmap";

export const PlatformChartsExpanded = memo(({ platformId, metrics, posts, loading }: PlatformChartsExpandedProps) => {
  const [showExpanded, setShowExpanded] = useState(false);
  const chartColor = colorMap[platformId] || '#3b82f6';

  const growthData = useMemo(() => {
    return metrics.map((m) => {
      const d = new Date(m.collected_at);
      return {
        date: `${d.getDate()}/${months[d.getMonth()]}`,
        seguidores: m.followers || 0,
      };
    });
  }, [metrics]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[180px] w-full rounded-xl" />
        <Skeleton className="h-[180px] w-full rounded-xl" />
      </div>
    );
  }

  if (metrics.length < 2 && posts.length === 0) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowExpanded(!showExpanded)}
        className="text-xs text-primary hover:text-primary/80 font-bold uppercase tracking-wider transition-colors"
      >
        {showExpanded ? '▲ Menos gráficos' : '▼ Mais gráficos (crescimento, heatmap, tipos)'}
      </button>

      {showExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {growthData.length > 1 && (
            <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
              <p className="text-sm font-bold mb-4">Crescimento de Seguidores</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="seguidores" stroke={chartColor} fill="url(#growthGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <EngagementDonut metrics={metrics} chartColor={chartColor} />
          <PostsByTypeChart posts={posts} />
          <ActivityHeatmap posts={posts} chartColor={chartColor} />
        </div>
      )}
    </div>
  );
});

PlatformChartsExpanded.displayName = "PlatformChartsExpanded";