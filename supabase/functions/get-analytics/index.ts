// @ts-ignore
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
  if (value === "x" || value === "twitter" || value === "x (twitter)") {
    return "twitter";
  }
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

    const token = authHeader.replace(/^Bearer\s/i, '');
    console.log(`[get-analytics] Validating token: ${token.substring(0, 10)}...`);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[get-analytics] getUser failed:", authError?.message || "User not found");
      return new Response(JSON.stringify({ 
        error: "Unauthorized", 
        detail: authError?.message || "Invalid or expired session" 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`[get-analytics] User authenticated: ${user.id}`);

    // Parameters extraction from Query (GET) or Body (POST)
    let requestedPeriod = "7d";
    let requestedPlatform = "all";
    let requestedType = "all";

    if (req.method === "POST") {
      try {
        const body = await req.json();
        requestedPeriod = body.period || "7d";
        requestedPlatform = body.platform || "all";
        requestedType = body.type || "all";
      } catch (e) {
        console.warn("[get-analytics] Could not parse JSON body, falling back to query params");
        const url = new URL(req.url);
        requestedPeriod = url.searchParams.get("period") || "7d";
        requestedPlatform = url.searchParams.get("platform") || "all";
        requestedType = url.searchParams.get("type") || "all";
      }
    } else {
      const url = new URL(req.url);
      requestedPeriod = url.searchParams.get("period") || "7d";
      requestedPlatform = url.searchParams.get("platform") || "all";
      requestedType = url.searchParams.get("type") || "all";
    }

    const now = new Date();
    let days = 7;
    let startDate: Date;
    switch (requestedPeriod) {
      case "24h": startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); days = 1; break;
      case "3d": startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); days = 3; break;
      case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); days = 7; break;
      case "15d": startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); days = 15; break;
      case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); days = 30; break;
      case "60d": startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); days = 60; break;
      case "90d": startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); days = 90; break;
      case "120d": startDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); days = 120; break;
      case "365d": startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); days = 365; break;
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
      supabase.from("post_metrics").select("*").eq("user_id", user.id).gte("collected_at", startDate.toISOString()),
      supabase.from("account_metrics").select("*").eq("user_id", user.id).gte("collected_at", startDate.toISOString()).order("collected_at", { ascending: true }),
      supabase.from("social_connections").select("id, platform, username, page_name, followers_count, profile_image_url, is_connected, platform_user_id, page_id").eq("user_id", user.id).eq("is_connected", true),
      supabase.from("social_accounts").select("id, platform, platform_user_id, username, profile_picture, followers, posts_count, views, likes, shares, comments, metadata, is_connected, updated_at").eq("user_id", user.id),
      supabase.from("platform_hourly_performance").select("*").order("avg_likes", { ascending: false }).limit(10),
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

    // Calculate total posts including external counts
    const externalPostsCount = socialAccounts.reduce((sum, acc) => sum + (acc.posts_count || 0), 0);
    const totalPosts = platformPosts.length + externalPostsCount;
    const publishedPosts = platformPosts.filter((p: any) => p.status === "published").length + externalPostsCount;
    const scheduledPosts = platformPosts.filter((p: any) => p.status === "scheduled").length;
    const failedPosts = platformPosts.filter((p: any) => p.status === "failed").length;
    const draftPosts = platformPosts.filter((p: any) => p.status === "draft").length;
    const realMetrics = (realMetricsData as PostMetric[]) || [];
    const filteredMetrics = requestedPlatform === "all"
      ? realMetrics
      : realMetrics.filter(m => normalizePlatform(m.platform) === normalizePlatform(requestedPlatform));

    // AGGREGATE EXTERNAL ANALYTICS
    const adsStats = (adsData || []).reduce((acc: any, current: any) => {
      acc.impressions += Number(current.impressions || 0);
      acc.reach += Number(current.reach || 0);
      acc.clicks += Number(current.clicks || 0);
      acc.spend += Number(current.amount_spent || 0);
      return acc;
    }, { impressions: 0, reach: 0, clicks: 0, spend: 0 });

    const youtubeStats = (ytData || []).reduce((acc: any, current: any) => {
      acc.views += Number(current.views || 0);
      acc.likes += Number(current.likes || 0);
      acc.comments += Number(current.comments || 0);
      return acc;
    }, { views: 0, likes: 0, comments: 0 });

    const gaStats = (gaData || []).reduce((acc: any, current: any) => {
      if (current.metric_name === 'activeUsers' || current.metric_name === 'sessions') {
        acc.views += Number(current.metric_value || 0);
      }
      return acc;
    }, { views: 0 });

    // TOTALS COMPUTATION (Including external data)
    const globalFollowers = socialAccounts.reduce((s: number, a: any) => s + (Number(a.followers || 0)), 0);
    const globalViews = socialAccounts.reduce((s: number, a: any) => s + (a.views || 0), 0) + adsStats.impressions + youtubeStats.views + gaStats.views;
    const globalLikes = socialAccounts.reduce((s: number, a: any) => s + (a.likes || 0), 0) + youtubeStats.likes;
    const globalShares = socialAccounts.reduce((s: number, a: any) => s + (a.shares || 0), 0);

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
    const chartData = [];

    for (let i = days - 1; i >= 0; i--) {
      const bucketStart = new Date(now);
      const bucketEnd = new Date(now);
      if (isHourly) {
        bucketStart.setHours(bucketStart.getHours() - i - 1);
        bucketEnd.setHours(bucketEnd.getHours() - i);
      } else {
        bucketStart.setDate(bucketStart.getDate() - i - 1);
        bucketEnd.setDate(bucketEnd.getDate() - i);
      }

      const label = isHourly
        ? bucketEnd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : bucketEnd.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });

      if (hasRealMetrics) {
        const bucketMetrics = filteredMetrics.filter(m => {
          const d = new Date(m.collected_at);
          return d >= bucketStart && d < bucketEnd;
        });
        chartData.push({
          name: label,
          views: bucketMetrics.reduce((s, m) => s + (m.impressions || 0), 0),
          engagement: bucketMetrics.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0), 0),
          reach: bucketMetrics.reduce((s, m) => s + (m.reach || 0), 0),
        });
      } else if (useAccountFallback) {
        chartData.push({
          name: label,
          views: globalViews,
          engagement: globalLikes + totalComments + globalShares,
          reach: globalFollowers,
        });
      } else {
        chartData.push({ name: label, views: 0, engagement: 0, reach: 0 });
      }
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
        .slice(0, 5)
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
      bestTimes = (hourlyPerf as any[]).slice(0, 7).map((h, i) => ({
        day: dayNames[h.day_of_week ?? ((i + 1) % 7)],
        time: `${String(h.hour || 0).padStart(2, "0")}:00`,
        engagement: Math.round(
          ((h.avg_likes || 0) + (h.avg_comments || 0) + (h.avg_shares || 0)) /
          Math.max((h.avg_impressions || 1), 1) * 100
        ),
        dayIdx: h.day_of_week ?? ((i + 1) % 7)
      })).sort((a, b) => a.dayIdx - b.dayIdx);
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
          currentFollowers: accountInfo?.followers || conn.followers_count || 0,
          postsCount: accountInfo?.posts_count || accountInfo?.metadata?.posts_count || 0,
          growth,
          profileImage: accountInfo?.profile_picture || conn.profile_image_url || null,
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
          currentFollowers: acc.followers || 0,
          postsCount: acc.posts_count || acc.metadata?.posts_count || 0,
          growth,
          profileImage: acc.profile_picture || null,
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


    const analytics = {
      overview: {
        totalPosts, publishedPosts, scheduledPosts, failedPosts, draftPosts,
        publishRate: totalPosts > 0 ? ((publishedPosts / totalPosts) * 100).toFixed(1) : 0,
        totalFollowers: followerData.reduce((acc, curr) => acc + curr.currentFollowers, 0),
        followersGrowth: (() => {
          const totalNow = followerData.reduce((acc, curr) => acc + curr.currentFollowers, 0);
          let totalThen = 0;
          
          followerData.forEach(f => {
            const account = socialAccounts.find(a => normalizePlatform(a.platform) === f.platform);
            if (account) {
              const pMetrics = accountMetrics.filter(m => m.social_account_id === account.id);
              // Enhanced: Use the first available metric in the window. 
              // If none in window, it means it's a new account or data hasn't been collected for 30 days.
              // We default to the current value minus what we think it was (or 0 if totally new).
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
      bestTimes,
      followerData,
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
        recentMessages: messagesRaw.slice(0, 15).map(m => ({
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
