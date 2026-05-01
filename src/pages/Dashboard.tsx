import { useState, useEffect, useRef, lazy, Suspense, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Eye, 
  Heart, 
  Users, 
  TrendingUp,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentPosts } from "@/components/dashboard/RecentPosts";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { SocialNetworkCard } from "@/components/dashboard/SocialNetworkCard";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings, Activity, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduledPost } from "@/hooks/useScheduledPosts";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSocialStats } from "@/hooks/useSocialStats";
import { SystemFooter } from "@/components/SystemFooter";

// Lazy load heavy views - wrap named exports for React.lazy
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
const FloatingWhatsApp = lazy(() => import("@/components/dashboard/FloatingWhatsApp").then(m => ({ default: m.FloatingWhatsApp })));

const ViewLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-primary/20 rounded-full" />
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
    </div>
  </div>
);

const Dashboard = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [preSelectedDate, setPreSelectedDate] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<string>('profile');
  // Tracks which account (connection) is selected per platform for the gear profile selector
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('dashboard_selected_accounts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('dashboard_selected_accounts', JSON.stringify(selectedAccounts));
  }, [selectedAccounts]);

  const { logout } = useAuth();
  const navigate = useNavigate();

  useWebPushNotifications();

  const { connections, initiateOAuth, disconnect } = useSocialConnections();
  const { data: analyticsData, loading: analyticsLoading, platform, setPlatform, syncAnalytics } = useAnalytics();
  const scheduledPosts = useScheduledPosts();

  // Local fallback stats when Edge Function fails
  const { stats: localStats, totalFollowers: localFollowers } = useSocialStats();
  const localTotalPosts = scheduledPosts.posts?.length ?? 0;
  const localEngagement = useMemo(() =>
    localStats.reduce((sum, s) => sum + s.likes_count + s.comments_count + s.shares_count, 0),
  [localStats]);

  // Realtime subscription for scheduled_posts - shared across all views
  const refetchRef = useRef(scheduledPosts.refetch);
  useEffect(() => { refetchRef.current = scheduledPosts.refetch; }, [scheduledPosts.refetch]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_posts' },
        () => { refetchRef.current(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isConnected = useCallback((platformId: string) =>
    connections.some(c => c.platform === platformId && c.is_connected), [connections]);

  const getPageName = useCallback((platformId: string) =>
    connections.find(c => c.platform === platformId && c.is_connected)?.page_name ?? null, [connections]);

  const handleConnect = useCallback(async (platformId: string) => {
    const platform = socialPlatforms.find(p => p.id === platformId);
    const isOAuth = platform?.type === 'social' && platformId !== 'site' && platformId !== 'telegram';
    
    if (!isOAuth) {
      // For Telegram and other API-key based platforms, just navigate to API config tab
      setSettingsSubTab('api');
      setActiveTab('settings');
      return;
    }

    setConnectingPlatform(platformId);
    try {
      await initiateOAuth(platformId);
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setConnectingPlatform(null);
    }
  }, [initiateOAuth]);


  const socialPlatformsList = useMemo(() => 
    socialPlatforms.filter(p => p.type === 'social'), 
  []);

  const connectedPlatforms = useMemo(() => 
    socialPlatforms.filter(p => connections.some(c => c.platform === p.id)),
  [connections]);

  const renderContent = () => {
    switch (activeTab) {
      case "create":
        return (
          <Suspense fallback={<ViewLoader />}>
            <div className="max-w-4xl mx-auto">
              <CreatePostPanel
                initialDate={preSelectedDate ? preSelectedDate.toISOString().slice(0, 16) : undefined}
                editingPost={editingPost}
                onPostSaved={() => {
                  setEditingPost(null);
                  setPreSelectedDate(null);
                  scheduledPosts.refetch();
                }}
                onBackToCalendar={editingPost || preSelectedDate ? () => {
                  setEditingPost(null);
                  setPreSelectedDate(null);
                  setActiveTab("calendar");
                } : undefined}
                createPost={scheduledPosts.createPost}
                updatePost={scheduledPosts.updatePost}
                submitForApproval={scheduledPosts.submitForApproval}
                approvePost={scheduledPosts.approvePost}
                rejectPost={scheduledPosts.rejectPost}
              />
            </div>
          </Suspense>
        );

      case "networks":
        return (
          <div>
            <div className="mb-8">
              <h1 className="font-display font-bold text-3xl mb-2">Redes Sociais</h1>
              <p className="text-muted-foreground">
                Conecte e gerencie suas redes sociais para publicação integrada
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {socialPlatformsList.map((platform, index) => {
                // All connections for this platform
                const platformAccounts = connections
                  .filter((c) => c.platform === platform.id && c.is_connected)
                  .map((c) => ({
                    id: c.id,
                    page_name: c.page_name,
                    platform_user_id: c.platform_user_id,
                    profile_image_url: c.profile_image_url || c.profile_picture,
                    followers_count: c.followers_count,
                    posts_count: c.posts_count,
                    page_id: c.page_id,
                  }));

                return (
                  <SocialNetworkCard
                    key={platform.id}
                    platform={platform}
                    isConnected={isConnected(platform.id)}
                    isConnecting={connectingPlatform === platform.id}
                    pageName={getPageName(platform.id)}
                    onConnect={() => handleConnect(platform.id)}
                    onDisconnect={() => disconnect(platform.id)}
                    delay={index * 0.05}
                    accounts={platformAccounts}
                    selectedAccountId={selectedAccounts[platform.id] ?? null}
                    onSelectAccount={(account) =>
                      setSelectedAccounts((prev) => ({
                        ...prev,
                        [platform.id]: account.id,
                      }))
                    }
                  />
                );
              })}
            </div>
          </div>
        );

      case "analytics":
        return (
          <Suspense fallback={<ViewLoader />}>
            <AdvancedAnalytics onNavigate={(tab, subTab) => {
              setActiveTab(tab);
              if (subTab) setSettingsSubTab(subTab);
            }} />
          </Suspense>
        );

      case "robot":
        return (
          <Suspense fallback={<ViewLoader />}>
            <RobotBuilder />
          </Suspense>
        );

      case "calendar":
        return (
          <Suspense fallback={<ViewLoader />}>
            <CalendarView
              posts={scheduledPosts.posts}
              loading={scheduledPosts.loading}
              deletePost={scheduledPosts.deletePost}
              submitForApproval={scheduledPosts.submitForApproval}
              approvePost={scheduledPosts.approvePost}
              rejectPost={scheduledPosts.rejectPost}
              refetch={scheduledPosts.refetch}
              onCreatePost={(date?: Date) => {
                setEditingPost(null);
                setPreSelectedDate(date || null);
                setActiveTab("create");
              }}
              onEditPost={(post: ScheduledPost) => {
                setEditingPost(post);
                setPreSelectedDate(null);
                setActiveTab("create");
              }}
            />
          </Suspense>
        );

      case "stories":
        return <Suspense fallback={<ViewLoader />}><StoriesLivesView /></Suspense>;

      case "messaging":
        return <Suspense fallback={<ViewLoader />}><MessagingView /></Suspense>;

      case "documents":
        return <Suspense fallback={<ViewLoader />}><DocumentsView /></Suspense>;

      case "settings":
        return <Suspense fallback={<ViewLoader />}><SettingsView defaultTab={settingsSubTab} /></Suspense>;

      case "accounts":
        return <Suspense fallback={<ViewLoader />}><SettingsView defaultTab="api" /></Suspense>;

      case "notifications":
        return <Suspense fallback={<ViewLoader />}><NotificationsFullView /></Suspense>;

      case "news":
        return <Suspense fallback={<ViewLoader />}><NewsPortal /></Suspense>;

      case "sys_portal":
        return <Suspense fallback={<ViewLoader />}><PortalSettingsWrapper /></Suspense>;

      case "manual":
        return <Suspense fallback={<ViewLoader />}><ManualView /></Suspense>;

      case "monitoring":
        return <Suspense fallback={<ViewLoader />}><CronMonitorView /></Suspense>;

      default:
        return (
          <>
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display font-bold text-3xl mb-1"
                >
                  Dashboard Principal 👋
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground"
                >
                  Visão geral e desempenho consolidado de todas as suas redes
                </motion.p>
              </div>

              <Popover open={isPlatformMenuOpen} onOpenChange={setIsPlatformMenuOpen}>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl hover:border-primary/50 transition-all font-medium text-sm shadow-sm group mr-1"
                    onMouseEnter={() => setIsPlatformMenuOpen(true)}
                  >
                    <Settings className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-500" />
                    <span>{platform === 'all' ? 'Todas as Redes' : socialPlatforms.find(p => p.id === platform)?.name}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  align="end" 
                  className="w-[240px] p-2"
                  onMouseLeave={() => setIsPlatformMenuOpen(false)}
                >
                  <div className="text-xs font-bold text-muted-foreground px-2 py-1 mb-1 uppercase tracking-wider">
                    Redes Conectadas
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      onClick={() => setPlatform('all')}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                        platform === 'all' ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Sumarizado (Global)
                      </div>
                      {platform === 'all' && <Check className="w-3 h-3" />}
                    </button>
                    {connectedPlatforms.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                          platform === p.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <p.icon className={cn("w-4 h-4", p.textColor)} />
                          {p.name}
                        </div>
                        {platform === p.id && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-xl hover:bg-primary/5 hover:text-primary transition-all border-border shadow-sm"
                      onClick={() => syncAnalytics?.()}
                      disabled={analyticsLoading}
                    >
                      <RefreshCw className={cn("w-4 h-4", analyticsLoading && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sincronizar dados das APIs</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard 
                title="Total de Posts" 
                value={(analyticsData?.overview.totalPosts ?? localTotalPosts).toString()} 
                icon={TrendingUp} 
                trend={parseFloat(analyticsData?.engagement.growth || "0")} 
                trendLabel="este mês" 
                color="primary" 
                delay={0} 
              />
              <StatsCard 
                title="Visualizações" 
                value={(analyticsData?.engagement.views || 0).toLocaleString()} 
                icon={Eye} 
                trend={parseFloat(analyticsData?.engagement.growth || "0")} 
                trendLabel="vs mês anterior" 
                color="accent" 
                delay={0.1} 
              />
              <StatsCard 
                title="Engajamento" 
                value={(
                  (analyticsData?.engagement.likes || 0) + 
                  (analyticsData?.engagement.comments || 0) + 
                  (analyticsData?.engagement.shares || 0) ||
                  localEngagement
                ).toLocaleString()} 
                icon={Heart} 
                trend={parseFloat(analyticsData?.engagement.engagementRate || "0")} 
                trendLabel="taxa" 
                color="success" 
                delay={0.1} 
              />
              <StatsCard 
                title="Seguidores" 
                value={(
                  analyticsData?.overview.totalFollowers ||
                  analyticsData?.followerData?.reduce((acc, curr) => acc + curr.currentFollowers, 0) || 
                  localFollowers ||
                  connections.reduce((acc, c) => acc + (c.followers_count || 0), 0)
                ).toLocaleString()} 
                icon={Users} 
                trend={analyticsData?.overview.followersGrowth !== undefined ? parseFloat(analyticsData.overview.followersGrowth.toString()) : undefined}
                trendLabel="este mês" 
                color="warning" 
                delay={0.1} 
              />
            </div>

            {/* Account List and Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AnalyticsChart 
                  data={analyticsData?.chartData} 
                  loading={analyticsLoading} 
                />
              </div>
              <div className="h-full">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass-card rounded-2xl border border-border p-6 h-full flex flex-col justify-between"
                >
                  <h3 className="font-display font-bold text-lg mb-4">Redes Conectadas</h3>
                  <div className="space-y-3">
                    {socialPlatforms.slice(0, 5).map((platform) => {
                      const Icon = platform.icon;
                      const connected = isConnected(platform.id);
                      return (
                        <div
                          key={platform.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", platform.color)}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium">{platform.name}</span>
                          </div>
                          <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500" : "bg-muted-foreground")} />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setActiveTab("networks")}
                    className="w-full mt-4 text-sm text-primary hover:underline"
                  >
                    Ver todas as redes →
                  </button>
                </motion.div>
              </div>
            </div>

            <div className="mt-6">
              <RecentPosts onEditPost={(post: ScheduledPost) => {
                setEditingPost(post);
                setActiveTab("create");
              }} />
            </div>
          </>
        );
    }
  };
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className={cn(
        "flex-1 transition-all duration-300 min-w-0 flex flex-col min-h-screen",
        isSidebarCollapsed ? "md:pl-20" : "md:pl-64",
        "pl-0"
      )}>
        <Header 
          onNotificationsClick={() => setShowNotifications(true)} 
          onNavigate={(tab: string, subTab?: string) => {
            setActiveTab(tab);
            if (subTab) setSettingsSubTab(subTab);
          }}
        />
        <main className="p-4 md:p-8 flex-1">
          {renderContent()}
        </main>
        <SystemFooter />
      </div>
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onViewAll={() => setActiveTab("notifications")}
      />
      <Suspense fallback={null}>
        <FloatingWhatsApp onOpenMessaging={() => setActiveTab("messaging")} />
      </Suspense>
    </div>
  );
};

export default Dashboard;
