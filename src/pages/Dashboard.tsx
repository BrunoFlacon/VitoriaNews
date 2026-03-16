import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { 
  Eye, 
  Heart, 
  Users, 
  TrendingUp,
  Loader2
} from "lucide-react";
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
import { socialPlatforms } from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";
import { ScheduledPost } from "@/hooks/useScheduledPosts";
import { useNavigate } from "react-router-dom";

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
const LiveStreamManager = lazy(() => import("@/components/dashboard/LiveStreamManager"));
const LiveClipsView = lazy(() => import("@/components/dashboard/LiveClipsView"));
const SocialAccountsPanel = lazy(() => import("@/components/dashboard/SocialAccountsPanel"));

const ViewLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [preSelectedDate, setPreSelectedDate] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);

  const { logout } = useAuth();
  const navigate = useNavigate();

  useWebPushNotifications();

  const { connections, initiateOAuth, disconnect } = useSocialConnections();
  const scheduledPosts = useScheduledPosts();

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

  const isConnected = (platformId: string) =>
    connections.some(c => c.platform === platformId && c.is_connected);

  const getPageName = (platformId: string) =>
    connections.find(c => c.platform === platformId && c.is_connected)?.page_name ?? null;

  const handleConnect = async (platformId: string) => {
    setConnectingPlatform(platformId);
    await initiateOAuth(platformId);
    setConnectingPlatform(null);
  };

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
              {socialPlatforms.map((platform, index) => (
                <SocialNetworkCard
                  key={platform.id}
                  platform={platform}
                  isConnected={isConnected(platform.id)}
                  isConnecting={connectingPlatform === platform.id}
                  pageName={getPageName(platform.id)}
                  onConnect={() => handleConnect(platform.id)}
                  onDisconnect={() => disconnect(platform.id)}
                  delay={index * 0.05}
                />
              ))}
            </div>
          </div>
        );

      case "analytics":
        return <Suspense fallback={<ViewLoader />}><AdvancedAnalytics /></Suspense>;

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
        return <Suspense fallback={<ViewLoader />}><SettingsView /></Suspense>;

      case "media":
        return <Suspense fallback={<ViewLoader />}><MediaGalleryView /></Suspense>;

      case "notifications":
        return <Suspense fallback={<ViewLoader />}><NotificationsFullView /></Suspense>;

      case "news":
        return <Suspense fallback={<ViewLoader />}><NewsPortal /></Suspense>;

      case "lives":
        return <Suspense fallback={<ViewLoader />}><LiveStreamManager /></Suspense>;

      case "clips":
        return <Suspense fallback={<ViewLoader />}><LiveClipsView /></Suspense>;

      case "accounts":
        return <Suspense fallback={<ViewLoader />}><SocialAccountsPanel /></Suspense>;

      default:
        return (
          <>
            <div className="mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display font-bold text-3xl mb-2"
              >
                Bem-vindo de volta! 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground"
              >
                Gerencie todas as suas redes sociais em um único lugar
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard title="Total de Posts" value="248" icon={TrendingUp} trend={12.5} trendLabel="este mês" color="primary" delay={0} />
              <StatsCard title="Visualizações" value="1.2M" icon={Eye} trend={8.2} trendLabel="vs mês anterior" color="accent" delay={0.1} />
              <StatsCard title="Engajamento" value="89.5K" icon={Heart} trend={-2.1} trendLabel="vs mês anterior" color="success" delay={0.2} />
              <StatsCard title="Seguidores" value="52.3K" icon={Users} trend={15.3} trendLabel="este mês" color="warning" delay={0.3} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AnalyticsChart />
              </div>
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass-card rounded-2xl border border-border p-6"
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
              <RecentPosts />
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div className="pl-64 transition-all duration-300">
        <Header onNotificationsClick={() => setShowNotifications(true)} />
        <main className="p-8">
          {renderContent()}
        </main>
      </div>
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onViewAll={() => setActiveTab("notifications")}
      />
    </div>
  );
};

export default Dashboard;
