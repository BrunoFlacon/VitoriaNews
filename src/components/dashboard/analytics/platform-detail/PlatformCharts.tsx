import { memo, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getPlatformDetails } from "./platformConfigs";
import type { AccountMetric } from "./usePlatformDetail";

interface PlatformChartsProps {
  platformId: string;
  metrics: AccountMetric[];
  loading: boolean;
}

const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const PlatformCharts = memo(({ platformId, metrics, loading }: PlatformChartsProps) => {
  const platform = getPlatformDetails(platformId);
  const colorVar = platform?.textColor?.replace("text-", "") || "#3b82f6";
  const chartColor = `var(--${colorVar})` || "#3b82f6";

  const chartData = useMemo(() => {
    if (metrics.length < 2) return [];
    return metrics.map((m) => {
      const d = new Date(m.collected_at);
      return {
        date: `${d.getDate()}/${months[d.getMonth()]}`,
        seguidores: m.followers || 0,
        engajamento: (m.likes || 0) + (m.comments || 0) + (m.shares || 0),
        visualizacoes: m.views || 0,
      };
    });
  }, [metrics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm italic">
        Dados históricos insuficientes para exibir gráficos
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
        <p className="text-sm font-bold mb-4">Seguidores</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="followersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <RechartsTooltip />
            <Area
              type="monotone"
              dataKey="seguidores"
              stroke={chartColor}
              fill="url(#followersGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
        <p className="text-sm font-bold mb-4">Engajamento</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <RechartsTooltip />
            <Bar dataKey="engajamento" fill={chartColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

PlatformCharts.displayName = "PlatformCharts";
