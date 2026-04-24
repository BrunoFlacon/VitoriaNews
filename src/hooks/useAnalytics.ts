// v2 - CORS fix: removed Cache-Control/Pragma headers
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

export function useAnalytics() {
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

      let retries = 2;
      let lastError: any = null;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      setAnalyticsErrorInfo(null);
      
      while (retries >= 0) {
        try {
          const { data: aData, error: aErr } = await supabase.functions.invoke('get-analytics', {
            method: 'POST',
            body: { period, platform, type: postType, source }
          });

          if (aErr) {
            lastError = aErr;
            if (retries > 0) {
              console.warn(`[useAnalytics] Request failed, retrying... (${retries} retries left)`);
              await new Promise(r => setTimeout(r, 1200 * (3 - retries)));
              retries--;
              continue;
            }
            const msg = aErr.message || (aErr as any).detail || "Erro desconhecido";
            setAnalyticsErrorInfo(msg);
            throw new Error(msg);
          }
          
          return aData as AnalyticsData;
        } catch (err: any) {
          lastError = err;
          if (retries > 0) {
            console.warn(`[useAnalytics] Error, retrying... (${retries} retries left)`, err.message?.substring(0, 80));
            await new Promise(r => setTimeout(r, 1500));
            retries--;
            continue;
          }
          setAnalyticsErrorInfo(err.message);
          throw err;
        }
      }
      throw lastError || new Error("Falha na requisição de analytics após múltiplas tentativas");
  };

  const { data, isLoading, refetch, isError } = useQuery<AnalyticsData, Error>({
    queryKey: ['analytics', user?.id, period, platform, postType, source],
    queryFn: fetchAnalyticsData,
    enabled: !!user,
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
      const { data, error } = await supabase.functions.invoke('collect-social-analytics', {
        method: 'POST',
        body: {}
      });

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase.functions.invoke('collect-meta-ads-analytics', {
        method: 'POST'
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
      const { data, error } = await supabase.functions.invoke('collect-google-analytics', {
        method: 'POST'
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
      const { data, error } = await supabase.functions.invoke('collect-youtube-analytics', {
        method: 'POST'
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
      const { data, error } = await supabase.functions.invoke("sync-telegram-chats", {
        body: { platform: "telegram" }
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Telegram sync failed");
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Telegram sincronizado",
        description: `${data.synced || 0} chats atualizados.`,
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
  };
}
