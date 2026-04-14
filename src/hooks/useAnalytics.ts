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
}

interface MessageStats {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  platformStats: Record<string, { sent: number, failed: number }>;
}

export interface FollowerData {
  platform: string;
  username: string | null;
  currentFollowers: number;
  postsCount: number;
  growth: number;
  profileImage: string | null;
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
  const [period, setPeriodState] = useState<string>('7d');
  const [platform, setPlatform] = useState<string>('all');
  const [postType, setPostType] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analyticsErrorInfo, setAnalyticsErrorInfo] = useState<string | null>(null);

  // Initialize period from user metadata or localStorage when user changes
  useEffect(() => {
    if (user?.user_metadata?.analytics_period) {
      setPeriodState(user.user_metadata.analytics_period);
    } else {
      const savedPeriod = localStorage.getItem('analytics_period');
      if (savedPeriod && ['24h', '3d', '7d', '15d', '30d', '60d', '90d', '120d', '365d'].includes(savedPeriod)) {
        setPeriodState(savedPeriod);
      }
    }
  }, [user]);

  // Wrapper for setPeriod to also persist it
  const setPeriod = async (newPeriod: string) => {
    setPeriodState(newPeriod);
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

    try {
      setAnalyticsErrorInfo(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");
      
      const { data: aData, error: aErr } = await supabase.functions.invoke('get-analytics', {
        method: 'POST',
        body: { period, platform, type: postType }
      });

      if (aErr) {
        const msg = aErr.message || (aErr as any).detail || "Erro desconhecido";
        setAnalyticsErrorInfo(msg);
        throw new Error(msg);
      }
      return aData as AnalyticsData;
    } catch (err: any) {
      setAnalyticsErrorInfo(err.message);
      throw err;
    }
  };

  const { data, isLoading, refetch, isError } = useQuery<AnalyticsData, Error>({
    queryKey: ['analytics', user?.id, period, platform, postType],
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
    refetch,
    syncAnalytics: () => syncMutation.mutate(),
    syncMetaAds: () => syncMetaAds.mutate(),
    syncGoogleAnalytics: () => syncGoogleAnalytics.mutate(),
    syncYouTubeAnalytics: () => syncYouTubeAnalytics.mutate(),
    syncTelegramChats: () => syncTelegramChats.mutate(),
  };
}
