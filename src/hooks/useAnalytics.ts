// v2 - CORS fix: removed Cache-Control/Pragma headers
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { safeInvoke } from '@/utils/supabase-utils';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

interface EngagementData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: string;
  growth: string;
}

interface ChartDataPoint {
  name: string;
  views: number;
  engagement: number;
  reach: number;
}

interface TopContent {
  id: string;
  content: string;
  platforms: string[];
  engagement: number;
  views: number;
  publishedAt: string | null;
}

interface BestTime {
  day: string;
  time: string;
  engagement: number;
  platform?: string;
}

interface MessageStats {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  platformStats: Record<string, { sent: number, failed: number }>;
  recentMessages?: Array<{
    id: string;
    platform: string;
    content: string;
    recipient: string;
    status: string;
    created_at: string;
  }>;
}

export interface FollowerData {
  platform: string;
  username: string | null;
  currentFollowers: number;
  postsCount: number;
  growth: number;
  profileImage: string | null;
  is_connected: boolean;
  last_synced_at?: string | null;
}

export interface AdsStatsData {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
}

export interface YoutubeStatsData {
  views: number;
  likes: number;
  comments: number;
}

export interface GaStatsData {
  views: number;
}

export interface AnalyticsData {
  overview: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    failedPosts: number;
    draftPosts: number;
    publishRate: string | number;
    totalFollowers?: number;
    followersGrowth?: string | number;
    lastSyncedAt?: string | null;
  };
  engagement: EngagementData;
  chartData: ChartDataPoint[];
  platformBreakdown: Record<string, { posts: number; engagement: number }>;
  topContent: TopContent[];
  bestTimes: BestTime[];
  followerData: FollowerData[];
  messageStats?: MessageStats;
  adsStats?: AdsStatsData;
  youtubeStats?: YoutubeStatsData;
  gaStats?: GaStatsData;
  viralData?: any[];
  trendsData?: any[];
  attacksData?: any[];
  messagingChannels?: any[];
  period: string;
  generatedAt: string;
  dataSource: 'real' | 'seeded';
}

