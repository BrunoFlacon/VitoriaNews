import { memo } from "react";
import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
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
  color = "primary",
  delay = 0,
}: StatsCardProps) => {
  const isPositive = trend && trend > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={cn(
        "glass-card rounded-2xl p-6 bg-gradient-to-br border",
        colorStyles[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-3xl font-display font-bold mt-2">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-green-500" : "text-red-500"
              )}>
                {isPositive ? "+" : ""}{trend}%
              </span>
              {trendLabel && (
                <span className="text-xs text-muted-foreground ml-1">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconColors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
});

StatsCard.displayName = "StatsCard";
