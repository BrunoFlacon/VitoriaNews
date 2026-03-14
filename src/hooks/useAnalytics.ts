import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  period: string;
  generatedAt: string;
  dataSource: 'real' | 'seeded';
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [platform, setPlatform] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("No session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-analytics?period=${period}&platform=${platform}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const analyticsData: AnalyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Erro ao carregar analytics",
        description: "Não foi possível carregar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, period, platform, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    period,
    setPeriod,
    platform,
    setPlatform,
    refetch: fetchAnalytics,
  };
}
