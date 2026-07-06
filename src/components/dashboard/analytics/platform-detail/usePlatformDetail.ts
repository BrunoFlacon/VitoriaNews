import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformAccount {
  id: string;
  platform: string;
  username: string | null;
  profile_picture: string | null;
  followers_count: number;
  is_primary: boolean;
}

export interface AccountMetric {
  collected_at: string;
  followers: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  engagement_rate: number | null;
  posts_count: number | null;
  reach: number | null;
  profile_visits: number | null;
  new_followers: number | null;
  platform: string | null;
  messages_sent_count: number | null;
  messages_delivered_count: number | null;
  unique_contacts_count: number | null;
}

export interface PostMetric {
  id: string;
  external_id: string | null;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  engagement_rate: number | null;
  platform: string;
  published_at: string | null;
  collected_at: string;
}

export interface GeoEntry {
  name: string;
  value: number;
  pct?: number;
}

export interface DemographicsInfo {
  topCountries: GeoEntry[];
  topCities: GeoEntry[];
  ageGroups: { range: string; pct: number }[];
  gender: { label: string; pct: number }[];
}

export interface PlatformDetailData {
  accounts: PlatformAccount[];
  metrics: AccountMetric[];
  posts: PostMetric[];
  demographics: DemographicsInfo | null;
  loading: boolean;
}

function createEmptyResult(platformId: string): PlatformDetailData {
  return { accounts: [], metrics: [], posts: [], demographics: null, loading: false };
}

export function usePlatformDetail(
  platformId: string | null,
  accountId?: string | null,
  dateRange?: { start: string; end: string } | null
) {
  const { user } = useAuth();

  const accountsQuery = useQuery({
    queryKey: ["platform-accounts", user?.id, platformId],
    queryFn: async () => {
      if (!user || !platformId) return [];
      const { data: connections } = await supabase
        .from("social_connections")
        .select("id, platform, username, profile_image_url, followers_count, is_primary")
        .eq("user_id", user.id)
        .eq("platform", platformId)
        .eq("is_connected", true);

      const { data: socialAccounts } = await supabase
        .from("social_accounts")
        .select("id, platform, username, profile_picture, followers_count")
        .eq("user_id", user.id)
        .eq("platform", platformId);

      const accountMap = new Map<string, PlatformAccount>();
      (connections || []).forEach((c: any) => {
        const key = c.id;
        accountMap.set(key, {
          id: key,
          platform: c.platform,
          username: c.username || c.platform,
          profile_picture: c.profile_image_url,
          followers_count: Number(c.followers_count || 0),
          is_primary: !!c.is_primary,
        });
      });
      (socialAccounts || []).forEach((sa: any) => {
        const key = sa.id;
        if (!accountMap.has(key)) {
          accountMap.set(key, {
            id: key,
            platform: sa.platform,
            username: sa.username,
            profile_picture: sa.profile_picture,
            followers_count: Number(sa.followers_count || 0),
            is_primary: false,
          });
        }
      });

      return Array.from(accountMap.values());
    },
    enabled: !!user && !!platformId,
    staleTime: 5 * 60 * 1000,
  });

  const resolvedAccountId = useMemo(() => {
    if (accountId) return accountId;
    const accounts = accountsQuery.data || [];
    const primary = accounts.find((a) => a.is_primary);
    return primary?.id || accounts[0]?.id || null;
  }, [accountId, accountsQuery.data]);

  const metricsQuery = useQuery({
    queryKey: ["platform-metrics", user?.id, platformId, resolvedAccountId, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      if (!user || !platformId) return [];
      let query = supabase
        .from("account_metrics")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", platformId)
        .order("collected_at", { ascending: true });

      if (dateRange?.start) query = query.gte("collected_at", dateRange.start);
      if (dateRange?.end) query = query.lte("collected_at", dateRange.end);

      const { data } = await query;
      return (data || []) as AccountMetric[];
    },
    enabled: !!user && !!platformId,
    staleTime: 5 * 60 * 1000,
  });

  const postsQuery = useQuery({
    queryKey: ["platform-posts", user?.id, platformId, resolvedAccountId, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      if (!user || !platformId) return [];
      let query = supabase
        .from("post_metrics")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", platformId)
        .order("collected_at", { ascending: false })
        .limit(50);

      if (dateRange?.start) query = query.gte("collected_at", dateRange.start);
      if (dateRange?.end) query = query.lte("collected_at", dateRange.end);

      const { data } = await query;
      return (data || []) as PostMetric[];
    },
    enabled: !!user && !!platformId,
    staleTime: 5 * 60 * 1000,
  });

  const demographicsQuery = useQuery({
    queryKey: ["audience-demographics", user?.id, platformId],
    queryFn: async () => {
      if (!user || !platformId) return null;
      const { data } = await supabase
        .from("audience_demographics")
        .select("top_countries, top_cities, age_groups, gender")
        .eq("user_id", user.id)
        .eq("platform", platformId)
        .order("collected_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return null;

      return {
        topCountries: (data.top_countries as Array<{ name: string; value: number; pct?: number }>) ?? [],
        topCities: (data.top_cities as Array<{ name: string; value: number }>) ?? [],
        ageGroups: (data.age_groups as Array<{ range: string; pct: number }>) ?? [],
        gender: (data.gender as Array<{ label: string; pct: number }>) ?? [],
      } satisfies DemographicsInfo;
    },
    enabled: !!user && !!platformId,
    staleTime: 30 * 60 * 1000,
  });

  const result = useMemo<PlatformDetailData>(() => {
    if (!platformId) return createEmptyResult(platformId || "");

    return {
      accounts: accountsQuery.data || [],
      metrics: metricsQuery.data || [],
      posts: postsQuery.data || [],
      demographics: demographicsQuery.data ?? null,
      loading: accountsQuery.isLoading || metricsQuery.isLoading || postsQuery.isLoading || demographicsQuery.isLoading,
    };
  }, [platformId, accountsQuery.data, metricsQuery.data, postsQuery.data, demographicsQuery.data,
      accountsQuery.isLoading, metricsQuery.isLoading, postsQuery.isLoading, demographicsQuery.isLoading]);

  return {
    ...result,
    selectedAccountId: resolvedAccountId,
    refetch: () => {
      accountsQuery.refetch();
      metricsQuery.refetch();
      postsQuery.refetch();
      demographicsQuery.refetch();
    },
  };
}
