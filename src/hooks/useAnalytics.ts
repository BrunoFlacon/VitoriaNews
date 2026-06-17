import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';

interface EngagementData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  growth: number;
}

interface ChartDataPoint {
  name: string;
  views: number;
  engagement: number;
  reach: number;
  likes?: number;
  comments?: number;
  shares?: number;
  posts?: number;
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
    totalFollowers?: number;
    followersGrowth?: number;
    lastSyncedAt?: string;
    responseTime?: string;
  };
  engagement: EngagementData;
  chartData: ChartDataPoint[];
  platformBreakdown: Record<string, { posts: number; engagement: number; views: number; likes: number; comments: number; shares: number }>;
  topContent: TopContent[];
  bestTimes: BestTime[];
  followerData: FollowerData[];
  messageStats?: MessageStats;
  adsStats?: { impressions: number; reach: number; clicks: number; spend: number };
  youtubeStats?: { views: number; likes: number; comments: number; subscribersGained?: number; watchTimeMinutes?: number; subscribers?: number };
  gaStats?: { views: number };
  period: string;
  generatedAt: string;
  dataSource: 'real' | 'seeded' | 'demo';
}

export function useAnalytics(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const [period, setPeriodState] = useState<string>(() => {
    if (user?.user_metadata?.analytics_period) return user.user_metadata.analytics_period;
    return localStorage.getItem('analytics_period') || '7d';
  });
  const [periodInitialized, setPeriodInitialized] = useState(!!user);
  const [platform, setPlatform] = useState<string>('all');
  const [postType, setPostType] = useState<string>('all');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  useEffect(() => {
    if (!user) return;
    const metaPeriod = user?.user_metadata?.analytics_period;
    if (metaPeriod) {
      setPeriodState(metaPeriod);
    }
    setPeriodInitialized(true);
  }, [user]);

  const setPeriod = async (newPeriod: string) => {
    setPeriodState(newPeriod);
    localStorage.setItem('analytics_period', newPeriod);
    if (user) {
      await supabase.auth.updateUser({ data: { analytics_period: newPeriod } });
    }
  };

  const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
    if (!user) throw new Error("No user available");
    
    try {
      setFetchError(null);
      const body: Record<string, any> = { period, platform, type: postType, source: 'all' };
      if (dateRange.start) body.start_date = dateRange.start.toISOString();
      if (dateRange.end) body.end_date = dateRange.end.toISOString();
      const { data: aData, error: aErr } = await supabase.functions.invoke('get-analytics', {
        body,
      });

      if (aErr) {
        console.error('[Analytics] Edge Function error:', aErr.message, 'context:', aErr.context, 'body:', body);
        throw aErr;
      }
      const result = aData as AnalyticsData;
      const key = ['analytics', user?.id, period, platform, postType];
      const cached = queryClient.getQueryData<AnalyticsData>(key);
      if (cached && result.chartData?.length && !result.chartData.some(d => d.views > 0 || d.engagement > 0 || d.likes > 0)) {
        const cachedHasData = cached.chartData?.some(d => d.views > 0 || d.engagement > 0);
        if (cachedHasData) {
          console.log('[Analytics] Edge Function returned all zeros, keeping cached data');
          return cached;
        }
      }
      return result;
    } catch (err: any) {
      const underlying = err?.context?.message || err?.context || '';
      const errMsg = err?.message || String(err);
      setFetchError(`${errMsg}${underlying ? ' | ' + underlying : ''}`);
      console.error('[Analytics] Fetch failed:', errMsg, '| underlying:', underlying);
      const key = ['analytics', user?.id, period, platform, postType];
      const cached = queryClient.getQueryData<AnalyticsData>(key);
      if (cached) {
        return cached;
      }
      return {
        overview: { totalPosts: 0, publishedPosts: 0, scheduledPosts: 0, failedPosts: 0, draftPosts: 0, publishRate: 0, totalFollowers: 0, followersGrowth: 0 },
        engagement: { views: 0, likes: 0, comments: 0, shares: 0, reach: 0, engagementRate: 0, growth: 0 },
        chartData: [],
        platformBreakdown: {},
        topContent: [],
        bestTimes: [],
        followerData: [],
        period,
        generatedAt: new Date().toISOString(),
        dataSource: 'demo'
      } as AnalyticsData;
    }
  };

  const { data, isLoading, refetch } = useQuery<AnalyticsData, Error>({
    queryKey: ['analytics', user?.id, period, platform, postType],
    queryFn: () => fetchAnalyticsData(),
    enabled: !!user && periodInitialized && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: keepPreviousData,
    retry: 0,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('collect-social-analytics', {
        body: { period, platform, postType }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Sincronização concluída", description: "Os dados foram atualizados." });
      queryClient.invalidateQueries({ queryKey: ['analytics', user?.id] });
    },
    onError: () => {
      toast({ title: "Erro na sincronização", variant: "destructive" });
    }
  });

  return {
    data: data || null,
    loading: isLoading,
    error: fetchError,
    isSyncingAll: syncMutation.isPending,
    period,
    setPeriod,
    platform,
    setPlatform,
    postType,
    setPostType,
    refetch,
    syncAnalytics: () => syncMutation.mutate(),
    dateRange,
    setDateRange
  };
}
