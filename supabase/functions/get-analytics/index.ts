// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function normalizePlatform(platform: string): string {
  const value = (platform || "").toLowerCase().trim();
  if (value === "x" || value === "twitter" || value === "x (twitter)" || value === "x_twitter") {
    return "twitter";
  }
  if (value === "truth social") return "truthsocial";
  if (value === "google news") return "googlenews";
  if (value === "google" || value === "google analytics") return "google";
  if (value === "youtube" || value === "yt") return "youtube";
  return value || "all";
}

interface PostMetric {
  id: string;
  post_id?: string;
  external_id?: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  content?: string;
  collected_at: string;
}

interface AccountMetric {
  id: string;
  social_account_id: string;
  platform: string;
  followers: number;
  posts_count: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  collected_at: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("x-authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!authHeader) {
      console.error('[get-analytics] No Authorization header provided');
      return new Response(JSON.stringify({ 
        error: "Authorization header missing",
        detail: "No token provided in Authorization or x-authorization headers"
      }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    console.log(`[get-analytics] Validating token: ${token.substring(0, 10)}...`);
    
    let userId: string | undefined;
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error("Invalid Auth");
      userId = user.id;
    } catch {
      userId = undefined;
    }
    
    if (!userId) {
      console.error("[get-analytics] getUser failed: User not found");
      return new Response(JSON.stringify({ 
        error: "Unauthorized", 
        detail: "Invalid or expired session" 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    const user = { id: userId };

    console.log(`[get-analytics] User authenticated: ${user.id}`);

    // Parameters extraction from Query (GET) or Body (POST)
    let requestedPeriod = "7d";
    let requestedPlatform = "all";
    let requestedType = "all";
    let requestedSource = "dashboard"; // 'dashboard' or 'api'

    if (req.method === "POST") {
      try {
        const body = await req.json();
        requestedPeriod = body.period || "7d";
        requestedPlatform = body.platform || "all";
        requestedType = body.type || "all";
        requestedSource = body.source || "dashboard";
      } catch (e) {
        console.warn("[get-analytics] Could not parse JSON body, falling back to query params");
        const url = new URL(req.url);
        requestedPeriod = url.searchParams.get("period") || "7d";
        requestedPlatform = url.searchParams.get("platform") || "all";
        requestedType = url.searchParams.get("type") || "all";
        requestedSource = url.searchParams.get("source") || "dashboard";
      }
    } else {
      const url = new URL(req.url);
      requestedPeriod = url.searchParams.get("period") || "7d";
      requestedPlatform = url.searchParams.get("platform") || "all";
      requestedType = url.searchParams.get("type") || "all";
      requestedSource = url.searchParams.get("source") || "dashboard";
    }

    const now = new Date();
    let days = 7;
    let startDate: Date;
    switch (requestedPeriod) {
      case "24h": startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); days = 24; break; // Use 24 points for hours
      case "3d": startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); days = 3; break;
      case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); days = 7; break;
      case "15d": startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); days = 15; break;
      case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); days = 30; break;
      case "60d": startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); days = 60; break;
      case "90d": startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); days = 90; break;
      case "120d": startDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); days = 120; break;
      case "365d": startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); days = 12; break; // Use 12 months
      default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); days = 7;
    }

    const [
      { data: postsResp },
      { data: realMetricsData },
      { data: accMetricsData },
      { data: socialConnections },
      { data: socialAccountsData },
      { data: hourlyPerf },
      { data: messagesData },
      { data: adsData },
      { data: gaData },
      { data: ytData },
      { data: viralData },
      { data: trendsData },
      { data: politicalTrendsData },
      { data: attacksData },
      { data: messagingChannelsResp }
    ] = await Promise.all([
      supabase.from("scheduled_posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("post_metrics").select("*").eq("user_id", user.id).or(`published_at.gte.${startDate.toISOString()},collected_at.gte.${startDate.toISOString()}`),
      supabase.from("account_metrics").select("*").eq("user_id", user.id).gte("collected_at", startDate.toISOString()).order("collected_at", { ascending: true }),
      supabase.from("social_connections").select("id, platform, username, page_name, followers_count, profile_image_url, is_connected, platform_user_id, page_id").eq("user_id", user.id),
      supabase.from("social_accounts").select("id, platform, platform_user_id, username, profile_picture, followers, followers_count, posts_count, views, likes, shares, comments, metadata, updated_at").eq("user_id", user.id),
      supabase.from("platform_hourly_performance").select("*").order("avg_likes", { ascending: false }).limit(50),
      supabase.from("messages").select("id, status, platform, content, recipient_name, recipient_phone, created_at, sent_at").eq("user_id", user.id).gte("created_at", startDate.toISOString()).order("created_at", { ascending: false }),
      supabase.from("meta_ads_campaigns").select("*").eq("user_id", user.id).gte("created_at", startDate.toISOString()),
      supabase.from("google_analytics_data").select("*").eq("user_id", user.id).gte("date", startDate.toISOString().split('T')[0]),
      supabase.from("youtube_analytics").select("*").eq("user_id", user.id).gte("date", startDate.toISOString().split('T')[0]),
      supabase.from("viral_campaigns").select("*").gte("detected_at", startDate.toISOString()),
      supabase.from("trends").select("*").gte("detected_at", startDate.toISOString()),
      supabase.from("political_trends").select("*").gte("detected_at", startDate.toISOString()),
      supabase.from("eventos_de_ataque").select("*").gte("detectado_em", startDate.toISOString()),
      supabase.from("messaging_channels").select("*").eq("user_id", user.id)
    ]);

    const posts = postsResp || [];
    const messagingChannels = (messagingChannelsResp as any[]) || [];
    const trends = [...(trendsData || []), ...(politicalTrendsData || [])];
    // ... filtering posts as before
    const filteredPosts = posts.filter((post: any) => {
      const inDateRange = new Date(post.created_at) >= startDate;
      const matchType = requestedType === "all" || post.type === requestedType || post.post_type === requestedType;
      return inDateRange && matchType;
    });
    
    const platformPosts = requestedPlatform === "all"
      ? filteredPosts
      : filteredPosts.filter((post: any) => post.platforms?.includes(requestedPlatform));

    const accountMetrics = (accMetricsData as AccountMetric[]) || [];
    const socialAccounts = (socialAccountsData as any[]) || [];

    const filteredSocialAccounts = requestedPlatform === "all"
      ? socialAccounts
      : socialAccounts.filter((a: any) => normalizePlatform(a.platform) === normalizePlatform(requestedPlatform));

    // Calculate total posts including external counts
    const externalPostsCount = filteredSocialAccounts.reduce((sum, acc) => sum + (acc.posts_count || 0), 0);
    const totalPosts = platformPosts.length + externalPostsCount;
    const publishedPosts = platformPosts.filter((p: any) => p.status === "published").length + externalPostsCount;
    const scheduledPosts = platformPosts.filter((p: any) => p.status === "scheduled").length;
    const failedPosts = platformPosts.filter((p: any) => p.status === "failed").length;
    const draftPosts = platformPosts.filter((p: any) => p.status === "draft").length;
    // platform-aware filtering: since DB may store 'x' or 'twitter' for same platform
    const normalizedRequestedPlatform = normalizePlatform(requestedPlatform);
    const realMetrics = (realMetricsData as PostMetric[]) || [];

    const filteredMetrics = requestedPlatform === "all"
      ? realMetrics
      : realMetrics.filter(m => normalizePlatform(m.platform) === normalizedRequestedPlatform);

    // AGGREGATE ADS, YOUTUBE, GOOGLE ANALYTICS (respect platform filter)
    const normalizedReqPlatform = normalizedRequestedPlatform;
    const filteredAdsData = (requestedPlatform === "all" || normalizedReqPlatform === "google" || normalizedReqPlatform === "meta" || normalizedReqPlatform === "facebook")
      ? (adsData || [])
      : [];
    
    const adsStats = filteredAdsData.reduce((acc: any, current: any) => {
      acc.impressions += Number(current.impressions || 0);
      acc.reach += Number(current.reach || 0);
      acc.clicks += Number(current.clicks || 0);
      acc.spend += Number(current.amount_spent || 0);
      return acc;
    }, { impressions: 0, reach: 0, clicks: 0, spend: 0 });

    const filteredYtData = (requestedPlatform === "all" || normalizedReqPlatform === "youtube") ? (ytData || []) : [];
    const youtubeStats = filteredYtData.reduce((acc: any, current: any) => {
      acc.views += Number(current.views || 0);
      acc.likes += Number(current.likes || 0);
      acc.comments += Number(current.comments || 0);
      acc.subscribers_gained = (acc.subscribers_gained || 0) + Number(current.subscribers_gained || 0);
      acc.watch_time_minutes = (acc.watch_time_minutes || 0) + Number(current.estimated_minutes_watched || 0);
      return acc;
    }, { views: 0, likes: 0, comments: 0, subscribers_gained: 0, watch_time_minutes: 0 });

    const filteredGaData = (requestedPlatform === "all" || normalizedReqPlatform === "google") ? (gaData || []) : [];
    const gaStats = filteredGaData.reduce((acc: any, current: any) => {
      if (current.metric_name === 'activeUsers' || current.metric_name === 'sessions' || current.metric_name === 'screenPageViews') {
        acc.views += Number(current.metric_value || 0);
      }
      acc.sessions = (acc.sessions || 0) + (current.metric_name === 'sessions' ? Number(current.metric_value || 0) : 0);
      acc.users = (acc.users || 0) + (current.metric_name === 'activeUsers' ? Number(current.metric_value || 0) : 0);
      return acc;
    }, { views: 0, sessions: 0, users: 0 });

    // TOTALS COMPUTATION (Including external data)
    const globalFollowers = filteredSocialAccounts.reduce((s: number, a: any) => s + (Number(a.followers || a.followers_count || 0)), 0);
    const globalViews = filteredSocialAccounts.reduce((s: number, a: any) => s + (a.views || 0), 0) + adsStats.impressions + youtubeStats.views + gaStats.views;
    const globalLikes = filteredSocialAccounts.reduce((s: number, a: any) => s + (a.likes || 0), 0) + youtubeStats.likes;
    const globalShares = filteredSocialAccounts.reduce((s: number, a: any) => s + (a.shares || 0), 0);

    let engagement;
    let growthValue = "0";

    const hasRealMetrics = filteredMetrics.length > 0;
    const useAccountFallback = !hasRealMetrics && (socialAccounts.length > 0 || (adsData || []).length > 0 || (ytData || []).length > 0);

    const totalViews = useAccountFallback ? globalViews : Math.max(globalViews, filteredMetrics.reduce((s, m) => s + (m.impressions || 0), 0));
    const totalLikes = useAccountFallback ? globalLikes : Math.max(globalLikes, filteredMetrics.reduce((s, m) => s + (m.likes || 0), 0));
    const totalComments = useAccountFallback ? (socialAccounts.reduce((s: number, a: any) => s + (a.comments || 0), 0) + youtubeStats.comments) : (filteredMetrics.reduce((s, m) => s + (m.comments || 0), 0) + youtubeStats.comments);
    const totalShares = useAccountFallback ? globalShares : Math.max(globalShares, filteredMetrics.reduce((s, m) => s + (m.shares || 0), 0));
    const totalReach = useAccountFallback ? (globalFollowers + adsStats.reach) : (filteredMetrics.reduce((s, m) => s + (m.reach || 0), 0) + adsStats.reach);
    const totalEngagements = totalLikes + totalComments + totalShares + adsStats.clicks;

    const engRate = totalViews > 0
      ? (totalEngagements / totalViews * 100).toFixed(2)
      : "0";

    if (hasRealMetrics) {
      const midDate = new Date((startDate.getTime() + now.getTime()) / 2);
      const firstHalf = filteredMetrics.filter(m => new Date(m.collected_at) < midDate);
      const secondHalf = filteredMetrics.filter(m => new Date(m.collected_at) >= midDate);
      const firstEng = firstHalf.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0), 0);
      const secondEng = secondHalf.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0), 0);
      growthValue = firstEng > 0 ? (((secondEng - firstEng) / firstEng) * 100).toFixed(1) : "0";
    }

    engagement = {
      views: totalViews,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      reach: totalReach,
      engagementRate: engRate,
    };

    const isHourly = requestedPeriod === "24h";
    const isYearly = requestedPeriod === "365d";
    const chartData = [];

    for (let i = days - 1; i >= 0; i--) {
      const bucketStart = new Date(now);
      const bucketEnd = new Date(now);
      
      if (isHourly) {
        bucketStart.setHours(bucketStart.getHours() - i - 1, 0, 0, 0);
        bucketEnd.setHours(bucketEnd.getHours() - i, 0, 0, 0);
      } else if (isYearly) {
        bucketStart.setMonth(bucketStart.getMonth() - i - 1, 1);
        bucketEnd.setMonth(bucketEnd.getMonth() - i, 1);
      } else {
        bucketStart.setDate(bucketStart.getDate() - i - 1);
        bucketEnd.setDate(bucketEnd.getDate() - i);
      }

      const label = isHourly
        ? bucketEnd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : isYearly 
          ? bucketEnd.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
          : bucketEnd.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

      const bucketPosts = filteredMetrics.filter(m => {
        const d = m.published_at ? new Date(m.published_at) : new Date(m.collected_at);
        return d >= bucketStart && d < bucketEnd;
      });

      const bucketAccMetrics = accountMetrics.filter(m => {
        const d = new Date(m.collected_at);
        return d >= bucketStart && d < bucketEnd;
      });
      
      const platformFilteredAcc = requestedPlatform === "all" 
        ? bucketAccMetrics 
        : bucketAccMetrics.filter(m => normalizePlatform(m.platform) === normalizePlatform(requestedPlatform));

      // Strategy: 
      // 1. Use account metrics for Followers/Reach (evolution)
      // 2. Use post metrics for Views/Engagement (activity)
      // 3. If source is 'api', prioritize raw metrics
      
      const viewsCount = requestedSource === 'api' 
        ? Math.max(bucketPosts.reduce((s, m) => s + (m.impressions || 0), 0), platformFilteredAcc.reduce((s, m) => s + (m.views || 0), 0))
        : platformFilteredAcc.reduce((s, m) => s + (m.views || 0), 0) || bucketPosts.reduce((s, m) => s + (m.impressions || 0), 0);

      const engagementCount = bucketPosts.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0) || 
                               platformFilteredAcc.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0);

      const reachCount = platformFilteredAcc.length > 0 
        ? platformFilteredAcc.reduce((s, m) => s + (m.followers || 0), 0) / platformFilteredAcc.length // Average in bucket
        : (bucketPosts.reduce((s, m) => s + (m.reach || 0), 0) || globalFollowers);

      chartData.push({
        name: label,
        views: Math.round(viewsCount),
        engagement: Math.round(engagementCount),
        reach: Math.round(reachCount),
      });
    }

    const platformBreakdown: Record<string, { posts: number; engagement: number }> = {};
    if (hasRealMetrics) {
      filteredMetrics.forEach(m => {
        const normalized = normalizePlatform(m.platform);
        if (!platformBreakdown[normalized]) platformBreakdown[normalized] = { posts: 0, engagement: 0 };
        platformBreakdown[normalized].posts++;
        platformBreakdown[normalized].engagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
      });
    } else if (socialAccounts.length > 0) {
      socialAccounts.forEach((a: any) => {
        const normalized = normalizePlatform(a.platform);
        if (!platformBreakdown[normalized]) platformBreakdown[normalized] = { posts: 0, engagement: 0 };
        platformBreakdown[normalized].posts += (a.posts_count || a.metadata?.posts_count || 0);
        platformBreakdown[normalized].engagement += (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
      });
    }

    let topContent: any[] = [];
    if (hasRealMetrics) {
      const postAgg: Record<string, { likes: number; impressions: number; comments: number; shares: number, content?: string, platform?: string }> = {};
      filteredMetrics.forEach(m => {
        const key = m.external_id || m.post_id;
        if (!key) return;
        if (!postAgg[key]) postAgg[key] = { likes: 0, impressions: 0, comments: 0, shares: 0, content: m.content, platform: m.platform };
        postAgg[key].likes += m.likes || 0;
        postAgg[key].impressions += m.impressions || 0;
        postAgg[key].comments += m.comments || 0;
        postAgg[key].shares += m.shares || 0;
        if (m.content && !postAgg[key].content) postAgg[key].content = m.content;
      });

      const sortedKeys = Object.entries(postAgg)
        .sort((a, b) => (b[1].likes + b[1].comments + b[1].shares) - (a[1].likes + a[1].comments + a[1].shares))
        .slice(0, 30)
        .map(e => e[0]);

      topContent = sortedKeys.map(key => {
        const post = posts.find((p: any) => p.id === key);
        const agg = postAgg[key];
        return {
          id: key,
          content: post ? post.content : (agg.content || "Post externo"),
          platforms: post?.platforms || (agg.platform ? [agg.platform] : []),
          engagement: agg.likes + agg.comments + agg.shares,
          views: agg.impressions,
          publishedAt: post?.published_at || null,
        };
      });
    }

    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    let bestTimes: any[] = [];
    if (hourlyPerf && (hourlyPerf as any[]).length > 0) {
      bestTimes = (hourlyPerf as any[]).map((h, i) => ({
        day: dayNames[h.day_of_week ?? ((i + 1) % 7)],
        time: `${String(h.hour || 0).padStart(2, "0")}:00`,
        platform: h.platform,
        engagement: Math.round(
          ((h.avg_likes || 0) + (h.avg_comments || 0) + (h.avg_shares || 0)) /
          Math.max((h.avg_impressions || 1), 1) * 100
        ),
        dayIdx: h.day_of_week ?? ((i + 1) % 7)
      })).sort((a, b) => a.dayIdx - b.dayIdx);
    } else if (realMetrics && realMetrics.length > 0) {
      // FALLBACK: Calculate from real post metrics
      const hourlyStats: Record<string, { engagement: number; count: number }> = {};
      
      realMetrics.forEach(m => {
        const d = new Date(m.published_at || m.collected_at);
        const day = d.getUTCDay();
        const hour = d.getUTCHours();
        const key = `${day}-${hour}`;
        
        if (!hourlyStats[key]) hourlyStats[key] = { engagement: 0, count: 0 };
        hourlyStats[key].engagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
        hourlyStats[key].count++;
      });
      
      bestTimes = Object.entries(hourlyStats).map(([key, val]) => {
        const [day, hour] = key.split("-").map(Number);
        return {
          day: dayNames[day],
          time: `${String(hour).padStart(2, "0")}:00`,
          engagement: Math.round(val.engagement / val.count),
          dayIdx: day
        };
      }).sort((a, b) => (b.engagement - a.engagement)).slice(0, 10);
      
      if (bestTimes.length === 0) {
         // Final fallback if no metrics in range
         bestTimes = dayNames.map((day, i) => ({
           day,
           time: "18:00",
           engagement: 0,
           dayIdx: i
         }));
      }
    } else {
      bestTimes = [];
    }

    const followerData: Array<{
      platform: string;
      username: string | null;
      currentFollowers: number;
      postsCount: number;
      growth: number;
      profileImage: string | null;
      is_connected: boolean;
    }> = [];

    if (socialConnections && (socialConnections as any[]).length > 0) {
      for (const conn of (socialConnections as any[])) {
        const normalized = normalizePlatform(conn.platform);
        
        const accountInfo = socialAccounts.find((a: any) => 
          normalizePlatform(a.platform) === normalized && 
          (a.platform_user_id === conn.platform_user_id || a.platform_user_id === conn.page_id || a.platform_user_id === conn.id)
        ) || socialAccounts.find((a: any) =>
          normalizePlatform(a.platform) === normalized &&
          (a.username === conn.page_name || a.username === conn.username || (a.metadata as any)?.phone_number_id === conn.platform_user_id)
        ) || socialAccounts.find((a: any) => normalizePlatform(a.platform) === normalized);

        const platformAccMetrics = accountMetrics.filter((m: AccountMetric) => m.social_account_id === (accountInfo?.id));
        const earliest = platformAccMetrics.length > 0 ? platformAccMetrics[0]?.followers || 0 : 0;
        const latest = platformAccMetrics.length > 0 ? platformAccMetrics[platformAccMetrics.length - 1]?.followers || 0 : 0;
        const growth = earliest > 0 ? Math.round(((latest - earliest) / earliest) * 100) : 0;

        followerData.push({
          platform: normalized,
          username: conn.page_name || accountInfo?.username || conn.username || null,
          currentFollowers: Number(accountInfo?.followers || accountInfo?.followers_count || conn.followers_count || 0),
          postsCount: Number(accountInfo?.posts_count || accountInfo?.metadata?.posts_count || (conn.metadata as any)?.posts_count || 0),
          growth,
          profileImage: accountInfo?.profile_picture || conn.profile_image_url || null,
          is_connected: conn.is_connected !== false,
        });
      }
    }

    for (const acc of (socialAccounts as any[])) {
      const normalized = normalizePlatform(acc.platform);
      const alreadyIncluded = followerData.some(f =>
        f.platform === normalized &&
        (f.username === acc.username || Math.abs((f.currentFollowers || 0) - (acc.followers_count || 0)) < 10)
      );
      if (!alreadyIncluded) {
        const platformAccMetrics = accountMetrics.filter((m: AccountMetric) => m.social_account_id === acc.id);
        const earliest = platformAccMetrics.length > 0 ? platformAccMetrics[0]?.followers || 0 : 0;
        const latest = platformAccMetrics.length > 0 ? platformAccMetrics[platformAccMetrics.length - 1]?.followers || 0 : 0;
        const growth = earliest > 0 ? Math.round(((latest - earliest) / earliest) * 100) : 0;

        followerData.push({
          platform: normalized,
          username: acc.username || null,
          currentFollowers: Number(acc.followers || acc.followers_count || 0),
          postsCount: Number(acc.posts_count || acc.metadata?.posts_count || 0),
          growth,
          profileImage: acc.profile_picture || null,
          is_connected: true, // Fallback for accounts found only in social_accounts
        });
      }
    }

    // Post-processing: enrich Telegram entries with totalMembers from messaging_channels
    for (const fd of followerData) {
      if (fd.platform === 'telegram' || fd.platform === 'whatsapp') {
        const channelTotal = messagingChannels
          .filter((ch: any) => ch.platform === fd.platform || !ch.platform)
          .reduce((sum: number, ch: any) => sum + (Number(ch.members_count) || 0), 0);
        if (channelTotal > fd.currentFollowers) {
          fd.currentFollowers = channelTotal;
        }
      }
    }
    // Ensure Telegram appears even if social_connections is missing but social_accounts has entry
    const telegramAccounts = socialAccounts.filter((a: any) => normalizePlatform(a.platform) === 'telegram');
    if (telegramAccounts.length > 0 && !followerData.some(f => f.platform === 'telegram')) {
      const telegramChannelTotal = messagingChannels
        .filter((ch: any) => ch.platform === 'telegram')
        .reduce((sum: number, ch: any) => sum + (Number(ch.members_count) || 0), 0);
      const tgAcc = telegramAccounts[0];
      const tgMetrics = accountMetrics.filter((m: AccountMetric) => m.social_account_id === tgAcc.id);
      const earliest = tgMetrics.length > 0 ? tgMetrics[0]?.followers || 0 : 0;
      const latest = tgMetrics.length > 0 ? tgMetrics[tgMetrics.length - 1]?.followers || 0 : 0;
      const growth = earliest > 0 ? Math.round(((latest - earliest) / earliest) * 100) : 0;
      followerData.push({
        platform: 'telegram',
        username: tgAcc.username || null,
        currentFollowers: telegramChannelTotal || tgAcc.followers || 0,
        postsCount: tgAcc.posts_count || 0,
        growth,
        profileImage: tgAcc.profile_picture || null,
        is_connected: true,
      });
    }

    const messagesRaw = (messagesData as any[]) || [];
    let totalSentM = messagesRaw.filter(m => m.status === 'sent').length;
    let totalFailedM = messagesRaw.filter(m => m.status === 'failed').length;

    const messagePlatformStats: Record<string, { sent: number, failed: number }> = {};
    
    // Add raw messages
    messagesRaw.forEach(m => {
      const p = normalizePlatform(m.platform || 'unknown');
      if (!messagePlatformStats[p]) messagePlatformStats[p] = { sent: 0, failed: 0 };
      if (m.status === 'sent') messagePlatformStats[p].sent++;
      if (m.status === 'failed') messagePlatformStats[p].failed++;
    });

    // Add scheduled posts to message stats
    filteredPosts.forEach((post: any) => {
      if (post.status === 'published' || post.status === 'failed') {
        const platforms = post.platforms || [];
        
        if (post.status === 'published') totalSentM++;
        if (post.status === 'failed') totalFailedM++;
        
        platforms.forEach((p: string) => {
          const normP = normalizePlatform(p);
          if (!messagePlatformStats[normP]) messagePlatformStats[normP] = { sent: 0, failed: 0 };
          if (post.status === 'published') messagePlatformStats[normP].sent++;
          if (post.status === 'failed') messagePlatformStats[normP].failed++;
        });
      }
    });

    const successRateM = (totalSentM + totalFailedM) > 0 
      ? Math.round((totalSentM / (totalSentM + totalFailedM)) * 100) 
      : 0;


    const lastSyncedAt = socialAccountsData && (socialAccountsData as any[]).length > 0 
      ? (socialAccountsData as any[]).reduce((max, acc) => {
          const syncDate = acc.last_synced_at || acc.updated_at;
          return syncDate && (!max || syncDate > max) ? syncDate : max;
        }, null as string | null)
      : null;

    const analytics = {
      overview: {
        totalPosts, publishedPosts, scheduledPosts, failedPosts, draftPosts,
        publishRate: totalPosts > 0 ? ((publishedPosts / totalPosts) * 100).toFixed(1) : 0,
        totalFollowers: followerData.reduce((acc, curr) => acc + curr.currentFollowers, 0),
        lastSyncedAt,
        followersGrowth: (() => {
          const totalNow = followerData.reduce((acc, curr) => acc + curr.currentFollowers, 0);
          let totalThen = 0;
          
          followerData.forEach(f => {
            const account = socialAccounts.find(a => normalizePlatform(a.platform) === f.platform);
            if (account) {
              const pMetrics = accountMetrics.filter(m => m.social_account_id === account.id);
              // Enhanced: Use the first available metric in the window. 
              totalThen += pMetrics.length > 0 ? (pMetrics[0].followers || 0) : f.currentFollowers;
            } else {
              totalThen += f.currentFollowers;
            }
          });
          
          if (totalThen === 0) return totalNow > 0 ? "100.0" : "0";
          const growth = ((totalNow - totalThen) / totalThen) * 100;
          return growth.toFixed(1);
        })()
      },
      engagement: { ...engagement, growth: growthValue },
      chartData,
      platformBreakdown,
      topContent: topContent.map(c => ({
        ...c,
        metrics: realMetricsData?.filter((m: any) => m.external_id === c.id || m.post_id === c.id)
      })),
      bestTimes,
      followerData: followerData.map(f => {
        const acc = socialAccountsData?.find((a: any) => normalizePlatform(a.platform) === f.platform);
        return { ...f, last_synced_at: acc?.last_synced_at || acc?.updated_at };
      }),
      adsStats,
      youtubeStats,
      gaStats,
      viralData: viralData || [],
      trendsData: trends || [],
      attacksData: attacksData || [],
      messageStats: {
        totalSent: totalSentM,
        totalFailed: totalFailedM,
        successRate: successRateM,
        platformStats: messagePlatformStats,
        recentMessages: messagesRaw.slice(0, 15).map((m: any) => ({
          id: m.id,
          platform: m.platform,
          content: m.content,
          recipient: m.recipient_name || m.recipient_phone,
          status: m.status,
          created_at: m.created_at
        }))
      },
      messagingChannels,
      period: requestedPeriod || "30d",
      generatedAt: new Date().toISOString(),
      dataSource: "real",
    };

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in get-analytics:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
