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
  growth: number;
  profileImage: string | null;
}

export interface AnalyticsData {
  overview: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    failedPosts: number;
    draftPosts: number;
    publishRate: string | number;
  };
  engagement: EngagementData;
  chartData: ChartDataPoint[];
  platformBreakdown: Record<string, { posts: number; engagement: number }>;
  topContent: TopContent[];
  bestTimes: BestTime[];
  followerData: FollowerData[];
  messageStats?: MessageStats;
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

    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      throw new Error("No session available for query");
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-analytics?period=${period}&platform=${platform}&type=${postType}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch analytics");
    }

    return response.json() as Promise<AnalyticsData>;
  };

  const { data, isLoading, refetch, isError } = useQuery<AnalyticsData, Error>({
    queryKey: ['analytics', user?.id, period, platform, postType],
    queryFn: fetchAnalyticsData,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // keep the data fresh for 5 mins
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
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collect-social-analytics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) throw new Error("Sync failed");
      return response;
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

  return {
    data: data || null,
    loading: isLoading || syncMutation.isPending,
    period,
    setPeriod,
    platform,
    setPlatform,
    postType,
    setPostType,
    refetch,
    syncAnalytics: () => syncMutation.mutate()
  };
}
