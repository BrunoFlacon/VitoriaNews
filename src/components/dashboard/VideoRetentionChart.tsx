import { RetentionMetric } from '@/hooks/usePlatformMetrics';

interface VideoRetentionChartProps {
  data: RetentionMetric[];
  totalViews: number;
}

export function VideoRetentionChart({ data, totalViews }: VideoRetentionChartProps) {
  if (!data || data.length === 0) return null;

  const maxViews = Math.max(...data.map(d => d.views), 1);

  return (
    <div className="space-y-2">
      {data.map((metric) => {
        const pct = Math.round((metric.views / maxViews) * 100);
        const totalPct = totalViews > 0 ? ((metric.views / totalViews) * 100).toFixed(1) : '0';
        return (
          <div key={metric.duration} className="flex items-center gap-3">
            <span className="w-16 text-xs text-muted-foreground font-medium shrink-0">{metric.label}</span>
            <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-20 text-xs font-bold text-right tabular-nums">
              {metric.views.toLocaleString('pt-BR')}
            </span>
            <span className="w-12 text-[10px] text-muted-foreground text-right">{totalPct}%</span>
          </div>
        );
      })}
    </div>
  );
}
