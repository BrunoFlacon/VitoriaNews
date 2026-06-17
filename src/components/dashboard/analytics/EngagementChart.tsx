import React, { useState, useCallback } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from "recharts";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EngagementChartProps {
  chartData: any[];
  totalFollowers?: number;
}

const METRIC_CONFIG: Record<string, { label: string; color: string; gradientId: string }> = {
  views: { label: 'Visualizações', color: '#3b82f6', gradientId: 'colorViews' },
  engagement: { label: 'Engajamento', color: '#8b5cf6', gradientId: 'colorEngs' },
  reach: { label: 'Alcance', color: '#22c55e', gradientId: 'colorReach' },
  followers: { label: 'Seguidores', color: '#f59e0b', gradientId: 'colorFollowers' },
  likes: { label: 'Curtidas', color: '#ec4899', gradientId: 'colorLikes' },
  comments: { label: 'Comentários', color: '#06b6d4', gradientId: 'colorComments' },
  shares: { label: 'Compartilhamentos', color: '#f97316', gradientId: 'colorShares' },
  posts: { label: 'Posts', color: '#84cc16', gradientId: 'colorPosts' },
};

const METRIC_KEYS = Object.keys(METRIC_CONFIG);
const METRICS_ARRAY = [
  { value: 'all', label: 'Todas as Métricas', color: '#fff' },
  ...METRIC_KEYS.map(k => ({ value: k, label: METRIC_CONFIG[k].label, color: METRIC_CONFIG[k].color })),
];

export const EngagementChart = React.memo(({ chartData, totalFollowers = 0 }: EngagementChartProps) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('all');

  const metricLabel = METRICS_ARRAY.find(m => m.value === selectedMetric)?.label || 'Todas as Métricas';
  const isAll = selectedMetric === 'all';

  const toggleMetric = useCallback((metric: string) => {
    setSelectedMetric(prev => isAll ? metric : prev === metric ? 'all' : metric);
  }, [isAll]);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="p-4 md:p-6 col-span-1 lg:col-span-2 shadow-xl border-border bg-card">
        <h3 className="font-display font-bold text-lg md:text-xl text-white mb-4">Performance Live</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Nenhum dado disponível no período</p>
        </div>
      </Card>
    );
  }

  const latest = chartData[chartData.length - 1];
  const hasFollowers = totalFollowers > 0;
  const timeSeriesKeys = METRIC_KEYS.filter(k => k !== 'followers');
  const displayKeys = hasFollowers ? METRIC_KEYS : timeSeriesKeys;

  const activeKeys = isAll ? displayKeys : [selectedMetric];

  return (
    <Card className="p-4 md:p-6 col-span-1 lg:col-span-2 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-lg md:text-xl text-white">Performance Live</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 rounded-xl border-border/50 text-[10px] font-bold px-2">
              {metricLabel}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] p-1 max-h-[300px] overflow-y-auto">
            <DropdownMenuRadioGroup value={selectedMetric} onValueChange={setSelectedMetric}>
              {METRICS_ARRAY.map(m => (
                <DropdownMenuRadioItem key={m.value} value={m.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    {m.value !== 'all' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />}
                    {m.label}
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Evolução no período — clique nas legendas para alternar</p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {displayKeys.map((key) => {
          const cfg = METRIC_CONFIG[key];
          const active = isAll || selectedMetric === key;
          const isStatic = key === 'followers';
          const val = isStatic ? totalFollowers : Number(latest?.[key] || 0);
          return (
            <button
              key={key}
              onClick={() => !isStatic && toggleMetric(key)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all",
                active ? 'bg-white/10' : 'opacity-30 hover:opacity-60',
                isStatic && 'cursor-default'
              )}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[11px] text-muted-foreground font-medium">{cfg.label}</span>
              <span className="text-[10px] font-black text-foreground tabular-nums">
                {val.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
      
      <div className="h-[300px] md:h-[380px] w-full relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {timeSeriesKeys.map(key => (
                <linearGradient key={key} id={METRIC_CONFIG[key].gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={METRIC_CONFIG[key].color} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={METRIC_CONFIG[key].color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(222, 30%, 18%)" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis stroke="hsl(215, 20%, 55%)" fontSize={11} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} axisLine={false} tickLine={false} />
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: "hsl(222, 47%, 11%)",
                border: "1px solid hsl(222, 30%, 22%)",
                borderRadius: "12px",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)",
                paddingTop: 10,
                paddingBottom: 10,
                paddingLeft: 14,
                paddingRight: 14
              }}
              labelStyle={{ color: "hsl(210, 40%, 98%)", fontWeight: "bold", fontSize: "13px" }}
              formatter={(value: any, name: string) => {
                const cfg = Object.values(METRIC_CONFIG).find(c => c.label === name);
                const color = cfg?.color || '#fff';
                return [<span key="v" style={{ color, fontWeight: 700, fontSize: 14 }}>{Number(value).toLocaleString('pt-BR')}</span>, name];
              }}
            />
            {timeSeriesKeys.map((key) => {
              const cfg = METRIC_CONFIG[key];
              return (
                <Area 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  name={cfg.label}
                  stroke={cfg.color} 
                  strokeWidth={2.5}
                  strokeOpacity={isAll || selectedMetric === key ? 1 : 0.08}
                  fillOpacity={isAll || selectedMetric === key ? 0.3 : 0.02}
                  fill={`url(#${cfg.gradientId})`} 
                  isAnimationActive={false}
                  connectNulls={false}
                  activeDot={{ r: 6, strokeWidth: 2.5, stroke: cfg.color, fill: '#fff' }}
                  dot={{ r: 3, strokeWidth: 2, stroke: cfg.color, fill: '#0f172a' }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
