import { useMemo, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface SocialAccountStat {
  id: string;
  platform: string;
  platform_user_id?: string;
  username: string | null;
  profile_picture: string | null;
  followers_count: number;
  posts_count: number;
  views_count: number;
  likes_count: number;
  shares_count: number;
  comments_count: number;
  engagement_rate: number;
  updated_at: string | null;
  chat_id?: string | null;
  metadata?: Record<string, any> | null;
}

export interface MessagingChannelStat {
  id: string;
  platform: string;
  channel_name: string;
  channel_type: string;
  members_count: number;
  online_count: number;
  profile_picture: string | null;
  channel_id: string | null;
}

export interface AudienceBreakdown {
  type: string;
  label: string;
  count: number;
  totalMembers: number;
  totalOnline: number;
  channels: MessagingChannelStat[];
}

export interface AudienceDemographicEntry {
  ageGroups: { range: string; value: number }[];
  gender: { label: string; value: number; pct: number }[];
  devices: { label: string; value: number; pct: number }[];
  topCities: { name: string; value: number }[];
  topCountries: { name: string; value: number; pct: number }[];
}

export interface MessageDeliveryStats {
  totalSent: number;
  totalFailed: number;
  totalDraft: number;
  totalScheduled: number;
  totalReceived: number;
  successRate: number;
  platformStats: Record<string, { sent: number; failed: number; draft: number; scheduled: number; received: number }>;
  recentMessages: any[];
}

export interface SocialStatsByPlatform {
  [platform: string]: SocialAccountStat[];
}

export function useSocialStats(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [manualLoading, setManualLoading] = useState(false);

  const CACHE_KEY = `social_stats_cache_${user?.id}`;
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes — keep data available instantly across visits

  const loadCache = (): any => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return undefined;
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) return parsed.data;
      return undefined;
    } catch { return undefined; }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['social_stats_all', user?.id],
    staleTime: CACHE_TTL, // Don't refetch while cache is fresh
    queryFn: async () => {
      if (!user) return null;
      
      const run = async (promise: any): Promise<{ data: any; error: any }> => {
        try { 
          const result = await promise;
          return result || { data: null, error: null };
        }
        catch (e) { return { data: null, error: e }; }
      };

      const [statsResult, credsResult, channelsResult, messagesResult, scheduledResult, demographicsResult] = await Promise.all([
        run(supabase
          .from('social_accounts')
          .select('id, platform, platform_user_id, username, page_name, profile_picture, followers, followers_count, posts_count, views, likes, shares, comments, engagement_rate, updated_at, chat_id, metadata')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })),
        run(supabase
          .from('api_credentials' as any)
          .select('platform')
          .eq('user_id', user.id)),
        run(supabase
          .from('messaging_channels')
          .select('id, platform, channel_name, channel_type, members_count, online_count, profile_picture, channel_id')
          .eq('user_id', user.id)),
        run(supabase
          .from('messages')
          .select('id, platform, status, content, recipient_name, recipient_phone, created_at, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500)),
        run(supabase
          .from('scheduled_posts')
          .select('platforms, status')
          .eq('user_id', user.id)
          .limit(500)),
        run(supabase
          .from('audience_demographics')
          .select('*')
          .eq('user_id', user.id)
          .order('collected_at', { ascending: false })
          .limit(1)),
      ]);

      const statsRes = statsResult;
      const credsRes = credsResult;
      const channelsRes = channelsResult;
      const messagesRes = messagesResult;
      const scheduledRes = scheduledResult;
      const demographicsRes = demographicsResult;

      let botActiveStatus: boolean | null = null;
      try {
        const { data: botSettings } = await supabase
          .from('bot_settings' as any)
          .select('is_active')
          .eq('user_id', user.id)
          .eq('platform', 'whatsapp')
          .maybeSingle();
        if (botSettings) botActiveStatus = !!(botSettings as any).is_active;
      } catch (err) {}
      
      const actionCounts: Record<string, number> = {};
      const botActionCounts: Record<string, number> = {};
      
      let msgTotalSent = 0;
      let msgTotalFailed = 0;
      let msgTotalDraft = 0;
      let msgTotalScheduled = 0;
      let msgTotalReceived = 0;
      const msgPlatformStats: Record<string, { sent: number; failed: number; draft: number; scheduled: number; received: number }> = {};
      
      (messagesRes.data || []).forEach((m: any) => {
        const p = (m.platform || 'unknown').toLowerCase().trim();
        const isBot = m.metadata?.integration_type === 'bot';
        if (isBot) botActionCounts[p] = (botActionCounts[p] || 0) + 1;
        else actionCounts[p] = (actionCounts[p] || 0) + 1;

        if (!msgPlatformStats[p]) msgPlatformStats[p] = { sent: 0, failed: 0, draft: 0, scheduled: 0, received: 0 };
        if (m.status === 'sent') {
          msgPlatformStats[p].sent++;
          msgTotalSent++;
        } else if (m.status === 'failed') {
          msgPlatformStats[p].failed++;
          msgTotalFailed++;
        } else if (m.status === 'draft') {
          msgPlatformStats[p].draft++;
          msgTotalDraft++;
        } else if (m.status === 'scheduled') {
          msgPlatformStats[p].scheduled++;
          msgTotalScheduled++;
        } else if (m.status === 'received') {
          msgPlatformStats[p].received++;
          msgTotalReceived++;
        }
      });

      const msgSuccessRate = (msgTotalSent + msgTotalFailed) > 0
        ? Math.round((msgTotalSent / (msgTotalSent + msgTotalFailed)) * 100)
        : 0;

      let scheduledCount = 0, draftCount = 0, publishedCount = 0, failedCount = 0;
      const publishedActions: Record<string, number> = {};
      (scheduledRes.data || []).forEach((post: any) => {
        const status = (post.status || '').toLowerCase();
        if (post.platforms && Array.isArray(post.platforms)) {
          post.platforms.forEach((p: string) => {
            const pk = p.toLowerCase().trim();
            actionCounts[pk] = (actionCounts[pk] || 0) + 1;
            if (status === 'published') {
              publishedActions[pk] = (publishedActions[pk] || 0) + 1;
            }
          });
        }
        if (status === 'scheduled') scheduledCount++;
        else if (status === 'draft') draftCount++;
        else if (status === 'published') publishedCount++;
        else if (status === 'failed') failedCount++;
      });

      const dedupedAccounts: any[] = [];
      const seenPlatformIds = new Set<string>();
      (statsRes.data || []).forEach((acc: any) => {
        const platformKey = acc.platform;
        const puid = acc.platform_user_id || acc.username || `__no_puid__${platformKey}`;
        const dedupKey = `${platformKey}-${puid}`;
        if (seenPlatformIds.has(dedupKey)) {
          return;
        }
        seenPlatformIds.add(dedupKey);

        const totalBotActions = botActionCounts[platformKey] || 0;
        const apiPostsCount = Number(acc.posts_count ?? 0);
        const publishedPostCount = publishedActions[platformKey] || 0;
        const effectivePosts = apiPostsCount > 0 ? apiPostsCount : publishedPostCount;

        const rawFollowers = Number(acc.followers_count || acc.followers || 0);
        const channelMembersFromMeta = Number(acc.metadata?.members_count || 0);

        dedupedAccounts.push({
          id: acc.id,
          platform: platformKey,
          platform_user_id: acc.platform_user_id,
          username: acc.username,
          profile_picture: acc.profile_picture,
          followers_count: rawFollowers > 0 ? rawFollowers : channelMembersFromMeta,
          posts_count: effectivePosts,
          views_count: Number(acc.views ?? 0),
          likes_count: Number(acc.likes ?? 0),
          shares_count: Number(acc.shares ?? 0),
          comments_count: Number(acc.comments ?? 0),
          engagement_rate: Number(acc.engagement_rate ?? 0),
          updated_at: acc.updated_at,
          chat_id: acc.chat_id,
          metadata: {
            ...(acc.metadata || {}),
            official_posts_count: apiPostsCount,
            bot_posts_count: totalBotActions,
            ...(platformKey === 'whatsapp' && botActiveStatus !== null ? { is_active: botActiveStatus } : {}),
          },
        });
      });

      // Secondary dedup: merge accounts on same platform with identical username
      // (e.g. Instagram linked via both IG Business API and Facebook Pages API)
      const mergedByUsername: any[] = [];
      const userKeyMap = new Map<string, number>();
      dedupedAccounts.forEach(acc => {
        if (!acc.username) { mergedByUsername.push(acc); return; }
        const ukey = `${acc.platform}-${acc.username}`;
        const existingIdx = userKeyMap.get(ukey);
        if (existingIdx !== undefined) {
          const existing = mergedByUsername[existingIdx];
          existing.followers_count = Math.max(existing.followers_count, acc.followers_count);
          existing.posts_count = Math.max(existing.posts_count, acc.posts_count);
          existing.views_count = Math.max(existing.views_count, acc.views_count);
          existing.likes_count = Math.max(existing.likes_count, acc.likes_count);
          existing.comments_count = Math.max(existing.comments_count, acc.comments_count);
          existing.shares_count = Math.max(existing.shares_count, acc.shares_count);
          existing.engagement_rate = Math.max(existing.engagement_rate, acc.engagement_rate);
          if (!existing.profile_picture && acc.profile_picture) existing.profile_picture = acc.profile_picture;
          if (!existing.platform_user_id && acc.platform_user_id) existing.platform_user_id = acc.platform_user_id;
          existing.metadata = { ...existing.metadata, ...acc.metadata };
        } else {
          userKeyMap.set(ukey, mergedByUsername.length);
          mergedByUsername.push({ ...acc });
        }
      });

      // Build profile_picture fallback map from social accounts
      const socialAccountPics: Record<string, string> = {};
      mergedByUsername.forEach(acc => {
        if (acc.profile_picture && !socialAccountPics[acc.platform]) {
          socialAccountPics[acc.platform] = acc.profile_picture;
        }
      });

      const channels: MessagingChannelStat[] = (channelsRes.data || []).map((ch: any) => ({
        id: ch.id,
        platform: ch.platform,
        channel_name: ch.channel_name || '',
        channel_type: ch.channel_type || 'group',
        members_count: Number(ch.members_count ?? 0),
        online_count: Number(ch.online_count ?? 0),
        profile_picture: ch.profile_picture || socialAccountPics[ch.platform] || null,
        channel_id: ch.channel_id || null,
      }));

      // TELEGRAM DEDUP: Only filter out channels/groups (negative chat_id or @username).
      // The bot has a numeric positive chat_id and should be kept.
      const filteredNormalized = mergedByUsername.filter(acc => {
        if (acc.platform === 'telegram' && acc.chat_id &&
          (String(acc.chat_id).startsWith('@') || Number(acc.chat_id) < 0)) return false;
        return true;
      });

      const finalStats = [...filteredNormalized];
      const existingPlatforms = new Set(finalStats.map(s => s.platform));
      channels.forEach(ch => {
        if (!existingPlatforms.has(ch.platform)) {
          const platformKey = ch.platform.toLowerCase();
          const totalActions = actionCounts[platformKey] || 0;
          const totalBotActions = botActionCounts[platformKey] || 0;
          finalStats.push({
            id: `virtual-${ch.id}`,
            platform: ch.platform,
            platform_user_id: ch.channel_id,
            username: ch.channel_name,
            profile_picture: ch.profile_picture,
            followers_count: 0,
            posts_count: 0,
            views_count: 0,
            likes_count: 0,
            shares_count: 0,
            comments_count: 0,
            engagement_rate: 0,
            updated_at: new Date().toISOString(),
            chat_id: ch.channel_id,
            metadata: {
              is_virtual: true,
              is_channel_members: true,
              members_count: ch.members_count,
              official_posts_count: 0,
              bot_posts_count: totalBotActions,
              ...(ch.platform === 'whatsapp' && botActiveStatus !== null ? { is_active: botActiveStatus } : {})
            },
          });
          existingPlatforms.add(ch.platform);
        }
      });

      const maxUpdatedAt = finalStats.reduce((latest: string | null, s) => {
        return s.updated_at && (!latest || s.updated_at > latest) ? s.updated_at : latest;
      }, null);

      const latestDemo = (demographicsRes.data || [])[0] || null;
      const demographics: AudienceDemographicEntry | null = latestDemo ? {
        ageGroups: latestDemo.age_groups || [],
        gender: latestDemo.gender || [],
        devices: latestDemo.devices || [],
        topCities: latestDemo.top_cities || [],
        topCountries: latestDemo.top_countries || [],
      } : null;

      const result = {
        stats: finalStats,
        messagingChannels: channels,
        apiConnections: (credsRes.data || []).map(r => r.platform),
        lastUpdated: maxUpdatedAt ? new Date(maxUpdatedAt) : new Date(),
        messageStats: {
          totalSent: msgTotalSent,
          totalFailed: msgTotalFailed,
          totalDraft: msgTotalDraft,
          totalScheduled: msgTotalScheduled,
          totalReceived: msgTotalReceived,
          successRate: msgSuccessRate,
          platformStats: msgPlatformStats,
          recentMessages: (messagesRes.data || []).slice(0, 500).map((m: any) => ({
            id: m.id,
            platform: m.platform,
            content: m.content,
            recipient: m.recipient_name || m.recipient_phone,
            status: m.status,
            created_at: m.created_at,
          })),
        },
        messageDeliveryStats: {
          totalSent: msgTotalSent,
          totalFailed: msgTotalFailed,
          totalDraft: msgTotalDraft,
          totalScheduled: msgTotalScheduled,
          totalReceived: msgTotalReceived,
          successRate: msgSuccessRate,
          platformStats: msgPlatformStats,
          recentMessages: (messagesRes.data || []).slice(0, 15).map((m: any) => ({
            id: m.id,
            platform: m.platform,
            content: m.content,
            recipient: m.recipient_name || m.recipient_phone,
            status: m.status,
            created_at: m.created_at,
          })),
        },
        postStatusCounts: {
          published: publishedCount,
          draft: draftCount,
          scheduled: scheduledCount,
          failed: failedCount,
        },
        demographics,
      };

      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() })); } catch {}

      return result;
    },
    enabled: !!user && (options.enabled !== false),
    initialData: loadCache,
    refetchOnMount: true,
  });

  // Real-time subscription - Use unique channel name per instance to avoid collisions
  const [realtimeError, setRealtimeError] = useState(false);
  useEffect(() => {
    if (!user || options.enabled === false) return;
    setRealtimeError(false);
    
    // Generate a unique channel name for this specific instance
    const channelId = Math.random().toString(36).substring(7);
    const channelName = `social-stats-realtime-${channelId}`;
    
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let invalidating = false;
    const debouncedInvalidate = () => {
      if (invalidating) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        invalidating = true;
        queryClient.invalidateQueries({ queryKey: ['social_stats_all', user.id] }).finally(() => {
          invalidating = false;
        });
      }, 2000);
    };

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'social_accounts',
        filter: `user_id=eq.${user.id}`,
      }, debouncedInvalidate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messaging_channels',
        filter: `user_id=eq.${user.id}`,
      }, debouncedInvalidate);

    // Subscribe with error handling
    let lastErrorTime = 0;
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        const now = Date.now();
        if (now - lastErrorTime > 30000) {
          console.debug('Realtime unavailable, using polling:', channelName);
        }
        lastErrorTime = now;
        setRealtimeError(true);
      } else if (status === 'SUBSCRIBED') {
        setRealtimeError(false);
      }
    });
    // Trigger a cache refetch on mount so data loads immediately
    queryClient.invalidateQueries({ queryKey: ['social_stats_all', user.id] });

    return () => { 
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [user, queryClient, options.enabled]);

  useEffect(() => {
    if (!user || options.enabled === false || !realtimeError) return;
    let isRunning = false;
    const interval = setInterval(async () => {
      if (isRunning || !navigator.onLine) return;
      isRunning = true;
      try {
        await queryClient.invalidateQueries({ queryKey: ['social_stats_all', user.id] });
      } finally {
        isRunning = false;
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [user, queryClient, options.enabled, realtimeError]);

  const MESSAGING_PLATFORMS = new Set(['whatsapp', 'telegram']);
  const emptyMessageStats = { totalSent: 0, totalFailed: 0, totalDraft: 0, totalScheduled: 0, totalReceived: 0, successRate: 0, platformStats: {}, recentMessages: [] };

  const stats = data?.stats || [];
  const messagingChannels = data?.messagingChannels || [];
  const apiConnections = data?.apiConnections || [];

  const socialStats = useMemo(() =>
    stats.filter(s => !MESSAGING_PLATFORMS.has(s.platform)),
    [stats]
  );
  const messagingStats = useMemo(() =>
    stats.filter(s => MESSAGING_PLATFORMS.has(s.platform)),
    [stats]
  );

  const byPlatform: SocialStatsByPlatform = useMemo(() => stats.reduce((acc, s) => {
    if (!acc[s.platform]) acc[s.platform] = [];
    acc[s.platform].push(s);
    return acc;
  }, {} as SocialStatsByPlatform), [stats]);

  const totalFollowers = useMemo(() => stats.reduce((sum, s) => sum + s.followers_count, 0), [stats]);
  const totalSocialFollowers = useMemo(() => socialStats.reduce((sum, s) => sum + s.followers_count, 0), [socialStats]);
  const totalMessagingMembers = useMemo(() => {
    const fromStats = messagingStats.reduce((sum, s) => sum + (s.followers_count || 0), 0);
    const fromChannels = messagingChannels.reduce((sum, c) => sum + c.members_count, 0);
    return fromStats || fromChannels;
  }, [messagingStats, messagingChannels]);
  const totalPosts = useMemo(() => stats.reduce((sum, s) => sum + s.posts_count, 0), [stats]);

  const getPlatformStats = useCallback((platform: string): SocialAccountStat | null => {
    const accounts = byPlatform[platform];
    if (!accounts || accounts.length === 0) return null;
    const channels = messagingChannels.filter(c => c.platform === platform);
    const totalMembers = channels.reduce((sum, ch) => sum + ch.members_count, 0);
    const isMessaging = MESSAGING_PLATFORMS.has(platform);

    return {
      id: accounts[0].id,
      platform,
      username: accounts[0].username,
      profile_picture: accounts[0].profile_picture,
      followers_count: isMessaging ? totalMembers : accounts.reduce((sum, a) => sum + a.followers_count, 0) || totalMembers,
      posts_count: accounts.reduce((sum, a) => sum + a.posts_count, 0),
      views_count: accounts.reduce((sum, a) => sum + a.views_count, 0),
      likes_count: accounts.reduce((sum, a) => sum + a.likes_count, 0),
      shares_count: accounts.reduce((sum, a) => sum + a.shares_count, 0),
      comments_count: accounts.reduce((sum, a) => sum + a.comments_count, 0),
      engagement_rate: accounts.reduce((sum, a) => sum + a.engagement_rate, 0),
      updated_at: accounts[0].updated_at,
      chat_id: accounts[0].chat_id,
    };
  }, [byPlatform, messagingChannels]);

  const isConnected = useCallback((platform: string): boolean => {
    return ((byPlatform[platform]?.length ?? 0) > 0) || apiConnections.includes(platform);
  }, [byPlatform, apiConnections]);

  const connectedPlatforms = Array.from(new Set([...Object.keys(byPlatform), ...apiConnections]));

  const audienceBreakdown: AudienceBreakdown[] = useMemo(() => {
    const typeMap: Record<string, { label: string; channels: MessagingChannelStat[] }> = {
      channel: { label: 'Canais', channels: [] },
      group: { label: 'Grupos', channels: [] },
      supergroup: { label: 'Comunidades', channels: [] },
      broadcast_list: { label: 'Listas de Transmissão', channels: [] },
    };

    messagingChannels.forEach(ch => {
      const type = ch.channel_type?.toLowerCase() || 'group';
      const key = type === 'community' ? 'supergroup' : (typeMap[type] ? type : 'group');
      if (typeMap[key]) typeMap[key].channels.push(ch);
    });

    return Object.entries(typeMap)
      .filter(([, v]) => v.channels.length > 0)
      .map(([type, v]) => ({
        type,
        label: v.label,
        count: v.channels.length,
        totalMembers: v.channels.reduce((sum, ch) => sum + ch.members_count, 0),
        totalOnline: v.channels.reduce((sum, ch) => sum + ch.online_count, 0),
        channels: v.channels,
      }));
  }, [messagingChannels]);

  return useMemo(() => ({
    stats,
    socialStats,
    messagingStats,
    byPlatform,
    messagingChannels,
    audienceBreakdown,
    loading: isLoading || manualLoading,
    setStatsLoading: setManualLoading,
    messageStats: data?.messageStats || emptyMessageStats,
    lastUpdated: data?.lastUpdated || null,
    totalFollowers,
    totalSocialFollowers,
    totalMessagingMembers,
    totalPosts,
    connectedPlatforms,
    getPlatformStats,
    isConnected,
    refresh: refetch,
    messageDeliveryStats: data?.messageDeliveryStats || emptyMessageStats,
    postStatusCounts: data?.postStatusCounts || { published: 0, draft: 0, scheduled: 0, failed: 0 },
    demographics: data?.demographics || null,
  }), [stats, socialStats, messagingStats, byPlatform, messagingChannels, audienceBreakdown, isLoading, manualLoading, data, totalFollowers, totalSocialFollowers, totalMessagingMembers, totalPosts, connectedPlatforms, getPlatformStats, isConnected, refetch]);
}
