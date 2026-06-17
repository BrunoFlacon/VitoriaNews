import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface YouTubePerformanceChartProps {
  data?: { name: string; views: number; watchTime: number }[];
}

const DEFAULT_DATA = [
  { name: "Segunda", views: 1200, watchTime: 80 },
  { name: "Terça", views: 1900, watchTime: 120 },
  { name: "Quarta", views: 1500, watchTime: 100 },
  { name: "Quinta", views: 2200, watchTime: 150 },
  { name: "Sexta", views: 1800, watchTime: 130 },
  { name: "Sábado", views: 2500, watchTime: 180 },
  { name: "Domingo", views: 3000, watchTime: 220 },
];

export const YouTubePerformanceChart = ({ data }: YouTubePerformanceChartProps) => {
  const chartData = data && data.length > 0 ? data : DEFAULT_DATA;
  const hasRealData = data !== undefined && data.length > 0;

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">Visualizações vs. Tempo de Exibição</h3>
          <p className="text-[10px] text-muted-foreground">{hasRealData ? "Todas as plataformas" : "Configure nas APIs YouTube para ver dados"}</p>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(222, 30%, 18%)" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={11} tickMargin={8} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" stroke="hsl(215, 20%, 55%)" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="hsl(215, 20%, 55%)" fontSize={11} axisLine={false} tickLine={false} />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 11%)", border: "1px solid hsl(222, 30%, 22%)", borderRadius: "12px",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)", padding: "10px 14px"
              }}
              labelStyle={{ color: "hsl(210, 40%, 98%)", fontWeight: "bold", fontSize: "13px" }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              iconType="circle"
              iconSize={8}
            />
            <Line yAxisId="left" type="monotone" dataKey="views" name="Visualizações" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 6 }} strokeOpacity={hasRealData ? 1 : 0.3} />
            <Line yAxisId="right" type="monotone" dataKey="watchTime" name="Tempo (Horas)" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3, fill: "#a855f7" }} activeDot={{ r: 6 }} strokeOpacity={hasRealData ? 1 : 0.3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};