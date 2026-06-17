import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface ViralPotentialChartProps {
  data?: { name: string; value: number }[];
}

const DEFAULT_DATA = [
  { name: "Não Seguidores", value: 934056 },
  { name: "Seguidores", value: 143102 },
];

const COLORS = ["#3b82f6", "#94a3b8"];

export const ViralPotentialChart = ({ data }: ViralPotentialChartProps) => {
  const chartData = data && data.length > 0 ? data : DEFAULT_DATA;
  const hasRealData = data !== undefined && data.length > 0;
  const total = chartData.reduce((s, d) => s + d.value, 0);
  const naoSeguidoresPct = total > 0 ? ((chartData[0]?.value ?? 0) / total * 100).toFixed(1) : "0";

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">Potencial Viral</h3>
          <p className="text-[10px] text-muted-foreground">{hasRealData ? "Interações por origem" : "Configure nas APIs Meta para ver dados"}</p>
        </div>
      </div>
      <div className="h-64 w-full relative" style={{ isolation: 'isolate' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%" cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              isAnimationActive={false}
              stroke="none"
            >
              {chartData.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx]} fillOpacity={hasRealData ? 1 : 0.3} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 11%)", border: "1px solid hsl(222, 30%, 22%)", borderRadius: "12px",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)", padding: "10px 14px"
              }}
              formatter={(value: any, name: any) => {
                const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0";
                return [
                  <div key="v">
                    <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{name}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginLeft: 8 }}>
                      {Number(value).toLocaleString('pt-BR')}
                    </span>
                    <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: 12, marginLeft: 6 }}>({pct}%)</span>
                  </div>,
                  null
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
          <span className="text-2xl font-bold text-white">{naoSeguidoresPct}%</span>
          <span className="text-[10px] font-medium text-muted-foreground">Não-Seguidores</span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {chartData.map((entry, idx) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
          return (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx], opacity: hasRealData ? 1 : 0.3 }} />
              <span className="flex-1 text-muted-foreground">{entry.name}</span>
              <span className="font-bold text-white">{pct}%</span>
              <span className="text-muted-foreground/60">{entry.value.toLocaleString('pt-BR')}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
