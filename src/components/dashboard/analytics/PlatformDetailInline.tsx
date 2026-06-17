import { memo } from "react";
import { ArrowUpRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformDetail } from "./platform-detail/usePlatformDetail";
import { PlatformKPIGrid } from "./platform-detail/PlatformKPIGrid";
import { PlatformCharts } from "./platform-detail/PlatformCharts";
import { PlatformChartsExpanded } from "./platform-detail/PlatformChartsExpanded";
import { PlatformProfileHeader } from "./platform-detail/PlatformProfileHeader";
import { getPlatformName } from "./platform-detail/platformConfigs";

interface PlatformDetailInlineProps {
  platformId: string;
  period?: string;
  dateRange?: { start: Date | null; end: Date | null };
  onViewFull?: () => void;
}

export const PlatformDetailInline = memo(({ platformId, dateRange, onViewFull }: PlatformDetailInlineProps) => {
  const dr = dateRange?.start && dateRange?.end
    ? { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() }
    : null;

  const { accounts, metrics, posts, loading, selectedAccountId } = usePlatformDetail(platformId, null, dr);
  const info = accounts.find(a => a.id === selectedAccountId);

  if (loading && accounts.length === 0 && metrics.length === 0) return null;

  return (
    <div className="space-y-4">
      <PlatformProfileHeader
        account={info || null}
        platformId={platformId}
        followerCount={metrics[metrics.length - 1]?.followers || undefined}
        postCount={posts.length}
      />

      <PlatformKPIGrid platformId={platformId} metrics={metrics} loading={loading} />

      <PlatformCharts platformId={platformId} metrics={metrics} loading={loading} />

      <PlatformChartsExpanded platformId={platformId} metrics={metrics} posts={posts} loading={loading} />

      {onViewFull && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={onViewFull} className="text-xs gap-1.5">
            Ver detalhamento completo <ArrowUpRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
});

PlatformDetailInline.displayName = "PlatformDetailInline";