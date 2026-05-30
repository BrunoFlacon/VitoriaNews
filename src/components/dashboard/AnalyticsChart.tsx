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
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl text-white">Visão Geral</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Performance dos últimos 7 dias</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
            <span className="text-xs text-muted-foreground font-medium">Visualizações</span>
          </div>
           <div className="flex items-center gap-1.5">
             <div className="w-3 h-3 rounded-full bg-[hsl(260.78deg_85.65%_59.02%)]" />
             <span className="text-xs text-muted-foreground font-medium">Engajamento</span>
           </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span className="text-xs text-muted-foreground font-medium">Alcance</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full" style={{ contain: 'layout style' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="hsl(215, 20%, 55%)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis 
              stroke="hsl(215, 20%, 55%)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 11%)",
                border: "1px solid hsl(222, 30%, 22%)",
                borderRadius: "12px",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)",
                padding: "10px 14px"
              }}
              itemStyle={{ fontSize: "14px", fontWeight: 600 }}
              labelStyle={{ color: "hsl(210, 40%, 98%)", fontWeight: "bold", fontSize: "13px", marginBottom: '6px' }}
              formatter={(value: any, name: string) => {
                const colorMap: Record<string, string> = {
                  'Visualizações': '#3b82f6',
                  'Engajamento': '#8b5cf6',
                  'Alcance': '#22c55e',
                };
                const color = colorMap[name] || '#fff';
                const displayValue = Number(value).toLocaleString('pt-BR');
                return [<span key="v" style={{ color, fontWeight: 700 }}>{displayValue}</span>, name];
              }}
            />
            <Area
              type="monotone"
              dataKey="views"
              name="Visualizações"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorViews)"
              animationDuration={1000}
            />
             <Area
               type="monotone"
               dataKey="engagement"
               name="Engajamento"
               stroke="hsl(260.78deg 85.65% 59.02%)"
               strokeWidth={3}
               fillOpacity={1}
               fill="url(#colorEngagement)"
               animationDuration={1000}
             />
            <Area
              type="monotone"
              dataKey="reach"
              name="Alcance"
              stroke="#22c55e"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorReach)"
              animationDuration={1000}
            />

          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
