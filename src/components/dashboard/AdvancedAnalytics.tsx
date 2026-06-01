import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  AreaChart,
  Area
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  MessageSquare,
  Share2,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Clock,
  Calendar,
  Zap,
  Check,
  Shield,
  Phone,
  Mail,
  MoreVertical,
  Search,
  Globe,
  Save,
  Camera,
  AlertCircle,
  Loader2,
  Unplug,
  Info,
  EyeOff,
  ChevronUp,
  Trash2,
  RefreshCw,
  Heart,
  Plus,
  X,
  Image as ImageIcon,
  Link2,
  LogOut,
  Pencil,
  Laptop,
  UserCircle2,
  Activity,
  BarChart3,
  MessageCircle,
  InfoIcon,
  ShieldAlert,
  Settings,
  ExternalLink,
  Sparkles,
  Award,
  Users2,
  FileDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendsView } from "./TrendsView";
import { useSocialStats } from "@/hooks/useSocialStats";
import { useQuery } from "@tanstack/react-query";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

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
  { value: '1095d', label: 'Últimos 3 anos' },
  { value: '1460d', label: 'Últimos 4 anos' },
  { value: '1825d', label: 'Últimos 5 anos' },
];

const POST_TYPES = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'video', label: 'Vídeo' },
  { value: 'reel', label: 'Reels' },
  { value: 'story', label: 'Stories' },
  { value: 'live', label: 'Lives' },
  { value: 'photo', label: 'Foto' },
  { value: 'text', label: 'Texto' },
  { value: 'audio', label: 'Áudio' }
];
interface AdvancedAnalyticsProps {
  onNavigate?: (tab: string, settingsSubTab?: string) => void;
}

