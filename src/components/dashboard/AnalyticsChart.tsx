import { Eye } from "lucide-react";
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
  periodDays?: number;
  onPeriodChange?: (p: string) => void;
  loading?: boolean;
}

export const AnalyticsChart = ({ data: chartData = [], periodDays, onPeriodChange, loading }: AnalyticsChartProps) => {
  if (loading) {
    return (
      <div className="glass-card rounded-2xl border border-border p-6 h-full flex flex-col justify-center items-center">
        <p className="text-muted-foreground">Carregando dados do gráfico...</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="glass-card rounded-2xl border border-border p-6 h-full flex flex-col justify-center items-center">
        <Eye className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground font-medium">Nenhum dado disponível para o gráfico</p>
        <p className="text-xs text-muted-foreground/50 mt-1">Conecte suas redes para visualizar métricas</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl border border-border p-4 md:p-6 h-full flex flex-col">
      {/* Title */}
      <h2 className="font-display font-bold text-lg md:text-xl text-white mb-2">Visão Geral</h2>

      {/* Row: indicators left, dropdown right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
            <span className="text-[11px] text-muted-foreground font-medium">Visualizações</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
            <span className="text-[11px] text-muted-foreground font-medium">Engajamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
            <span className="text-[11px] text-muted-foreground font-medium">Alcance</span>
          </div>
        </div>

        {onPeriodChange && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
            <span>Performance dos últimos</span>
            <select
              value={`${periodDays}d`}
              onChange={e => onPeriodChange(e.target.value)}
              className="bg-transparent border-none p-0 text-sm font-bold text-foreground cursor-pointer outline-none"
            >
              {['7d','15d','30d','45d','60d','90d'].map(per => (
                <option key={per} value={per} className="bg-background">
                  {per.replace('d','')} dias
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
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
              isAnimationActive={true}
            />
            <Area
              type="monotone"
              dataKey="engagement"
              name="Engajamento"
              stroke="#8b5cf6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorEngagement)"
              isAnimationActive={true}
            />
            <Area
              type="monotone"
              dataKey="reach"
              name="Alcance"
              stroke="#22c55e"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorReach)"
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      </div>
  );
};

AnalyticsChart.displayName = "AnalyticsChart";