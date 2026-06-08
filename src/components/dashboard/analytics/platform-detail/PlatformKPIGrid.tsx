import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getKpisForPlatform } from "./platformConfigs";
import type { AccountMetric } from "./usePlatformDetail";

interface PlatformKPIGridProps {
  platformId: string;
  metrics: AccountMetric[];
  loading: boolean;
}

function formatValue(value: number | null | undefined, format: "number" | "percent" | "duration"): string {
  if (value === null || value === undefined) return "—";
  switch (format) {
    case "percent":
      return `${Number(value).toFixed(1)}%`;
    case "duration": {
      const mins = Math.floor(Number(value) / 60);
      const secs = Math.round(Number(value) % 60);
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }
    default:
      return Number(value).toLocaleString();
  }
}

function computeKpiValue(key: string, metrics: AccountMetric[]): number | null {
  if (metrics.length === 0) return null;

  const latest = metrics[metrics.length - 1];
  switch (key) {
    case "followers":
      return latest.followers ?? null;
    case "subscribers":
      return latest.followers ?? null;
    case "members":
      return latest.followers ?? null;
    case "views":
      return latest.views ?? null;
    case "likes":
      return latest.likes ?? null;
    case "reach":
      return latest.reach ?? null;
    case "profileVisits":
      return latest.profile_visits ?? null;
    case "impressions":
      return latest.views ?? null;
    case "clicks":
      return latest.shares ?? null;
    case "engagementRate": {
      const eng = (latest.likes || 0) + (latest.comments || 0) + (latest.shares || 0);
      const base = latest.reach || latest.views || 1;
      return (eng / base) * 100;
    }
    case "tweets":
    case "posts":
      return latest.posts_count ?? null;
    case "messagesSent":
      return latest.posts_count ?? null;
    case "messagesDelivered":
      return latest.reach ?? null;
    case "successRate": {
      const sent = latest.posts_count || 1;
      const delivered = latest.reach || 0;
      return (delivered / sent) * 100;
    }
    case "watchTime":
      return latest.views ?? null;
    case "avgViewDuration":
      return latest.engagement_rate ?? null;
    case "engagement":
      return (latest.likes || 0) + (latest.comments || 0) + (latest.shares || 0);
    default:
      return null;
  }
}

export const PlatformKPIGrid = memo(({ platformId, metrics, loading }: PlatformKPIGridProps) => {
  const kpis = getKpisForPlatform(platformId);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpis.map((kpi) => {
        if (loading) {
          return (
            <div key={kpi.key} className="p-4 rounded-xl bg-muted/20 border border-border/50">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
          );
        }
        const value = computeKpiValue(kpi.key, metrics);
        return (
          <div
            key={kpi.key}
            className="p-4 rounded-xl bg-muted/20 border border-border/50 group relative"
          >
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">
              {kpi.label}
            </p>
            <p className={cn("text-xl font-bold", value === null ? "text-muted-foreground" : "")}>
              {formatValue(value, kpi.format)}
            </p>
            {value === null && (
              <span className="text-[9px] text-muted-foreground/50 italic block mt-0.5">
                Coletor ainda não habilitado
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

PlatformKPIGrid.displayName = "PlatformKPIGrid";
