import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

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
  updated_at: string | null;
  chat_id?: string | null;
  metadata?: Record<string, any> | null;
}

export interface MessagingChannelStat {
  id: string;
  platform: string;
  channel_name: string;
  channel_type: string; // 'channel' | 'group' | 'supergroup' | 'community' | 'broadcast_list'
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


/**
 * useSocialStats
 * Centralized hook that fetches real-world social account metrics from
 * `social_accounts` table and distributes them to all dashboard tabs.
 * Replaces hardcoded/mock data across Analytics, Messaging, Calendar, etc.
 */
export function useSocialStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SocialAccountStat[]>([]);
  const [messagingChannels, setMessagingChannels] = useState<MessagingChannelStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const [apiConnections, setApiConnections] = useState<string[]>([]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Run all data fetches AND the bot ping in parallel to avoid serial blocking
      const [statsRes, credsRes, channelsRes, messagesRes, scheduledRes] = await Promise.all([
        supabase
          .from('social_accounts')
          .select('id, platform, platform_user_id, username, profile_picture, followers, posts_count, views, likes, shares, comments, updated_at, chat_id, metadata')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('api_credentials')
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
          .limit(500),
        supabase
          .from('scheduled_posts')
          .select('platforms, status')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .limit(200),
      ]);

      if (statsRes.error) throw statsRes.error;

      // Determine if bot is active based on database settings/messages rather than ping
      let botActiveStatus: boolean | null = null;
      const { data: botSettings } = await supabase
        .from('bot_settings' as any)
        .select('is_active')
        .eq('user_id', user.id)
        .eq('platform', 'whatsapp')
        .maybeSingle();
      
      if (botSettings) {
        botActiveStatus = !!botSettings.is_active;
      }

      // Map platform message counts
      const actionCounts: Record<string, number> = {};
      const botActionCounts: Record<string, number> = {};
      
      // Add direct messages (including sent/delivered)
      (messagesRes.data || []).forEach((m: any) => {
        const p = (m.platform || 'unknown').toLowerCase().trim();
        const isBot = m.metadata?.integration_type === 'bot';
        
        if (isBot) {
          botActionCounts[p] = (botActionCounts[p] || 0) + 1;
        } else {
          actionCounts[p] = (actionCounts[p] || 0) + 1;
        }
      });

      // Add published feed posts
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
        // Aggregate platform-specific actions (messages + posts) if account counter is low
        const totalActions = actionCounts[platformKey] || 0;
        const totalBotActions = botActionCounts[platformKey] || 0;
        const effectivePosts = Math.max(Number(acc.posts_count ?? 0), totalActions);

        return {
          id: acc.id,
          platform: acc.platform,
          platform_user_id: acc.platform_user_id,
          username: acc.username,
          profile_picture: acc.profile_picture,
          followers_count: Number(acc.followers ?? 0),
          posts_count: effectivePosts,
          views_count: Number(acc.views ?? 0),
          likes_count: Number(acc.likes ?? 0),
          shares_count: Number(acc.shares ?? 0),
          comments_count: Number(acc.comments ?? 0),
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

      // Ensure we have a stat entry for platforms that have messaging channels but no social_accounts row yet
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

      setStats(finalStats);
      setMessagingChannels(channels);
      setApiConnections((credsRes.data || []).map(r => r.platform));
      setLastUpdated(new Date());
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [user, queryClient]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time subscription to social_accounts changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('social-stats-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'social_accounts',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchStats]);

  /** All stats grouped by platform */
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
      // Check if this platform exists in messaging_channels to complement data
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
        updated_at: accounts[0].updated_at,
        chat_id: accounts[0].chat_id,
      };
  };

  /** Check if a platform is connected (has any data OR credentials) */
  const isConnected = (platform: string): boolean => {
    return ((byPlatform[platform]?.length ?? 0) > 0) || apiConnections.includes(platform);
  };

  /** Connected platforms list (merged) */
  const connectedPlatforms = Array.from(new Set([...Object.keys(byPlatform), ...apiConnections]));

  /** Audience breakdown by channel type across all messaging platforms */
  const audienceBreakdown: AudienceBreakdown[] = useMemo(() => {
    const typeMap: Record<string, { label: string; channels: MessagingChannelStat[] }> = {
      channel: { label: 'Canais', channels: [] },
      group: { label: 'Grupos', channels: [] },
      supergroup: { label: 'Comunidades', channels: [] },
      broadcast_list: { label: 'Listas de Transmissão', channels: [] },
    };

    messagingChannels.forEach(ch => {
      const type = ch.channel_type?.toLowerCase() || 'group';
      // Map supergroup+community together
      const key = type === 'community' ? 'supergroup' : (typeMap[type] ? type : 'group');
      if (typeMap[key]) {
        typeMap[key].channels.push(ch);
      }
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
    loading,
    setStatsLoading: setLoading,
    lastUpdated,
    totalFollowers,
    totalPosts,
    connectedPlatforms,
    getPlatformStats,
    isConnected,
    refresh: fetchStats,
  };
}
