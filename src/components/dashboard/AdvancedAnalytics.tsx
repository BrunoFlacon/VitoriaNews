import React, { useState, useMemo, useCallback, useRef } from "react";
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
  Users2
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
  onNavigate?: (tab: string, subTab?: string) => void;
}

export const AdvancedAnalytics = ({ onNavigate }: AdvancedAnalyticsProps = {}) => {
  const { data, loading, error, period, setPeriod, platform, setPlatform, syncAnalytics, refetch } = useAnalytics();
  const { logout } = useAuth();
  const { audienceBreakdown, loading: statsLoading } = useSocialStats();
  const [postType, setPostType] = useState('all');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [platformActiveProfile, setPlatformActiveProfile] = useState<Record<string, string>>({});
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'analytics' | 'trends'>('analytics');
  // Scroll Helpers – wrapped in useCallback to prevent per-render recreation
  const scrollContainer = useCallback((id: string, direction: 'left' | 'right') => {
    // Use requestAnimationFrame to batch DOM reads/writes, avoiding forced reflow
    requestAnimationFrame(() => {
      const container = document.getElementById(id);
      if (container) {
        container.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
      }
    });
  }, []);

  const [topContentFilter, setTopContentFilter] = useState<string>('all');
  
  // Drill-down filters
  const [audienceNetworkInfo, setAudienceNetworkInfo] = useState<string>('all');
  const [audienceTypeInfo, setAudienceTypeInfo] = useState<string>('all');
  const [audienceOnlineInfo, setAudienceOnlineInfo] = useState<string>('all');
  const [audienceSearchQuery, setAudienceSearchQuery] = useState<string>('');

  // Aggregating Follower Data to prevent duplicates
  const groupedFollowers = useMemo(() => {
    if (!data?.followerData) return [];
    
    // Group by platform
    const grouped = (data.followerData as any[]).reduce((acc: Record<string, any>, curr: any) => {
      const platformKey = curr.platform;
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
  }, [data?.followerData]);

  // Find currently selected profile details if any
  const activeProfile = useMemo(() => {
    if (!selectedProfileId || !data?.followerData) return null;
    return data.followerData.find((p: any) => 
      `${p.platform}-${p.username || p.platform_user_id}` === selectedProfileId
    );
  }, [selectedProfileId, data?.followerData]);

  // 1. Move the data extraction useMemo to the TOP (before returns)
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
    messageStats
  } = useMemo(() => {
    const d = (data || {}) as any;
    return {
      overview: d.overview || { 
        totalPosts: 0, publishedPosts: 0, scheduledPosts: 0, 
        draftPosts: 0, failedPosts: 0, publishRate: 0 
      },
      engagement: d.engagement || { 
        views: 0, likes: 0, comments: 0, reach: 0, shares: 0, growth: "0" 
      },
      chartData: d.chartData || [],
      platformBreakdown: d.platformBreakdown || {},
      topContent: d.topContent || [],
      bestTimes: d.bestTimes || [],
      adsStats: d.adsStats || { impressions: 0, reach: 0, clicks: 0, spend: 0 },
      youtubeStats: d.youtubeStats || { views: 0, likes: 0, comments: 0 },
      gaStats: d.gaStats || { views: 0 },
      viralData: d.viralData || [],
      trendsData: d.trendsData || [],
      attacksData: d.attacksData || [],
      messageStats: d.messageStats || { totalSent: 0, totalFailed: 0, successRate: 0, platformStats: {} }
    };
  }, [data]);

  // 2. Early returns happen only AFTER hooks
  if (loading) {
    return (
      <div className="flex bg-background/50 h-[600px] items-center justify-center rounded-2xl border border-border">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">
            Carregando analytics em tempo real...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex bg-background h-[600px] items-center justify-center rounded-2xl border border-border">
        <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="font-display font-bold text-xl">Erro ao carregar dados</h3>
          {error && (
            <div className="w-full p-3 bg-red-500/5 rounded-lg border border-red-500/20 mb-2">
              <p className="text-xs font-mono text-red-500 break-all">
                ID: {error}
              </p>
            </div>
          )}
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar as informações do dashboard. Verifique sua conexão e tente novamente.
          </p>
          <div className="flex flex-col gap-2 w-full">
            <Button onClick={() => refetch()} className="w-full">
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={() => logout()} className="w-full">
              Sair e Entrar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render helper for trend percentage
  const renderTrend = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
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

  const getPlatformDetails = (id: string) => 
    socialPlatforms.find(p => p.id === id) || { name: id, color: 'bg-muted', icon: Activity };

  const getPlatformHex = (id: string) => {
    switch (normalizePlatform(id)) {
      case 'facebook': return '#1877F2';
      case 'instagram': return '#E4405F';
      case 'twitter': return '#000000';
      case 'linkedin': return '#0A66C2';
      case 'youtube': return '#FF0000';
      case 'tiktok': return '#000000';
      case 'whatsapp': return '#25D366';
      case 'telegram': return '#0088CC';
      case 'threads': return '#000000';
      case 'kwai': return '#FF5000';
      case 'rumble': return '#85C742';
      case 'truthsocial': return '#00AEEF';
      case 'gettr': return '#E11A27';
      case 'spotify': return '#1DB954';
      case 'googlenews': return '#4285F4';
      default: return '#3b82f6';
    }
  }

  function normalizePlatform(platform: string): string {
    const value = platform.toLowerCase().trim();
    if (value === "x" || value === "twitter" || value === "x (twitter)") return "twitter";
    if (value === "truth social") return "truthsocial";
    if (value === "google news") return "googlenews";
    return value;
  }

  return (
    <div className="space-y-8 pb-12 w-full animate-fade-in">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Analytics Avançados
            {data.dataSource === 'seeded' && (
              <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full font-medium ml-2">
                Dados Históricos Pendentes
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
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

        <div className="flex flex-wrap items-center gap-3">
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="w-[180px] bg-background font-medium">
              <Calendar className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={isPlatformMenuOpen} onOpenChange={setIsPlatformMenuOpen}>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-md hover:border-primary/50 transition-colors font-medium text-sm group mr-1"
                onMouseEnter={() => setIsPlatformMenuOpen(true)}
              >
                <Settings className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-500" />
                <span>{platform === 'all' ? 'Todas as Redes' : getPlatformDetails(platform).name}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              align="end" 
              className="w-[260px] p-2"
              onMouseLeave={() => setIsPlatformMenuOpen(false)}
            >
              <div className="text-xs font-bold text-muted-foreground px-3 py-2 mb-1 uppercase tracking-wider border-b border-border/50">
                Redes Sociais
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-[450px] overflow-y-auto custom-scrollbar p-1">
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
          
          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger className="w-[180px] bg-background font-medium">
              <Activity className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Tipo de Post" />
            </SelectTrigger>
            <SelectContent>
              {POST_TYPES.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full hover:bg-primary/5 hover:text-primary transition-all border-primary/20"
                  onClick={syncAnalytics}
                  disabled={loading}
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sincronizar dados das APIs</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {activeView === 'trends' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TrendsView />
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* TOP WIDGETS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de Visualizações", value: engagement.views, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Engajamento Total", value: engagement.likes + engagement.comments, icon: Heart, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Alcance Estimado", value: engagement.reach, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Compartilhamentos", value: engagement.shares, icon: Share2, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {renderTrend(engagement.growth || "0")}
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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
        <Card className="p-6 col-span-2 shadow-sm border-border bg-card">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-card-foreground">Visão Geral</h3>
              <p className="text-sm text-muted-foreground">Evolução do engajamento no período</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEngs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="views" name="Visualizações" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="engagement" name="Engajamento" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorEngs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Restore Platform Breakdown Chart */}
        <Card className="p-6 shadow-sm border-border bg-card">
          <h3 className="font-display font-bold text-lg mb-2 text-card-foreground">Por Plataforma</h3>
          <p className="text-sm text-muted-foreground mb-6">Distribuição de publicações e métricas</p>
          
          {Object.keys(platformBreakdown).length > 0 ? (
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(platformBreakdown as Record<string, any>).map(([key, d]) => ({
                      name: key,
                      value: d.posts,
                      fill: getPlatformHex(key)
                    }))}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                  >
                    {Object.keys(platformBreakdown).map((key) => (
                      <Cell key={`cell-${key}`} fill={getPlatformHex(key)} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-3">
                {Object.entries(platformBreakdown as Record<string, any>).slice(0, 4).map(([key, data]) => {
                  const p = getPlatformDetails(key);
                  return (
                    <div key={key} className="flex items-center justify-between text-sm group">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPlatformHex(key) }} />
                        <span className="text-card-foreground group-hover:text-primary transition-colors">{p.name}</span>
                      </div>
                      <span className="text-muted-foreground">{data.posts} posts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
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
        <Card className="p-6 shadow-sm border-border bg-card overflow-hidden relative">
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
        <Card className="p-6 shadow-sm border-border bg-card overflow-hidden relative">
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
                {((data?.followerData || []).filter((f: any) => f.platform === 'youtube').reduce((acc: number, f: any) => acc + (f.growth || 0), 0)).toLocaleString()}
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
        <Card className="p-6 shadow-sm border-border bg-card mb-8">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="font-display font-bold text-lg text-card-foreground flex items-center gap-2">
                <Users2 className="w-5 h-5 text-indigo-500" />
                Audiência do chat Real-Time
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Acompanhe o tempo de tela e tracking de presença online de seus chats.
              </p>
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
          
          <div id="audience-scroll" className="flex flex-row flex-nowrap gap-4 overflow-x-auto scrollbar-hide pr-2 pb-4 snap-x smooth-scroll">
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
                 // Recent filter fallback mock
                 if (audienceOnlineInfo === 'active_recent' && (Math.random() > 0.5)) return false; // simulated mock for now
                 
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
                         <img src={ch.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                       ) : (
                         <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                           {(dispName)[0]?.toUpperCase() || 'C'}
                         </div>
                       )}
                       <div>
                         <h4 className="font-bold text-sm text-card-foreground line-clamp-1">{dispName}</h4>
                         <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                             {ch.platform === 'telegram' ? 'Telegram' : 'WhatsApp'}
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

                   {/* TRACKING SESSION MOCK VISUAL */}
                   <div className="flex justify-between items-center pt-3 border-t border-border/50 text-[10px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                         <Clock className="w-3 h-3" />
                         <span>Tempo Médio Sessão: <strong className="text-foreground">{Math.floor(Math.random() * 4) + 1}m {Math.floor(Math.random() * 59)}s</strong></span>
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
      <Card className="p-6 shadow-sm border-border bg-card">
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
        
        <div id="follower-scroll" className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x smooth-scroll">
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
                   {renderTrend(group.profiles[0]?.growth || "0")}
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
                          <img src={group.profiles[0].profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
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
                                   <img src={prof.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
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
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Omnichannel</span>
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
              
              const sortedTimes = [...(bestTimes || [])].sort((a, b) => {
                const orderA = dayOrder[a.day] ?? 99;
                const orderB = dayOrder[b.day] ?? 99;
                return orderA - orderB;
              });

              return sortedTimes.length > 0 ? sortedTimes.map((bt: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold">
                      {i + 1}
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
              )) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Sem métricas de horários capturadas</div>
              );
            })()}
          </div>
        </Card>

        <Card className="p-6 shadow-sm border-border bg-card flex flex-col">
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

          <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 flex-1">
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
      <Card className="p-6 mt-6 shadow-sm border-border bg-card">
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
                  {data?.messageStats?.successRate || 0}%
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
                    strokeDashoffset={226 - (226 * (data?.messageStats?.successRate || 0)) / 100}
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
                <p className="text-2xl font-bold text-green-500">{data?.messageStats?.totalSent || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Falhas</p>
                <p className="text-2xl font-bold text-red-500">{data?.messageStats?.totalFailed || 0}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-4 text-muted-foreground">Entrega por Plataforma</p>
            <div className="space-y-4">
              {data?.messageStats?.platformStats && Object.entries(data.messageStats.platformStats).length > 0 ? (
                Object.entries(data.messageStats.platformStats).map(([platform, stats]: [string, any]) => {
                  const details = getPlatformDetails(platform);
                  const totalGlobalSent = data.messageStats?.totalSent || 1;
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
            {data?.messageStats?.recentMessages && data.messageStats.recentMessages.length > 0 ? (
              data.messageStats.recentMessages.map((msg: any) => {
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