export function useAnalytics(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriodState] = useState<string>('7d');
  const [platform, setPlatformState] = useState<string>('all');
  const [postType, setPostType] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [analyticsErrorInfo, setAnalyticsErrorInfo] = useState<string | null>(null);
  
  // Initialize period and platform from user metadata or localStorage when user changes
  useEffect(() => {
    if (!user) return;

    if (user.user_metadata?.analytics_period) {
      setPeriodState(user.user_metadata.analytics_period);
    } else {
      const savedPeriod = localStorage.getItem('analytics_period');
      if (savedPeriod && ['24h', '3d', '7d', '15d', '30d', '60d', '90d', '120d', '365d'].includes(savedPeriod)) {
        setPeriodState(savedPeriod);
      }
    }

    const savedPlatform = localStorage.getItem('analytics_platform');
    if (savedPlatform) {
      setPlatformState(savedPlatform);
    }
  }, [user]);

  // Wrapper for setPlatform to also persist it
  const setPlatform = (newPlatform: string) => {
    setPlatformState(newPlatform);
    setAnalyticsErrorInfo(null);
    localStorage.setItem('analytics_platform', newPlatform);
  };

  // Wrapper for setPeriod to also persist it
  const setPeriod = async (newPeriod: string) => {
    setPeriodState(newPeriod);
    setAnalyticsErrorInfo(null);
    localStorage.setItem('analytics_period', newPeriod);
    
    // Save to database asynchronously
    if (user) {
      const { error } = await supabase.auth.updateUser({
        data: { analytics_period: newPeriod }
      });
      if (error) {
        console.error("Failed to save analytics period to user preferences:", error);
      }
    }
  };

  const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
    if (!user) {
      throw new Error("No user available for query");
    }

    setAnalyticsErrorInfo(null);
    
    // Use safeInvoke with a generous 45s timeout for analytics calculation
    const { data: aData, error: aErr } = await safeInvoke('get-analytics', {
      body: { period, platform, type: postType, source },
      timeoutMs: 45000
    });

    if (aErr) {
      const msg = aErr.message || "Falha ao carregar analytics";
      setAnalyticsErrorInfo(msg);
      throw aErr;
    }
    
    return aData as AnalyticsData;
  };

  const { data, isLoading, refetch, isError } = useQuery<AnalyticsData, Error>({
    queryKey: ['analytics', user?.id, period, platform, postType, source],
    queryFn: fetchAnalyticsData,
    enabled: !!user && (options.enabled !== false),
    staleTime: 5 * 60 * 1000,    // considerar fresco por 5 minutos
    gcTime: 10 * 60 * 1000,      // manter em cache por 10 minutos
    retry: 1,
    refetchOnWindowFocus: false,  // não rebuscar ao focar a janela
  });

  // Display toast once on unhandled fetching errors
  useEffect(() => {
    if (isError) {
      toast({
        title: "Erro ao carregar analytics",
        description: "Não foi possível carregar os dados. Verifique a conexão.",
        variant: "destructive",
      });
    }
  }, [isError, toast]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      
      // Parallel sync for main social platforms
      const [resSocial, resTwitter, resTelegram] = await Promise.allSettled([
        safeInvoke('collect-social-analytics', { timeoutMs: 60000 }),
        safeInvoke('sync-twitter', { timeoutMs: 30000 }),
        safeInvoke('sync-telegram-chats', { body: { platform: "telegram" }, timeoutMs: 30000 })
      ]);

      return { resSocial, resTwitter, resTelegram };
    },
    onSuccess: () => {
      toast({
        title: "Sincronização concluída",
        description: "Os dados das suas redes sociais foram atualizados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['analytics', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['social_connections', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['social_accounts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['messaging_channels', user?.id] });
    },
    onError: () => {
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível buscar dados novos agora. Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  });

  const syncMetaAds = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { data, error } = await safeInvoke('collect-meta-ads-analytics', {
        timeoutMs: 30000
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Meta Ads sincronizado",
        description: `${data.total_campaigns || 0} campanhas atualizadas.`,
      });
      queryClient.invalidateQueries({ queryKey: ['analytics', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['social_accounts', user?.id] });
    },
    onError: (e: any) => {
      toast({
        title: "Erro Meta Ads",
        description: e.message,
        variant: "destructive",
      });
    }
  });

  const syncGoogleAnalytics = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { data, error } = await safeInvoke('collect-google-analytics', {
        timeoutMs: 30000
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Google Analytics sincronizado",
        description: "Dados de tráfego do site atualizados.",
      });
      queryClient.invalidateQueries({ queryKey: ['analytics', user?.id] });
    },
    onError: (e: any) => {
      toast({
        title: "Erro Google Analytics",
        description: e.message,
        variant: "destructive",
      });
    }
  });

  const syncYouTubeAnalytics = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { data, error } = await safeInvoke('collect-youtube-analytics', {
        timeoutMs: 30000
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "YouTube Analytics sincronizado",
        description: "Dados de vídeos e canal atualizados.",
      });
      queryClient.invalidateQueries({ queryKey: ['analytics', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['social_accounts', user?.id] });
    },
    onError: (e: any) => {
      toast({
        title: "Erro YouTube Analytics",
        description: e.message,
        variant: "destructive",
      });
    }
  });

  const syncTelegramChats = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { data, error } = await safeInvoke("sync-telegram-chats", {
        body: { platform: "telegram" },
        timeoutMs: 30000
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Telegram sync failed");
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Telegram sincronizado",
        description: `${data.accountsSynced || 0} chats atualizados.`,
      });
      queryClient.invalidateQueries({ queryKey: ['analytics', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['social_accounts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['messaging_channels', user?.id] });
    },
    onError: (e: any) => {
      toast({
        title: "Erro Telegram",
        description: e.message,
        variant: "destructive",
      });
    }
  });

  const syncTwitter = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { data, error } = await safeInvoke('sync-twitter', {
        timeoutMs: 30000
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Twitter sincronizado",
        description: "Dados do perfil e métricas atualizados.",
      });
      queryClient.invalidateQueries({ queryKey: ['analytics', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['social_accounts', user?.id] });
    },
    onError: (e: any) => {
      toast({
        title: "Erro Twitter",
        description: e.message,
        variant: "destructive",
      });
    }
  });

  return {
    data: data || null,
    loading: isLoading || syncMutation.isPending,
    error: analyticsErrorInfo,
    period,
    setPeriod,
    platform,
    setPlatform,
    postType,
    setPostType,
    source,
    setSource,
    refetch,
    syncAnalytics: () => syncMutation.mutate(),
    syncMetaAds: () => syncMetaAds.mutate(),
    syncGoogleAnalytics: () => syncGoogleAnalytics.mutate(),
    syncYouTubeAnalytics: () => syncYouTubeAnalytics.mutate(),
    syncTelegramChats: () => syncTelegramChats.mutate(),
    syncTwitter: () => syncTwitter.mutate(),
  };
}
