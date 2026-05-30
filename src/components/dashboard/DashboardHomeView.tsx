import { memo, Suspense, lazy, useCallback } from "react";
import { motion } from "framer-motion";
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

// Lazy load non-critical internal components
const StatsCard = lazy(() => import("@/components/dashboard/StatsCard").then(m => ({ default: m.StatsCard })));
const RecentPosts = lazy(() => import("@/components/dashboard/RecentPosts").then(m => ({ default: m.RecentPosts })));
const AnalyticsChart = lazy(() => import("@/components/dashboard/AnalyticsChart").then(m => ({ default: m.AnalyticsChart })));

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
  analyticsData: any;
  localStats: any[];
  localTotalPosts: number;
  localEngagement: number;
  localFollowers: number;
  dashboardChartData: any[];
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
  analyticsData,
  localStats,
  localTotalPosts,
  localEngagement,
  localFollowers,
  dashboardChartData,
  isConnected,
  setActiveTab,
  setEditingPost
}: DashboardHomeViewProps) => {
  // Helper to compute average follower growth from followerData for selected platform
  const computeFollowerGrowth = useCallback(() => {
    if (!analyticsData?.followerData || analyticsData.followerData.length === 0) return undefined;
    
    const filteredData = platform === 'all' 
      ? analyticsData.followerData 
      : analyticsData.followerData.filter(f => normalizePlatform(f.platform) === normalizePlatform(platform));
    
    if (filteredData.length === 0) return undefined;
    
    const totalGrowth = filteredData.reduce((sum, f) => sum + (f.growth || 0), 0);
    return Number((totalGrowth / filteredData.length).toFixed(2));
  }, [analyticsData?.followerData, platform]);

  // Helper to compute engagement rate from local stats when analytics data is not real
  const computeEngagementRateFromLocal = useCallback(() => {
    if (!localStats || localStats.length === 0) return 0;
    
    const filteredStats = platform === 'all' 
      ? localStats 
      : localStats.filter(s => normalizePlatform(s.platform) === normalizePlatform(platform));
    
    if (filteredStats.length === 0) return 0;
    
    const totalEngagement = filteredStats.reduce((sum, s) => 
      sum + (s.likes_count || 0) + (s.comments_count || 0) + (s.shares_count || 0), 0);
    const totalViews = filteredStats.reduce((sum, s) => sum + (s.views_count || 0), 0);
    
    return totalViews > 0 ? Number(((totalEngagement / totalViews) * 100).toFixed(2)) : 0;
  }, [localStats, platform]);

  // Determine if we have real data (not fallback/seeded) for reliable growth metrics
  const hasRealData = analyticsData?.dataSource === 'real';
  return (
    <>
      <div 
        className="flex items-center justify-between mb-8 sticky top-0 md:relative bg-background/80 backdrop-blur-md z-10 py-1"
        style={{ contain: 'layout' }}
      >
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl mb-0.5 md:mb-1">
            Dashboard Principal 👋
          </h1>
          <p className="text-muted-foreground text-[10px] md:text-sm truncate">
            Visão geral e desempenho consolidado de todas as suas redes
          </p>
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

      <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6"><div className="h-24 bg-muted/30 rounded-2xl animate-pulse" /><div className="h-24 bg-muted/30 rounded-2xl animate-pulse" /><div className="h-24 bg-muted/30 rounded-2xl animate-pulse" /><div className="h-24 bg-muted/30 rounded-2xl animate-pulse" /></div>}>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6" style={{ contain: 'layout' }}>
<StatsCard 
             title="Total de Posts" 
             value={(analyticsData?.overview.totalPosts || (platform !== 'all' ? localStats.filter(s => normalizePlatform(s.platform) === normalizePlatform(platform)).reduce((s, a) => s + a.posts_count, 0) : localTotalPosts)).toString()} 
             icon={TrendingUp} 
             trend={hasRealData ? parseFloat(analyticsData?.engagement.growth || "0") : undefined} 
             trendLabel="este mês" 
             color="primary" 
             delay={0} 
           />
<StatsCard 
             title="Visualizações" 
             value={(
               analyticsData?.engagement.views ||
               (platform !== 'all' ? localStats.filter(s => normalizePlatform(s.platform) === normalizePlatform(platform)).reduce((sum, s) => sum + s.views_count, 0) : localStats.reduce((sum, s) => sum + s.views_count, 0))
             ).toLocaleString()} 
             icon={Eye} 
             trend={hasRealData ? parseFloat(analyticsData?.engagement.growth || "0") : undefined} 
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
               (platform !== 'all' ? localStats.filter(s => normalizePlatform(s.platform) === normalizePlatform(platform)).reduce((sum, s) => sum + s.likes_count + s.comments_count + s.shares_count, 0) : localEngagement)
             ).toLocaleString()} 
             icon={Heart} 
             trend={hasRealData ? parseFloat(analyticsData?.engagement.engagementRate || "0") : computeEngagementRateFromLocal()} 
             trendLabel="taxa" 
             color="success" 
             delay={0.1} 
           />
<StatsCard 
             title="Seguidores" 
             value={(
               analyticsData?.overview.totalFollowers ||
               analyticsData?.followerData?.reduce((acc, curr: any) => acc + curr.currentFollowers, 0) || 
               localFollowers ||
               (platform !== 'all' ? localStats.filter(s => normalizePlatform(s.platform) === normalizePlatform(platform)).reduce((acc, c) => acc + (c.followers_count || 0), 0) : localStats.reduce((acc, c) => acc + (c.followers_count || 0), 0))
             ).toLocaleString()} 
             icon={Users} 
             trend={hasRealData ? (analyticsData?.overview.followersGrowth !== undefined ? parseFloat(analyticsData.overview.followersGrowth.toString()) : undefined) : computeFollowerGrowth()}
             trendLabel="este mês" 
             color="warning" 
             delay={0.1} 
           />
        </div>
      </Suspense>

      {/* Account List and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-[350px] bg-muted/30 rounded-2xl animate-pulse" />}>
            <AnalyticsChart 
              data={dashboardChartData} 
              loading={analyticsLoading} 
            />
          </Suspense>
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
              className="w-full mt-4 text-sm text-primary hover:underline font-bold"
            >
              Ver todas as redes →
            </button>
          </motion.div>
        </div>
      </div>

      <div className="mt-6">
        <Suspense fallback={<div className="h-64 bg-muted/30 rounded-2xl animate-pulse" />}>
          <RecentPosts onEditPost={(post: ScheduledPost) => {
            setEditingPost(post);
            setActiveTab("create");
          }} />
        </Suspense>
      </div>
    </>
  );
});

DashboardHomeView.displayName = "DashboardHomeView";
