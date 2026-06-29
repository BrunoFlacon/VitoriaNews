import React, { memo, useState, useMemo } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from "recharts";
import { Card } from "@/components/ui/card";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { ChevronDown, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface PlatformDistributionProps {
  platformBreakdown: Record<string, any>;
  COLORS: string[];
  onPieSelect?: (platform: string | null) => void;
}

const METRIC_OPTIONS = [
  { value: 'posts', label: 'Posts', color: '#3b82f6' },
  { value: 'engagement', label: 'Engajamento', color: '#8b5cf6' },
  { value: 'views', label: 'Visualizações', color: '#22c55e' },
  { value: 'likes', label: 'Curtidas', color: '#ec4899' },
  { value: 'comments', label: 'Comentários', color: '#06b6d4' },
  { value: 'shares', label: 'Compartilhamentos', color: '#f97316' },
] as const;

const getPlatformName = (key: string) =>
  socialPlatforms.find(p => p.id === key)?.name || key.charAt(0).toUpperCase() + key.slice(1);

const extractHexColor = (key: string): string | null => {
  const platform = socialPlatforms.find(p => p.id === key);
  if (!platform) return null;
  const match = platform.textColor?.match(/\[(#[\w]+)\]/);
  if (match) return match[1];
  if (platform.textColor?.includes('text-white')) return '#ffffff';
  return null;
};

export const PlatformDistribution = memo(({ platformBreakdown, COLORS, onPieSelect }: PlatformDistributionProps) => {
  const [pieMetric, setPieMetric] = useState<string>('posts');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const hasData = Object.keys(platformBreakdown).length > 0;
  const metricLabel = METRIC_OPTIONS.find(m => m.value === pieMetric)?.label ?? pieMetric;

  const handleSelect = (key: string) => {
    const next = selectedPlatform === key ? null : key;
    setSelectedPlatform(next);
    onPieSelect?.(next);
  };

  const pieData = useMemo(() => {
    const entries = Object.entries(platformBreakdown)
      .filter(([, data]) => data && typeof data === 'object')
      .map(([key, data]) => {
        const value = Number(data[pieMetric] ?? 0);
        const entryIndex = Object.keys(platformBreakdown).indexOf(key);
        return {
          key,
          name: getPlatformName(key),
          value,
          fill: COLORS.length > 0 ? COLORS[entryIndex % COLORS.length] : '#3b82f6',
        };
      })
      .filter(d => d.value > 0);
    return entries;
  }, [platformBreakdown, pieMetric, COLORS]);

  const total = useMemo(() => pieData.reduce((sum, d) => sum + d.value, 0), [pieData]);

  const sortedData = useMemo(() => [...pieData].sort((a, b) => b.value - a.value), [pieData]);

  const selectedEntry = selectedPlatform ? pieData.find(d => d.key === selectedPlatform) : null;
  const selectedPct = selectedEntry && total > 0 ? ((selectedEntry.value / total) * 100).toFixed(1) : null;

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display font-bold text-lg md:text-xl text-white">Mix de Audiência</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 rounded-xl border-border/50 text-[10px] font-bold px-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: METRIC_OPTIONS.find(m => m.value === pieMetric)?.color }} />
              {metricLabel}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[190px] p-1">
            <DropdownMenuRadioGroup value={pieMetric} onValueChange={setPieMetric}>
              {METRIC_OPTIONS.map(m => (
                <DropdownMenuRadioItem key={m.value} value={m.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    {m.label}
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Distribuição por plataforma — {metricLabel.toLowerCase()}</p>
      
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-14 text-center opacity-50">
          <BarChart3 className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Conecte APIs para ver distribuição</p>
          <p className="text-[10px] text-muted-foreground mt-1">Dados aparecerão após coleta de métricas</p>
        </div>
      ) : (<div>
      <div className="h-[300px] w-full relative" style={{ isolation: 'isolate' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              isAnimationActive={false}
              stroke="none"
              onClick={(entry: any) => {
                if (entry?.key) handleSelect(entry.key);
              }}
            >
              {pieData.map((entry) => (
                <Cell 
                  key={`cell-${entry.key}`} 
                  fill={entry.fill}
                  opacity={selectedPlatform && selectedPlatform !== entry.key ? 0.25 : 1}
                  stroke={selectedPlatform === entry.key ? '#fff' : 'transparent'}
                  strokeWidth={selectedPlatform === entry.key ? 2 : 0}
                  className="cursor-pointer transition-all duration-200"
                  style={{ transition: 'opacity 0.2s' }}
                />
              ))}
            </Pie>
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: "hsl(222, 47%, 11%)",
                border: "1px solid hsl(222, 30%, 22%)",
                borderRadius: "12px",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)",
                paddingTop: 10,
                paddingBottom: 10,
                paddingLeft: 14,
                paddingRight: 14,
                zIndex: 50,
                position: "relative"
              }}
              formatter={(value: any, name: any) => {
                const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0";
                return [
                  <div key="v" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{name}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
                      {Number(value).toLocaleString('pt-BR')}
                      <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: 12, marginLeft: 6 }}>({pct}%)</span>
                    </span>
                  </div>,
                  null
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
          <span className="text-[10px] font-medium text-muted-foreground">Total</span>
          <span className="text-2xl font-bold text-white">{total.toLocaleString('pt-BR')}</span>
          <span className="text-[10px] font-bold text-muted-foreground/50 mt-0.5">{metricLabel.toLowerCase()}</span>
        </div>
      </div>

      <div
        className="mt-4 space-y-1 max-h-[160px] overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {sortedData.map((entry, idx) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
          const isSelected = selectedPlatform === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => handleSelect(entry.key)}
              className={`w-full flex items-center justify-between text-sm rounded-lg px-2 py-1.5 transition-all duration-200 ${
                isSelected 
                  ? 'bg-white/10 ring-1 ring-white/20' 
                  : 'hover:bg-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[9px] font-bold text-muted-foreground/40 w-4 text-right shrink-0">
                  {idx + 1}
                </span>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-200"
                  style={{
                    backgroundColor: entry.fill,
                    boxShadow: isSelected ? `0 0 6px ${entry.fill}` : 'none',
                    transform: isSelected ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
                <span className={`text-xs transition-colors ${isSelected ? 'text-white font-semibold' : 'text-muted-foreground font-medium hover:text-white'}`}>
                  {entry.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground/60 font-medium">{pct}%</span>
                <span className="text-sm font-bold text-white">{entry.value.toLocaleString('pt-BR')}</span>
              </div>
            </button>
          );
        })}
      </div>
      </div>
      )}
    </Card>
  );
});
