import React, { memo, useState, useMemo, useCallback, useRef, useEffect, startTransition } from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, Heart, Share2, TrendingUp, Users, 
  Settings, Clock, Activity, AlertCircle, BarChart3,
  Calendar, ArrowUpRight,
  RefreshCw, Check, MessageCircle, MessageSquare, Zap, Globe,
  FileDown, DollarSign
} from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialStats } from "@/hooks/useSocialStats";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { cn, normalizePlatform } from "@/lib/utils";

// Modular Components
import { AnalyticsHeader } from "./analytics/AnalyticsHeader";
import { StatsGrid } from "./analytics/StatsGrid";
import { EngagementChart } from "./analytics/EngagementChart";
import { PlatformDistribution } from "./analytics/PlatformDistribution";
import { AudienceTracking } from "./analytics/AudienceTracking";
import { FollowersGrowth } from "./analytics/FollowersGrowth";
import { AnalyticsDetailedReports } from "./analytics/AnalyticsDetailedReports";
import { AudienceDemographics } from "./analytics/AudienceDemographics";
import { AudienceMetricsPanel } from "./analytics/AudienceMetricsPanel";
import { FormatRecommendations } from "./analytics/FormatRecommendations";
import { FormatReachChart } from "./analytics/FormatReachChart";
import { ViralPotentialChart } from "./analytics/ViralPotentialChart";
import { RetentionFunnelChart } from "./analytics/RetentionFunnelChart";

import { YouTubeSummaryCards } from "./analytics/YouTubeSummaryCards";
import { YouTubePerformanceChart } from "./analytics/YouTubePerformanceChart";
import { YouTubeEngagementChart } from "./analytics/YouTubeEngagementChart";
import { YouTubeAudienceCharts } from "./analytics/YouTubeAudienceCharts";
import { YouTubeShortsInsights } from "./analytics/YouTubeShortsInsights";
import { AnalyticsSkeleton } from "./analytics/AnalyticsSkeleton";

import { socialPlatforms, getPlatformDetails } from "@/components/icons/platform-metadata";
import { TrendsView } from "./TrendsView";
import { PlatformDetailTab } from "./analytics/platform-detail/PlatformDetailTab";
import { PlatformDetailInline } from "./analytics/PlatformDetailInline";
import { VideoRetentionChart } from "./VideoRetentionChart";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { exportToXLSX } from "@/utils/exportAnalytics";

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

interface IntegrationCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  stats?: Record<string, number>;
  statLabels: Record<string, string>;
  formatValue?: (key: string, value: number) => string;
  onConnect?: () => void;
}

