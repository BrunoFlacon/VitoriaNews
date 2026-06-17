import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface MonetizationOverviewProps {
  totalRevenue?: number;
  revenueBreakdown?: { name: string; value: number }[];
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b"];

export const MonetizationOverview = ({ totalRevenue, revenueBreakdown }: MonetizationOverviewProps) => {
  if (totalRevenue === undefined || !revenueBreakdown || revenueBreakdown.length === 0) return null;
  const total = revenueBreakdown.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <DollarSign className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">Monetização Meta</h3>
          <p className="text-[10px] text-muted-foreground">Ganhos estimados de produtos financeiros</p>
        </div>
      </div>
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 mb-4 text-center relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 text-8xl text-white/10">
          <DollarSign className="w-24 h-24" />
        </div>
        <p className="text-blue-100 font-semibold text-xs uppercase tracking-wider mb-1">Ganhos Estimados Totais</p>
        <h2 className="text-4xl font-bold text-white tracking-tight">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
        <p className="text-blue-200 text-[10px] mt-1">USD</p>
      </div>
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Composição da Receita (USD)</h4>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  cx="50%" cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={false}
                  stroke="none"
                >
                  {breakdown.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx]} fillOpacity={1} />
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
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginLeft: 8 }}>${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: 12, marginLeft: 6 }}>({pct}%)</span>
                      </div>,
                      null
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {breakdown.map((entry, idx) => {
              const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
              return (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="flex-1 text-muted-foreground">{entry.name}</span>
                  <span className="font-bold text-white">${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-muted-foreground/60 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};
