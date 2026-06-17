import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";

interface YouTubeEngagementChartProps {
  data?: { name: string; value: number }[];
}

const DEFAULT_DATA = [
  { name: "Likes", value: 850 },
  { name: "Comentários", value: 120 },
  { name: "Compartilhamentos", value: 45 },
  { name: "Dislikes", value: 12 },
];

const COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444"];

export const YouTubeEngagementChart = ({ data }: YouTubeEngagementChartProps) => {
  const chartData = data && data.length > 0 ? data : DEFAULT_DATA;
  const hasRealData = data !== undefined && data.length > 0;

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Heart className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">Engajamento Total</h3>
          <p className="text-[10px] text-muted-foreground">{hasRealData ? "Likes, comentários, compartilhamentos" : "Configure nas APIs YouTube para ver dados"}</p>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(222, 30%, 18%)" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={11} tickMargin={8} axisLine={false} tickLine={false} />
            <YAxis stroke="hsl(215, 20%, 55%)" fontSize={11} axisLine={false} tickLine={false} />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 11%)", border: "1px solid hsl(222, 30%, 22%)", borderRadius: "12px",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)", padding: "10px 14px"
              }}
              labelStyle={{ color: "hsl(210, 40%, 98%)", fontWeight: "bold", fontSize: "13px" }}
              formatter={(value: any) => [<span key="v" style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{Number(value).toLocaleString('pt-BR')}</span>, "Quantidade"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {chartData.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx]} fillOpacity={hasRealData ? 0.9 : 0.3} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};