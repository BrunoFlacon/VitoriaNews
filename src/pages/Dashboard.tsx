import { useState, useEffect, useRef, lazy, Suspense, useMemo, useCallback, startTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useScheduledPosts, ScheduledPost } from "@/hooks/useScheduledPosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSocialStats } from "@/hooks/useSocialStats";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { cn, normalizePlatform } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';

// Core UI Components
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { DashboardHomeView } from "@/components/dashboard/DashboardHomeView";

// Lazy load non-critical components
const NotificationsPanel = lazy(() => import("@/components/dashboard/NotificationsPanel").then(m => ({ default: m.NotificationsPanel })));
const SystemFooter = lazy(() => import("@/components/SystemFooter").then(m => ({ default: m.SystemFooter })));

// Views lazy-loaded
const CreatePostPanel = lazy(() => import("@/components/dashboard/CreatePostPanel").then(m => ({ default: m.CreatePostPanel })));
const CalendarView = lazy(() => import("@/components/dashboard/CalendarView").then(m => ({ default: m.CalendarView })));
const AdvancedAnalytics = lazy(() => import("@/components/dashboard/AdvancedAnalytics").then(m => ({ default: m.AdvancedAnalytics })));
const StoriesLivesView = lazy(() => import("@/components/dashboard/StoriesLivesView").then(m => ({ default: m.StoriesLivesView })));
const DocumentsView = lazy(() => import("@/components/dashboard/DocumentsView").then(m => ({ default: m.DocumentsView })));
const MessagingView = lazy(() => import("@/components/dashboard/MessagingView").then(m => ({ default: m.MessagingView })));
const SettingsView = lazy(() => import("@/components/dashboard/SettingsView").then(m => ({ default: m.SettingsView })));
const MediaGalleryView = lazy(() => import("@/components/dashboard/MediaGalleryView").then(m => ({ default: m.MediaGalleryView })));
const NotificationsFullView = lazy(() => import("@/components/dashboard/NotificationsFullView").then(m => ({ default: m.NotificationsFullView })));
const NewsPortal = lazy(() => import("@/components/dashboard/NewsPortal"));
const PortalSettingsWrapper = lazy(() => import("@/components/dashboard/settings/PortalSettingsWrapper").then(m => ({ default: m.PortalSettingsWrapper })));
const ManualView = lazy(() => import("@/components/dashboard/ManualView").then(m => ({ default: m.ManualView })));
const RobotBuilder = lazy(() => import("./RobotBuilder"));
const CronMonitorView = lazy(() => import("@/components/dashboard/CronMonitorView").then(m => ({ default: m.CronMonitorView })));
const SocialNetworksView = lazy(() => import("@/components/dashboard/SocialNetworksView").then(m => ({ default: m.SocialNetworksView })));
const FloatingWhatsApp = lazy(() => import("@/components/dashboard/FloatingWhatsApp").then(m => ({ default: m.FloatingWhatsApp })));

const ViewLoader = () => (
  <div className="flex items-center justify-center py-10 min-h-[200px]">
    <div className="relative scale-75">
      <div className="w-10 h-10 border-4 border-primary/10 rounded-full" />
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
    </div>
  </div>
);

