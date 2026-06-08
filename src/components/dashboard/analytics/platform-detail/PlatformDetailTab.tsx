import { useState, memo, useCallback } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { usePlatformDetail } from "./usePlatformDetail";
import { PlatformSelector } from "./PlatformSelector";
import { PlatformProfileHeader } from "./PlatformProfileHeader";
import { PlatformKPIGrid } from "./PlatformKPIGrid";
import { PlatformCharts } from "./PlatformCharts";
import { PlatformPostsTable } from "./PlatformPostsTable";
import { getPlatformName } from "./platformConfigs";

interface PlatformDetailTabProps {
  dateRange?: { start: string; end: string } | null;
  onBack?: () => void;
}

export const PlatformDetailTab = memo(({ dateRange, onBack }: PlatformDetailTabProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

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

  if (!selectedPlatform) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Selecione uma plataforma para ver o detalhamento:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {hasData.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelectedPlatform(p.id); setSelectedAccountId(null); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/20 border border-border/50 hover:border-primary/30 hover:bg-muted/40 transition-all"
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
        followerCount={metrics[metrics.length - 1]?.followers || undefined}
        postCount={posts.length}
      />

      <PlatformKPIGrid platformId={selectedPlatform} metrics={metrics} loading={loading} />

      <PlatformCharts platformId={selectedPlatform} metrics={metrics} loading={loading} />

      <div>
        <p className="text-sm font-bold mb-3">Posts Publicados</p>
        <PlatformPostsTable platformId={selectedPlatform} posts={posts} loading={loading} />
      </div>
    </div>
  );
});

PlatformDetailTab.displayName = "PlatformDetailTab";
