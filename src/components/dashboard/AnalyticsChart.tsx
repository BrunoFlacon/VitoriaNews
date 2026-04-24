import { motion } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface AnalyticsChartProps {
  data?: any[];
  loading?: boolean;
}

export const AnalyticsChart = ({ data: chartData = [], loading = false }: AnalyticsChartProps) => {
  if (loading) {
    return (
      <div className="glass-card rounded-2xl border border-border p-6 h-[420px] flex flex-col justify-center items-center">
        <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Carregando métricas...</p>
      </div>
    );
  }

  const displayData = chartData.length > 0 ? chartData : [
    { name: "Seg", views: 0, engagement: 0, reach: 0 },
    { name: "Ter", views: 0, engagement: 0, reach: 0 },
    { name: "Qua", views: 0, engagement: 0, reach: 0 },
    { name: "Qui", views: 0, engagement: 0, reach: 0 },
    { name: "Sex", views: 0, engagement: 0, reach: 0 },
    { name: "Sáb", views: 0, engagement: 0, reach: 0 },
    { name: "Dom", views: 0, engagement: 0, reach: 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl border border-border p-6 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl">Visão Geral</h2>
          <p className="text-sm text-muted-foreground">Performance dos últimos 7 dias</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Visualizações</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-xs text-muted-foreground">Engajamento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Alcance</span>
          </div>
        </div>
      </div>

      <div className="h-[300px]" style={{ contain: "strict" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(215, 20%, 55%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(215, 20%, 55%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 10%)",
                border: "1px solid hsl(222, 30%, 18%)",
                borderRadius: "12px",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)"
              }}
              labelStyle={{ color: "hsl(210, 40%, 98%)" }}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              fill="url(#colorViews)"
            />
            <Area
              type="monotone"
              dataKey="engagement"
              stroke="hsl(262, 83%, 58%)"
              strokeWidth={2}
              fill="url(#colorEngagement)"
            />
            <Area
              type="monotone"
              dataKey="reach"
              stroke="hsl(142, 70%, 45%)"
              strokeWidth={2}
              fill="url(#colorReach)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
