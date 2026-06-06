import { memo, useCallback, useMemo } from "react";
import { 
  Eye, 
  Heart, 
  Users, 
  TrendingUp,
  Settings, 
  Activity, 
  RefreshCw, 
  Check 
} from "lucide-react";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { cn, normalizePlatform } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScheduledPost } from "@/hooks/useScheduledPosts";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentPosts } from "@/components/dashboard/RecentPosts";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";

interface DashboardHomeViewProps {
  platform: string;
  setPlatform: (p: string) => void;
  isPlatformMenuOpen: boolean;
  setIsPlatformMenuOpen: (o: boolean) => void;
  isMobilePlatformMenuOpen: boolean;
  setIsMobilePlatformMenuOpen: (o: boolean) => void;
  connectedPlatforms: any[];
  syncAnalytics: () => void;
  analyticsLoading: boolean;
  analyticsSyncing?: boolean;
  analyticsData: any;
  localStats: any[];
  localTotalPosts: number;
  localEngagement: number;
  localFollowers: number;
  dashboardChartData: any[];
  dashboardPeriod: string;
  setDashboardPeriod: (p: string) => void;
  isConnected: (p: string) => boolean;
  setActiveTab: (t: string) => void;
  setEditingPost: (p: ScheduledPost) => void;
}