const IntegrationCard = memo(({ title, icon: Icon, color, bg, stats, statLabels, formatValue, onConnect }: IntegrationCardProps) => {
  const hasPositiveValue = stats && Object.values(stats).some(v => v > 0);
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 hover:border-border transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-[10px] text-muted-foreground">{hasPositiveValue ? 'Com dados' : 'Configure nas APIs'}</p>
        </div>
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(statLabels).map(([key, label]) => {
            const val = stats[key] ?? 0;
            return (
              <div key={key}>
                <p className="text-lg font-bold text-white">{formatValue ? formatValue(key, val) : val.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase">{label}</p>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2">
        <button onClick={onConnect} className="text-[10px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2">
          Configurar em APIs Sociais & Dev →
        </button>
      </div>
    </div>
  );
});

const PERIOD_OPTIONS = [
  { value: '24h', label: 'Últimas 24 horas' },
  { value: '3d', label: 'Últimos 3 dias' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '15d', label: 'Últimos 15 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '60d', label: 'Últimos 60 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '120d', label: 'Últimos 120 dias' },
  { value: '365d', label: 'Último 1 ano' },
  { value: '730d', label: 'Últimos 2 anos' },
  { value: '1825d', label: 'Últimos 5 anos' },
  { value: 'all', label: 'Todo o histórico' },
];

interface AdvancedAnalyticsProps {
  onNavigate?: (tab: string, settingsSubTab?: string) => void;
}

export const AdvancedAnalytics = ({ onNavigate }: AdvancedAnalyticsProps = {}) => {
  const { 
    data: fetchedData, loading, error,
    period, setPeriod, 
    platform, setPlatform, 
    syncAnalytics, isSyncingAll,
    dateRange, setDateRange,
    refetch
  } = useAnalytics();
  
  const { user } = useAuth();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [platformMetricsReady, setPlatformMetricsReady] = useState(false);
  useEffect(() => { setPlatformMetricsReady(true); }, []);

  const data = fetchedData || {
    overview: { totalPosts: 0, publishedPosts: 0, scheduledPosts: 0, failedPosts: 0, draftPosts: 0, publishRate: 0, totalFollowers: 0 },
    engagement: { views: 0, likes: 0, comments: 0, shares: 0, reach: 0, engagementRate: 0, growth: 0 },
    chartData: [],
    platformBreakdown: {},
    topContent: [],
    bestTimes: [],
    followerData: [],
    messageStats: { totalSent: 0, totalFailed: 0, successRate: 0, platformStats: {} },
    period: "30d",
    generatedAt: new Date().toISOString(),
    dataSource: "demo"
  };

  const {
    audienceBreakdown, lastUpdated, demographics,
    totalSocialFollowers, totalMessagingMembers, totalPosts,
    connectedPlatforms, postStatusCounts, messageDeliveryStats: socialMessageStats,
  } = useSocialStats();

  const { retention, topContent: pmTopContent, bestTimes: pmBestTimes, formatRecs, isLoading: pmLoading } = usePlatformMetrics(
    platform === 'all' ? 'all' : normalizePlatform(platform),
    period,
    platformMetricsReady
  );

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [platformActiveProfile, setPlatformActiveProfile] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<'analytics' | 'trends' | 'platform-detail'>('analytics');
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [topContentFilter, setTopContentFilter] = useState<string>('all');
  const [bestTimesFilter, setBestTimesFilter] = useState<string>('all');
  const [audienceNetworkInfo, setAudienceNetworkInfo] = useState<string>('all');
  const [audienceTypeInfo, setAudienceTypeInfo] = useState<string>('all');
  const [audienceOnlineInfo, setAudienceOnlineInfo] = useState<string>('all');
  const [pieSelectedPlatform, setPieSelectedPlatform] = useState<string | null>(null);

  // Derived data for new analytic components
  const isRealtime = data.dataSource === 'real' || !!fetchedData;
  const hasYoutubeData = !!(data.youtubeStats && (data.youtubeStats.views > 0 || data.youtubeStats.likes > 0 || data.youtubeStats.comments > 0));
  const hasAdsData = !!(data.adsStats && (data.adsStats.impressions > 0 || data.adsStats.clicks > 0 || data.adsStats.spend > 0));
  const totalInteractions = data.engagement.likes + data.engagement.comments + data.engagement.shares;
  const totalFollowerCount = totalSocialFollowers + totalMessagingMembers;

  const formatReachData = useMemo(() => {
    if (!data.platformBreakdown || Object.keys(data.platformBreakdown).length === 0) return undefined;
    return Object.entries(data.platformBreakdown).map(([key, val]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: val.views || 0,
    }));
  }, [data.platformBreakdown]);

  const viralPotentialData = useMemo(() => {
    const seguidores = totalFollowerCount;
    const naoSeguidores = Math.max(0, totalInteractions - seguidores);
    if (totalInteractions === 0 && seguidores === 0) return undefined;
    return [
      { name: "Não Seguidores", value: naoSeguidores || 1 },
      { name: "Seguidores", value: seguidores || 1 },
    ];
  }, [totalInteractions, totalFollowerCount]);

  const retentionFunnelData = useMemo(() => {
    if (!retention || retention.length === 0) return undefined;
    const intervals = ['3s', '15s', '1min', '3min', '5min', '10min', '15min', '20min', '30min', '45min', '55min', '1h'];
    const filtered = retention.filter(r => r.duration && intervals.includes(r.duration));
    return filtered.length > 0 ? filtered.map(r => ({ name: r.duration, value: r.views || 0 })) : undefined;
  }, [retention]);



  const ytSummaryData = useMemo(() => {
    if (!data.youtubeStats) return undefined;
    return {
      views: data.youtubeStats.views,
      newSubscribers: data.youtubeStats.subscribersGained,
      watchTimeHours: data.youtubeStats.watchTimeMinutes ? Math.round(data.youtubeStats.watchTimeMinutes / 60 * 10) / 10 : undefined,
    };
  }, [data.youtubeStats]);

  // chartData contém dados agregados de todas as plataformas (inclui YouTube). Sem série temporal específica do YouTube no banco.
  const ytPerformanceData = useMemo(() => {
    if (!data.chartData || data.chartData.length === 0) return undefined;
    return data.chartData.map(d => ({ name: d.name, views: d.views || 0, watchTime: d.engagement || 0 }));
  }, [data.chartData]);

  const ytEngagementData = useMemo(() => {
    if (!data.youtubeStats) return undefined;
    return [
      { name: "Likes", value: data.youtubeStats.likes },
      { name: "Comentários", value: data.youtubeStats.comments },
      { name: "Compartilhamentos", value: data.engagement.shares },
    ].filter(d => d.value > 0);
  }, [data.youtubeStats, data.engagement.shares]);

  const ytAgeData = useMemo(() => {
    if (!demographics?.ageGroups || demographics.ageGroups.length === 0) return undefined;
    return demographics.ageGroups.map(a => ({ name: a.range, value: a.value }));
  }, [demographics]);

  const ytTrafficData = useMemo(() => {
    if (!hasYoutubeData) return undefined;
    // Dados de origem de tráfego requerem YouTube Analytics API (não disponível via Data API v3)
    return undefined;
  }, [hasYoutubeData]);

  // Shorts funnel requer YouTube Analytics API (não disponível via Data API v3)
  // O componente YouTubeShortsInsights já tem fallbacks visuais quando undefined
  const ytShortsFunnel = useMemo(() => {
    if (!data.youtubeStats) return undefined;
    return undefined;
  }, [data.youtubeStats]);

  const ytShortsSpectators = useMemo(() => {
    if (!hasYoutubeData) return undefined;
    return undefined;
  }, [hasYoutubeData]);

  // Sync pie selection to platform filter
  const prevPieRef = useRef<string | null>(null);
  useEffect(() => {
    if (pieSelectedPlatform !== prevPieRef.current) {
      prevPieRef.current = pieSelectedPlatform;
      startTransition(() => {
        setPlatform(pieSelectedPlatform ?? 'all');
      });
    }
  }, [pieSelectedPlatform, setPlatform]);

  const handleExportCSV = useCallback(() => {
    const demoData = demographics ? { ageGroups: demographics.ageGroups, gender: demographics.gender, devices: demographics.devices, topCities: demographics.topCities, topCountries: demographics.topCountries } : undefined;
    exportToXLSX({ ...data, demographics: demoData }, 'analytics');
    toast({ title: "XLSX Exportado", description: "Dados exportados com sucesso." });
  }, [data, demographics, toast]);

  useEffect(() => {
    const handleSearch = (e: any) => setSearchQuery((e.detail?.query || "").toLowerCase());
    window.addEventListener('system-search', handleSearch);
    return () => window.removeEventListener('system-search', handleSearch);
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    try {
      setIsExporting(true);
      toast({ title: "Gerando PDF", description: "Aguarde enquanto preparamos seu relatório..." });
      const canvas = await html2canvas(reportRef.current, { scale: 1, useCORS: true, backgroundColor: '#0f172a' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      pdf.save(`SocialHub_Report_${period}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "Sucesso!", description: "Relatório exportado com sucesso." });
    } catch (err) {
      console.error("PDF Export failed:", err);
      toast({ title: "Erro na exportação", description: "Problema ao gerar o PDF.", variant: "destructive" });
    } finally { setIsExporting(false); }
  }, [period, toast]);

  const globalPeakHour = useMemo(() => {
    const source = pmBestTimes.length > 0 ? pmBestTimes : data?.bestTimes;
    if (!source || source.length === 0) return null;
    const highest = [...source].sort((a, b) => b.engagement - a.engagement)[0];
    return `${highest.day} às ${highest.time}`;
  }, [data?.bestTimes, pmBestTimes]);

  const mergedTopContent = useMemo(() => {
    const merged = [...(data.topContent || [])];
    const edgeKeys = new Set(merged.map((item: any) => (item.content || item.title || "").trim().toLowerCase().slice(0, 80)));

    for (const pm of pmTopContent) {
      const pmKey = (pm.content || "").trim().toLowerCase().slice(0, 80);
      if (!pmKey || edgeKeys.has(pmKey)) continue;

      const existing = merged.find((item: any) =>
        (item.content || item.title || "").trim().toLowerCase().slice(0, 80) === pmKey
      );

      if (existing) {
        if (!existing.content && pm.content) existing.content = pm.content;
        if (!existing.platforms && pm.platforms) existing.platforms = pm.platforms;
        if (!existing.allPlatforms && pm.allPlatforms) existing.allPlatforms = pm.allPlatforms;
      } else {
        merged.push({ ...pm, views: pm.views || 0, engagement: (pm.likes || 0) + (pm.comments || 0) });
      }
    }

    return merged;
  }, [data.topContent, pmTopContent]);

  const filteredTopContent = useMemo(() => {
    if (!searchQuery) return mergedTopContent;
    return mergedTopContent.filter((item: any) =>
      (item.title || item.content || "").toLowerCase().includes(searchQuery) ||
      (item.platform || "").toLowerCase().includes(searchQuery)
    );
  }, [mergedTopContent, searchQuery]);

  const groupedFollowers = useMemo(() => {
    if (!data?.followerData) return [];
    
    const filtered = !searchQuery ? data.followerData : data.followerData.filter((item: any) => 
      (item.username || item.page_name || "").toLowerCase().includes(searchQuery) ||
      (item.platform || "").toLowerCase().includes(searchQuery)
    );

    const grouped = (filtered as any[]).reduce((acc: Record<string, any>, curr: any) => {
      if (!acc[curr.platform]) {
        acc[curr.platform] = { 
          platform: curr.platform, 
          totalFollowers: 0, 
          totalPosts: 0, 
          profiles: [], 
          _seen: new Set() 
        };
      }
      
      const u = (curr.username || curr.platform_user_id || "").toLowerCase().trim();
      if (!acc[curr.platform]._seen.has(u)) {
        acc[curr.platform]._seen.add(u);
        acc[curr.platform].totalFollowers += curr.currentFollowers || 0;
        acc[curr.platform].totalPosts += curr.postsCount || 0;
        acc[curr.platform].profiles.push(curr);
      }
      return acc;
    }, {});

    return Object.values(grouped).map((g: any) => { delete g._seen; return g; });
  }, [data?.followerData, searchQuery]);

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-8 pb-12 w-full animate-fade-in" style={{ contain: 'layout style paint' }}>
      <AnalyticsHeader 
        period={period} setPeriod={setPeriod}
        platform={platform} setPlatform={setPlatform}
        syncAnalytics={syncAnalytics} isSyncingAll={isSyncingAll}
        activeView={activeView} setActiveView={setActiveView}
        handleExportPDF={handleExportPDF} isExporting={isExporting}
        lastSyncedAt={data.overview.lastSyncedAt}
        dataSource={data.dataSource}
        PERIOD_OPTIONS={PERIOD_OPTIONS}
        dateRange={dateRange} setDateRange={setDateRange}
        refetch={refetch}
      />

      {data.dataSource === 'demo' && !data.chartData.some(d => d.views > 0 || d.engagement > 0) && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
          Dados de conectividade indisponíveis. Configure APIs Sociais para coletar métricas.
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono">
          Erro ao buscar analytics: {error}
        </div>
      )}

      <StatsGrid 
        engagement={data.engagement} 
        overview={{...data.overview, publishRate: Number(data.overview.publishRate || 0)}} 
        messageStats={data.messageStats} 
        chartData={data.chartData}
        dataSource={data.dataSource}
      />

      <AudienceMetricsPanel
        totalSocialFollowers={totalSocialFollowers}
        totalMessagingMembers={totalMessagingMembers}
        totalPosts={totalPosts}
        connectedPlatforms={connectedPlatforms}
        postStatusCounts={postStatusCounts}
        messageSuccessRate={socialMessageStats?.successRate ?? 0}
        messageTotalSent={socialMessageStats?.totalSent ?? 0}
        messageTotalFailed={socialMessageStats?.totalFailed ?? 0}
      />

      {platform !== 'all' && activeView === 'analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border border-primary/20 rounded-2xl p-4 md:p-6 bg-primary/5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Detalhamento — {platform}
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveView('platform-detail')}
              className="text-xs gap-1.5"
            >
              Ver completo <ArrowUpRight className="w-3 h-3" />
            </Button>
          </div>
          <PlatformDetailInline
            platformId={platform}
            period={period}
            dateRange={dateRange}
            onViewFull={() => setActiveView('platform-detail')}
          />
        </motion.div>
      )}

      {activeView === 'trends' ? (
        <TrendsView />
      ) : activeView === 'platform-detail' ? (
        <PlatformDetailTab initialPlatform={platform !== 'all' ? platform : undefined} dateRange={dateRange?.start && dateRange?.end ? { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() } : null} />
      ) : (
        <div ref={reportRef} className="space-y-8 animate-in fade-in duration-500 p-0.5 md:p-1 overflow-x-hidden" style={{ contain: 'layout style' }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-w-0">
            <div className="lg:col-span-2 min-w-0">
              <EngagementChart chartData={data.chartData} totalFollowers={totalSocialFollowers + totalMessagingMembers} />
            </div>
            <PlatformDistribution 
              platformBreakdown={data.platformBreakdown || {}} 
              COLORS={COLORS}
              onPieSelect={setPieSelectedPlatform}
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-sm uppercase text-muted-foreground px-1">Integrações Avançadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IntegrationCard
                title="Google Ads"
                icon={Activity}
                color="text-blue-400"
                bg="bg-blue-500/10"
                stats={data.adsStats ? { impressions: data.adsStats.impressions, clicks: data.adsStats.clicks, spend: data.adsStats.spend } : undefined}
                statLabels={{ impressions: 'Impressões', clicks: 'Cliques', spend: 'Gasto' }}
                formatValue={(k, v) => k === 'spend' ? `R$ ${v.toLocaleString('pt-BR')}` : v.toLocaleString('pt-BR')}
                onConnect={() => onNavigate?.('settings', 'api')}
              />
              <IntegrationCard
                title="YouTube Analytics"
                icon={Eye}
                color="text-red-400"
                bg="bg-red-500/10"
                stats={data.youtubeStats ? { views: data.youtubeStats.views, likes: data.youtubeStats.likes, comments: data.youtubeStats.comments } : undefined}
                statLabels={{ views: 'Visualizações', likes: 'Curtidas', comments: 'Comentários' }}
                onConnect={() => onNavigate?.('settings', 'api')}
              />
              <IntegrationCard
                title="Google Analytics 4"
                icon={Globe}
                color="text-indigo-400"
                bg="bg-indigo-500/10"
                stats={data.gaStats ? { views: data.gaStats.views } : undefined}
                statLabels={{ views: 'Page Views' }}
                onConnect={() => onNavigate?.('settings', 'api')}
              />
            </div>
          </div>

          <AudienceTracking 
            audienceBreakdown={audienceBreakdown}
            lastUpdated={lastUpdated ? new Date(lastUpdated).toISOString() : undefined}
            globalPeakHour={globalPeakHour}
            audienceNetworkInfo={audienceNetworkInfo} setAudienceNetworkInfo={setAudienceNetworkInfo}
            audienceTypeInfo={audienceTypeInfo} setAudienceTypeInfo={setAudienceTypeInfo}
            audienceOnlineInfo={audienceOnlineInfo} setAudienceOnlineInfo={setAudienceOnlineInfo}
            searchQuery={searchQuery}
            onNavigate={onNavigate}
          />

          <AudienceDemographics demographics={demographics} />

          <div className="space-y-2">
            <h3 className="font-bold text-sm uppercase text-muted-foreground px-1">Meta Insights</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormatReachChart data={formatReachData} />
              <ViralPotentialChart data={viralPotentialData} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RetentionFunnelChart data={retentionFunnelData} />
              <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Meta Ads</h3>
                    <p className="text-[10px] text-muted-foreground">{hasAdsData ? 'Gastos com anúncios' : 'Configure nas APIs Meta para ver dados'}</p>
                  </div>
                </div>
                {hasAdsData ? (
                  <>
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 text-center">
                      <p className="text-blue-100 font-semibold text-xs uppercase tracking-wider mb-1">Total Gasto</p>
                      <h2 className="text-3xl font-bold text-white">R$ {data.adsStats!.spend.toFixed(2)}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center">
                        <p className="text-lg font-bold">{data.adsStats!.impressions.toLocaleString('pt-BR')}</p>
                        <p className="text-[10px] text-muted-foreground">Impressões</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{data.adsStats!.clicks.toLocaleString('pt-BR')}</p>
                        <p className="text-[10px] text-muted-foreground">Cliques</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                    <DollarSign className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Conecte o Meta Ads para acompanhar gastos</p>
                    <button onClick={() => onNavigate?.('settings', 'api')} className="mt-2 text-xs text-primary hover:underline underline-offset-2">
                      Configurar em APIs Sociais & Dev →
                    </button>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-sm uppercase text-muted-foreground px-1">YouTube Insights</h3>
            <YouTubeSummaryCards data={ytSummaryData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <YouTubePerformanceChart data={ytPerformanceData} />
              <YouTubeEngagementChart data={ytEngagementData} />
            </div>
            <YouTubeAudienceCharts ageData={ytAgeData} trafficData={ytTrafficData} />
            <YouTubeShortsInsights funnelData={ytShortsFunnel} spectators={ytShortsSpectators} />
          </div>

          <FormatRecommendations data={formatRecs} />

          <FollowersGrowth 
            groupedFollowers={groupedFollowers}
            selectedProfileId={selectedProfileId}
            setSelectedProfileId={setSelectedProfileId}
            platformActiveProfile={platformActiveProfile}
            setPlatformActiveProfile={setPlatformActiveProfile}
            onNavigate={onNavigate}
          />

          <AnalyticsDetailedReports 
            bestTimes={data.bestTimes}
            bestTimesFilter={bestTimesFilter}
            setBestTimesFilter={setBestTimesFilter}
            filteredTopContent={filteredTopContent}
            topContentFilter={topContentFilter}
            setTopContentFilter={setTopContentFilter}
            messageStats={data.messageStats}
            audienceBreakdown={audienceBreakdown}
          />

          {(platform === 'all' || platform === 'facebook') && retention.length > 0 && (
            <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow">
              <h3 className="font-bold text-sm mb-4 uppercase text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" />
                Retenção de Vídeo (Facebook)
              </h3>
              <VideoRetentionChart data={retention} totalViews={data.engagement.views} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalytics;