const Dashboard = () => {
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dashboard");
  const [settingsSubTab, setSettingsSubTab] = useState<string | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [preSelectedDate, setPreSelectedDate] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const [isMobilePlatformMenuOpen, setIsMobilePlatformMenuOpen] = useState(false);
  // Cache for heavy chart computations
  const snapshotsCache = useRef<{ key: string; data: any }>({ key: '', data: null });
  const chartCache = useRef<{ key: string; data: any }>({ key: '', data: null });
  // TAB INTELLIGENCE: Only fetch data for active tabs
  const isDashboardTab = activeTab === 'dashboard';
  const isAnalyticsTab = activeTab === 'analytics' || isDashboardTab;
  const isCalendarTab = activeTab === 'calendar' || activeTab === 'create' || isDashboardTab;
  
  const { stats: localStats, socialStats: localSocialStats, messagingStats: localMessagingStats, messagingChannels, audienceBreakdown, totalSocialFollowers, totalMessagingMembers, loading: statsLoading } = useSocialStats({ enabled: isDashboardTab });
  const { data: analyticsData, loading: analyticsLoading, isSyncingAll: analyticsSyncing, syncAnalytics, platform: analyticsPlatform, setPlatform: setAnalyticsPlatform, period: analyticsPeriod, setPeriod: setAnalyticsPeriod } = useAnalytics({ enabled: isAnalyticsTab && statsLoading === false });

  // Query account_metrics for real time-series chart data when Edge Function has none
  const { data: accountMetricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['account_metrics', user?.id, 'v3'],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('account_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('collected_at', { ascending: true });
      if (error) { console.warn('[Dashboard] account_metrics query failed:', error); return []; }
      return data || [];
    },
    enabled: isDashboardTab && !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 3000,
  });
  // Auto-sync when data is missing from both Edge Function and local DB
  const hasAutoSynced = useRef(false);
  const hasAutoSyncedChart = useRef(false);
  useEffect(() => {
    if (hasAutoSynced.current && hasAutoSyncedChart.current) return;
    if (analyticsLoading || analyticsSyncing) return;
    if (!analyticsData) return;
    const hasApiChartData = (analyticsData.chartData?.length ?? 0) > 0;
    const hasEngagement = (analyticsData.engagement?.views ?? 0) > 0;
    const hasLocalStats = localStats?.some(s => s.followers_count > 0 || s.posts_count > 0);
    const hasAccountMetrics = (accountMetricsData ?? []).length > 0;
    const needsSync = (!hasApiChartData && !hasLocalStats) || (hasEngagement && !hasApiChartData && !hasAccountMetrics);
    if (needsSync) {
      hasAutoSynced.current = true;
      hasAutoSyncedChart.current = true;
      // Defer to avoid blocking paint
      const scheduleSync = () => syncAnalytics();
      if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(scheduleSync, { timeout: 2000 });
        return () => cancelIdleCallback(id);
      } else {
        const id = setTimeout(scheduleSync, 1000);
        return () => clearTimeout(id);
      }
    }
  }, [analyticsData, analyticsLoading, analyticsSyncing, localStats, accountMetricsData, syncAnalytics]);
  const [platformState, setPlatformState] = useState<string>(analyticsPlatform ?? 'all');
  const setPlatform = useCallback((p: string) => {
    setPlatformState(p);
    setAnalyticsPlatform(p);
  }, [setAnalyticsPlatform]);
  const { connections } = useSocialConnections();
  const { 
    posts: scheduledPosts, 
    loading: scheduledPostsLoading, 
    createPost, 
    updatePost, 
    deletePost, 
    submitForApproval, 
    approvePost, 
    rejectPost, 
    refetch: refetchScheduledPosts 
  } = useScheduledPosts({ enabled: isCalendarTab });

  // Sync activeTab with URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const subTabFromUrl = searchParams.get("subtab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      startTransition(() => setActiveTab(tabFromUrl));
    }
    if (subTabFromUrl) {
      setSettingsSubTab(subTabFromUrl);
    }
  }, [searchParams]);

  // Listen for navigate-to-kanban event from CarrosselView (Rascunho action)
  useEffect(() => {
    const handler = () => setActiveTab("calendar");
    window.addEventListener("navigate-to-kanban", handler);
    return () => window.removeEventListener("navigate-to-kanban", handler);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
      toast({
        title: "Sessão encerrada",
        description: "Você foi deslogado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao sair",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  }, [logout, navigate, toast]);

  const handleTabChange = useCallback((tab: string) => {
    startTransition(() => {
      setActiveTab(tab);
      if (tab !== 'settings') setSettingsSubTab(undefined);
    });
  }, []);

  const handleNotificationsClick = useCallback(() => setShowNotifications(true), []);
  const handleHeaderNavigate = useCallback((tab: string, subTab?: string) => {
    handleTabChange(tab);
    if (subTab) setSettingsSubTab(subTab);
  }, [handleTabChange]);

  const handleEditPost = useCallback((post: ScheduledPost) => {
    if (post.media_type === "carousel") {
      setSearchParams({ tab: "stories", subtab: "carrosseis", edit: post.id });
    } else {
      setEditingPost(post);
      setActiveTab("create");
    }
  }, [setSearchParams]);

  const connectedPlatforms = useMemo(() => 
    socialPlatforms.filter(p => connections?.some(c => c.platform === p.id)),
    [connections]
  );

  const isConnected = useCallback((platformId: string) => {
    return connections?.some(c => c.platform === platformId) || false;
  }, [connections]);

  const localTotalPosts = useMemo(() => 
    localSocialStats?.reduce((acc, curr) => acc + curr.posts_count, 0) || 0,
    [localSocialStats]
  );

  const localEngagement = useMemo(() => 
    localSocialStats?.reduce((acc, curr) => acc + curr.likes_count + curr.comments_count + curr.shares_count, 0) || 0,
    [localSocialStats]
  );

  const localFollowers = useMemo(() => 
    localSocialStats?.reduce((acc, curr) => acc + (curr.followers_count || 0), 0) || 0,
    [localSocialStats]
  );

  const localMessagingMembersCount = useMemo(() =>
    localMessagingStats?.reduce((acc, curr) => acc + (curr.followers_count || 0), 0) || totalMessagingMembers || 0,
    [localMessagingStats, totalMessagingMembers]
  );

  // Per-metric growth with cache
  const metricGrowth = useMemo(() => {
    const metrics = (accountMetricsData ?? []) as any[];
    if (metrics.length < 3) return null;
    const sorted = [...metrics].sort((a, b) =>
      new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid);
    const newer = sorted.slice(mid);

    const calcGrowth = (key: string): string | undefined => {
      const avg = (arr: any[], k: string) => {
        if (k === 'engagement') {
          return arr.reduce((s: number, r: any) => s + Number(r.likes || 0) + Number(r.comments || 0) + Number(r.shares || 0), 0) / arr.length;
        }
        return arr.reduce((s: number, r: any) => s + Number(r[k] || 0), 0) / arr.length;
      };
      const oldVal = avg(older, key);
      const newVal = avg(newer, key);
      if (oldVal === 0) return undefined;
      const pct = ((newVal - oldVal) / oldVal) * 100;
      if (Math.abs(pct) < 1) return "0";
      return pct.toFixed(1);
    };

    return {
      views: calcGrowth('views'),
      engagement: calcGrowth('engagement'),
      followers: calcGrowth('followers'),
    };
  }, [accountMetricsData]);

  // Pre-process raw metrics into daily snapshots per account with ref cache
  const accountDailySnapshots = useMemo(() => {
    const metrics = (accountMetricsData ?? []) as any[];
    if (metrics.length === 0) return null;

    const cacheKey = `${(accountMetricsData ?? []).length}-${platformState}`;
    if (snapshotsCache.current.key === cacheKey) return snapshotsCache.current.data;

    const filtered = platformState !== 'all'
      ? metrics.filter((m: any) => normalizePlatform(m.platform) === platformState)
      : metrics;

    if (filtered.length === 0) return null;

    const grouped = new Map<string, any>();
    for (let i = 0; i < filtered.length; i++) {
      const m = filtered[i];
      const d = new Date(m.collected_at);
      const y = d.getFullYear();
      const mo = d.getMonth() + 1;
      const dd = d.getDate();
      const dateKey = `${y}-${mo < 10 ? '0' + mo : mo}-${dd < 10 ? '0' + dd : dd}`;
      const accountKey = `${m.platform}-${m.platform_user_id || m.id}`;
      const dedupKey = `${accountKey}-${dateKey}`;
      const existing = grouped.get(dedupKey);
      if (!existing || new Date(m.collected_at) > new Date(existing.collected_at)) {
        grouped.set(dedupKey, {
          views: Number(m.views || 0),
          likes: Number(m.likes || 0),
          comments: Number(m.comments || 0),
          shares: Number(m.shares || 0),
          engagement: Number(m.likes || 0) + Number(m.comments || 0) + Number(m.shares || 0),
          reach: Math.round(Number(m.views || 0) * 0.35),
          dateKey,
          accountKey,
          collected_at: m.collected_at,
        });
      }
    }

    const accountGroups = new Map<string, any[]>();
    for (const snap of grouped.values()) {
      const key = snap.accountKey;
      if (!accountGroups.has(key)) accountGroups.set(key, []);
      accountGroups.get(key)!.push(snap);
    }
    for (const snaps of accountGroups.values()) {
      snaps.sort((a: any, b: any) => new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime());
    }

    snapshotsCache.current = { key: cacheKey, data: accountGroups };
    return accountGroups;
  }, [accountMetricsData, platformState]);

  // Build final chart array from pre-computed snapshots for the selected period
  const dashboardChartData = useMemo(() => {
    const rawChartData = analyticsData?.chartData || [];
    // Only use API chart data if it has at least one point with real (non-zero) values.
    // This prevents the chart from flashing empty/zeroed data after the Edge Function
    // resolves and overwrites the good local account_metrics data.
    const apiHasRealData = rawChartData.some(
      (d: any) => (d.views ?? 0) > 0 || (d.engagement ?? 0) > 0 || (d.reach ?? 0) > 0
    );
    if (apiHasRealData) return rawChartData;

    if (!accountDailySnapshots) return [];

    const cacheKey = `${(accountDailySnapshots?.size ?? 0)}-${analyticsPeriod}`;
    if (chartCache.current.key === cacheKey) return chartCache.current.data;

    const periodDays = analyticsPeriod === '15d' ? 15 : analyticsPeriod === '30d' ? 30 : analyticsPeriod === '45d' ? 45 : analyticsPeriod === '60d' ? 60 : analyticsPeriod === '90d' ? 90 : 7;

    const dateDeltas = new Map<string, { views: number; likes: number; comments: number; shares: number; engagement: number; reach: number }>();
    for (const snaps of accountDailySnapshots.values()) {
      for (let idx = 0; idx < snaps.length; idx++) {
        const snap = snaps[idx];
        const prev = idx > 0 ? snaps[idx - 1] : null;
        let entry = dateDeltas.get(snap.dateKey);
        if (!entry) {
          entry = { views: 0, likes: 0, comments: 0, shares: 0, engagement: 0, reach: 0 };
          dateDeltas.set(snap.dateKey, entry);
        }
        entry.views += snap.views - (prev?.views || 0);
        entry.likes += snap.likes - (prev?.likes || 0);
        entry.comments += snap.comments - (prev?.comments || 0);
        entry.shares += snap.shares - (prev?.shares || 0);
        entry.engagement += snap.engagement - (prev?.engagement || 0);
        entry.reach += snap.reach - (prev?.reach || 0);
      }
    }

    const months = ['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
    const result: any[] = new Array(periodDays + 1);
    const now = new Date();
    let idx = 0;
    for (let i = periodDays; i >= 0; i--, idx++) {
      const dt = new Date(now); dt.setDate(dt.getDate() - i);
      const y = dt.getFullYear();
      const mo = dt.getMonth();
      const dd = dt.getDate();
      const isoKey = `${y}-${mo + 1 < 10 ? '0' + (mo + 1) : mo + 1}-${dd < 10 ? '0' + dd : dd}`;
      const delta = dateDeltas.get(isoKey);
      result[idx] = {
        name: `${dd} de ${months[mo]}`,
        views: delta?.views ?? 0,
        engagement: delta?.engagement ?? 0,
        reach: delta?.reach ?? 0,
      };
    }
    chartCache.current = { key: cacheKey, data: result };
    return result;
  }, [analyticsData, accountDailySnapshots, analyticsPeriod]);

  // Show loading spinner only when we have no data at all (neither from API nor local metrics)
  const chartLoading = (analyticsLoading || metricsLoading) && dashboardChartData.length === 0;

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="min-h-[70vh] w-full contents">
<ErrorBoundary><DashboardHomeView 
               platform={platformState}
               setPlatform={setPlatform}
               isPlatformMenuOpen={isPlatformMenuOpen}
               setIsPlatformMenuOpen={setIsPlatformMenuOpen}
               isMobilePlatformMenuOpen={isMobilePlatformMenuOpen}
               setIsMobilePlatformMenuOpen={setIsMobilePlatformMenuOpen}
               connectedPlatforms={connectedPlatforms}
                syncAnalytics={syncAnalytics}
                analyticsLoading={analyticsLoading}
                analyticsSyncing={analyticsSyncing}
                analyticsData={analyticsData}
               localStats={localStats || []}
               localTotalPosts={localTotalPosts}
               localEngagement={localEngagement}
               localFollowers={localFollowers}
                 dashboardChartData={dashboardChartData}
                 chartLoading={chartLoading}
                 dashboardPeriod={analyticsPeriod}
                 setDashboardPeriod={setAnalyticsPeriod}
               isConnected={isConnected}
               setActiveTab={handleTabChange}
               onEditPost={handleEditPost}
                metricGrowth={metricGrowth}
            /></ErrorBoundary>
          </div>
        );
      case "create":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><CreatePostPanel
              editingPost={editingPost}
              onPostSaved={() => {
                setActiveTab("dashboard");
                setEditingPost(null);
              }}
              onBackToCalendar={() => setActiveTab("calendar")}
              onEditPost={handleEditPost}
              createPost={createPost}
              updatePost={updatePost}
              submitForApproval={submitForApproval}
              approvePost={approvePost}
              rejectPost={rejectPost}
            /></ErrorBoundary>
          </Suspense>
        );
      case "calendar":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><CalendarView 
            posts={scheduledPosts}
            loading={scheduledPostsLoading}
            deletePost={deletePost}
            submitForApproval={submitForApproval}
            approvePost={approvePost}
            rejectPost={rejectPost}
            refetch={async () => { await refetchScheduledPosts(); }}
            onCreatePost={(date) => {
              setPreSelectedDate(date || null);
              setActiveTab("create");
            }}
            onEditPost={handleEditPost}
          /></ErrorBoundary>
          </Suspense>
        );
      case "analytics":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary>
              <AdvancedAnalytics />
            </ErrorBoundary>
          </Suspense>
        );
        case "stories":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><StoriesLivesView /></ErrorBoundary>
          </Suspense>
        );
      case "messaging":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><MessagingView /></ErrorBoundary>
          </Suspense>
        );
      case "news":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><NewsPortal /></ErrorBoundary>
          </Suspense>
        );
      case "documents":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><DocumentsView /></ErrorBoundary>
          </Suspense>
        );
      case "networks":
      case "accounts":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><SocialNetworksView /></ErrorBoundary>
          </Suspense>
        );
      case "sys_portal":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><PortalSettingsWrapper /></ErrorBoundary>
          </Suspense>
        );
      case "settings":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><SettingsView defaultTab={settingsSubTab} /></ErrorBoundary>
          </Suspense>
        );
      case "notifications":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><NotificationsFullView /></ErrorBoundary>
          </Suspense>
        );
      case "manual":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><ManualView /></ErrorBoundary>
          </Suspense>
        );
      case "robot":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><RobotBuilder /></ErrorBoundary>
          </Suspense>
        );
      case "monitoring":
        return (
          <Suspense fallback={<ViewLoader />}>
            <ErrorBoundary><CronMonitorView /></ErrorBoundary>
          </Suspense>
        );
      default:
        return <ViewLoader />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className={cn(
        "flex-1 transition-[padding-left] duration-200 min-w-0 flex flex-col min-h-screen",
        isMobile ? "pl-0 pb-20" : (isSidebarCollapsed ? "md:pl-20" : "md:pl-64")
      )}>
        <Header 
          onNotificationsClick={handleNotificationsClick}
          onNavigate={handleHeaderNavigate}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />
        <main className="p-4 md:p-8 flex-1 w-full max-w-7xl mx-auto overflow-x-hidden min-w-0">
          {/* OTIMIZAÇÃO LCP: Garantir que a área de conteúdo tenha altura mínima para ser o maior elemento do viewport */}
          <div className="min-h-[70vh] flex flex-col">
            {renderContent()}
          </div>
        </main>
        <Suspense fallback={<div className="h-20" />}>
          <ErrorBoundary><SystemFooter /></ErrorBoundary>
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <ErrorBoundary><NotificationsPanel
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          onViewAll={() => handleTabChange("notifications")}
        /></ErrorBoundary>
      </Suspense>
      <Suspense fallback={null}>
        <ErrorBoundary><FloatingWhatsApp onOpenMessaging={() => handleTabChange("messaging")} /></ErrorBoundary>
      </Suspense>
    </div>
  );
};

export default Dashboard;
