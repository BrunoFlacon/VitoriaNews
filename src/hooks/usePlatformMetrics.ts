import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export interface RetentionMetric {
  duration: string;
  label: string;
  views: number;
}

export interface DailyKpi {
  metric_date: string;
  metric_type: string;
  value: number;
}

export interface PostMetric {
  id: string;
  content: string;
  platform: string;
  allPlatforms: string[];
  media_type: string | null;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagement: number;
  published_at: string | null;
}

export interface HourlyPerformance {
  day: string;
  time: string;
  engagement: number;
  platform: string;
}

export interface FormatRecommendation {
  platform: string;
  day: string;
  time: string;
  media_type: string;
  count: number;
}

export interface PlatformMetricsResult {
  retention: RetentionMetric[];
  topContent: PostMetric[];
  bestTimes: HourlyPerformance[];
  formatRecs: FormatRecommendation[];
  dailyMetrics: DailyKpi[];
  isLoading: boolean;
  error: Error | null;
}

const RETENTION_COLUMNS = [
  { duration: '3s', col: 'views_3s', label: '3 segundos' },
  { duration: '15s', col: 'views_15s', label: '15 segundos' },
  { duration: '30s', col: 'views_30s', label: '30 segundos' },
  { duration: '1min', col: 'views_1min', label: '1 minuto' },
  { duration: '3min', col: 'views_3min', label: '3 minutos' },
  { duration: '5min', col: 'views_5min', label: '5 minutos' },
  { duration: '10min', col: 'views_10min', label: '10 minutos' },
  { duration: '15min', col: 'views_15min', label: '15 minutos' },
  { duration: '20min', col: 'views_20min', label: '20 minutos' },
  { duration: '30min', col: 'views_30min', label: '30 minutos' },
  { duration: '45min', col: 'views_45min', label: '45 minutos' },
  { duration: '55min', col: 'views_55min', label: '55 minutos' },
  { duration: '1h', col: 'views_1h', label: '1 hora' },
];

function parsePlatforms(raw: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  let cleaned = raw.trim();
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }
  const parts = cleaned.split(/\s+/).map(p => p.split('|')[0]).filter(Boolean);
  return parts.length > 0 ? parts : [cleaned];
}

