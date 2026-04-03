import { TrendingUp, Activity, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PoliticalTrend } from "@/lib/social-sdk/types";

interface TrendCardProps {
  trend: PoliticalTrend;
}

export const TrendCard = ({ trend }: TrendCardProps) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positivo': return 'text-green-500 bg-green-500/10';
      case 'negativo': return 'text-red-500 bg-red-500/10';
      default: return 'text-blue-500 bg-blue-500/10';
    }
  };

  return (
    <Card className="bg-card/50 border-white/5 hover:bg-card/80 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <TrendingUp className="w-12 h-12" />
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge className={getSentimentColor(trend.sentiment)}>
            {trend.sentiment}
          </Badge>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {trend.velocity.toFixed(1)}x Vel.
          </span>
        </div>
        <CardTitle className="text-lg font-black mt-2 group-hover:text-primary transition-colors">
          {trend.keyword}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Menções</span>
            <span className="text-xl font-black text-white">{trend.mentions.toLocaleString()}</span>
          </div>
          <div className="h-8 w-[1px] bg-white/5" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Impacto</span>
            <div className="flex items-center gap-1">
              <span className="text-xl font-black text-primary">{(trend.velocity * 10).toFixed(0)}%</span>
              <BarChart3 className="w-3 h-3 text-primary" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