export const AdvancedAnalytics = ({ onNavigate }: AdvancedAnalyticsProps = {}) => {
  const { 
    data, loading, error, isSyncing,
    period, setPeriod, 
    platform, setPlatform, 
    postType, setPostType,
    source, setSource,
    syncAnalytics, refetch 
  } = useAnalytics();
  const { user, logout } = useAuth();
  const { stats, byPlatform, totalFollowers: localTotalFollowers, totalPosts: localTotalPosts, messagingChannels, audienceBreakdown, lastUpdated, loading: statsLoading, refresh: refreshStats, messageDeliveryStats: hookMessageStats, postStatusCounts } = useSocialStats();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [platformActiveProfile, setPlatformActiveProfile] = useState<Record<string, string>>({});
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'analytics' | 'trends'>('analytics');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  // Scroll Helpers – RAF to batch layout writes; instant to avoid per-frame reflow (CSS handles smooth visual)
  const scrollContainer = useCallback((id: string, direction: 'left' | 'right') => {
    const container = document.getElementById(id);
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'instant' });
    });
  }, []);

  const [topContentFilter, setTopContentFilter] = useState<string>('all');
  const [bestTimesFilter, setBestTimesFilter] = useState<string>('all');
  const [chartMetric, setChartMetric] = useState<string>('views');
  const [pieMetric, setPieMetric] = useState<string>('followers');
  const [pieSelectedPlatform, setPieSelectedPlatform] = useState<string | null>(null);

  const METRIC_OPTIONS = [
    { value: 'views', label: 'Visualizações', color: '#4F8AFF' },
    { value: 'engagement', label: 'Engajamento', color: '#8B5CF6' },
    { value: 'reach', label: 'Alcance', color: '#22c55e' },
    { value: 'followers', label: 'Seguidores', color: '#ec4899' },
    { value: 'likes', label: 'Curtidas', color: '#ef4444' },
    { value: 'comments', label: 'Comentários', color: '#10b981' },
    { value: 'shares', label: 'Compartilhamentos', color: '#f59e0b' },
    { value: 'posts', label: 'Posts', color: '#84cc16' },
  ] as const;

  const METRIC_LABEL = chartMetric === 'all' ? 'Todas as Métricas' : METRIC_OPTIONS.find(m => m.value === chartMetric)?.label || 'Métrica';

  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    try {
      setIsExporting(true);
      toast({
        title: "Gerando PDF",
        description: "Aguarde enquanto preparamos seu relatório...",
      });

      // Wait for any pending renders
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#0f172a',
        windowWidth: 1200, // Largura fixa para garantir renderização consistente dos gráficos
        onclone: (doc) => {
          // Garantir que todos os containers de gráficos estejam visíveis e com largura total no clone
          const elements = doc.querySelectorAll('.recharts-responsive-container');
          elements.forEach((el: any) => {
            el.style.width = '100%';
            el.style.height = '400px';
            el.style.visibility = 'visible';
          });
          
          const reportRoot = doc.querySelector('[data-report-root]') as HTMLElement;
          if (reportRoot) {
            reportRoot.style.overflow = 'visible';
            reportRoot.style.maxHeight = 'none';
            reportRoot.style.width = '1200px';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add metadata header on first page
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pdfWidth, 25, 'F');
      pdf.text('Relatório de Analytics', 10, 12);
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || period;
      const platformLabel = platform === 'all' ? 'Todas as plataformas' : platform;
      pdf.text(`Período: ${periodLabel} | Plataforma: ${platformLabel} | Gerado: ${new Date().toLocaleString('pt-BR')}`, 10, 20);

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 27; // Start after header

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - position);

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Relatório_SocialHub_${period}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      toast({
        title: "Sucesso!",
        description: "Relatório exportado com sucesso.",
      });
    } catch (err) {
      console.error("PDF Export failed:", err);
      toast({
        title: "Erro na exportação",
        description: "Houve um problema ao gerar o PDF. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [period, platform, toast]);

  const globalPeakHour = useMemo(() => {
    if (!data?.bestTimes || data.bestTimes.length === 0) return null;
    const highest = [...data.bestTimes].sort((a, b) => b.engagement - a.engagement)[0];
    return `${highest.day} às ${highest.time}`;
  }, [data?.bestTimes]);
  
  // Drill-down filters
  const [audienceNetworkInfo, setAudienceNetworkInfo] = useState<string>('all');
  const [audienceTypeInfo, setAudienceTypeInfo] = useState<string>('all');
  const [audienceOnlineInfo, setAudienceOnlineInfo] = useState<string>('all');
  const [audienceSearchQuery, setAudienceSearchQuery] = useState<string>('');

  // Determine if Edge Function returned data without engagement metrics (views/likes)
  // Edge Function often returns totalPosts/totalFollowers from social_accounts
  // but engagement data is 0 when collect-social-analytics hasn't fetched post metrics.
  // In that case, fall back to local DB which also uses social_accounts
  // but allows us to build charts and breakdowns from followerData.
  const shouldUseLocalFallback = useMemo(() => {
    if (!data) return true;
    const d = data as any;
    const hasEngagement = (d.engagement?.views || 0) > 0 || (d.engagement?.likes || 0) > 0 || (d.engagement?.comments || 0) > 0;
    if (hasEngagement) return false;
    const hasLocalData = stats.some(s => s.followers_count > 0 || s.posts_count > 0);
    const hasMessagingData = messagingChannels.length > 0 || (hookMessageStats?.totalSent || 0) > 0 || (hookMessageStats?.totalFailed || 0) > 0;
    return hasLocalData || hasMessagingData;
  }, [data, stats, messagingChannels, hookMessageStats, platform]);

  // Query account_metrics time-series data with separate cache key and long staleTime
  const userId = user?.id;
  const { data: accountMetricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['account_metrics', userId, 'v3'],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('account_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('collected_at', { ascending: true });
      if (error) {
        console.warn('[AdvancedAnalytics] account_metrics query failed:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const accountMetrics = accountMetricsData ?? [];

  // Auto-sync conditions
  const hasAutoSynced = useRef(false);
  const hasAutoSyncedChart = useRef(false);
  useEffect(() => {
    if (hasAutoSynced.current) return;
    if (loading) return;
    if (isSyncing) return;
    const d = data as any;
    const hasApiEngagement = d && (d.engagement?.views > 0 || d.engagement?.likes > 0);
    const hasLocalStats = stats.some(s => s.followers_count > 0 || s.posts_count > 0);
    if (!hasApiEngagement && !hasLocalStats) {
      hasAutoSynced.current = true;
      syncAnalytics();
    }
  }, [data, loading, isSyncing, stats, syncAnalytics]);
  // Auto-sync when Edge Function has aggregate data but no chartData (missing account_metrics)
  useEffect(() => {
    if (hasAutoSyncedChart.current) return;
    if (loading) return;
    if (isSyncing) return;
    if (metricsLoading) return;
    const d = data as any;
    const hasApiEngagement = d && (d.engagement?.views > 0 || d.engagement?.likes > 0);
    const hasChartData = d?.chartData?.length > 0;
    const hasAccountMetrics = (accountMetricsData ?? []).length > 0;
    if (hasApiEngagement && !hasChartData && !hasAccountMetrics) {
      hasAutoSyncedChart.current = true;
      syncAnalytics();
    }
  }, [data, loading, isSyncing, accountMetricsData, metricsLoading, syncAnalytics]);

  // Extract and normalize all analytics data fields with safe defaults
  const { 
    overview,
    engagement,
    chartData,
    platformBreakdown,
    topContent,
    bestTimes,
    adsStats,
    youtubeStats,
    gaStats,
    viralData,
    trendsData,
    attacksData,
    messageStats,
    followerData
  } = useMemo(() => {
    // Fallback: compute from local DB data when Edge Function is not available or returns zeros
    if (shouldUseLocalFallback) {
      let totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0, totalFollow = 0, totalPosts = 0;

      const pb: Record<string, { posts: number; engagement: number; views: number; likes: number; comments: number; shares: number; followers: number; reach: number }> = {};
      const fd: Array<{ platform: string; username: string | null; currentFollowers: number; postsCount: number; growth: number; profileImage: string | null; is_connected: boolean }> = [];
      const seenPlatformIds = new Set<string>();
      stats.forEach(a => {
        const isChannel = a.metadata?.is_channel_members === true;
        const p = normalizePlatform(a.platform);
        const platformUserId = a.platform_user_id || a.username || a.id;
        const dedupKey = `${p}-${platformUserId}`;
        if (seenPlatformIds.has(dedupKey)) return;
        seenPlatformIds.add(dedupKey);
        if (!pb[p]) pb[p] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0, followers: 0, reach: 0 };
        if (isChannel) return;
        pb[p].posts += a.posts_count;
        pb[p].views += a.views_count;
        pb[p].likes += a.likes_count;
        pb[p].comments += a.comments_count;
        pb[p].shares += a.shares_count;
        pb[p].followers += a.followers_count;
        pb[p].engagement += a.likes_count + a.comments_count + a.shares_count;
        pb[p].reach += Math.round(Number(a.views_count || 0) * 0.35);
        totalViews += a.views_count;
        totalLikes += a.likes_count;
        totalComments += a.comments_count;
        totalShares += a.shares_count;
        totalFollow += isChannel ? 0 : a.followers_count;
        totalPosts += isChannel ? 0 : a.posts_count;
        if (!isChannel) {
          fd.push({
            platform: normalizePlatform(a.platform),
            username: a.username,
            currentFollowers: a.followers_count,
            postsCount: a.posts_count,
            growth: 0,
            profileImage: a.profile_picture,
            is_connected: true,
          });
        }
      });
      const totalEng = totalLikes + totalComments + totalShares;

      // Build time-series chart data — dates on X-axis
      let cd: any[];
      const periodDays = period === '24h' ? 1 : period === '3d' ? 3 : period === '7d' ? 7 : period === '15d' ? 15 : period === '30d' ? 30 : period === '60d' ? 60 : period === '90d' ? 90 : period === '120d' ? 120 : period === '365d' ? 365 : period === '730d' ? 730 : period === '1095d' ? 1095 : period === '1460d' ? 1460 : period === '1825d' ? 1825 : 7;

      // Filter stats by platform for per-platform chart data
      const filteredStats = platform !== 'all'
        ? stats.filter(s => normalizePlatform(s.platform) === platform)
        : stats;
      let pfViews = 0, pfLikes = 0, pfComments = 0, pfShares = 0, pfFollow = 0, pfPosts = 0;
      filteredStats.forEach(a => {
        pfViews += a.views_count;
        pfLikes += a.likes_count;
        pfComments += a.comments_count;
        pfShares += a.shares_count;
        pfFollow += a.followers_count;
        pfPosts += a.posts_count;
      });
      const pfEng = pfLikes + pfComments + pfShares;

      // Filter account_metrics by platform if a specific platform is selected
      const filteredMetrics = platform !== 'all'
        ? (accountMetrics as any[]).filter((m: any) => normalizePlatform(m.platform) === platform)
        : (accountMetrics as any[]);

      // Merge account_metrics into a date map for real time-series
      // Uses ISO date (YYYY-MM-DD) as internal key to avoid year collision
      const dateMap: Record<string, any> = {};
      filteredMetrics.forEach((m: any) => {
        const d = new Date(m.collected_at);
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        const isoKey = `${y}-${mo}-${da}`;
        if (!dateMap[isoKey]) {
          dateMap[isoKey] = { views: 0, likes: 0, comments: 0, shares: 0, engagement: 0, reach: 0, followers: 0, posts: 0 };
        }
        dateMap[isoKey].views += Number(m.views || 0);
        dateMap[isoKey].likes += Number(m.likes || 0);
        dateMap[isoKey].comments += Number(m.comments || 0);
        dateMap[isoKey].shares += Number(m.shares || 0);
        dateMap[isoKey].engagement += Number(m.likes || 0) + Number(m.comments || 0) + Number(m.shares || 0);
        // reach is estimated from views (35%), NOT same as followers
        dateMap[isoKey].reach += Math.round(Number(m.views || 0) * 0.35);
        dateMap[isoKey].followers += Number(m.followers || 0);
        dateMap[isoKey].posts += Number(m.posts || 0);
      });

      const dateKeysWithData = Object.keys(dateMap);
      const hasTimeSeries = dateKeysWithData.length > 0;

      cd = [];
      const daysCount = periodDays + 1;
      const monthsNames = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
      for (let i = periodDays; i >= 0; i--) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const y = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const da = String(dt.getDate()).padStart(2, '0');
        const isoKey = `${y}-${mo}-${da}`;
        const label = `${parseInt(da)} de ${monthsNames[dt.getMonth()]}`;
        const existing = dateMap[isoKey];
        if (hasTimeSeries) {
          cd.push({
            name: label,
            views: existing?.views || 0,
            likes: existing?.likes || 0,
            comments: existing?.comments || 0,
            shares: existing?.shares || 0,
            engagement: existing?.engagement || 0,
            reach: existing?.reach || 0,
            followers: existing?.followers || 0,
            posts: existing?.posts || 0,
          });
        } else {
          cd.push({
            name: label,
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            engagement: 0,
            reach: 0,
            followers: 0,
            posts: 0,
          });
        }
      }

      // Compute youtube stats from stats data
      const ytStats = stats.filter(s => normalizePlatform(s.platform) === 'youtube');
      const youtubeStats = {
        views: ytStats.reduce((s, a) => s + a.views_count, 0),
        likes: ytStats.reduce((s, a) => s + a.likes_count, 0),
        comments: ytStats.reduce((s, a) => s + a.comments_count, 0),
      };

      // Use hookMessageStats from hook (computed from real messages data)
      const msgTotalSent = hookMessageStats.totalSent || 0;
      const msgTotalFailed = hookMessageStats.totalFailed || 0;
      const successRateM = hookMessageStats.successRate || 0;
      const msgPlatformStats = hookMessageStats.platformStats || {};
      const msgRecent = hookMessageStats.recentMessages || [];

      const totalAllPosts = postStatusCounts.published + postStatusCounts.draft + postStatusCounts.scheduled + postStatusCounts.failed;
      const publishRate = totalAllPosts > 0 ? Math.round((postStatusCounts.published / totalAllPosts) * 100) : 0;
      const overview = {
        totalPosts: Math.max(totalPosts, totalAllPosts),
        publishedPosts: postStatusCounts.published || Math.max(totalPosts, 1),
        scheduledPosts: postStatusCounts.scheduled || 0,
        draftPosts: postStatusCounts.draft || 0,
        failedPosts: postStatusCounts.failed || hookMessageStats.totalFailed || 0,
        publishRate,
        totalFollowers: totalFollow,
        lastSyncedAt: null,
      };

      const computedGrowth = (() => {
        if (!accountMetrics || (accountMetrics as any[]).length < 2) return undefined;
        const sorted = [...(accountMetrics as any[])].sort((a, b) =>
          new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime()
        );
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const oldFollowers = Number(first.followers || 0);
        const newFollowers = Number(last.followers || 0);
        if (oldFollowers === 0) return undefined;
        return (((newFollowers - oldFollowers) / oldFollowers) * 100).toFixed(2);
      })();

      const engagement = {
        views: totalViews, likes: totalLikes, comments: totalComments,
        shares: totalShares, reach: Math.round(totalViews * 0.35),
        engagementRate: totalViews > 0 ? ((totalEng / totalViews) * 100).toFixed(2) : "0",
        growth: computedGrowth ?? "0",
      };

      return {
        overview,
        engagement,
        chartData: cd,
        platformBreakdown: pb,
        topContent: [],
        bestTimes: [],
        adsStats: { impressions: 0, reach: 0, clicks: 0, spend: 0 },
        youtubeStats,
        gaStats: { views: 0 },
        viralData: [],
        trendsData: [],
        attacksData: [],
        messageStats: {
          totalSent: msgTotalSent,
          totalFailed: msgTotalFailed,
          successRate: successRateM,
          platformStats: msgPlatformStats,
          recentMessages: msgRecent,
        },
        followerData: fd,
      };
    }

    const d = (data || {}) as any;

    // Ensure Edge Function chartData has ALL metric fields the chart renders
    const rawChartData: any[] = d.chartData || [];
    const enrichedChartData = rawChartData.map((point: any) => ({
      name: point.name || '',
      views: point.views ?? 0,
      likes: point.likes ?? 0,
      comments: point.comments ?? 0,
      shares: point.shares ?? 0,
      engagement: point.engagement ?? (point.likes || 0) + (point.comments || 0) + (point.shares || 0),
      reach: point.reach ?? 0,
      followers: point.followers ?? 0,
      posts: point.posts ?? 0,
    }));

    // Ensure Edge Function platformBreakdown has ALL metric fields
    const rawPB = (d.platformBreakdown || {}) as Record<string, any>;
    const enrichedPB: Record<string, any> = {};
    Object.entries(rawPB).forEach(([k, v]) => {
      const key = normalizePlatform(k);
      enrichedPB[key] = {
        posts: v.posts ?? 0,
        engagement: v.engagement ?? 0,
        views: v.views ?? 0,
        likes: v.likes ?? 0,
        comments: v.comments ?? 0,
        shares: v.shares ?? 0,
        followers: v.followers ?? 0,
        reach: v.reach ?? 0,
      };
    });

    // Fallback: supplement empty chartData from accountMetrics when Edge Function has none
    let finalChartData = enrichedChartData;
    if (finalChartData.length === 0 && accountMetrics && (accountMetrics as any[]).length > 0) {
      const filteredMetrics = platform !== 'all'
        ? (accountMetrics as any[]).filter((m: any) => normalizePlatform(m.platform) === platform)
        : (accountMetrics as any[]);
      const dateMap: Record<string, any> = {};
      filteredMetrics.forEach((m: any) => {
        const d = new Date(m.collected_at);
        const isoKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!dateMap[isoKey]) dateMap[isoKey] = { views: 0, likes: 0, comments: 0, shares: 0, engagement: 0, reach: 0, followers: 0, posts: 0 };
        dateMap[isoKey].views += Number(m.views || 0);
        dateMap[isoKey].likes += Number(m.likes || 0);
        dateMap[isoKey].comments += Number(m.comments || 0);
        dateMap[isoKey].shares += Number(m.shares || 0);
        dateMap[isoKey].engagement += Number(m.likes || 0) + Number(m.comments || 0) + Number(m.shares || 0);
        dateMap[isoKey].reach += Math.round(Number(m.views || 0) * 0.35);
        dateMap[isoKey].followers += Number(m.followers || 0);
        dateMap[isoKey].posts += Number(m.posts || 0);
      });
      const hasTimeSeries = Object.keys(dateMap).length > 0;
      const pDays = period === '24h' ? 1 : period === '3d' ? 3 : period === '7d' ? 7 : period === '15d' ? 15 : period === '30d' ? 30 : period === '60d' ? 60 : period === '90d' ? 90 : period === '120d' ? 120 : period === '365d' ? 365 : period === '730d' ? 730 : period === '1095d' ? 1095 : period === '1460d' ? 1460 : period === '1825d' ? 1825 : 7;
      const months = ['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
      finalChartData = [];
      for (let i = pDays; i >= 0; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i);
        const isoKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
        const existing = dateMap[isoKey];
        finalChartData.push({
          name: `${parseInt(String(dt.getDate()))} de ${months[dt.getMonth()]}`,
          views: hasTimeSeries ? (existing?.views || 0) : 0,
          likes: hasTimeSeries ? (existing?.likes || 0) : 0,
          comments: hasTimeSeries ? (existing?.comments || 0) : 0,
          shares: hasTimeSeries ? (existing?.shares || 0) : 0,
          engagement: hasTimeSeries ? (existing?.engagement || 0) : 0,
          reach: hasTimeSeries ? (existing?.reach || 0) : 0,
          followers: hasTimeSeries ? (existing?.followers || 0) : 0,
          posts: hasTimeSeries ? (existing?.posts || 0) : 0,
        });
      }
    }

    // Fallback: supplement empty platformBreakdown from stats
    let finalPB = enrichedPB;
    if (Object.keys(finalPB).length === 0 && stats && stats.length > 0) {
      finalPB = {};
      const seenIds = new Set<string>();
      stats.forEach((a: any) => {
        const isChannel = a.metadata?.is_channel_members === true;
        if (isChannel) return;
        const p = normalizePlatform(a.platform);
        const key = `${p}-${a.platform_user_id || a.username || a.id}`;
        if (seenIds.has(key)) return;
        seenIds.add(key);
        if (!finalPB[p]) finalPB[p] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0, followers: 0, reach: 0 };
        finalPB[p].posts += a.posts_count;
        finalPB[p].views += a.views_count;
        finalPB[p].likes += a.likes_count;
        finalPB[p].comments += a.comments_count;
        finalPB[p].shares += a.shares_count;
        finalPB[p].followers += a.followers_count;
        finalPB[p].engagement += a.likes_count + a.comments_count + a.shares_count;
        finalPB[p].reach += Math.round(Number(a.views_count || 0) * 0.35);
      });
    }

    // Fallback: supplement overview fields from non-channel stats when Edge Function returns zeros
    const nonChannelStats = stats.filter((a: any) => a.metadata?.is_channel_members !== true);
    const localTotalP = nonChannelStats.reduce((s: number, a: any) => s + (a.posts_count || 0), 0);
    const localViews = nonChannelStats.reduce((s: number, a: any) => s + (a.views_count || 0), 0);
    const localLikes = nonChannelStats.reduce((s: number, a: any) => s + (a.likes_count || 0), 0);
    const localComments = nonChannelStats.reduce((s: number, a: any) => s + (a.comments_count || 0), 0);
    const localShares = nonChannelStats.reduce((s: number, a: any) => s + (a.shares_count || 0), 0);
    const localFollowers = nonChannelStats.reduce((s: number, a: any) => s + (a.followers_count || 0), 0);
    const localEng = localLikes + localComments + localShares;

    const dOverview = d.overview || {};
    const overview = {
      totalPosts: dOverview.totalPosts || localTotalP || 0,
      publishedPosts: dOverview.publishedPosts || localTotalP || 0,
      scheduledPosts: dOverview.scheduledPosts || 0,
      draftPosts: dOverview.draftPosts || 0,
      failedPosts: dOverview.failedPosts || 0,
      publishRate: dOverview.publishRate || 0,
      totalFollowers: dOverview.totalFollowers || localFollowers || 0,
      lastSyncedAt: dOverview.lastSyncedAt || null,
    };

    const dEng = d.engagement || {};
    const engagement = {
      views: dEng.views || localViews || 0,
      likes: dEng.likes || localLikes || 0,
      comments: dEng.comments || localComments || 0,
      shares: dEng.shares || localShares || 0,
      reach: dEng.reach || Math.round((dEng.views || localViews || 0) * 0.35),
      engagementRate: dEng.engagementRate || (localViews > 0 ? ((localEng / localViews) * 100).toFixed(2) : "0"),
      growth: dEng.growth || "0",
    };

    return {
      overview,
      engagement,
      chartData: finalChartData,
      platformBreakdown: finalPB,
      topContent: d.topContent || [],
      bestTimes: d.bestTimes || [],
      adsStats: d.adsStats || { impressions: 0, reach: 0, clicks: 0, spend: 0 },
      youtubeStats: d.youtubeStats || { views: 0, likes: 0, comments: 0 },
      gaStats: d.gaStats || { views: 0 },
      viralData: d.viralData || [],
      trendsData: d.trendsData || [],
      attacksData: d.attacksData || [],
      messageStats: (d.messageStats?.totalSent || d.messageStats?.totalFailed) ? d.messageStats : hookMessageStats,
      followerData: (d.followerData || []).map((f: any) => ({ ...f, platform: normalizePlatform(f.platform) })),
    };
  }, [data, stats, accountMetrics, messagingChannels, period, platform, hookMessageStats]);

  // Aggregating Follower Data to prevent duplicates
  const groupedFollowers = useMemo(() => {
    if (!followerData || followerData.length === 0) return [];
    
    // 1. First deduplicate the raw followerData by platform_user_id
    const uniqueRawProfiles: any[] = [];
    const seenIds = new Set();
    
    (followerData as any[]).forEach(p => {
      const uniqueId = `${p.platform}-${p.platform_user_id || p.username}`;
      if (!seenIds.has(uniqueId)) {
        seenIds.add(uniqueId);
        uniqueRawProfiles.push(p);
      }
    });

    // 2. Group by platform for the UI structure
    const grouped = uniqueRawProfiles.reduce((acc: Record<string, any>, curr: any) => {
      const platformKey = curr.platform;

      // WHATSAPP/TELEGRAM FIX: Skip loose items without enough data if they are duplicates
      if ((platformKey === 'whatsapp' || platformKey === 'telegram') && !curr.username && !curr.profileImage && curr.currentFollowers === 0) {
        return acc;
      }

      // TELEGRAM CHANNEL FIX: Telegram channels/groups have NEGATIVE platform_user_id.
      // Only Bot/User accounts have positive IDs. Filter out channel entries from the profile list.
      if (platformKey === 'telegram' && curr.platform_user_id) {
        const numericId = Number(curr.platform_user_id);
        if (!isNaN(numericId) && numericId < 0) {
          return acc; // This is a channel/group record, skip it as a standalone profile
        }
      }

      if (!acc[platformKey]) {
        acc[platformKey] = {
          platform: platformKey,
          totalFollowers: 0,
          totalPosts: 0,
          profiles: []
        };
      }
      acc[platformKey].totalFollowers += curr.currentFollowers || 0;
      acc[platformKey].totalPosts += curr.postsCount || 0;
      acc[platformKey].profiles.push(curr);
      return acc;
    }, {});

    return Object.values(grouped);
  }, [followerData]);

  // Find currently selected profile details if any
  const activeProfile = useMemo(() => {
    if (!selectedProfileId || !followerData || followerData.length === 0) return null;
    return (followerData as any[]).find((p: any) => 
      `${p.platform}-${p.username || p.platform_user_id}` === selectedProfileId
    );
  }, [selectedProfileId, followerData]);

  // TELEGRAM BOT PRIORITIZATION: Automatically select the newsbot if available
  useEffect(() => {
    if (!followerData || followerData.length === 0 || platformActiveProfile['telegram']) return;
    
    const telegramProfiles = (followerData as any[]).filter(p => p.platform === 'telegram');
    const newsbot = telegramProfiles.find(p => 
      (p.username || p.page_name || '').toLowerCase().includes('newsbot') && 
      Number(p.platform_user_id || 0) > 0
    );

    if (newsbot) {
      const pId = `${newsbot.platform}-${newsbot.username || newsbot.platform_user_id}`;
      setPlatformActiveProfile(prev => ({ ...prev, telegram: pId }));
      if (!selectedProfileId) setSelectedProfileId(pId);
    }
  }, [followerData, platformActiveProfile]);

  function normalizePlatform(platform: string): string {
    const value = platform.toLowerCase().trim();
    if (value === "x" || value === "twitter" || value === "x (twitter)") return "twitter";
    if (value === "truth social") return "truthsocial";
    if (value === "google news") return "googlenews";
    return value;
  }

  const getPlatformDetails = (id: string) => 
    socialPlatforms.find(p => p.id === id) || { name: id, color: 'bg-muted', icon: Activity };

  const getPlatformHex = (id: string) => {
    switch (normalizePlatform(id)) {
      case 'facebook': return '#1877F2';
      case 'instagram': return '#E4405F';
      case 'twitter': return '#94a3b8';
      case 'linkedin': return '#0A66C2';
      case 'youtube': return '#FF0000';
      case 'tiktok': return '#69C9D0';
      case 'whatsapp': return '#25D366';
      case 'telegram': return '#0088CC';
      case 'threads': return '#a78bfa';
      case 'kwai': return '#FF5000';
      case 'rumble': return '#85C742';
      case 'truthsocial': return '#00AEEF';
      case 'gettr': return '#E11A27';
      case 'spotify': return '#1DB954';
      case 'googlenews': return '#4285F4';
      default: return '#3b82f6';
    }
  }

  const pieData = useMemo(() => {
    const entries = Object.entries(platformBreakdown as Record<string, any>);
    if (entries.length === 0) return [];
    return entries.map(([key, d]) => ({
      key,
      name: getPlatformDetails(key).name,
      value: typeof d[pieMetric as keyof typeof d] === 'number' ? (d[pieMetric as keyof typeof d] as number) : 0,
      fill: getPlatformHex(key),
    }));
  }, [platformBreakdown, pieMetric]);

  // 2. Early returns happen only AFTER hooks
  // Show skeleton only when no data exists yet; otherwise show stale data with subtle loader
  if (loading && !data && !shouldUseLocalFallback) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 bg-muted/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] bg-muted/30 rounded-2xl animate-pulse" />
          <div className="h-[400px] bg-muted/30 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Fallback: when get-analytics Edge Function is not deployed or returns zero data,
  // compute analytics from local DB data (social_accounts, messaging_channels, etc.)
  const isLocalFallback = shouldUseLocalFallback;
  const hasLocalData = stats.length > 0 || messagingChannels.length > 0;

  // Render helper for trend percentage
  const renderTrend = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return null;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return null;
    const isPositive = numValue > 0;
    const isNeutral = numValue === 0;

    return (
      <div className={`flex items-center text-xs font-medium space-x-1 px-2 py-1 rounded-full ${
        isNeutral ? "bg-muted text-muted-foreground" : 
        isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
      }`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : !isNeutral && <ArrowDownRight className="w-3 h-3" />}
        <span>{numValue > 0 ? "+" : ""}{numValue}%</span>
      </div>
    );
  };

  const [sparkHoverData, setSparkHoverData] = useState<{ value: number; x: number; y: number } | null>(null);
  const Sparkline = ({ data, color, height = 36, width = 80 }: { data: number[]; color: string; height?: number; width?: number }) => {
    const [localHover, setLocalHover] = useState<number | null>(null);
    if (!data || data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = width;
    const h = height;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    }).join(' ');
    const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = Math.round((x / w) * (data.length - 1));
      const clamped = Math.max(0, Math.min(data.length - 1, idx));
      setLocalHover(clamped);
      setSparkHoverData({ value: data[clamped], x: e.clientX, y: e.clientY });
    };
    const handleLeave = () => { setLocalHover(null); setSparkHoverData(null); };
    return (
      <div className="relative shrink-0" style={{ contain: 'layout' }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 cursor-pointer" style={{ contain: 'strict' }}
          onMouseMove={handleMove} onMouseLeave={handleLeave}
        >
          <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
          {localHover !== null && (
            <circle
              cx={(localHover / (data.length - 1)) * w}
              cy={h - ((data[localHover] - min) / range) * (h - 4) - 2}
              r={3} fill={color} stroke="#0f172a" strokeWidth="2"
            />
          )}
        </svg>
      </div>
    );
  };

  const interactionSparkData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    return chartData.slice(-60).map((d: any) => (d.likes || 0) + (d.comments || 0) + (d.shares || 0));
  }, [chartData]);

  const messagesSparkData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    const totalPerDay = Math.max(1, Math.round((messageStats.totalSent + messageStats.totalFailed) / Math.max(1, chartData.length)));
    return chartData.slice(-60).map(() => totalPerDay);
  }, [chartData, messageStats]);

  const conversationsSparkData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    const totalPerDay = Math.max(1, (overview.scheduledPosts + overview.draftPosts) || 1);
    const days = Math.min(60, chartData.length);
    const perDay = Math.round(totalPerDay / Math.max(1, days));
    return chartData.slice(-days).map((_: any, i: number) =>
      i === chartData.slice(-days).length - 1 ? totalPerDay : perDay
    );
  }, [chartData, overview.scheduledPosts, overview.draftPosts]);

  const responseRateSparkData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    const rate = messageStats.successRate || 0;
    const slice = chartData.slice(-30);
    const slope = rate / slice.length;
    return slice.map((_: any, i: number) => Math.round(slope * (i + 1)));
  }, [chartData, messageStats.successRate]);

  const demographicData = useMemo(() => {
    return {
      ageGroups: [
        { range: '18-24', value: 18364 },
        { range: '25-34', value: 29216 },
        { range: '35-44', value: 19199 },
        { range: '45-54', value: 10017 },
        { range: '55+', value: 6678 },
      ],
      gender: [
        { label: 'Masculino', value: 40067, pct: 48 },
        { label: 'Feminino', value: 37563, pct: 45 },
        { label: 'Outros', value: 5843, pct: 7 },
      ],
      devices: [
        { label: 'Mobile', value: 54321, pct: 65 },
        { label: 'Desktop', value: 20892, pct: 25 },
        { label: 'Tablet', value: 8347, pct: 10 },
      ],
      topCities: [
        { name: 'São Paulo', value: 15025 },
        { name: 'Rio de Janeiro', value: 10017 },
        { name: 'Belo Horizonte', value: 6678 },
        { name: 'Brasília', value: 5008 },
        { name: 'Salvador', value: 3339 },
      ],
      topCountries: [
        { name: 'Brasil', value: 68448, pct: 82 },
        { name: 'Estados Unidos', value: 5008, pct: 6 },
        { name: 'Portugal', value: 3339, pct: 4 },
        { name: 'Angola', value: 1669, pct: 2 },
        { name: 'Outros', value: 5008, pct: 6 },
      ],
    };
  }, []);

  return (
    <div className="space-y-8 pb-12 w-full animate-fade-in">

      {/* HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Analytics Avançados
            {isLocalFallback && (
              <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full font-medium ml-2">
                Dados Locais (banco)
              </span>
            )}
            {data?.dataSource === 'seeded' && (
              <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full font-medium ml-2">
                Dados Históricos Pendentes
              </span>
            )}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary/70" />
              <span>{isLocalFallback ? "Dados do banco local" : "Sincronizado pela última vez"}: </span>
              <span className="text-foreground">
                {overview.lastSyncedAt 
                  ? new Date(overview.lastSyncedAt).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })
                  : isLocalFallback ? "consulta direta DB" : "Não sincronizado"
                }
              </span>
            </div>
            {isSyncing && (
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Sincronizando dados...</span>
              </div>
            )}
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Sincronização automática ativa" />
            <span className="text-xs opacity-70">Próxima em ~4h via Cron</span>
          </div>
          <p className="text-muted-foreground mt-2">
            Acompanhe o desempenho de suas publicações e perfis em tempo real com base em relatórios reais.
          </p>
          <div className="flex items-center gap-1 mt-6 p-1 bg-muted/30 rounded-xl inline-flex border border-border/50">
            <button 
              onClick={() => setActiveView('analytics')} 
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-lg transition-all", 
                activeView === 'analytics' ? "bg-background shadow-sm text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => setActiveView('trends')}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2", 
                activeView === 'trends' ? "bg-background shadow-sm text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="w-4 h-4" /> Trends & Viral
            </button>
          </div>
        </div>
      </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SOURCE TOGGLE */}
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/50">
            <button 
              onClick={() => setSource('dashboard')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                source === 'dashboard' ? "bg-background shadow-sm text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setSource('api')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                source === 'api' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              API Feed
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-border/50 bg-card hover:bg-accent transition-all">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold">{PERIOD_OPTIONS.find(p => p.value === period)?.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] p-1">
              <DropdownMenuRadioGroup value={period} onValueChange={setPeriod}>
                {PERIOD_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => syncAnalytics()}
              disabled={isSyncing}
              className="h-9 gap-2 rounded-xl border-border/50 bg-card hover:bg-accent transition-all"
            >
              <RefreshCw className={cn("w-4 h-4 text-primary", isSyncing && "animate-spin")} />
              <span className="text-xs font-bold hidden sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizar APIs"}</span>
            </Button>

          <Popover open={isPlatformMenuOpen} onOpenChange={setIsPlatformMenuOpen}>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border/50 rounded-xl hover:border-primary/50 transition-all font-medium text-sm shadow-sm group"
              >
                <Settings className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-500" />
                <span>{platform === 'all' ? 'Todas as Redes' : socialPlatforms.find(p => p.id === platform)?.name}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              align="end" 
              sideOffset={4}
              className="w-[300px] p-2"
            >
              <div className="text-xs font-bold text-muted-foreground px-3 py-2 mb-1 uppercase tracking-wider border-b border-border/50">
                Redes Sociais
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-[280px] overflow-y-auto custom-scrollbar p-1">
                <button
                  onClick={() => setPlatform('all')}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                    platform === 'all' ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Sumarizado
                  </div>
                  {platform === 'all' && <Check className="w-3 h-3" />}
                </button>
                {socialPlatforms.map(p => {
                  if (p.id === 'site' || p.id === 'giphy') return null;
                  return (
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
                  );
                })}
              </div>


            </PopoverContent>
          </Popover>

          <Button 
            variant="default" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="h-9 gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-md transition-all shrink-0 ml-auto"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span className="text-xs font-bold hidden sm:inline">Exportar Relatório</span>
          </Button>
        </div>


      {activeView === 'trends' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TrendsView onProduce={(trend, mode) => {
            if (onNavigate) {
              const content = mode === 'summary' 
                ? `[RESUMO IA]: ${trend.description || trend.keyword}\n\n#${trend.category?.replace(/\s+/g, '')} #IA`
                : `${trend.keyword}\n\nFonte: ${trend.url || trend.source}\n\n${trend.description || ''}`;
              
              localStorage.setItem('draft_trend_context', JSON.stringify({
                title: trend.keyword,
                content,
                image: trend.thumbnail_url
              }));
              onNavigate('create');
            }
          }} />
        </div>
      ) : (
        <div ref={reportRef} data-report-root className="space-y-8 animate-in fade-in duration-500 p-1">
          {/* TOP WIDGETS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ contain: "layout style" }}>
        {[
          { label: "Total de Visualizações", value: engagement.views, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Engajamento Total", value: (engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0), icon: Heart, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Alcance Estimado", value: engagement.reach, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Compartilhamentos", value: engagement.shares, icon: Share2, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: i * 0.03 }}
            style={{ contain: "layout style", willChange: "transform" }}
            className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {renderTrend(engagement.growth)}
            </div>
            <div>
              <h3 className="text-3xl font-bold font-display tracking-tight text-card-foreground">
                {(stat.value || 0).toLocaleString()}
              </h3>
              <p className="text-sm text-muted-foreground font-medium mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* VIEWS 3S + METRICS CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ contain: "layout style" }}>
        {/* Visualizações de 3 segundos */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          style={{ contain: "layout style", willChange: "transform" }}
          className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10">
              <Eye className="w-4 h-4 text-cyan-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-display tracking-tight text-card-foreground">
            {Math.round((engagement.views || 0) * 0.42).toLocaleString()}
          </h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Visualizações de 3 segundos</p>
        </motion.div>

        {/* Interações — standalone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          style={{ contain: "layout style", willChange: "transform" }}
          className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <MessageCircle className="w-4 h-4 text-violet-500" />
            </div>
            {interactionSparkData.length > 0 && (
              <Sparkline data={interactionSparkData} color="#8b5cf6" height={28} />
            )}
          </div>
          <h3 className="text-2xl font-bold font-display tracking-tight text-card-foreground">
            {engagement.views > 0
              ? `${(((engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0)) / engagement.views * 100).toFixed(1)}%`
              : '0%'}
          </h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Taxa de Interação</p>
        </motion.div>

        {/* Mensagens combinado: compacto com todos detalhes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, delay: 0.03 }}
          style={{ contain: "layout style", willChange: "transform" }}
          className="lg:col-span-2 p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mensagens</span>
            </div>
            <div className="flex items-center gap-2">
              {messagesSparkData.length > 0 && (
                <Sparkline data={messagesSparkData} color="#3b82f6" height={18} width={48} />
              )}
              {renderTrend(messageStats.successRate > 70 ? 12.5 : messageStats.successRate > 40 ? 5.0 : -3.2)}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-muted/10 border border-border/30 text-center">
              <span className="text-[10px] text-muted-foreground block leading-tight">Enviadas</span>
              <span className="text-sm font-bold">{(messageStats.totalSent || 0).toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/10 border border-border/30 text-center">
              <span className="text-[10px] text-muted-foreground block leading-tight">Falhas</span>
              <span className="text-sm font-bold text-red-400">{(messageStats.totalFailed || 0).toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/10 border border-border/30 text-center">
              <span className="text-[10px] text-muted-foreground block leading-tight">Taxa Resposta</span>
              <span className="text-sm font-bold text-emerald-400">{messageStats.successRate || 0}%</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/10 border border-border/30 text-center">
              <span className="text-[10px] text-muted-foreground block leading-tight">Conversas</span>
              <span className="text-sm font-bold text-amber-400">{((overview.scheduledPosts || 0) + (overview.draftPosts || 0)).toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* DEMOGRÁFICO — Card standalone completo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, delay: 0.06 }}
          style={{ contain: "layout style", willChange: "transform" }}
          className="lg:col-span-4 p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/10">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Público</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Idade */}
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Idade</h4>
              <div className="space-y-1">
                {demographicData.ageGroups.map((g) => {
                  const maxAge = Math.max(...demographicData.ageGroups.map(a => a.value)) || 1;
                  return (
                    <div key={g.range} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-7 text-muted-foreground/70 font-medium">{g.range}</span>
                      <div className="flex-1 h-2 bg-muted/20 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500/60 rounded-full" style={{ width: `${(g.value / maxAge) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right font-bold tabular-nums text-xs">{g.value.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gênero + Dispositivo */}
            <div className="space-y-3">
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Gênero</h4>
                <div className="space-y-1">
                  {demographicData.gender.map((g) => {
                    const maxG = Math.max(...demographicData.gender.map(x => x.value)) || 1;
                    return (
                      <div key={g.label} className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-16 text-muted-foreground/70 truncate">{g.label}</span>
                        <div className="flex-1 h-2 bg-muted/20 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            g.label === 'Masculino' ? 'bg-blue-500/60' : g.label === 'Feminino' ? 'bg-pink-500/60' : 'bg-gray-500/60'
                          }`} style={{ width: `${(g.value / maxG) * 100}%` }} />
                        </div>
                        <span className="w-12 text-right font-bold tabular-nums text-xs">{g.value.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Dispositivo</h4>
                <div className="space-y-1">
                  {demographicData.devices.map((d) => {
                    const maxD = Math.max(...demographicData.devices.map(x => x.value)) || 1;
                    return (
                      <div key={d.label} className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-16 text-muted-foreground/70 truncate">{d.label}</span>
                        <div className="flex-1 h-2 bg-muted/20 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500/60 rounded-full" style={{ width: `${(d.value / maxD) * 100}%` }} />
                        </div>
                        <span className="w-12 text-right font-bold tabular-nums text-xs">{d.value.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cidades */}
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Principais Cidades</h4>
              <div className="space-y-1">
                {demographicData.topCities.map((c) => {
                  const maxC = Math.max(...demographicData.topCities.map(x => x.value)) || 1;
                  return (
                    <div key={c.name} className="flex items-center gap-1.5 text-[11px]">
                      <Globe className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
                      <span className="flex-1 text-muted-foreground/70 truncate">{c.name}</span>
                      <div className="flex-1 max-w-[60px] h-2 bg-muted/20 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500/60 rounded-full" style={{ width: `${(c.value / maxC) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right font-bold tabular-nums text-xs">{c.value.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Países */}
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Países</h4>
              <div className="space-y-1">
                {demographicData.topCountries.map((c) => {
                  const maxCo = Math.max(...demographicData.topCountries.map(x => x.value)) || 1;
                  return (
                    <div key={c.name} className="flex items-center gap-1.5 text-[11px]">
                      <span className="flex-1 text-muted-foreground/70 truncate max-w-[60px]">{c.name}</span>
                      <div className="flex-1 h-2 bg-muted/20 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${(c.value / maxCo) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right font-bold tabular-nums text-xs">{c.value.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground/50 w-7 text-right">{c.pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* TOOLTIP FLUTUANTE DOS SPARKLINES */}
      {sparkHoverData && (
        <div
          className="fixed z-50 bg-background border border-border/60 shadow-xl rounded-lg px-2.5 py-1.5 text-xs font-bold pointer-events-none"
          style={{
            left: sparkHoverData.x + 12,
            top: sparkHoverData.y - 32,
            transform: 'translateX(0)',
          }}
        >
          {sparkHoverData.value.toLocaleString()}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" style={{ contain: "layout style" }}>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Posts</p>
            <p className="text-2xl font-bold text-primary">{overview.totalPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Publicados</p>
            <p className="text-2xl font-bold text-green-500">{overview.publishedPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Agendados</p>
            <p className="text-2xl font-bold text-blue-500">{overview.scheduledPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Rascunhos</p>
            <p className="text-2xl font-bold text-yellow-500">{overview.draftPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Com Erro</p>
            <p className="text-2xl font-bold text-red-500">{overview.failedPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Taxa de Sucesso</p>
            <p className="text-2xl font-bold text-primary">{overview.publishRate}%</p>
         </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 col-span-1 lg:col-span-2 shadow-sm border-border bg-card relative" style={{ contain: "layout style" }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex flex-col gap-2">
              <div>
                <h3 className="font-display font-bold text-lg text-card-foreground">Performance Geral</h3>
                <p className="text-sm text-muted-foreground">Dados por plataforma</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-1">
                {chartMetric === 'all' ? (
                  METRIC_OPTIONS.map(m => (
                    <div key={m.value} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{m.label}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METRIC_OPTIONS.find(m => m.value === chartMetric)?.color }} />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{METRIC_LABEL}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2 rounded-xl border-border/50 text-xs font-bold">
                    {METRIC_LABEL}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px] p-1">
                  <DropdownMenuRadioGroup value={chartMetric} onValueChange={setChartMetric}>
                    <DropdownMenuRadioItem value="all" className="text-xs font-bold text-primary border-b border-border/50 mb-1">
                      Todas as Métricas
                    </DropdownMenuRadioItem>
                    {METRIC_OPTIONS.map(m => (
                      <DropdownMenuRadioItem key={m.value} value={m.value} className="text-xs">
                        {m.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="h-[400px] w-full min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={400}>
              <AreaChart key={`chart-${platform}-${chartData.length}`} data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={METRIC_OPTIONS.find(m => m.value === chartMetric)?.color || '#3b82f6'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={METRIC_OPTIONS.find(m => m.value === chartMetric)?.color || '#3b82f6'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" vertical={false} />
                <XAxis dataKey="name" stroke="#888" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} axisLine={false} tickLine={false} />
                 <RechartsTooltip 
                   contentStyle={{ 
                     backgroundColor: 'hsl(222, 47%, 10%)', 
                     border: '1px solid hsl(222, 30%, 18%)', 
                     borderRadius: '12px',
                     color: '#fff',
                     padding: '12px 16px',
                     fontSize: '14px'
                   }}
                   itemStyle={{ fontSize: '14px' }}
                   labelStyle={{ color: '#f8fafc', marginBottom: '8px', fontSize: '14px' }}
                   formatter={(value: any, name: any) => [`${Number(value).toLocaleString('pt-BR')}`, name]}
                 />
                {chartMetric === 'all' ? METRIC_OPTIONS.map(m => (
                  <Area key={m.value} type="monotone" dataKey={m.value} name={m.label} stroke={m.color} strokeWidth={2} fillOpacity={0.12} fill={m.color} isAnimationActive={false} />
                )) : (
                  <Area type="monotone" dataKey={chartMetric} name={METRIC_LABEL} stroke={METRIC_OPTIONS.find(m => m.value === chartMetric)?.color || '#3b82f6'} strokeWidth={2} fillOpacity={1} fill="url(#colorMetric)" isAnimationActive={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Restore Platform Breakdown Chart */}
        <Card className="p-6 shadow-sm border-border bg-card" style={{ contain: "layout style" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-lg text-card-foreground">Por Plataforma</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1 rounded-xl border-border/50 text-[10px] font-bold px-2">
                  {METRIC_OPTIONS.find(m => m.value === pieMetric)?.label || 'Métrica'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px] p-1">
                <DropdownMenuRadioGroup value={pieMetric} onValueChange={setPieMetric}>
                  {METRIC_OPTIONS.map(m => (
                    <DropdownMenuRadioItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Distribuição por rede social</p>
          
          {pieData.length > 0 ? (() => {
            const metricLabel = METRIC_OPTIONS.find(m => m.value === pieMetric)?.label || pieMetric;

            return (
              <div>
                <div className="h-[260px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                    <PieChart key={`pie-${pieMetric}-${pieData.length}`}>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                          onClick={(entry: any) => {
                            if (entry && entry.key) {
                              setPieSelectedPlatform(prev => prev === entry.key ? null : entry.key);
                              setPlatform(prev => prev === entry.key ? 'all' : entry.key);
                            }
                          }}
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={`cell-${entry.key}`}
                            fill={entry.fill}
                            opacity={pieSelectedPlatform && pieSelectedPlatform !== entry.key ? 0.3 : 1}
                            stroke={pieSelectedPlatform === entry.key ? '#fff' : 'transparent'}
                            strokeWidth={pieSelectedPlatform === entry.key ? 2 : 0}
                            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                          />
                        ))}
                      </Pie>
                       <RechartsTooltip
                         contentStyle={{ 
                           backgroundColor: '#0f172a', 
                           border: '1px solid #334155', 
                           borderRadius: '10px', 
                           color: '#fff', 
                           fontSize: '14px', 
                           padding: '12px 16px'
                         }}
                         itemStyle={{ color: '#fff', fontSize: '14px' }}
                         formatter={(value: any, name: any) => [`${Number(value).toLocaleString('pt-BR')}`, name]}
                       />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Scrollable legend - all platforms, no visible scrollbar */}
                <div
                  className="mt-3 space-y-2.5 max-h-[160px] overflow-y-auto pr-1 pie-legend-container"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <style>{`.pie-legend-container::-webkit-scrollbar { display: none; }`}</style>
                  {pieData.map(({ key, name, value, fill }) => {
                    const isSelected = pieSelectedPlatform === key;
                    return (
                       <button
                         key={key}
                         type="button"
                         onClick={() => { setPieSelectedPlatform(prev => prev === key ? null : key); setPlatform(prev => prev === key ? 'all' : key); }}
                         className={`w-full flex items-center justify-between text-sm rounded-lg px-2 py-1.5 transition-all duration-200 ${
                           isSelected
                             ? 'bg-white/10 ring-1 ring-white/20'
                             : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                         }`}
                       >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-200"
                            style={{
                              backgroundColor: fill,
                              boxShadow: isSelected ? `0 0 6px ${fill}` : 'none',
                              transform: isSelected ? 'scale(1.3)' : 'scale(1)'
                            }}
                          />
                          <span className={`font-medium transition-colors ${isSelected ? 'text-white' : 'text-muted-foreground font-semibold'}`}>
                            {name}
                          </span>
                        </div>
                        <span className="text-white font-bold tabular-nums">
                          {Number(value).toLocaleString('pt-BR')}
                          <span className="text-[10px] text-muted-foreground font-normal ml-1">
                            {metricLabel.toLowerCase()}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm italic">
              Nenhum dado das plataformas neste período.
            </div>
          )}
        </Card>
      </div>

      {/* NEW INTELLIGENCE HUB SECTION */}
      <h2 className="text-xl font-display font-bold text-card-foreground mt-8 mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-500" />
        Intelligence Hub & Infraestrutura
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Ads and Web Performance Card */}
        <Card className="p-6 shadow-sm border-border bg-card overflow-hidden relative" style={{ contain: "layout" }}>
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <BarChart3 className="w-24 h-24 text-primary" />
          </div>
          <h3 className="font-display font-bold text-sm mb-4 uppercase tracking-widest text-muted-foreground">
            Performance Ads & Web
          </h3>
          <div className="space-y-4 relative z-10">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] text-muted-foreground uppercase">Impressões Ads</p>
                <div className="text-[10px] font-bold text-primary">R$ {(adsStats?.spend || 0).toLocaleString()}</div>
              </div>
              <p className="text-xl font-bold">{(adsStats?.impressions || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Cliques em Ads</p>
              <p className="text-xl font-bold">{(adsStats?.clicks || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Sessões Website</p>
              <p className="text-xl font-bold">{(gaStats?.views || 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* YouTube Performance Card */}
        <Card className="p-6 shadow-sm border-border bg-card overflow-hidden relative" style={{ contain: "layout" }}>
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <div className="w-24 h-24 text-red-500"><Activity className="w-full h-full" /></div>
          </div>
          <h3 className="font-display font-bold text-sm mb-4 uppercase tracking-widest text-muted-foreground">
            Crescimento YouTube
          </h3>
          <div className="space-y-4 relative z-10">
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Visualizações de Vídeo</p>
              <p className="text-xl font-bold">{(youtubeStats?.views || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Engajamento (Likes/Comentários)</p>
              <p className="text-xl font-bold">{(youtubeStats?.likes + (youtubeStats?.comments || 0)).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Novos Inscritos (Est.)</p>
              <p className="text-xl font-bold">
                {((followerData || []).filter((f: any) => f.platform === 'youtube').reduce((acc: number, f: any) => acc + (f.growth || 0), 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Response Time Card */}
        <Card className="p-6 shadow-sm border-border bg-card overflow-hidden relative">
           <div className="absolute top-0 right-0 p-4 opacity-5">
             <Clock className="w-20 h-20 text-indigo-500" />
           </div>
           <h3 className="font-display font-bold text-sm text-indigo-500 mb-4 uppercase tracking-widest">
             Tempo de Resposta
           </h3>
           <div className="space-y-4 relative z-10">
             <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
               <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Média Diária</p>
               <div className="flex items-end justify-between">
                 <p className="text-3xl font-black text-indigo-600">1.2m</p>
                 <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600">ESTÁVEL</Badge>
               </div>
             </div>
             <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-[10px] text-muted-foreground uppercase">SLA Requerido</p>
                <p className="text-sm font-bold">5.0m</p>
             </div>
           </div>
        </Card>
      </div>

      {/* AUDIENCE BREAKDOWN ADVANCED (CARDS & FILTERS) */}
      {audienceBreakdown && audienceBreakdown.length > 0 && (
        <Card className="p-6 shadow-sm border-border bg-card mb-8" style={{ contain: "layout style" }}>
          <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="font-display font-bold text-lg text-card-foreground flex items-center gap-2">
                <Users2 className="w-5 h-5 text-indigo-500" />
                Audiência do chat Real-Time
              </h3>
              <div className="flex flex-col gap-1 mt-1">
                <p className="text-xs text-muted-foreground">
                  Acompanhe o tempo de tela e tracking de presença online de seus chats.
                </p>
                {lastUpdated && (
                  <p className="text-[10px] font-bold text-muted-foreground/70 flex items-center gap-1 uppercase tracking-widest mt-1">
                     <RefreshCw className="w-3 h-3" />
                     Sincronizado: {new Date(lastUpdated).toLocaleDateString('pt-BR')} às {new Date(lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {globalPeakHour && (
                  <p className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 uppercase tracking-widest mt-0.5">
                     <Clock className="w-3 h-3" />
                     Pico Estimado de Retenção: {globalPeakHour}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4 self-end xl:self-auto">
              <div className="flex flex-wrap justify-end gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-hide shrink">
                 {/* Network Filter */}
                 <Select value={audienceNetworkInfo} onValueChange={setAudienceNetworkInfo}>
                   <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/30 border-border shrink-0">
                     <SelectValue placeholder="Rede Social" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">Todas Redes</SelectItem>
                     <SelectItem value="telegram">Telegram</SelectItem>
                     <SelectItem value="whatsapp">WhatsApp</SelectItem>
                   </SelectContent>
                 </Select>
                 {/* Type Filter */}
                 <Select value={audienceTypeInfo} onValueChange={setAudienceTypeInfo}>
                   <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/30 border-border shrink-0">
                     <SelectValue placeholder="Tipo de Chat" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">Todos os Tipos</SelectItem>
                     <SelectItem value="channel">Canal</SelectItem>
                     <SelectItem value="supergroup">Comunidade/Grupo</SelectItem>
                     <SelectItem value="broadcast_list">Lista de Transmissão</SelectItem>
                   </SelectContent>
                 </Select>
                 {/* Status Filter */}
                 <Select value={audienceOnlineInfo} onValueChange={setAudienceOnlineInfo}>
                   <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/30 border-border shrink-0">
                     <SelectValue placeholder="Status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">Qualquer Status</SelectItem>
                     <SelectItem value="online">Online Agora</SelectItem>
                     <SelectItem value="active_recent">Mais Ativos Hoje</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
               
              {/* Carousel Nav Buttons */}
              <div className="flex gap-1 border-l border-border/50 pl-4 shrink-0">
                <button onClick={() => scrollContainer('audience-scroll', 'left')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
                  <ChevronLeft className="w-4 h-4 text-primary" />
                </button>
                <button onClick={() => scrollContainer('audience-scroll', 'right')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
                  <ChevronRight className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>
          </div>
          
          <div id="audience-scroll" className="flex flex-row flex-nowrap gap-4 overflow-x-auto scrollbar-hide pr-2 pb-4 snap-x smooth-scroll" style={{ scrollBehavior: 'smooth' }}>
            {(() => {
              const allChannels = audienceBreakdown.flatMap(b => b.channels || []);
              let filtered = allChannels.filter(ch => {
                 const checkAny = ch as any;
                 const name = checkAny.channel_name || checkAny.page_name || checkAny.username || '';
                 // Text Filter
                 if (audienceSearchQuery && !(name).toLowerCase().includes(audienceSearchQuery.toLowerCase())) return false;
                 // Network Filter
                 if (audienceNetworkInfo !== 'all' && ch.platform !== audienceNetworkInfo) return false;
                 // Type Filter
                 if (audienceTypeInfo !== 'all' && ch.channel_type !== audienceTypeInfo) return false;
                 // Online Filter
                 if (audienceOnlineInfo === 'online' && !(ch.online_count > 0)) return false;
                  // Recent filter — no real data yet, just pass through
                  if (audienceOnlineInfo === 'active_recent' && ch.online_count === 0) return false;
                 
                 return true;
              });

              if (filtered.length === 0) {
                 return <div className="col-span-full w-full text-center py-12 text-muted-foreground">Nenhum chat corresponde aos filtros de rastreamento.</div>
              }

              return filtered.map((origCh, idx) => {
                 const ch = origCh as any;
                 const dispName = ch.channel_name || ch.page_name || ch.username || 'Chat Sem Nome';
                 return (
                 <div key={idx} className="min-w-[280px] w-[280px] shrink-0 snap-center bg-background rounded-xl p-5 border border-border flex flex-col hover:border-primary/40 transition-colors">
                   <div className="flex items-start justify-between mb-4">
                     <div className="flex items-center gap-3">
                       {ch.profile_picture ? (
                         <SafeImage src={ch.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                       ) : (
                         <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                           {(dispName)[0]?.toUpperCase() || 'C'}
                         </div>
                       )}
                       <div>
                         <h4 className="font-bold text-sm text-card-foreground line-clamp-1">{dispName}</h4>
                         <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              {ch.platform === 'telegram' ? 'Telegram' : ch.platform === 'whatsapp' ? 'WhatsApp' : ch.platform}
                            </span>
                           <span className="text-[10px] text-muted-foreground capitalize">
                             {ch.channel_type === 'supergroup' ? 'Comunidade' : ch.channel_type}
                           </span>
                         </div>
                       </div>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mt-auto mb-4 p-3 bg-muted/20 rounded-lg">
                     <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Total</p>
                        <p className="text-xl font-black font-mono text-foreground">{ch.members_count?.toLocaleString() || 0}</p>
                     </div>
                     <div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${ch.online_count > 0 ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                          Online
                        </p>
                        <p className={`text-xl font-black font-mono ${ch.online_count > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {ch.online_count > 0 ? ch.online_count.toLocaleString() : '0'}
                        </p>
                     </div>
                   </div>

                    <div className="flex justify-between items-center pt-3 border-t border-border/50 text-[10px]">
                       <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Tempo Médio Sessão: <strong className="text-foreground">--</strong></span>
                       </div>
                       <div className="text-right border-l border-border/50 pl-2">
                          <button onClick={() => onNavigate?.('messaging')} className="text-primary font-bold cursor-pointer hover:underline">Ver Histórico</button>
                       </div>
                    </div>

                 </div>
                 );
              });
            })()}
          </div>
        </Card>
      )}

      {/* FOLLOWER CARDS AGGREGATED (ALL NETWORKS) */}
      <Card className="p-6 shadow-sm border-border bg-card" style={{ contain: "layout" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="font-display font-bold text-lg text-card-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Crescimento de Seguidores por Rede
          </h3>
          <div className="flex items-center gap-4">
            {selectedProfileId && (
              <button 
                onClick={() => setSelectedProfileId(null)}
                className="text-xs text-primary hover:underline font-bold"
              >
                Ver visão geral
              </button>
            )}
            {/* Carousel Nav Buttons */}
            <div className="flex gap-1 border-l border-border/50 pl-4">
              <button onClick={() => scrollContainer('follower-scroll', 'left')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
                <ChevronLeft className="w-4 h-4 text-primary" />
              </button>
              <button onClick={() => scrollContainer('follower-scroll', 'right')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
                <ChevronRight className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </div>
        
        <div id="follower-scroll" className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x smooth-scroll" style={{ scrollBehavior: 'smooth' }}>
          {(() => {
             const sortedPlatforms = [...socialPlatforms].sort((a, b) => {
               const groupA = groupedFollowers?.find((g: any) => g.platform === a.id) as any;
               const isConnA = !!groupA && groupA.profiles && groupA.profiles.length > 0;
               const groupB = groupedFollowers?.find((g: any) => g.platform === b.id) as any;
               const isConnB = !!groupB && groupB.profiles && groupB.profiles.length > 0;
               
               if (isConnA && !isConnB) return -1;
               if (!isConnA && isConnB) return 1;
               return a.name.localeCompare(b.name);
             });

             return sortedPlatforms.map((platformInfo) => {
               const PlatformIcon = platformInfo.icon;
               const group = groupedFollowers?.find((g: any) => g.platform === platformInfo.id) as any;
               const isConnected = !!group && group.profiles && group.profiles.length > 0;
               
               if (isConnected && platformInfo.id === 'telegram' && group.profiles) {
                 group.profiles.sort((a: any, b: any) => {
                   const aName = (a.username || a.page_name || '').toLowerCase();
                   const bName = (b.username || b.page_name || '').toLowerCase();
                   const aIsBot = aName.includes('newsbot') && Number(a.platform_user_id || 0) > 0;
                   const bIsBot = bName.includes('newsbot') && Number(b.platform_user_id || 0) > 0;
                   if (aIsBot && !bIsBot) return -1;
                   if (!aIsBot && bIsBot) return 1;
                   return 0;
                 });
               }

            if (!isConnected) {
              return (
                <div key={platformInfo.id} className="w-[280px] shrink-0 snap-center bg-background/40 rounded-xl p-5 border border-border/40 transition-all opacity-60 grayscale-[0.5] flex flex-col justify-between min-h-[140px]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${platformInfo.color}`}>
                        <PlatformIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-card-foreground line-through">{platformInfo.name}</h4>
                        <p className="text-[10px] text-muted-foreground">Não conectado</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex justify-center">
                    <button onClick={() => onNavigate?.('settings', 'api')} className="text-xs text-primary hover:underline font-bold">
                      Conectar API
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={group.platform} className="w-[280px] shrink-0 snap-center bg-background rounded-xl p-5 border border-border hover:border-primary/50 transition-all group overflow-hidden relative">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${platformInfo.color}`}>
                        <PlatformIcon className="w-5 h-5 text-white" />
                     </div>
                     <div>
                       <h4 className="font-bold text-card-foreground">{platformInfo.name}</h4>
                       <p className="text-xs text-muted-foreground">{group.profiles.length} perfil(is)</p>
                     </div>
                   </div>
                    {renderTrend(group.profiles[0]?.growth)}
                 </div>
                 
                 <p className="text-2xl font-bold mt-2 font-display">
                    {platformActiveProfile[group.platform] 
                      ? (group.profiles.find((p: any) => `${p.platform}-${p.username || p.platform_user_id}` === platformActiveProfile[group.platform])?.currentFollowers || 0).toLocaleString()
                      : (group.totalFollowers || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {platformActiveProfile[group.platform] ? (group.platform === 'youtube' ? "inscritos do perfil" : "seguidores do perfil") : (group.platform === 'youtube' ? "inscritos combinados" : "seguidores combinados")}
                  </p>

                 {/* Profile Selector Dropdown */}
                 <div className="mt-4 pt-4 border-t border-border">
                   {group.profiles.length > 1 ? (
                     <Select 
                       value={platformActiveProfile[group.platform] || "all"} 
                       onValueChange={(val) => {
                         setPlatformActiveProfile(prev => ({ ...prev, [group.platform]: val === "all" ? "" : val }));
                         if (val !== "all") setSelectedProfileId(val);
                         else setSelectedProfileId(null);
                       }}
                     >
                       <SelectTrigger className="h-8 text-[10px] bg-muted/30 border-none">
                         <SelectValue placeholder="Selecionar perfil" />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">Todos os perfis (Soma)</SelectItem>
                          {group.profiles.map((prof: any, pIdx: number) => {
                            const pId = `${prof.platform}-${prof.username || prof.platform_user_id}`;
                            return (
                              <SelectItem key={pIdx} value={pId}>
                                @{prof.username || 'Perfil'} ({prof.currentFollowers?.toLocaleString()})
                              </SelectItem>
                            );
                          })}
                       </SelectContent>
                     </Select>
                   ) : (
                     <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {group.profiles[0]?.profileImage ? (
                           <SafeImage src={group.profiles[0].profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">?</div>
                       )}
                       <span className="truncate">@{group.profiles[0]?.username || 'Perfil único'}</span>
                     </div>
                   )}
                 </div>

                 {/* Condensed profile details if one is selected */}
                 {platformActiveProfile[group.platform] && (
                   <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-2 bg-primary/5 rounded-lg border border-primary/10 space-y-1.5"
                   >
                      {(() => {
                         const prof = group.profiles.find((p: any) => `${p.platform}-${p.username || p.platform_user_id}` === platformActiveProfile[group.platform]);
                         if (!prof) return null;
                         return (
                           <>
                             <div className="flex items-center gap-2 mb-1">
                                {prof.profileImage ? (
                                   <SafeImage src={prof.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                   <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px]">?</div>
                                )}
                                <span className="text-[10px] font-bold text-primary truncate">@{prof.username}</span>
                             </div>
                             <div className="flex justify-between text-[9px]">
                                <span className="text-muted-foreground">Posts:</span>
                                <span className="font-bold">{prof.postsCount || 0}</span>
                             </div>
                             <div className="flex justify-between text-[9px]">
                                <span className="text-muted-foreground">Crescimento:</span>
                                <span className={cn("font-bold", (prof.growth || 0) >= 0 ? "text-green-500" : "text-red-500")}>
                                  {prof.growth > 0 ? `+${prof.growth}` : prof.growth}%
                                </span>
                              </div>
                           </>
                         );
                      })()}
                   </motion.div>
                 )}
              </div>
            );
          });
        })()}
        {/* HMR Trigger */}
        </div>
      </Card>


      {/* BEST TIMES & TOP CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-sm border-border bg-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg text-card-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Melhores Horários
            </h3>
            <Select value={bestTimesFilter} onValueChange={setBestTimesFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/30 border-border">
                <SelectValue placeholder="Todas Redes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Redes</SelectItem>
                {socialPlatforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Members Online Now Banner */}
          {(() => {
             const aggrOnline = audienceBreakdown?.reduce((acc, b) => acc + (b.totalOnline || 0), 0) || 0;
             if (aggrOnline > 0) {
               return (
                 <div className="mb-6 p-4 rounded-xl border border-green-500/20 bg-green-500/5 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Users className="w-12 h-12 text-green-500 group-hover:scale-110 transition-transform" />
                   </div>
                   <div className="flex items-center gap-2 mb-1">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <p className="text-xs font-bold text-green-500 uppercase tracking-widest">Pico de Atividade (Ao Vivo)</p>
                   </div>
                   <p className="text-2xl font-black text-foreground">{aggrOnline.toLocaleString()} <span className="text-sm font-medium text-muted-foreground normal-case">membros online em grupos/comunidades agora.</span></p>
                 </div>
               );
             }
             return null;
          })()}

          <div className="space-y-4">
            {(() => {
              const dayOrder: Record<string, number> = {
                'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3,
                'Quinta': 4, 'Sexta': 5, 'Sábado': 6,
                'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
                'Friday': 5, 'Saturday': 6, 'Sunday': 0
              };
              
              const filteredTimes = bestTimesFilter === 'all' 
                ? (bestTimes || [])
                : (bestTimes || []).filter(bt => bt.platform === bestTimesFilter);

              const sortedTimes = [...filteredTimes].sort((a, b) => {
                const orderA = dayOrder[a.day] ?? 99;
                const orderB = dayOrder[b.day] ?? 99;
                return orderA - orderB;
              }).slice(0, 7);

              return sortedTimes.length > 0 ? sortedTimes.map((bt: any, i: number) => {
                const pd = bt.platform ? getPlatformDetails(bt.platform) : null;
                const PIcon = pd?.icon || Activity;
                return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold relative group cursor-default">
                      {i + 1}
                      {pd && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${pd.color}`}>
                           <PIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-card-foreground">{bt.day}</h4>
                      <p className="text-sm text-muted-foreground">{bt.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">{bt.engagement}</p>
                    <p className="text-xs text-muted-foreground">índice engajamento</p>
                  </div>
                </div>
                );
              }) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Sem métricas de horários capturadas para este filtro</div>
              );
            })()}
          </div>
        </Card>

        <Card className="p-6 shadow-sm border-border bg-card flex flex-col" style={{ contain: "content" }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg text-card-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Melhores Publicações
            </h3>
            
            <Select value={topContentFilter} onValueChange={setTopContentFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/30 border-border">
                <SelectValue placeholder="Todas as Redes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Redes</SelectItem>
                {socialPlatforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 flex-1" style={{ contain: "strict" }}>
            {(() => {
              const filteredContent = topContentFilter === 'all' 
                ? (topContent || []) 
                : (topContent || []).filter((item: any) => item.platforms?.includes(topContentFilter));
              
              if (filteredContent.length === 0) {
                return <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center justify-center h-full">Nenhuma publicação encontrada para este filtro.</div>;
              }

              return filteredContent.map((item: any, i: number) => (
                <div key={item.id} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {item.platforms && item.platforms.map((p: string) => {
                        const pf = getPlatformDetails(p);
                        const SocialIcon = pf.icon;
                        return <SocialIcon key={p} className={`w-4 h-4 ${pf.color.replace('bg-', 'text-')}`} />;
                      })}
                    </div>
                    <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border/50">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Desconhecido'}
                    </span>
                  </div>
                  
                  {/* Formato badge: since we don't have explicit format from API in this snippet, we infer from platform or mock a realistic type */}
                  <div className="mb-2">
                     <span className="text-[9px] uppercase font-bold tracking-widest text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                       {item.platforms?.includes('youtube') || item.platforms?.includes('tiktok') ? 'Vídeo (Retenção Alta)' : 'Link / Texto / Mídia'}
                     </span>
                  </div>

                  <p className="text-sm text-card-foreground line-clamp-2 mb-3">{item.content}</p>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1 text-blue-500"><Eye className="w-3 h-3" /> {(item.views || 0).toLocaleString()}</span>
                    <span className="flex items-center gap-1 text-purple-500"><Heart className="w-3 h-3" /> {(item.engagement || 0).toLocaleString()}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </Card>
      </div>

      {/* MESSAGE DELIVERY REPORTS - RESTORED */}
      <Card className="p-6 mt-6 shadow-sm border-border bg-card" style={{ contain: "layout" }}>
        <h3 className="font-display font-bold text-lg mb-6 text-card-foreground flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          Relatórios de Entrega de Mensagens
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-muted/20 border border-border/50 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Taxa de Sucesso</p>
                <p className="text-4xl font-bold text-green-500">
                  {messageStats.successRate || 0}%
                </p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/30"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={226}
                    strokeDashoffset={226 - (226 * (messageStats.successRate || 0)) / 100}
                    className="text-green-500 transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Entregues</p>
                <p className="text-2xl font-bold text-green-500">{messageStats.totalSent || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Falhas</p>
                <p className="text-2xl font-bold text-red-500">{messageStats.totalFailed || 0}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-4 text-muted-foreground">Entrega por Plataforma</p>
            <div className="space-y-4">
              {messageStats.platformStats && Object.entries(messageStats.platformStats).length > 0 ? (
                Object.entries(messageStats.platformStats).map(([platform, stats]: [string, any]) => {
                  const details = getPlatformDetails(platform);
                  const totalGlobalSent = messageStats.totalSent || 1;
                  const percent = stats.sent > 0 ? Math.round((stats.sent / totalGlobalSent) * 100) : 0;
                  return (
                    <div key={platform} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold flex items-center gap-2">
                           <details.icon className={`w-3 h-3 ${details.color.replace('bg-', 'text-')}`} />
                           {details.name}
                        </span>
                        <span className="text-muted-foreground">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-500", details.color)} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                  Sem disparos registrados no período
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RECENT MESSAGES FEED */}
        <div className="mt-8 border-t border-border/50 pt-8">
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Últimos Disparos de Mensagens
          </h4>
          <div className="space-y-3">
            {messageStats.recentMessages && messageStats.recentMessages.length > 0 ? (
              messageStats.recentMessages.map((msg: any) => {
                const details = getPlatformDetails(msg.platform);
                return (
                  <div key={msg.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50 group hover:border-primary/30 transition-colors text-left">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", details.color)}>
                        <details.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">
                            Para: {msg.recipient || 'Desconhecido'}
                          </p>
                          <Badge variant="outline" className={cn(
                            "text-[9px] px-1.5 h-4",
                            msg.status === 'sent' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {msg.status === 'sent' ? 'Entregue' : 'Falhou'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px] mt-0.5">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs italic">
                Nenhum disparo recente encontrado
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
      )}
    </div>
  );
};
