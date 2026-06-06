import { useState, useEffect, useRef, lazy, Suspense, useMemo, useCallback, startTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useScheduledPosts, ScheduledPost } from "@/hooks/useScheduledPosts";
import { useAuth } from "@/contexts/AuthContext";
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
  const [dashboardPeriod, setDashboardPeriod] = useState<string>('7d');
  // TAB INTELLIGENCE: Only fetch data for active tabs
  const isDashboardTab = activeTab === 'dashboard';
  const isAnalyticsTab = activeTab === 'analytics' || isDashboardTab;
  const isCalendarTab = activeTab === 'calendar' || activeTab === 'create' || isDashboardTab;
  
  const { stats: localStats, loading: statsLoading } = useSocialStats({ enabled: isDashboardTab });
  const { data: analyticsData, loading: analyticsLoading, isSyncing: analyticsSyncing, syncAnalytics, platform: analyticsPlatform, setPlatform: setAnalyticsPlatform, period: analyticsPeriod, setPeriod: setAnalyticsPeriod } = useAnalytics({ enabled: isAnalyticsTab });

  // Query account_metrics for real time-series chart data when Edge Function has none
  const { data: accountMetricsData } = useQuery({
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

  // Sync activeTab with URL params (initial load only)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    // Deep security: Hide the tab parameter from the address bar immediately
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []); // Only run once on mount

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
      // Remove setSearchParams to hide the tab name from the URL after /dashboard
    });
  }, []);

  const connectedPlatforms = useMemo(() => 
    socialPlatforms.filter(p => connections?.some(c => c.platform === p.id)),
    [connections]
  );

  const isConnected = useCallback((platformId: string) => {
    return connections?.some(c => c.platform === platformId) || false;
  }, [connections]);

  const localTotalPosts = useMemo(() => 
    localStats?.reduce((acc, curr) => acc + curr.posts_count, 0) || 0,
    [localStats]
  );

  const localEngagement = useMemo(() => 
    localStats?.reduce((acc, curr) => acc + curr.likes_count + curr.comments_count + curr.shares_count, 0) || 0,
    [localStats]
  );

  const localFollowers = useMemo(() => 
    localStats?.reduce((acc, curr) => acc + (curr.followers_count || 0), 0) || 0,
    [localStats]
  );

  const dashboardChartData = useMemo(() => {
    // Priority 1: Use Edge Function per-period chart data when available
    const rawChartData = analyticsData?.chartData || [];
    if (rawChartData.length > 0) return rawChartData;

    // Priority 2: Build time-series chart from account_metrics with day-over-day deltas
    const metrics = (accountMetricsData ?? []) as any[];
    if (metrics.length === 0) return [];

    const filtered = platformState !== 'all'
      ? metrics.filter((m: any) => normalizePlatform(m.platform) === platformState)
      : metrics;

    // Group by (platform, platform_user_id, date) and take last snapshot per day per account
    const grouped: Record<string, any> = {};
    filtered.forEach((m: any) => {
      const d = new Date(m.collected_at);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const accountKey = `${m.platform}-${m.platform_user_id || m.id}`;
      const dedupKey = `${accountKey}-${dateKey}`;
      if (!grouped[dedupKey] || new Date(m.collected_at) > new Date(grouped[dedupKey].collected_at)) {
        grouped[dedupKey] = { ...m, _dateKey: dateKey, _accountKey: accountKey };
      }
    });

    // For each account, sort by date and compute day-over-day deltas
    type SnapRow = { views: number; likes: number; comments: number; shares: number; engagement: number; reach: number; _dateKey: string; collected_at: string };
    const accountGroups: Record<string, SnapRow[]> = {};
    Object.values(grouped).forEach((m: any) => {
      if (!accountGroups[m._accountKey]) accountGroups[m._accountKey] = [];
      accountGroups[m._accountKey].push({
        views: Number(m.views || 0),
        likes: Number(m.likes || 0),
        comments: Number(m.comments || 0),
        shares: Number(m.shares || 0),
        engagement: Number(m.likes || 0) + Number(m.comments || 0) + Number(m.shares || 0),
        reach: Math.round(Number(m.views || 0) * 0.35),
        _dateKey: m._dateKey,
        collected_at: m.collected_at,
      });
    });

    // Compute per-day deltas by summing deltas across accounts
    const dateDeltas: Record<string, { views: number; likes: number; comments: number; shares: number; engagement: number; reach: number }> = {};
    Object.values(accountGroups).forEach((snaps) => {
      snaps.sort((a, b) => new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime());
      snaps.forEach((snap, idx) => {
        const prev = idx > 0 ? snaps[idx - 1] : null;
        if (!dateDeltas[snap._dateKey]) dateDeltas[snap._dateKey] = { views: 0, likes: 0, comments: 0, shares: 0, engagement: 0, reach: 0 };
        dateDeltas[snap._dateKey].views += snap.views - (prev?.views || 0);
        dateDeltas[snap._dateKey].likes += snap.likes - (prev?.likes || 0);
        dateDeltas[snap._dateKey].comments += snap.comments - (prev?.comments || 0);
        dateDeltas[snap._dateKey].shares += snap.shares - (prev?.shares || 0);
        dateDeltas[snap._dateKey].engagement += snap.engagement - (prev?.engagement || 0);
        dateDeltas[snap._dateKey].reach += snap.reach - (prev?.reach || 0);
      });
    });

    const periodDays = analyticsPeriod === '15d' ? 15 : analyticsPeriod === '30d' ? 30 : analyticsPeriod === '45d' ? 45 : analyticsPeriod === '60d' ? 60 : analyticsPeriod === '90d' ? 90 : 7;
    const months = ['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
    const result: any[] = [];
    for (let i = periodDays; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const isoKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      const delta = dateDeltas[isoKey];
      result.push({
        name: `${parseInt(String(dt.getDate()))} de ${months[dt.getMonth()]}`,
        views: delta?.views ?? 0,
        engagement: delta?.engagement ?? 0,
        reach: delta?.reach ?? 0,
      });
    }
    return result;
  }, [analyticsData, accountMetricsData, platformState, dashboardPeriod]);

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
                dashboardPeriod={analyticsPeriod}
                setDashboardPeriod={setAnalyticsPeriod}
               isConnected={isConnected}
               setActiveTab={handleTabChange}
               setEditingPost={setEditingPost}
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
            onEditPost={(post) => {
              setEditingPost(post);
              setActiveTab("create");
            }}
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
        "flex-1 transition-all duration-300 min-w-0 flex flex-col min-h-screen",
        isMobile ? "pl-0 pb-20" : (isSidebarCollapsed ? "md:pl-20" : "md:pl-64")
      )}>
        <Header 
          onNotificationsClick={() => setShowNotifications(true)} 
          onNavigate={(tab, subTab) => {
            handleTabChange(tab);
            if (subTab) setSettingsSubTab(subTab);
          }}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />
        <main className="p-4 md:p-8 flex-1 w-full max-w-7xl mx-auto overflow-x-hidden min-w-0">
          {/* OTIMIZAÇÃO LCP: Garantir que a área de conteúdo tenha altura mínima para ser o maior elemento do viewport */}
          <div className="min-h-[70vh] flex flex-col">
            {renderContent()}
          </div>
        </main>
        <Suspense fallback={null}>
          <ErrorBoundary><SystemFooter /></ErrorBoundary>
        </Suspense>
      </div>
      <ErrorBoundary><NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onViewAll={() => handleTabChange("notifications")}
      /></ErrorBoundary>
      <Suspense fallback={null}>
        <ErrorBoundary><FloatingWhatsApp onOpenMessaging={() => handleTabChange("messaging")} /></ErrorBoundary>
      </Suspense>
    </div>
  );
};

export default Dashboard;