export const DashboardHomeView = memo(({
  platform,
  setPlatform,
  isPlatformMenuOpen,
  setIsPlatformMenuOpen,
  isMobilePlatformMenuOpen,
  setIsMobilePlatformMenuOpen,
  connectedPlatforms,
  syncAnalytics,
  analyticsLoading,
  analyticsSyncing,
  analyticsData,
  localStats,
  localTotalPosts,
  localEngagement,
  localFollowers,
  dashboardChartData,
  dashboardPeriod,
  setDashboardPeriod,
  isConnected,
  setActiveTab,
  setEditingPost
}: DashboardHomeViewProps) => {
  // Compute filtered stats for the selected platform
  const filteredStats = useMemo(() => {
    if (!localStats || localStats.length === 0) return [];
    if (platform === 'all') return localStats;
    return localStats.filter(s => normalizePlatform(s.platform) === normalizePlatform(platform));
  }, [localStats, platform]);

  const platformTotalPosts = useMemo(() =>
    filteredStats.reduce((s, a) => s + (a.posts_count || 0), 0),
    [filteredStats]
  );
  const platformViews = useMemo(() =>
    filteredStats.reduce((s, a) => s + (a.views_count || 0), 0),
    [filteredStats]
  );
  const platformEngagement = useMemo(() =>
    filteredStats.reduce((s, a) => s + (a.likes_count || 0) + (a.comments_count || 0) + (a.shares_count || 0), 0),
    [filteredStats]
  );
  const platformFollowers = useMemo(() =>
    filteredStats.reduce((s, a) => s + (a.followers_count || 0), 0),
    [filteredStats]
  );

  // All trends computed from localStats — appear instantly, no API dependency
  const computeEngagementRate = useCallback(() => {
    if (!localStats || localStats.length === 0) return 0;
    const fs = platform === 'all' ? localStats : localStats.filter(s => normalizePlatform(s.platform) === normalizePlatform(platform));
    if (fs.length === 0) return 0;
    const eng = fs.reduce((sum, s) => sum + (s.likes_count || 0) + (s.comments_count || 0) + (s.shares_count || 0), 0);
    const views = fs.reduce((sum, s) => sum + (s.views_count || 0), 0);
    return views > 0 ? Number(((eng / views) * 100).toFixed(2)) : 0;
  }, [localStats, platform]);

  const computeEngagementPerPost = useCallback(() => {
    return platformTotalPosts > 0 && platformEngagement > 0 ? Number((platformEngagement / platformTotalPosts).toFixed(1)) : 0;
  }, [platformTotalPosts, platformEngagement]);

  const computeViewsPerFollower = useCallback(() => {
    return platformFollowers > 0 && platformViews > 0 ? Number((platformViews / platformFollowers).toFixed(1)) : 0;
  }, [platformViews, platformFollowers]);

  return (
    <>
      <div className="flex items-center justify-between mb-8 sticky top-0 md:relative bg-background/80 backdrop-blur-md z-10 py-1">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl mb-0.5 md:mb-1">
            Dashboard Principal 👋
          </h1>
          <p className="text-muted-foreground text-[10px] md:text-sm truncate">
            Visão geral e desempenho consolidado de todas as suas redes
          </p>
          {analyticsSyncing && (
            <p className="text-[10px] text-blue-400 flex items-center gap-1 mt-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Sincronizando...
            </p>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          <Popover open={isMobilePlatformMenuOpen} onOpenChange={setIsMobilePlatformMenuOpen}>
            <PopoverTrigger asChild>
              <button 
                className="p-2 bg-card border border-border rounded-xl hover:border-primary/50 transition-all shadow-sm"
              >
                <Settings className="w-4 h-4 text-primary" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={4} className="w-[200px] p-2 glass-card">
               <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 mb-1 uppercase tracking-widest">
                Redes
              </div>
              <div className="grid grid-cols-1 gap-1">
                <button onClick={() => { setPlatform('all'); setIsMobilePlatformMenuOpen(false); }} className={cn("flex items-center justify-between w-full px-3 py-2 text-sm rounded-md", platform === 'all' ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted")}>
                  <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Global</div>
                  {platform === 'all' && <Check className="w-3 h-3" />}
                </button>
                {connectedPlatforms.map(p => (
                  <button key={p.id} onClick={() => { setPlatform(p.id); setIsMobilePlatformMenuOpen(false); }} className={cn("flex items-center justify-between w-full px-3 py-2 text-sm rounded-md", platform === p.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted")}>
                    <div className="flex items-center gap-2"><p.icon className={cn("w-4 h-4", p.textColor)} /> {p.name}</div>
                    {platform === p.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl border-border shadow-sm h-9 w-9"
            onClick={() => syncAnalytics?.()}
            disabled={analyticsLoading}
          >
            <RefreshCw className={cn("w-4 h-4", analyticsLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Popover open={isPlatformMenuOpen} onOpenChange={setIsPlatformMenuOpen}>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl hover:border-primary/50 transition-all font-medium text-sm shadow-sm group"
              >
                <Settings className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-500" />
                <span>{platform === 'all' ? 'Todas as Redes' : socialPlatforms.find(p => p.id === platform)?.name}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              align="end" 
              sideOffset={4}
              className="w-[240px] p-2 glass-card"
            >
              <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 mb-1 uppercase tracking-widest">
                Redes Conectadas
              </div>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => { setPlatform('all'); setIsPlatformMenuOpen(false); }}
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
                    onClick={() => { setPlatform(p.id); setIsPlatformMenuOpen(false); }}
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
                  className="rounded-xl hover:bg-primary/5 hover:text-primary transition-all border-border shadow-sm h-10 w-10"
                  onClick={() => syncAnalytics?.()}
                  disabled={analyticsLoading}
                >
                  <RefreshCw className={cn("w-4 h-4", analyticsLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sincronizar dados</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
<StatsCard 
              title="Total de Posts" 
              value={platformTotalPosts.toString()} 
              icon={TrendingUp} 
              trend={computeEngagementPerPost()} 
              trendLabel="por post" 
              color="primary" 
              delay={0} 
            />
<StatsCard 
              title="Visualizações" 
              value={platformViews.toLocaleString()} 
              icon={Eye} 
              trend={computeViewsPerFollower()} 
              trendLabel="por seguidor" 
              color="accent" 
              delay={0.1} 
            />
<StatsCard 
              title="Engajamento" 
              value={platformEngagement.toLocaleString()} 
              icon={Heart} 
              trend={computeEngagementRate()} 
              trendLabel="taxa" 
              color="success" 
              delay={0.1} 
            />
<StatsCard 
              title="Seguidores" 
              value={platformFollowers.toLocaleString()} 
              icon={Users} 
              trend={platformFollowers > 0 && platformEngagement > 0 ? Number(((platformEngagement / platformFollowers) * 100).toFixed(2)) : 0} 
              trendLabel="por seguidor" 
              color="warning" 
              delay={0.1} 
            />
        </div>

      {/* Account List and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsChart 
            data={dashboardChartData}
            periodDays={dashboardPeriod === '15d' ? 15 : dashboardPeriod === '30d' ? 30 : dashboardPeriod === '45d' ? 45 : dashboardPeriod === '60d' ? 60 : dashboardPeriod === '90d' ? 90 : 7}
            onPeriodChange={setDashboardPeriod}
          />
        </div>
        <div className="h-full">
          <div
            className="glass-card rounded-2xl border border-border p-6 h-full flex flex-col justify-between animate-fade-in"
            style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
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
              className="w-full mt-4 text-sm text-primary hover:underline font-bold"
            >
              Ver todas as redes →
            </button>
          </div>
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
});

DashboardHomeView.displayName = "DashboardHomeView";
