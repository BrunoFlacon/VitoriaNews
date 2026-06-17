import { useState, memo, useCallback, useMemo } from "react";
import { ArrowLeft, RefreshCw, Calendar, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { usePlatformDetail } from "./usePlatformDetail";
import { PlatformSelector } from "./PlatformSelector";
import { PlatformProfileHeader } from "./PlatformProfileHeader";
import { PlatformKPIGrid } from "./PlatformKPIGrid";
import { PlatformCharts } from "./PlatformCharts";
import { PlatformChartsExpanded } from "./PlatformChartsExpanded";
import { PlatformPostsTable } from "./PlatformPostsTable";
import { PlatformAudienceGeo } from "./PlatformAudienceGeo";
import { getPlatformName } from "./platformConfigs";

interface PlatformDetailTabProps {
  dateRange?: { start: string; end: string } | null;
  onBack?: () => void;
  initialPlatform?: string;
}

export const PlatformDetailTab = memo(({ dateRange, onBack, initialPlatform }: PlatformDetailTabProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(initialPlatform || null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<'none' | 'previous' | 'year_ago'>('none');

  const {
    accounts,
    metrics,
    posts,
    loading,
    selectedAccountId: resolvedAccountId,
    refetch,
  } = usePlatformDetail(selectedPlatform, selectedAccountId, dateRange);

  const hasData = socialPlatforms.filter(p => p.type === "social" || p.type === "messaging");

  const handleSelectAccount = useCallback((id: string) => {
    setSelectedAccountId(id);
  }, []);

  const prevDateRange = useMemo(() => {
    if (compareMode === 'none' || !dateRange) return null;
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const diff = end.getTime() - start.getTime();
    if (compareMode === 'previous') {
      return { start: new Date(start.getTime() - diff).toISOString(), end: start.toISOString() };
    }
    return { start: new Date(start.getTime() - diff - 365 * 24 * 60 * 60 * 1000).toISOString(), end: new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString() };
  }, [compareMode, dateRange]);

  const { metrics: prevMetrics } = usePlatformDetail(compareMode !== 'none' ? selectedPlatform : null, selectedAccountId, prevDateRange);

  if (!selectedPlatform) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Selecione uma plataforma para ver o detalhamento:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {hasData.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelectedPlatform(p.id); setSelectedAccountId(null); }}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                selectedPlatform === p.id
                  ? "border-primary/60 bg-primary/10 scale-105 ring-1 ring-primary/30"
                  : "bg-muted/20 border-border/50 hover:border-primary/30 hover:bg-muted/40"
              )}
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", p.color)}>
                <p.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-center">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const info = accounts.find((a) => a.id === resolvedAccountId);

  const latestMetric = metrics[metrics.length - 1];
  const demographics = latestMetric ? {
    topCountries: [] as { name: string; value: number; pct?: number }[],
    topCities: [] as { name: string; value: number }[],
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <p className="text-sm font-bold">{getPlatformName(selectedPlatform)}</p>
            <p className="text-[10px] text-muted-foreground">Detalhamento e métricas por plataforma</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dateRange && (
            <div className="flex items-center gap-1 bg-muted/20 rounded-lg p-0.5">
              {(['none', 'previous', 'year_ago'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setCompareMode(mode)}
                  className={cn(
                    "text-[9px] px-2 py-1 rounded-md font-bold uppercase transition-all",
                    compareMode === mode ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
                  )}
                >
                  {mode === 'none' ? 'Atual' : mode === 'previous' ? 'vs Anterior' : 'vs Ano Ant.'}
                </button>
              ))}
            </div>
          )}
          <PlatformSelector
            platformId={selectedPlatform}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelect={handleSelectAccount}
          />
          <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <PlatformProfileHeader
        account={info || null}
        platformId={selectedPlatform}
        followerCount={latestMetric?.followers || undefined}
        postCount={posts.length}
      />

      <PlatformKPIGrid platformId={selectedPlatform} metrics={metrics} loading={loading} previousMetrics={prevMetrics} />

      <PlatformCharts platformId={selectedPlatform} metrics={metrics} loading={loading} />

      <PlatformChartsExpanded platformId={selectedPlatform} metrics={metrics} posts={posts} loading={loading} />

      <PlatformAudienceGeo
        topCountries={demographics?.topCountries}
        topCities={demographics?.topCities}
      />

      <div>
        <p className="text-sm font-bold mb-3">Posts Publicados</p>
        <PlatformPostsTable platformId={selectedPlatform} posts={posts} loading={loading} />
      </div>
    </div>
  );
});

PlatformDetailTab.displayName = "PlatformDetailTab";
