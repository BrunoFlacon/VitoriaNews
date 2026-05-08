import React from "react";
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

interface EngagementChartProps {
  chartData: any[];
}

export const EngagementChart = React.memo(({ chartData }: EngagementChartProps) => {
  return (
    <Card className="p-6 col-span-1 lg:col-span-2 shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="font-display font-black text-xl text-foreground uppercase tracking-wider">Performance Live</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Evolução do engajamento no período selecionado</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Visualizações</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Engajamento</span>
          </div>
        </div>
      </div>
      
      <div className="h-[300px] md:h-[380px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -35, bottom: 0 }}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorEngs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={9} 
              tickMargin={10} 
              axisLine={false} 
              tickLine={false}
              fontFamily="Inter, sans-serif"
              fontWeight="bold"
              minTickGap={20}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={8} 
              tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
              axisLine={false} 
              tickLine={false}
              fontFamily="Inter, sans-serif"
              fontWeight="bold"
              width={35}
            />
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px', 
                color: '#fff',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                padding: '8px'
              }}
              itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontSize: '9px', fontWeight: 'black' }}
            />
            <Area 
              type="monotone" 
              dataKey="views" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorViews)" 
              animationDuration={2000}
            />
            <Area 
              type="monotone" 
              dataKey="engagement" 
              stroke="#8b5cf6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorEngs)" 
              animationDuration={2500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
