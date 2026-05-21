import { useMemo, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

export interface SocialStatsByPlatform {
  [platform: string]: SocialAccountStat[];
}

export function useSocialStats(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [manualLoading, setManualLoading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['social_stats_all', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const results = await Promise.allSettled([
        supabase
          .from('social_accounts')
          .select('id, platform, platform_user_id, username, profile_picture, followers, followers_count, posts_count, views, likes, shares, comments, engagement_rate, updated_at, chat_id, metadata')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('api_credentials' as any)
          .select('platform')
          .eq('user_id', user.id),
        supabase
          .from('messaging_channels')
          .select('id, platform, channel_name, channel_type, members_count, online_count, profile_picture, channel_id')
          .eq('user_id', user.id),
        supabase
          .from('messages')
          .select('platform, channel_id, status, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('scheduled_posts')
          .select('platforms, status')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .limit(200),
      ]);

      const statsRes = results[0].status === 'fulfilled' ? results[0].value : { data: [], error: results[0].reason };
      const credsRes = results[1].status === 'fulfilled' ? results[1].value : { data: [], error: results[1].reason };
      const channelsRes = results[2].status === 'fulfilled' ? results[2].value : { data: [], error: results[2].reason };
      const messagesRes = results[3].status === 'fulfilled' ? results[3].value : { data: [], error: results[3].reason };
      const scheduledRes = results[4].status === 'fulfilled' ? results[4].value : { data: [], error: results[4].reason };

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
      
      (messagesRes.data || []).forEach((m: any) => {
        const p = (m.platform || 'unknown').toLowerCase().trim();
        const isBot = m.metadata?.integration_type === 'bot';
        if (isBot) botActionCounts[p] = (botActionCounts[p] || 0) + 1;
        else actionCounts[p] = (actionCounts[p] || 0) + 1;
      });

      (scheduledRes.data || []).forEach((post: any) => {
        if (post.platforms && Array.isArray(post.platforms)) {
          post.platforms.forEach((p: string) => {
            const pk = p.toLowerCase().trim();
            actionCounts[pk] = (actionCounts[pk] || 0) + 1;
          });
        }
      });

      const normalized: SocialAccountStat[] = (statsRes.data || []).map((acc: any) => {
        const platformKey = acc.platform;
        const totalActions = actionCounts[platformKey] || 0;
        const totalBotActions = botActionCounts[platformKey] || 0;
        const effectivePosts = Math.max(Number(acc.posts_count ?? 0), totalActions);

        return {
          id: acc.id,
          platform: acc.platform,
          platform_user_id: acc.platform_user_id,
          username: acc.username,
          profile_picture: acc.profile_picture,
          followers_count: Number(acc.followers_count ?? acc.followers ?? 0),
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
            official_posts_count: effectivePosts,
            bot_posts_count: totalBotActions,
            ...(platformKey === 'whatsapp' && botActiveStatus !== null ? { is_active: botActiveStatus } : {}),
          },
        };
      });

      const channels: MessagingChannelStat[] = (channelsRes.data || []).map((ch: any) => ({
        id: ch.id,
        platform: ch.platform,
        channel_name: ch.channel_name || '',
        channel_type: ch.channel_type || 'group',
        members_count: Number(ch.members_count ?? 0),
        online_count: Number(ch.online_count ?? 0),
        profile_picture: ch.profile_picture || null,
        channel_id: ch.channel_id || null,
      }));

      const finalStats = [...normalized];
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
            followers_count: ch.members_count,
            posts_count: totalActions,
            views_count: 0,
            likes_count: 0,
            shares_count: 0,
            comments_count: 0,
            engagement_rate: 0,
            updated_at: new Date().toISOString(),
            chat_id: ch.channel_id,
            metadata: {
              is_virtual: true,
              official_posts_count: totalActions,
              bot_posts_count: totalBotActions,
              ...(ch.platform === 'whatsapp' && botActiveStatus !== null ? { is_active: botActiveStatus } : {})
            },
          });
          existingPlatforms.add(ch.platform);
        }
      });

      return {
        stats: finalStats,
        messagingChannels: channels,
        apiConnections: (credsRes.data || []).map(r => r.platform),
        lastUpdated: new Date()
      };
    },
    enabled: !!user && (options.enabled !== false),
    staleTime: 60 * 1000, // Fresco por 1 minuto
  });

  // Real-time subscription - Single global instance via queryClient invalidation
  useEffect(() => {
    if (!user || options.enabled === false) return;
    const channel = supabase
      .channel('social-stats-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'social_accounts',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['social_stats_all', user.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const stats = data?.stats || [];
  const messagingChannels = data?.messagingChannels || [];
  const apiConnections = data?.apiConnections || [];

  const byPlatform: SocialStatsByPlatform = useMemo(() => stats.reduce((acc, s) => {
    if (!acc[s.platform]) acc[s.platform] = [];
    acc[s.platform].push(s);
    return acc;
  }, {} as SocialStatsByPlatform), [stats]);

  const totalFollowers = useMemo(() => stats.reduce((sum, s) => sum + s.followers_count, 0), [stats]);
  const totalPosts = useMemo(() => stats.reduce((sum, s) => sum + s.posts_count, 0), [stats]);

  const getPlatformStats = (platform: string): SocialAccountStat | null => {
    const accounts = byPlatform[platform];
    if (!accounts || accounts.length === 0) return null;
    const channels = messagingChannels.filter(c => c.platform === platform);
    const totalMembers = channels.reduce((sum, ch) => sum + ch.members_count, 0);

    return {
      id: accounts[0].id,
      platform,
      username: accounts[0].username,
      profile_picture: accounts[0].profile_picture,
      followers_count: accounts.reduce((sum, a) => sum + a.followers_count, 0) || totalMembers,
      posts_count: accounts.reduce((sum, a) => sum + a.posts_count, 0),
      views_count: accounts.reduce((sum, a) => sum + a.views_count, 0),
      likes_count: accounts.reduce((sum, a) => sum + a.likes_count, 0),
      shares_count: accounts.reduce((sum, a) => sum + a.shares_count, 0),
      comments_count: accounts.reduce((sum, a) => sum + a.comments_count, 0),
      engagement_rate: accounts.reduce((sum, a) => sum + a.engagement_rate, 0),
      updated_at: accounts[0].updated_at,
      chat_id: accounts[0].chat_id,
    };
  };

  const isConnected = (platform: string): boolean => {
    return ((byPlatform[platform]?.length ?? 0) > 0) || apiConnections.includes(platform);
  };

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

  return {
    stats,
    byPlatform,
    messagingChannels,
    audienceBreakdown,
    loading: isLoading || manualLoading,
    setStatsLoading: (loading: boolean) => setManualLoading(loading),
    lastUpdated: data?.lastUpdated || null,
    totalFollowers,
    totalPosts,
    connectedPlatforms,
    getPlatformStats,
    isConnected,
    refresh: refetch,
  };
}

