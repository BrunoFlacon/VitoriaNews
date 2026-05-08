import React, { memo } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from "recharts";
import { Card } from "@/components/ui/card";

interface PlatformDistributionProps {
  platformBreakdown: Record<string, number>;
  COLORS: string[];
}

export const PlatformDistribution = memo(({ platformBreakdown, COLORS }: PlatformDistributionProps) => {
  const pieData = Object.entries(platformBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <Card className="p-6 shadow-2xl border-white/10 bg-white/5 backdrop-blur-xl">
      <h3 className="font-display font-black text-lg text-foreground uppercase tracking-widest mb-6">Mix de Audiência</h3>
      <div className="h-[300px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={8}
              dataKey="value"
              animationDuration={1500}
              stroke="none"
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  className="hover:opacity-80 transition-opacity cursor-pointer shadow-xl"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' }}
                />
              ))}
            </Pie>
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                border: 'none', 
                borderRadius: '12px', 
                color: '#fff',
                backdropFilter: 'blur(12px)'
              }}
              itemStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Total</span>
          <span className="text-2xl font-black tracking-tighter">
            {pieData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="mt-6 space-y-2">
        {pieData.map((entry, index) => (
          <div key={entry.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{entry.name}</span>
            </div>
            <span className="text-xs font-bold">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});
