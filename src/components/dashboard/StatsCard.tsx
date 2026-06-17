import { memo } from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  trendType?: 'growth' | 'ratio';
  color?: "primary" | "accent" | "success" | "warning";
  delay?: number;
}

const colorStyles = {
  primary: "from-primary/20 to-primary/5 border-primary/20",
  accent: "from-accent/20 to-accent/5 border-accent/20",
  success: "from-green-500/20 to-green-500/5 border-green-500/20",
  warning: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/20",
};

const iconColors = {
  primary: "text-primary bg-primary/10",
  accent: "text-accent bg-accent/10",
  success: "text-green-500 bg-green-500/10",
  warning: "text-yellow-500 bg-yellow-500/10",
};

export const StatsCard = memo(({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  trendType = 'growth',
  color = "primary",
  delay = 0,
}: StatsCardProps) => {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;
  const showTrend = trend !== undefined;

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-3 md:p-4 bg-gradient-to-br border animate-fade-in",
        colorStyles[color]
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards', contain: 'layout paint' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-[10px] md:text-xs font-medium">{title}</p>
          <p className="text-lg md:text-2xl font-display font-bold mt-1">{value}</p>
          {showTrend && trendType === 'growth' && (
            <div className="flex items-center gap-1 mt-1 md:mt-2">
              {isPositive ? (
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
              )}
              <span className={cn(
                "text-[10px] md:text-sm font-medium",
                isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
              )}>
                {isPositive ? "+" : ""}{trend}%
              </span>
              {trendLabel && (
                <span className="text-[10px] md:text-xs text-muted-foreground ml-1 truncate">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
          {showTrend && trendType === 'ratio' && (
            <div className="flex items-center gap-1 mt-1 md:mt-2">
              <span className="text-[10px] md:text-sm font-medium text-muted-foreground">
                {trend}
              </span>
              {trendLabel && (
                <span className="text-[10px] md:text-xs text-muted-foreground ml-1 truncate">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={cn("p-2 md:p-3 rounded-xl", iconColors[color])}>
          <Icon className="w-4 h-4 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
});

StatsCard.displayName = "StatsCard";