export function usePlatformMetrics(platform: string, period: string = '30d', enabled: boolean = true) {
  const { user } = useAuth();

  const periodDays = period === '24h' ? 1 : period === '3d' ? 3 : period === '7d' ? 7 : period === '15d' ? 15 : period === '30d' ? 30 : period === '60d' ? 60 : period === '90d' ? 90 : 30;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - periodDays);
  const sinceStr = sinceDate.toISOString().split('T')[0];

  const retentionQuery = useQuery({
    queryKey: ['platform_retention', platform, period],
    queryFn: async (): Promise<RetentionMetric[]> => {
      if (platform !== 'all' && platform !== 'facebook') return [];
      const selectCols = RETENTION_COLUMNS.map(c => c.col).join(', ');
      const { data, error } = await supabase
        .from('facebook_daily_retention')
        .select(`metric_date, ${selectCols}`)
        .gte('metric_date', sinceStr)
        .order('metric_date', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) return [];
      const latest = data[0];
      return RETENTION_COLUMNS.map(c => ({
        duration: c.duration,
        label: c.label,
        views: Number((latest as any)[c.col] || 0),
      }));
    },
    enabled: !!user && enabled && (platform === 'all' || platform === 'facebook'),
    staleTime: 5 * 60 * 1000,
  });

  const topContentQuery = useQuery({
    queryKey: ['platform_top_content', platform, period],
    queryFn: async (): Promise<PostMetric[]> => {
      let query = supabase
        .from('scheduled_posts')
        .select('id, content, platforms, media_type, published_at, status')
        .eq('status', 'published')
        .not('content', 'is', null)
        .order('published_at', { ascending: false })
        .limit(20);

      const { data, error } = await query;
      if (error || !data) return [];

      const merged: Record<string, PostMetric & { allPlatforms: string[] }> = {};
      for (const p of data) {
        const platforms = parsePlatforms(p.platforms);
        if (platform !== 'all' && !platforms.includes(platform)) continue;
        const key = p.content?.trim().toLowerCase().slice(0, 80) || p.id;
        if (!merged[key]) {
          merged[key] = {
            id: p.id,
            content: p.content || '',
            platform: platforms[0] || '',
            allPlatforms: [],
            media_type: p.media_type || null,
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            engagement: 0,
            published_at: p.published_at,
          };
        }
        for (const plat of platforms) {
          if (!merged[key].allPlatforms.includes(plat)) {
            merged[key].allPlatforms.push(plat);
          }
        }
      }
      const finalTopContent = Object.values(merged)
        .filter(p => p.content.trim().length > 0)
        .slice(0, 10);
      return finalTopContent;
    },
    enabled: !!user && enabled,
    staleTime: 5 * 60 * 1000,
  });

  const bestTimesQuery = useQuery({
    queryKey: ['platform_best_times', platform, period],
    queryFn: async (): Promise<HourlyPerformance[]> => {
      let query = supabase
        .from('scheduled_posts')
        .select('id, platforms, scheduled_at, published_at, status')
        .in('status', ['published', 'scheduled']);

      const { data, error } = await query;
      if (error || !data) return [];

      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

      interface DayHourKey {
        dayName: string;
        hour: string;
        platform: string;
      }

      const grouped: Record<string, { key: DayHourKey; count: number }> = {};
      const getKey = (d: string, h: string, p: string) => `${d}|${h}|${p}`;

      for (const post of data) {
        const ts = post.scheduled_at || post.published_at;
        if (!ts) continue;
        const date = new Date(ts);
        const dayName = dayNames[date.getDay()];
        const hour = `${String(date.getHours()).padStart(2, '0')}:00`;
        const platforms = parsePlatforms(post.platforms);

        for (const plat of platforms) {
          if (platform !== 'all' && plat !== platform) continue;
          const key = getKey(dayName, hour, plat);
          if (!grouped[key]) {
            grouped[key] = { key: { dayName, hour, platform: plat }, count: 0 };
          }
          grouped[key].count++;
        }
      }

      const flat = Object.values(grouped);
      flat.sort((a, b) => b.count - a.count);
      return flat.slice(0, 7).map(g => ({
        day: g.key.dayName,
        time: g.key.hour,
        engagement: g.count,
        platform: g.key.platform,
      }));
    },
    enabled: !!user && enabled && user.id != null,
    staleTime: 5 * 60 * 1000,
  });

  const formatRecsQuery = useQuery({
    queryKey: ['platform_format_recs', platform, period],
    queryFn: async (): Promise<FormatRecommendation[]> => {
      let query = supabase
        .from('scheduled_posts')
        .select('id, platforms, media_type, scheduled_at, published_at, status')
        .in('status', ['published', 'scheduled'])
        .not('media_type', 'is', null);

      const { data, error } = await query;
      if (error || !data) return [];

      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

      const grouped: Record<string, { count: number; platform: string; day: string; time: string; media_type: string }> = {};
      const getKey = (p: string, d: string, h: string, m: string) => `${p}|${d}|${h}|${m}`;

      for (const post of data) {
        const ts = post.scheduled_at || post.published_at;
        if (!ts) continue;
        const date = new Date(ts);
        const dayName = dayNames[date.getDay()];
        const hour = `${String(date.getHours()).padStart(2, '0')}:00`;
        const platforms = parsePlatforms(post.platforms);
        const mt = (post.media_type || 'unknown').toLowerCase();

        for (const plat of platforms) {
          if (platform !== 'all' && plat !== platform) continue;
          const key = getKey(plat, dayName, hour, mt);
          if (!grouped[key]) {
            grouped[key] = { count: 0, platform: plat, day: dayName, time: hour, media_type: mt };
          }
          grouped[key].count++;
        }
      }

      const flat = Object.values(grouped);
      flat.sort((a, b) => b.count - a.count);

      const bestPerSlot: Record<string, FormatRecommendation> = {};
      for (const item of flat) {
        const slotKey = `${item.platform}|${item.day}|${item.time}`;
        if (!bestPerSlot[slotKey] || item.count > bestPerSlot[slotKey].count) {
          bestPerSlot[slotKey] = item;
        }
      }

      return Object.values(bestPerSlot)
        .sort((a, b) => b.count - a.count)
        .slice(0, 7);
    },
    enabled: !!user && enabled,
    staleTime: 5 * 60 * 1000,
  });

  const dailyMetricsQuery = useQuery({
    queryKey: ['platform_daily_metrics', platform, period],
    queryFn: async (): Promise<DailyKpi[]> => {
      const { data, error } = await supabase
        .from('facebook_daily_metrics')
        .select('metric_date, metric_type, value')
        .gte('metric_date', sinceStr)
        .order('metric_date', { ascending: false })
        .limit(500);
      if (error || !data) return [];
      return data as DailyKpi[];
    },
    enabled: !!user && enabled && (platform === 'all' || platform === 'facebook'),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => ({
    retention: retentionQuery.data || [],
    topContent: topContentQuery.data || [],
    bestTimes: bestTimesQuery.data || [],
    formatRecs: formatRecsQuery.data || [],
    dailyMetrics: dailyMetricsQuery.data || [],
    isLoading: retentionQuery.isLoading || topContentQuery.isLoading || bestTimesQuery.isLoading || formatRecsQuery.isLoading,
    error: retentionQuery.error || topContentQuery.error || bestTimesQuery.error || formatRecsQuery.error,
  }), [
    retentionQuery.data,
    topContentQuery.data,
    bestTimesQuery.data,
    formatRecsQuery.data,
    dailyMetricsQuery.data,
    retentionQuery.isLoading,
    topContentQuery.isLoading,
    bestTimesQuery.isLoading,
    formatRecsQuery.isLoading,
    retentionQuery.error,
    topContentQuery.error,
    bestTimesQuery.error,
    formatRecsQuery.error,
  ]);
}
