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
import { cn } from "@/lib/utils";

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
  const [platform, setPlatform] = useState<string>('all');
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const [isMobilePlatformMenuOpen, setIsMobilePlatformMenuOpen] = useState(false);

  // TAB INTELLIGENCE: Only fetch data for active tabs
  const isDashboardTab = activeTab === 'dashboard';
  const isAnalyticsTab = activeTab === 'analytics' || isDashboardTab;
  const isCalendarTab = activeTab === 'calendar' || activeTab === 'create' || isDashboardTab;

  const { stats: localStats, loading: statsLoading } = useSocialStats({ enabled: isDashboardTab });
  const { data: analyticsData, loading: analyticsLoading, syncAnalytics } = useAnalytics({ enabled: isAnalyticsTab });
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
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

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
      setSearchParams({ tab });
      if (tab !== 'settings') setSettingsSubTab(undefined);
    });
  }, [setSearchParams]);

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
    if (platform === 'all') return analyticsData?.chartData || [];
    return (analyticsData?.chartData || []).map((day: any) => ({
      name: day.name,
      value: day[platform] || 0
    }));
  }, [platform, analyticsData]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="min-h-[70vh] w-full contents">
            <ErrorBoundary><DashboardHomeView 
              platform={platform}
              setPlatform={setPlatform}
              isPlatformMenuOpen={isPlatformMenuOpen}
              setIsPlatformMenuOpen={setIsPlatformMenuOpen}
              isMobilePlatformMenuOpen={isMobilePlatformMenuOpen}
              setIsMobilePlatformMenuOpen={setIsMobilePlatformMenuOpen}
              connectedPlatforms={connectedPlatforms}
              syncAnalytics={syncAnalytics}
              analyticsLoading={analyticsLoading}
              analyticsData={analyticsData}
              localStats={localStats || []}
              localTotalPosts={localTotalPosts}
              localEngagement={localEngagement}
              localFollowers={localFollowers}
              dashboardChartData={dashboardChartData}
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
        <main className="p-4 md:p-8 flex-1 w-full max-w-7xl mx-auto">
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
