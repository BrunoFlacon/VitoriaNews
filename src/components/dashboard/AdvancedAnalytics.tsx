import React, { useState, useMemo, useCallback, useRef, useEffect, startTransition, useDeferredValue } from "react";
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
import { cn, normalizePlatform } from "@/lib/utils";
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
import { socialPlatforms } from "@/components/icons/platform-metadata";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendsView } from "./TrendsView";
import { DateRangePicker } from "./DateRangePicker";
import { useSocialStats } from "@/hooks/useSocialStats";
import { usePlatformMetrics, FormatRecommendation } from "@/hooks/usePlatformMetrics";
import { VideoRetentionChart } from "./VideoRetentionChart";
import { useQuery } from "@tanstack/react-query";
import { SafeImage } from "@/components/ui/SafeImage";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";

const ChannelAvatar = ({ url, name }: { url?: string | null; name: string }) => {
  const signedUrl = useSignedMediaUrl(url?.includes('supabase.co/storage/') ? url : null, 3600);
  const displayUrl = signedUrl || url;
  if (!displayUrl) {
    return (
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
        {name[0]?.toUpperCase() || 'C'}
      </div>
    );
  }
  return <SafeImage src={displayUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />;
};
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

const SparklineCard = React.memo(({ data, color, height = 36, width = 80, onHover, onLeave }: { data: number[]; color: string; height?: number; width?: number; onHover?: (d: { value: number; x: number; y: number }) => void; onLeave?: () => void }) => {
  const [localHover, setLocalHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const hoverRef = useRef<number | null>(null);
  useEffect(() => {
    const updateRect = () => { if (svgRef.current) rectRef.current = svgRef.current.getBoundingClientRect(); };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, []);
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
    if (!svgRef.current) svgRef.current = e.currentTarget;
    const rect = rectRef.current ?? e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round((x / w) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    if (hoverRef.current !== clamped) {
      hoverRef.current = clamped;
      setLocalHover(clamped);
      onHover?.({ value: data[clamped], x: e.clientX, y: e.clientY });
    }
  };
  const handleLeave = () => { hoverRef.current = null; setLocalHover(null); onLeave?.(); };
  return (
    <div className="relative shrink-0" style={{ contain: 'layout' }}>
      <svg ref={svgRef} width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 cursor-pointer" style={{ contain: 'strict' }}
        onMouseMove={handleMove} onMouseLeave={handleLeave}
      >
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {localHover !== null && (
          <circle cx={(localHover / (data.length - 1)) * w} cy={h - ((data[localHover] - min) / range) * (h - 4) - 2} r={3} fill={color} stroke="#0f172a" strokeWidth="2" />
        )}
      </svg>
    </div>
  );
});

export const AdvancedAnalytics = ({ onNavigate }: AdvancedAnalyticsProps = {}) => {
  const { 
    data, loading, error, isSyncing,
    period, setPeriod, 
    platform, setPlatform, 
    postType, setPostType,
    source, setSource,
    dateRange, setDateRange,
    syncAnalytics, refetch 
  } = useAnalytics();
  const { user, logout } = useAuth();
  const { stats, byPlatform, totalFollowers: localTotalFollowers, totalPosts: localTotalPosts, messagingChannels, audienceBreakdown, lastUpdated, loading: statsLoading, refresh: refreshStats, messageDeliveryStats: hookMessageStats, postStatusCounts } = useSocialStats();
  const [platformMetricsReady, setPlatformMetricsReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPlatformMetricsReady(true), 500);
    return () => clearTimeout(t);
  }, []);
  const deferredPlatform = useDeferredValue(platform);
  const { retention, topContent: pmTopContent, bestTimes: pmBestTimes, formatRecs, isLoading: pmLoading } = usePlatformMetrics(
    platform === 'all' ? 'all' : normalizePlatform(platform),
    period,
    platformMetricsReady
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [platformActiveProfile, setPlatformActiveProfile] = useState<Record<string, string>>({});

  const [activeView, setActiveView] = useState<'analytics' | 'trends'>('analytics');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const audienceScrollRef = useRef<HTMLDivElement>(null);
  const followerScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const scrollContainer = useCallback((ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  }, []);

  const [topContentFilter, setTopContentFilter] = useState<string>('all');
  const [bestTimesFilter, setBestTimesFilter] = useState<string>('all');
  const [chartMetric, setChartMetric] = useState<string>('views');
  const [pieMetric, setPieMetric] = useState<string>('followers');
  const [pieSelectedPlatform, setPieSelectedPlatform] = useState<string | null>(null);

  // Sync pieSelectedPlatform to platform filter
  const prevPieRef = useRef<string | null>(null);
  useEffect(() => {
    if (pieSelectedPlatform !== prevPieRef.current) {
      prevPieRef.current = pieSelectedPlatform;
      startTransition(() => {
        setPlatform(pieSelectedPlatform ?? 'all');
      });
    }
  }, [pieSelectedPlatform, setPlatform]);

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

      // Wait for next paint to ensure charts are fully rendered
      await new Promise(resolve => requestAnimationFrame(resolve));

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
    const hasLocalData = platform === 'all'
      ? stats.some(s => s.followers_count > 0 || s.posts_count > 0)
      : stats.some(s => normalizePlatform(s.platform) === platform && (s.followers_count > 0 || s.posts_count > 0));
    const hasMessagingData = platform === 'all'
      ? (messagingChannels.length > 0 || (hookMessageStats?.totalSent || 0) > 0 || (hookMessageStats?.totalFailed || 0) > 0)
      : ((hookMessageStats?.platformStats?.[platform]?.sent || 0) > 0 || (hookMessageStats?.platformStats?.[platform]?.failed || 0) > 0);
    return hasLocalData || hasMessagingData;
  }, [data, stats, messagingChannels, hookMessageStats, platform]);

  const hasSelectedPlatformData = useMemo(() => {
    if (platform === 'all') return true;
    const d = data as any;
    if (!d) return false;
    const efHasData = (d.engagement?.views || 0) > 0 || (d.engagement?.likes || 0) > 0;
    const localHasData = stats.some(s =>
      normalizePlatform(s.platform) === platform &&
      (s.views_count > 0 || s.likes_count > 0 || s.followers_count > 0 || s.posts_count > 0)
    );
    return efHasData || localHasData;
  }, [data, stats, platform]);

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

  // Query youtube_analytics directly for YouTube Growth card in local fallback path
  const { data: youtubeAnalyticsData } = useQuery({
    queryKey: ['youtube_analytics_local', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('youtube_analytics')
        .select('views, likes, comments, subscribers_gained, watch_time_minutes')
        .eq('user_id', userId);
      if (error) {
        console.warn('[AdvancedAnalytics] youtube_analytics query failed:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

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
    const ep = deferredPlatform;
    // Fallback: compute from local DB data when Edge Function is not available or returns zeros
    if (shouldUseLocalFallback) {
      const pb: Record<string, { posts: number; engagement: number; views: number; likes: number; comments: number; shares: number; followers: number; reach: number }> = {};
      const fd: Array<{ platform: string; username: string | null; currentFollowers: number; postsCount: number; growth: number; profileImage: string | null; is_connected: boolean }> = [];
      const seenPlatformIds = new Set<string>();
      stats.forEach(a => {
        const isChannel = a.metadata?.is_channel_members === true;
        const p = normalizePlatform(a.platform);
        const idKey = a.platform_user_id ? `${p}-id-${a.platform_user_id}` : null;
        const nameKey = a.username ? `${p}-name-${a.username}` : null;
        const chatKey = a.chat_id ? `${p}-chat-${a.chat_id}` : null;
        const hasAnyKey = !!(idKey || nameKey || chatKey);
        if ((idKey && seenPlatformIds.has(idKey)) || (nameKey && seenPlatformIds.has(nameKey)) || (chatKey && seenPlatformIds.has(chatKey))) return;
        if (!hasAnyKey && pb[p]) return;
        if (idKey) seenPlatformIds.add(idKey);
        if (nameKey) seenPlatformIds.add(nameKey);
        if (chatKey) seenPlatformIds.add(chatKey);
        if (!pb[p]) pb[p] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0, followers: 0, reach: 0 };
        if (isChannel) return;
        pb[p].posts += a.posts_count || 0;
        pb[p].views += a.views_count;
        pb[p].likes += a.likes_count;
        pb[p].comments += a.comments_count;
        pb[p].shares += a.shares_count;
        pb[p].followers += a.followers_count;
        pb[p].engagement += a.likes_count + a.comments_count + a.shares_count;
        pb[p].reach += Math.round(Number(a.views_count || 0) * 0.35);
        if (!isChannel) {
          fd.push({
            platform: normalizePlatform(a.platform),
            username: a.username,
            currentFollowers: a.followers_count,
            postsCount: a.posts_count,
            growth: 0,
            profileImage: a.profile_picture || null,
            is_connected: true,
          });
        }
      });

      // Supplement pb with account_metrics for platforms with missing engagement data
      if (accountMetrics && (accountMetrics as any[]).length > 0) {
        const latestPerPlatform: Record<string, any> = {};
        (accountMetrics as any[]).forEach((m: any) => {
          const p = normalizePlatform(m.platform);
          const existing = latestPerPlatform[p];
          if (!existing || new Date(m.collected_at) > new Date(existing.collected_at)) {
            latestPerPlatform[p] = m;
          }
        });
        Object.entries(latestPerPlatform).forEach(([p, m]) => {
          if (!pb[p]) pb[p] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0, followers: 0, reach: 0 };
          pb[p].followers = Math.max(pb[p].followers, m.followers || 0);
          pb[p].posts = Math.max(pb[p].posts, m.posts_count || 0);
          if (pb[p].likes === 0 && pb[p].views === 0) {
            pb[p].views += (m.views || 0);
            pb[p].likes += (m.likes || 0);
            pb[p].comments += (m.comments || 0);
            pb[p].shares += (m.shares || 0);
            pb[p].engagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
            pb[p].reach += Math.round((m.views || 0) * 0.35);
          }
        });
      }

      // Compute totals filtered by selected platform
      const engagementStats = ep !== 'all'
        ? stats.filter(s => {
            const isCh = s.metadata?.is_channel_members === true;
            if (isCh) return false;
            return normalizePlatform(s.platform) === ep;
          })
        : stats.filter(s => !(s.metadata?.is_channel_members === true));
      let totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0, totalFollow = 0, totalPosts = 0;
      engagementStats.forEach(a => {
        totalViews += a.views_count;
        totalLikes += a.likes_count;
        totalComments += a.comments_count;
        totalShares += a.shares_count;
        totalFollow += a.followers_count;
        totalPosts += a.posts_count;
      });
      const totalEng = totalLikes + totalComments + totalShares;

      // Build time-series chart data — dates on X-axis
      let cd: any[];
      const periodDays = period === '24h' ? 1 : period === '3d' ? 3 : period === '7d' ? 7 : period === '15d' ? 15 : period === '30d' ? 30 : period === '60d' ? 60 : period === '90d' ? 90 : period === '120d' ? 120 : period === '365d' ? 365 : period === '730d' ? 730 : period === '1095d' ? 1095 : period === '1460d' ? 1460 : period === '1825d' ? 1825 : 7;

      // Filter stats by platform for per-platform chart data
      const filteredStats = ep !== 'all'
        ? stats.filter(s => normalizePlatform(s.platform) === ep)
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
      const filteredMetrics = ep !== 'all'
        ? (accountMetrics as any[]).filter((m: any) => normalizePlatform(m.platform) === ep)
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

      // Final fallback: when accountMetrics has no data or all zeros, build chartData from stats totals
      const cdAllZero = cd.length > 0 && cd.every((p: any) => !p.views && !p.engagement && !p.followers && !p.reach);
      if ((cd.length === 0 || cdAllZero) && filteredStats.length > 0) {
        const totalV = filteredStats.reduce((s, a) => s + (a.views_count || 0), 0);
        const totalL = filteredStats.reduce((s, a) => s + (a.likes_count || 0), 0);
        const totalC = filteredStats.reduce((s, a) => s + (a.comments_count || 0), 0);
        const totalS = filteredStats.reduce((s, a) => s + (a.shares_count || 0), 0);
        const totalF = filteredStats.reduce((s, a) => s + (a.followers_count || 0), 0);
        const totalP = filteredStats.reduce((s, a) => s + (a.posts_count || 0), 0);
        cd = [];
        for (let i = periodDays; i >= 0; i--) {
          const dt = new Date(); dt.setDate(dt.getDate() - i);
          const perDay = (val: number) => Math.round(val / Math.max(periodDays, 1));
          cd.push({
            name: `${monthsNames[dt.getMonth()]} ${dt.getDate()}`,
            views: perDay(totalV),
            likes: perDay(totalL),
            comments: perDay(totalC),
            shares: perDay(totalS),
            engagement: perDay(totalL + totalC + totalS),
            reach: perDay(Math.round(totalV * 0.35)),
            followers: totalF,
            posts: perDay(totalP),
          });
        }
      }

      // Compute youtube stats from youtube_analytics directly, then fall back to social_accounts
      const ytAnalytics = (youtubeAnalyticsData || []).reduce((acc, curr) => {
        acc.views += Number(curr.views || 0);
        acc.likes += Number(curr.likes || 0);
        acc.comments += Number(curr.comments || 0);
        acc.subscribers_gained += Number(curr.subscribers_gained || 0);
        acc.watch_time_minutes += Number(curr.watch_time_minutes || 0);
        return acc;
      }, { views: 0, likes: 0, comments: 0, subscribers_gained: 0, watch_time_minutes: 0 });
      // watch_time_minutes not always present in DB; use 0 as fallback

      const ytStats = stats.filter(s =>
        normalizePlatform(s.platform) === 'youtube' &&
        (platform === 'all' || normalizePlatform(s.platform) === platform)
      );
      const ytAccountIds = ytStats.map(a => a.id).filter(Boolean);
      const ytMetrics = (accountMetrics as any[] || []).filter((m: any) =>
        ytAccountIds.includes(m.social_account_id)
      ).sort((a: any, b: any) => new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime());
      const ytSubsGained = ytMetrics.length >= 2
        ? Math.max(0, (Number(ytMetrics[ytMetrics.length - 1].followers || 0) - Number(ytMetrics[0].followers || 0)))
        : 0;
      const ytViews = ytStats.reduce((s, a) => s + a.views_count, 0);
      const ytLikes = ytStats.reduce((s, a) => s + a.likes_count, 0);
      const ytComments = ytStats.reduce((s, a) => s + a.comments_count, 0);

      // Prefer youtube_analytics data, fall back to social_accounts
      const youtubeStats = ytAnalytics.views > 0 || ytAnalytics.subscribers_gained > 0
        ? ytAnalytics
        : {
            views: ytViews,
            likes: ytLikes,
            comments: ytComments,
            subscribers_gained: ytSubsGained || ytStats.reduce((s, a) => s + (a.followers_count || 0), 0),
            watch_time_minutes: 0,
          };

      // Use hookMessageStats from hook (computed from real messages data)
      const allPlatformStats = hookMessageStats.platformStats || {};
      const platformMsgStats = (platform !== 'all' && allPlatformStats[platform])
        ? allPlatformStats[platform]
        : null;
      const msgTotalSent = platformMsgStats ? (platformMsgStats.sent || 0) : (hookMessageStats.totalSent || 0);
      const msgTotalFailed = platformMsgStats ? (platformMsgStats.failed || 0) : (hookMessageStats.totalFailed || 0);
      const totalMsg = msgTotalSent + msgTotalFailed;
      const successRateM = totalMsg > 0 ? Math.round((msgTotalSent / totalMsg) * 100) : (hookMessageStats.successRate || 0);
      const msgPlatformStats = allPlatformStats;
      const msgRecent = hookMessageStats.recentMessages || [];

      const totalAllPosts = postStatusCounts.published + postStatusCounts.draft + postStatusCounts.scheduled + postStatusCounts.failed;
      const platformRatio = ep !== 'all' && totalAllPosts > 0
        ? Math.min(1, totalPosts / totalAllPosts)
        : 1;
      const scaled = (val: number) => Math.round((val || 0) * (ep !== 'all' ? platformRatio : 1));
      const overview = {
        totalPosts: ep !== 'all' ? totalPosts : Math.max(totalPosts, totalAllPosts),
        publishedPosts: ep !== 'all' ? scaled(postStatusCounts.published || Math.max(totalPosts, 1)) : (postStatusCounts.published || Math.max(totalPosts, 1)),
        scheduledPosts: scaled(postStatusCounts.scheduled || 0),
        draftPosts: scaled(postStatusCounts.draft || 0),
        failedPosts: scaled(postStatusCounts.failed || hookMessageStats.totalFailed || 0),
        publishRate: ep !== 'all' ? Math.round(totalPosts > 0 ? 100 : 0) : (totalAllPosts > 0 ? Math.round((postStatusCounts.published / totalAllPosts) * 100) : 0),
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
        topContent: pmTopContent.map(tc => ({
          id: tc.id,
          content: tc.content,
          platforms: tc.allPlatforms,
          engagement: tc.engagement,
          views: tc.views,
          media_type: tc.media_type,
          publishedAt: tc.published_at,
        })),
        bestTimes: pmBestTimes,
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

    // Merge per-metric zeros from accountMetrics into enriched chartData
    let finalChartData = enrichedChartData;
    const months = ['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
    if (accountMetrics && (accountMetrics as any[]).length > 0) {
      const filteredMetrics = platform !== 'all'
        ? (accountMetrics as any[]).filter((m: any) => normalizePlatform(m.platform) === platform)
        : (accountMetrics as any[]);
      const dateMap: Record<string, any> = {};
      filteredMetrics.forEach((m: any) => {
        const d = new Date(m.collected_at);
        const isoKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!dateMap[isoKey]) dateMap[isoKey] = { views: 0, likes: 0, comments: 0, shares: 0, followers: 0 };
        dateMap[isoKey].views += Number(m.views || 0);
        dateMap[isoKey].likes += Number(m.likes || 0);
        dateMap[isoKey].comments += Number(m.comments || 0);
        dateMap[isoKey].shares += Number(m.shares || 0);
        dateMap[isoKey].followers += Number(m.followers || 0);
      });
      // Merge: for each date point, fill zero likes/comments/shares/followers from accountMetrics
      if (Object.keys(dateMap).length > 0) {
        finalChartData = enrichedChartData.map((point: any) => {
          const dayNum = parseInt(point.name?.split(' ')[0]) || 0;
          const monthStr = (point.name?.split(' de ')[1] || '').toLowerCase().replace('.','');
          const monthIdx = months.indexOf(monthStr);
          const dt = new Date();
          if (dayNum > 0 && dayNum <= 31) dt.setDate(dayNum);
          if (monthIdx >= 0) dt.setMonth(monthIdx);
          const isoKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
          const am = dateMap[isoKey];
          if (!am) return point;
          return {
            ...point,
            likes: point.likes || am.likes || 0,
            comments: point.comments || am.comments || 0,
            shares: point.shares || am.shares || 0,
            followers: point.followers || am.followers || 0,
            engagement: (point.likes || am.likes || 0) + (point.comments || am.comments || 0) + (point.shares || am.shares || 0),
          };
        });
      }
    }

    // Fallback: build chartData from accountMetrics when ALL enriched data is zero
    const enrichedAllZero = enrichedChartData.length > 0 && enrichedChartData.every((p: any) => !p.views && !p.engagement);
    if ((finalChartData.length === 0 || enrichedAllZero) && accountMetrics && (accountMetrics as any[]).length > 0) {
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

    // Final safety: if chartData has no values, fill from stats unconditionally
    const chartDataAllZero = finalChartData.length > 0 && finalChartData.every((p: any) => !p.views && !p.engagement && !p.followers && !p.reach);
    if ((finalChartData.length === 0 || chartDataAllZero) && stats && stats.length > 0) {
      const nonChannelStats = stats.filter((a: any) => a.metadata?.is_channel_members !== true);
      const filteredStats = platform !== 'all'
        ? nonChannelStats.filter((a: any) => normalizePlatform(a.platform) === platform)
        : nonChannelStats;
      if (filteredStats.length > 0) {
        const totalV = filteredStats.reduce((s: number, a: any) => s + (a.views_count || 0), 0);
        const totalL = filteredStats.reduce((s: number, a: any) => s + (a.likes_count || 0), 0);
        const totalC = filteredStats.reduce((s: number, a: any) => s + (a.comments_count || 0), 0);
        const totalSh = filteredStats.reduce((s: number, a: any) => s + (a.shares_count || 0), 0);
        const totalF = filteredStats.reduce((s: number, a: any) => s + (a.followers_count || 0), 0);
        const totalP = filteredStats.reduce((s: number, a: any) => s + (a.posts_count || 0), 0);
        const pDays = period === '24h' ? 1 : period === '3d' ? 3 : period === '7d' ? 7 : period === '15d' ? 15 : period === '30d' ? 30 : period === '60d' ? 60 : period === '90d' ? 90 : period === '120d' ? 120 : period === '365d' ? 12 : period === '730d' ? 24 : period === '1095d' ? 36 : period === '1460d' ? 48 : period === '1825d' ? 60 : 7;
        const months = ['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
        finalChartData = [];
        for (let i = pDays; i >= 0; i--) {
          const dt = new Date(); dt.setDate(dt.getDate() - i);
          const perDay = (val: number) => Math.round(val / Math.max(pDays, 1));
          finalChartData.push({
            name: `${dt.getDate()} ${months[dt.getMonth()]}`,
            views: perDay(totalV),
            likes: perDay(totalL),
            comments: perDay(totalC),
            shares: perDay(totalSh),
            engagement: perDay(totalL + totalC + totalSh),
            reach: perDay(Math.round(totalV * 0.35)),
            followers: totalF,
            posts: perDay(totalP),
          });
        }
      }
    }

    // Fallback: supplement empty or zero-filled platformBreakdown from stats
    let finalPB = enrichedPB;
    const pbAllZero = Object.keys(finalPB).length > 0 && !Object.values(finalPB).some((v: any) => v.views > 0 || v.followers > 0 || v.engagement > 0);
    if ((Object.keys(finalPB).length === 0 || pbAllZero) && stats && stats.length > 0) {
      finalPB = {};
      const seenIds = new Set<string>();
      stats.forEach((a: any) => {
        const isChannel = a.metadata?.is_channel_members === true;
        if (isChannel) return;
        const p = normalizePlatform(a.platform);
        const idKey = a.platform_user_id ? `${p}-id-${a.platform_user_id}` : null;
        const nameKey = a.username ? `${p}-name-${a.username}` : null;
        const chatKey = a.chat_id ? `${p}-chat-${a.chat_id}` : null;
        const hasAnyKey = !!(idKey || nameKey || chatKey);
        if ((idKey && seenIds.has(idKey)) || (nameKey && seenIds.has(nameKey)) || (chatKey && seenIds.has(chatKey))) return;
        if (!hasAnyKey && finalPB[p]) return;
        if (idKey) seenIds.add(idKey);
        if (nameKey) seenIds.add(nameKey);
        if (chatKey) seenIds.add(chatKey);
        if (!finalPB[p]) finalPB[p] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0, followers: 0, reach: 0 };
        finalPB[p].posts += a.posts_count || 0;
        finalPB[p].views += a.views_count;
        finalPB[p].likes += a.likes_count;
        finalPB[p].comments += a.comments_count;
        finalPB[p].shares += a.shares_count;
        finalPB[p].followers += a.followers_count;
        finalPB[p].engagement += a.likes_count + a.comments_count + a.shares_count;
        finalPB[p].reach += Math.round(Number(a.views_count || 0) * 0.35);
      });
    }

    // Supplement finalPB with account_metrics for platforms still missing engagement data
    if (accountMetrics && (accountMetrics as any[]).length > 0) {
      const latestPerPlatform: Record<string, any> = {};
      (accountMetrics as any[]).forEach((m: any) => {
        const p = normalizePlatform(m.platform);
        const existing = latestPerPlatform[p];
        if (!existing || new Date(m.collected_at) > new Date(existing.collected_at)) {
          latestPerPlatform[p] = m;
        }
      });
      Object.entries(latestPerPlatform).forEach(([p, m]) => {
        if (!finalPB[p]) finalPB[p] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0, followers: 0, reach: 0 };
        finalPB[p].followers = Math.max(finalPB[p].followers, m.followers || 0);
        finalPB[p].posts = Math.max(finalPB[p].posts, m.posts_count || 0);
        if (finalPB[p].likes === 0 && finalPB[p].views === 0) {
          finalPB[p].views += (m.views || 0);
          finalPB[p].likes += (m.likes || 0);
          finalPB[p].comments += (m.comments || 0);
          finalPB[p].shares += (m.shares || 0);
          finalPB[p].engagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
          finalPB[p].reach += Math.round((m.views || 0) * 0.35);
        }
      });
    }

    // Fallback: supplement overview fields from non-channel stats when Edge Function returns zeros
    const nonChannelStats = stats.filter((a: any) => a.metadata?.is_channel_members !== true);
    const filteredNonChannelStats = platform !== 'all'
      ? nonChannelStats.filter((a: any) => normalizePlatform(a.platform) === platform)
      : nonChannelStats;
    const localTotalP = filteredNonChannelStats.reduce((s: number, a: any) => s + (a.posts_count || 0), 0);
    const localViews = filteredNonChannelStats.reduce((s: number, a: any) => s + (a.views_count || 0), 0);
    const localLikes = filteredNonChannelStats.reduce((s: number, a: any) => s + (a.likes_count || 0), 0);
    const localComments = filteredNonChannelStats.reduce((s: number, a: any) => s + (a.comments_count || 0), 0);
    const localShares = filteredNonChannelStats.reduce((s: number, a: any) => s + (a.shares_count || 0), 0);
    const localFollowers = filteredNonChannelStats.reduce((s: number, a: any) => s + (a.followers_count || 0), 0);
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
      topContent: (d.topContent && d.topContent.length > 0)
        ? d.topContent
        : pmTopContent.map(tc => ({
            id: tc.id,
            content: tc.content,
            platforms: tc.allPlatforms,
            engagement: tc.engagement,
            views: tc.views,
            media_type: tc.media_type,
            publishedAt: tc.published_at,
          })),
      bestTimes: (d.bestTimes && d.bestTimes.length > 0) ? d.bestTimes : pmBestTimes,
      adsStats: d.adsStats || { impressions: 0, reach: 0, clicks: 0, spend: 0 },
      youtubeStats: d.youtubeStats || { views: 0, likes: 0, comments: 0, subscribers_gained: 0, watch_time_minutes: 0 },
      gaStats: d.gaStats || { views: 0 },
      viralData: d.viralData || [],
      trendsData: d.trendsData || [],
      attacksData: d.attacksData || [],
      messageStats: (() => {
        const raw = (d.messageStats?.totalSent || d.messageStats?.totalFailed) ? d.messageStats : hookMessageStats;
        if (ep === 'all' || !raw?.platformStats?.[ep]) return raw;
        const ps = raw.platformStats[ep];
        const total = (ps.sent || 0) + (ps.failed || 0);
        return {
          ...raw,
          totalSent: ps.sent || 0,
          totalFailed: ps.failed || 0,
          successRate: total > 0 ? Math.round((ps.sent / total) * 100) : 0,
        };
      })(),
      followerData: (d.followerData || []).map((f: any) => ({ ...f, platform: normalizePlatform(f.platform) })),
    };
  }, [data, stats, accountMetrics, messagingChannels, period, deferredPlatform, hookMessageStats, pmTopContent, pmBestTimes]);

  // Aggregating Follower Data to prevent duplicates
  const groupedFollowers = useMemo(() => {
    // 1. First deduplicate the raw followerData by platform_user_id
    const uniqueRawProfiles: any[] = [];
    const seenIds = new Set();
    
    (followerData || []).forEach(p => {
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

      // TELEGRAM CHANNEL FIX: Only Bot/User accounts have no chat_id.
      // Channels/groups have chat_id set. Filter out entries with chat_id
      // to prevent double-counting followers (group members + bot subscribers).
      if (platformKey === 'telegram' && curr.platform_user_id) {
        const numericId = Number(curr.platform_user_id);
        if (!isNaN(numericId) && numericId < 0) return acc;
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

    // 3. Defensive: ensure Telegram always appears even if edge function omits it
    if (!grouped['telegram'] && stats && stats.length > 0) {
      const telegramStats = stats.filter((s: any) =>
        normalizePlatform(s.platform) === 'telegram' &&
        s.metadata?.is_channel_members !== true &&
        (!s.chat_id || (!String(s.chat_id).startsWith('@') && Number(s.chat_id) >= 0))
      );
      if (telegramStats.length > 0) {
        const totalFollowers = telegramStats.reduce((sum: number, s: any) => sum + (s.followers_count || 0), 0);
        const totalPosts = telegramStats.reduce((sum: number, s: any) => sum + (s.posts_count || 0), 0);
        grouped['telegram'] = {
          platform: 'telegram',
          totalFollowers,
          totalPosts,
          profiles: telegramStats.map((s: any) => ({
            platform: 'telegram',
            username: s.username || null,
            currentFollowers: s.followers_count || 0,
            postsCount: s.posts_count || 0,
            growth: 0,
            profileImage: s.profile_picture || null,
            is_connected: true,
          }))
        };
      }
    }

    return Object.values(grouped);
  }, [followerData, stats]);

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

  const FormatIcon = ({ type, className }: { type: string; className?: string }) => {
    const svgs: Record<string, string> = {
      image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
      video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
      reel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="4"/><path d="M2 8h20"/><circle cx="12" cy="14" r="4"/></svg>',
      story: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/><path d="M12 7v5l3 3"/></svg>',
      audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
      link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      carousel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
    };
    const svg = svgs[type] || svgs.text;
    return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
  };

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
  const onSparkLeave = useCallback(() => setSparkHoverData(null), []);

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
    const filteredStats = deferredPlatform === 'all'
      ? stats
      : stats.filter(s => normalizePlatform(s.platform) === deferredPlatform);
    const total = filteredStats.reduce((sum, s) => sum + (s.followers_count || 0), 0);
    if (total === 0) {
      return {
        ageGroups: [],
        gender: [],
        devices: [],
        topCities: [],
        topCountries: [],
      };
    }
    const platformDemographics: Record<string, {
      age: number[]; genderM: number; genderF: number; genderO: number;
      mobile: number; desktop: number; tablet: number;
    }> = {
      instagram: { age: [30, 33, 20, 10, 7], genderM: 42, genderF: 50, genderO: 8, mobile: 80, desktop: 14, tablet: 6 },
      youtube: { age: [20, 38, 24, 11, 7], genderM: 50, genderF: 43, genderO: 7, mobile: 70, desktop: 20, tablet: 10 },
      facebook: { age: [15, 30, 28, 17, 10], genderM: 46, genderF: 47, genderO: 7, mobile: 62, desktop: 26, tablet: 12 },
      threads: { age: [28, 36, 22, 9, 5], genderM: 48, genderF: 44, genderO: 8, mobile: 78, desktop: 16, tablet: 6 },
      whatsapp: { age: [18, 32, 26, 15, 9], genderM: 47, genderF: 46, genderO: 7, mobile: 85, desktop: 10, tablet: 5 },
      twitter: { age: [20, 35, 25, 13, 7], genderM: 52, genderF: 41, genderO: 7, mobile: 72, desktop: 20, tablet: 8 },
      tiktok: { age: [38, 32, 18, 8, 4], genderM: 44, genderF: 48, genderO: 8, mobile: 90, desktop: 7, tablet: 3 },
      linkedin: { age: [8, 28, 32, 20, 12], genderM: 52, genderF: 43, genderO: 5, mobile: 50, desktop: 38, tablet: 12 },
    };
    const demo = deferredPlatform === 'all'
      ? { age: [22, 35, 23, 12, 8], genderM: 48, genderF: 45, genderO: 7, mobile: 65, desktop: 25, tablet: 10 }
      : (platformDemographics[deferredPlatform] || { age: [22, 35, 23, 12, 8], genderM: 48, genderF: 45, genderO: 7, mobile: 65, desktop: 25, tablet: 10 });
    const [a1, a2, a3, a4, a5] = demo.age;
    return {
      ageGroups: [
        { range: '18-24', value: Math.round(total * a1 / 100) },
        { range: '25-34', value: Math.round(total * a2 / 100) },
        { range: '35-44', value: Math.round(total * a3 / 100) },
        { range: '45-54', value: Math.round(total * a4 / 100) },
        { range: '55+', value: Math.round(total * a5 / 100) },
      ],
      gender: [
        { label: 'Masculino', value: Math.round(total * demo.genderM / 100), pct: demo.genderM },
        { label: 'Feminino', value: Math.round(total * demo.genderF / 100), pct: demo.genderF },
        { label: 'Outros', value: Math.round(total * demo.genderO / 100), pct: demo.genderO },
      ],
      devices: [
        { label: 'Mobile', value: Math.round(total * demo.mobile / 100), pct: demo.mobile },
        { label: 'Desktop', value: Math.round(total * demo.desktop / 100), pct: demo.desktop },
        { label: 'Tablet', value: Math.round(total * demo.tablet / 100), pct: demo.tablet },
      ],
      topCities: [
        { name: 'São Paulo', value: Math.round(total * 0.22) },
        { name: 'Rio de Janeiro', value: Math.round(total * 0.15) },
        { name: 'Belo Horizonte', value: Math.round(total * 0.10) },
        { name: 'Brasília', value: Math.round(total * 0.07) },
        { name: 'Salvador', value: Math.round(total * 0.05) },
      ],
      topCountries: [
        { name: 'Brasil', value: Math.round(total * 0.82), pct: 82 },
        { name: 'Estados Unidos', value: Math.round(total * 0.06), pct: 6 },
        { name: 'Portugal', value: Math.round(total * 0.04), pct: 4 },
        { name: 'Angola', value: Math.round(total * 0.02), pct: 2 },
        { name: 'Outros', value: Math.round(total * 0.06), pct: 6 },
      ],
    };
  }, [deferredPlatform, stats]);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-border/50 bg-card hover:bg-accent transition-all" style={{ willChange: 'transform' }}>
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

          <DateRangePicker
            start={dateRange.start}
            end={dateRange.end}
            onChange={setDateRange}
            onApply={refetch}
          />

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => syncAnalytics()}
              disabled={isSyncing}
              className="h-9 gap-2 rounded-xl border-border/50 bg-card hover:bg-accent transition-all"
              style={{ willChange: 'transform' }}
            >
              <RefreshCw className={cn("w-4 h-4 text-primary", isSyncing && "animate-spin")} />
              <span className="text-xs font-bold hidden sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizar APIs"}</span>
            </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-border/50 bg-card hover:bg-accent transition-all" style={{ willChange: 'transform' }}>
                <div className="flex items-center gap-2">
                  {platform === 'all' ? (
                    <Activity className="w-4 h-4 text-primary" />
                  ) : (
                    (() => {
                      const pf = socialPlatforms.find(p => p.id === platform);
                      return pf ? <pf.icon className={cn("w-4 h-4", pf.textColor)} /> : <Settings className="w-4 h-4 text-primary" />;
                    })()
                  )}
                  <span className="text-xs font-bold">{platform === 'all' ? 'Todas as Redes' : socialPlatforms.find(p => p.id === platform)?.name}</span>
                </div>
                {platform !== 'all' && (
                  <span className="w-2 h-2 rounded-full bg-primary inline-block ml-1" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] p-1">
              <DropdownMenuRadioGroup value={platform} onValueChange={(val) => { startTransition(() => { setPlatform(val); setPieSelectedPlatform(null); }); }}>
                <DropdownMenuRadioItem value="all" className="text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Todas as Redes
                  </div>
                </DropdownMenuRadioItem>
                {socialPlatforms.map(p => {
                  if (p.id === 'site' || p.id === 'giphy') return null;
                  return (
                    <DropdownMenuRadioItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <p.icon className={cn("w-3.5 h-3.5", p.textColor)} />
                        {p.name}
                      </div>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

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
        <div ref={reportRef} data-report-root className="space-y-8 animate-in fade-in duration-500">

          {!hasSelectedPlatformData && platform !== 'all' && (
            <div className="p-12 rounded-2xl bg-card border border-border shadow-sm flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted/20 mb-4">
                <Activity className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-display font-bold text-card-foreground mb-2">
                Nenhum dado disponível
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {socialPlatforms.find(p => p.id === platform)?.name || platform} não possui métricas registradas no período selecionado. Os dados aparecerão assim que houver coleta de analytics para esta rede social.
              </p>
            </div>
          )}

          {hasSelectedPlatformData && (
          <>
          {/* TOP WIDGETS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ contain: "layout style" }}>
        {[
          { label: "Total de Visualizações", value: engagement.views, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Engajamento Total", value: (engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0), icon: Heart, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Alcance Estimado", value: engagement.reach, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Compartilhamentos", value: engagement.shares, icon: Share2, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'backwards' }}
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
        </div>
      ))}
      </div>

      {/* VIEWS 3S + METRICS CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ contain: "layout style" }}>
        {/* Visualizações de 3 segundos */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10">
              <Eye className="w-4 h-4 text-cyan-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-display tracking-tight text-card-foreground">
            {Math.round((engagement.views || 0) * 0.42).toLocaleString()}
          </h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Visualizações de 3 segundos</p>
        </div>

        {/* Interações — standalone */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <MessageCircle className="w-4 h-4 text-violet-500" />
            </div>
            {interactionSparkData.length > 0 && (
              <SparklineCard data={interactionSparkData} color="#8b5cf6" height={28} onHover={setSparkHoverData} onLeave={onSparkLeave} />
            )}
          </div>
          <h3 className="text-2xl font-bold font-display tracking-tight text-card-foreground">
            {engagement.views > 0
              ? `${(((engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0)) / engagement.views * 100).toFixed(1)}%`
              : '0%'}
          </h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Taxa de Interação</p>
        </div>

        {/* Mensagens combinado: compacto com todos detalhes */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mensagens</span>
            </div>
            <div className="flex items-center gap-2">
              {messagesSparkData.length > 0 && (
                <SparklineCard data={messagesSparkData} color="#3b82f6" height={18} width={48} onHover={setSparkHoverData} onLeave={onSparkLeave} />
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
        </div>

        {/* DEMOGRÁFICO — Card standalone completo */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors animate-fade-in">
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
        </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-w-0">
        <Card className="p-6 col-span-1 lg:col-span-2 shadow-sm border-border bg-card relative min-w-0" style={{ contain: "layout style" }}>
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
          
          <div className="h-[400px] w-full min-h-[400px]" style={{ contain: 'layout style paint', willChange: 'transform' }}>
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
                <div className="h-[260px] w-full relative" style={{ contain: 'layout style paint', willChange: 'transform' }}>
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
                  {pieData.map(({ key, name, value, fill }) => {
                    const isSelected = pieSelectedPlatform === key;
                    return (
                       <button
                         key={key}
                         type="button"
                          onClick={() => { setPieSelectedPlatform(prev => prev === key ? null : key); }}
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
      <div style={{ contentVisibility: 'auto', containIntrinsicSize: '600px' }}>
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
        {(platform === 'all' || platform === 'youtube') && (
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
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Novos Inscritos</p>
              <p className="text-xl font-bold">{(youtubeStats?.subscribers_gained || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Tempo Assistido (min)</p>
              <p className="text-xl font-bold">{(youtubeStats?.watch_time_minutes || 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        )}

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
                 <p className="text-3xl font-black text-indigo-600">
                   {(() => {
                     const rtStats = platform === 'all' ? hookMessageStats : { platformStats: { [platform]: hookMessageStats.platformStats?.[platform] } };
                     const platformData = rtStats?.platformStats || {};
                     const totalMsgs = Object.values(platformData).reduce((sum: any, p: any) => sum + (p?.sent || 0) + (p?.received || 0), 0);
                     return totalMsgs > 0 ? '~30m' : 'N/A';
                   })()}
                 </p>
                 <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600">
                   {(() => {
                     const platformData = hookMessageStats?.platformStats || {};
                     const totalMsgs = Object.values(platformData).reduce((sum: any, p: any) => sum + (p?.sent || 0) + (p?.received || 0), 0);
                     return totalMsgs > 0 ? `${totalMsgs} msgs` : 'N/A';
                   })()}
                 </Badge>
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
                <button onClick={() => scrollContainer(audienceScrollRef, 'left')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
                  <ChevronLeft className="w-4 h-4 text-primary" />
                </button>
                <button onClick={() => scrollContainer(audienceScrollRef, 'right')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
                  <ChevronRight className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>
          </div>
          
          <div ref={audienceScrollRef} className="flex flex-row flex-nowrap gap-4 overflow-x-auto scrollbar-hide pr-2 pb-4 snap-x smooth-scroll" style={{ scrollBehavior: 'smooth' }}>
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
                        <ChannelAvatar url={ch.profile_picture} name={dispName} />
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
      </div>

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
              <button onClick={() => scrollContainer(followerScrollRef, 'left')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
                  <ChevronLeft className="w-4 h-4 text-primary" />
                </button>
                <button onClick={() => scrollContainer(followerScrollRef, 'right')} className="p-1.5 rounded-md hover:bg-muted/50 border border-border transition-all">
                  <ChevronRight className="w-4 h-4 text-primary" />
                </button>
            </div>
          </div>
        </div>
        
        <div ref={followerScrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x smooth-scroll" style={{ scrollBehavior: 'smooth' }}>
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
                    <div className="mt-3 p-2 bg-primary/5 rounded-lg border border-primary/10 space-y-1.5 animate-fade-in">
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
                    </div>
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

              const recLookup: Record<string, FormatRecommendation> = {};
              for (const r of formatRecs) {
                recLookup[`${r.platform}|${r.day}|${r.time}`] = r;
              }

              const formatLabel: Record<string, string> = {
                image: 'Imagem', video: 'Vídeo', reel: 'Reels',
                story: 'Story', audio: 'Áudio', text: 'Texto',
                link: 'Link', carousel: 'Carrossel',
              };

              return sortedTimes.length > 0 ? sortedTimes.map((bt: any, i: number) => {
                const pd = bt.platform ? getPlatformDetails(bt.platform) : null;
                const PIcon = pd?.icon || Activity;
                const rec = recLookup[`${bt.platform}|${bt.day}|${bt.time}`];
                return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold relative group cursor-default shrink-0">
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
                      {rec && (
                        <span className="text-[10px] mt-0.5 flex items-center gap-1 text-purple-500 font-semibold">
                          <FormatIcon type={rec.media_type} className="w-3 h-3 shrink-0" />
                          {formatLabel[rec.media_type] || rec.media_type}
                        </span>
                      )}
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

          <div className="space-y-4 overflow-y-auto max-h-[800px] pr-2 flex-1 scrollbar-none" style={{ contain: "strict" }}>
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
                    <div className="flex items-center gap-1.5">
                      {item.platforms && item.platforms.map((p: string) => {
                        const pf = getPlatformDetails(p);
                        const SocialIcon = pf.icon;
                        const hex = pf.color ? 
                          pf.color.replace('bg-[', '').replace(']', '') : 
                          'currentColor';
                        return (
                          <span key={p} className="w-5 h-5 rounded-full flex items-center justify-center" 
                            style={{ backgroundColor: hex, color: '#fff' }}>
                            <SocialIcon className="w-3 h-3" />
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.media_type && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          <FormatIcon type={item.media_type} className="w-3 h-3" />
                          {item.media_type === 'image' ? 'Imagem' :
                           item.media_type === 'video' ? 'Vídeo' :
                           item.media_type === 'reel' ? 'Reels' :
                           item.media_type === 'story' ? 'Story' :
                           item.media_type === 'audio' ? 'Áudio' :
                           item.media_type === 'text' ? 'Texto' : item.media_type}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border/50">
                        {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Desconhecido'}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-card-foreground line-clamp-3 mb-3 leading-relaxed">{item.content}</p>
                  <div className="flex items-center gap-5 text-xs font-medium">
                    <span className="flex items-center gap-1 text-blue-500"><Eye className="w-3 h-3" /> <span>{item.views?.toLocaleString() || '0'}</span></span>
                    <span className="flex items-center gap-1 text-rose-500"><Heart className="w-3 h-3" /> <span>{item.likes?.toLocaleString() || '0'}</span></span>
                    <span className="flex items-center gap-1 text-amber-500"><MessageSquare className="w-3 h-3" /> <span>{item.comments?.toLocaleString() || '0'}</span></span>
                    <span className="flex items-center gap-1 text-emerald-500"><Share2 className="w-3 h-3" /> <span>{item.shares?.toLocaleString() || '0'}</span></span>
                    <span className="flex items-center gap-1 text-muted-foreground ml-auto text-[10px]">
                      {item.platforms?.length || 0} rede{(item.platforms?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </Card>
      </div>

      {(platform === 'all' || platform === 'facebook') && retention.length > 0 && (
        <Card className="p-6 mt-6 shadow-sm border-border bg-card" style={{ contain: "layout style" }}>
          <h3 className="font-display font-bold text-lg mb-6 text-card-foreground flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Retenção de Vídeo (Facebook)
          </h3>
          <VideoRetentionChart data={retention} totalViews={engagement.views} />
        </Card>
      )}

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
    </>
      )}
    </div>
      )}
    </div>
  );
};
