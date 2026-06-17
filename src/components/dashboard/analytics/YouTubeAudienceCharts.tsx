import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Users, MapPin } from "lucide-react";

interface YouTubeAudienceChartsProps {
  ageData?: { name: string; value: number }[];
  trafficData?: { name: string; value: number }[];
}

const DEFAULT_AGE_DATA = [
  { name: "13-17", value: 10 },
  { name: "18-24", value: 35 },
  { name: "25-34", value: 40 },
  { name: "35-44", value: 10 },
  { name: "45+", value: 5 },
];

const DEFAULT_TRAFFIC_DATA = [
  { name: "Pesquisa YT", value: 45 },
  { name: "Sugeridos", value: 25 },
  { name: "Navegação", value: 15 },
  { name: "Externo", value: 10 },
  { name: "Outros", value: 5 },
];

const AGE_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#60a5fa"];
const TRAFFIC_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#6b7280"];

export const YouTubeAudienceCharts = ({ ageData, trafficData }: YouTubeAudienceChartsProps) => {
  const ageChart = ageData && ageData.length > 0 ? ageData : DEFAULT_AGE_DATA;
  const trafficChart = trafficData && trafficData.length > 0 ? trafficData : DEFAULT_TRAFFIC_DATA;
  const hasAgeData = ageData !== undefined && ageData.length > 0;
  const hasTrafficData = trafficData !== undefined && trafficData.length > 0;

  const ageTotal = ageChart.reduce((s, d) => s + d.value, 0);
  const trafficTotal = trafficChart.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Público: Faixa Etária</h3>
            <p className="text-[10px] text-muted-foreground">{hasAgeData ? "Distribuição etária da audiência" : "Configure nas APIs YouTube para ver dados"}</p>
          </div>
        </div>
        <div className="h-64 w-full relative" style={{ isolation: 'isolate' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ageChart}
                cx="50%" cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                isAnimationActive={false}
                stroke="none"
              >
                {ageChart.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={AGE_COLORS[idx]} fillOpacity={hasAgeData ? 1 : 0.3} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 11%)", border: "1px solid hsl(222, 30%, 22%)", borderRadius: "12px",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)", padding: "10px 14px"
                }}
                formatter={(value: any, name: any) => {
                  const pct = ageTotal > 0 ? ((Number(value) / ageTotal) * 100).toFixed(1) : "0";
                  return [
                    <div key="v">
                      <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{name}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginLeft: 8 }}>{pct}%</span>
                    </div>,
                    null
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center" style={{ zIndex: 1 }}>
            <span className="text-lg font-bold text-white">{ageChart.reduce((max, d) => Math.max(max, d.value), 0)}%</span>
            <span className="text-[9px] font-medium text-muted-foreground block">Principal</span>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          {ageChart.map((entry, idx) => {
            const pct = ageTotal > 0 ? ((entry.value / ageTotal) * 100).toFixed(1) : "0";
            return (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: AGE_COLORS[idx], opacity: hasAgeData ? 1 : 0.3 }} />
                <span className="flex-1 text-muted-foreground">{entry.name}</span>
                <span className="font-bold text-white">{pct}%</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Origem do Tráfego</h3>
            <p className="text-[10px] text-muted-foreground">{hasTrafficData ? "Fontes de tráfego do YouTube" : "Configure nas APIs YouTube para ver dados"}</p>
          </div>
        </div>
        <div className="h-64 w-full relative" style={{ isolation: 'isolate' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={trafficChart}
                cx="50%" cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                isAnimationActive={false}
                stroke="none"
              >
                {trafficChart.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={TRAFFIC_COLORS[idx]} fillOpacity={hasTrafficData ? 1 : 0.3} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 11%)", border: "1px solid hsl(222, 30%, 22%)", borderRadius: "12px",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)", padding: "10px 14px"
                }}
                formatter={(value: any, name: any) => {
                  const pct = trafficTotal > 0 ? ((Number(value) / trafficTotal) * 100).toFixed(1) : "0";
                  return [
                    <div key="v">
                      <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{name}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginLeft: 8 }}>{pct}%</span>
                    </div>,
                    null
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center" style={{ zIndex: 1 }}>
            <span className="text-lg font-bold text-white">
              {trafficChart.reduce((max, d) => d.value > max.value ? d : max, trafficChart[0])?.value}%
            </span>
            <span className="text-[9px] font-medium text-muted-foreground block">Principal</span>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          {trafficChart.map((entry, idx) => {
            const pct = trafficTotal > 0 ? ((entry.value / trafficTotal) * 100).toFixed(1) : "0";
            return (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TRAFFIC_COLORS[idx], opacity: hasTrafficData ? 1 : 0.3 }} />
                <span className="flex-1 text-muted-foreground">{entry.name}</span>
                <span className="font-bold text-white">{pct}%</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};