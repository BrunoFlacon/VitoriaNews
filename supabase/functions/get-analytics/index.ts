import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePlatform(platform: string): string {
  const value = platform.toLowerCase().trim();
  if (value === "x" || value === "twitter" || value === "x (twitter)") {
    return "twitter";
  }
  return value;
}

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 0xffffffff;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "7d";
    const platform = url.searchParams.get("platform") || "all";

    const rand = seededRandom(`${user.id}-${period}-${platform}`);

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "24h": startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case "90d": startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch posts
    const { data: posts } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const filteredPosts = (posts || []).filter(post => new Date(post.created_at) >= startDate);
    const platformPosts = platform === "all"
      ? filteredPosts
      : filteredPosts.filter(post => post.platforms?.includes(platform));

    const totalPosts = platformPosts.length;
    const publishedPosts = platformPosts.filter(p => p.status === "published").length;
    const scheduledPosts = platformPosts.filter(p => p.status === "scheduled").length;
    const failedPosts = platformPosts.filter(p => p.status === "failed").length;
    const draftPosts = platformPosts.filter(p => p.status === "draft").length;

    // ========== REAL METRICS from post_metrics ==========
    const { data: realMetrics } = await supabase
      .from("post_metrics")
      .select("*")
      .eq("user_id", user.id)
      .gte("collected_at", startDate.toISOString());

    // Filter by platform if needed
    const filteredMetrics = platform === "all"
      ? (realMetrics || [])
      : (realMetrics || []).filter(m => normalizePlatform(m.platform) === normalizePlatform(platform));

    const hasRealMetrics = filteredMetrics.length > 0;

    // ========== REAL ACCOUNT METRICS ==========
    const { data: accountMetrics } = await supabase
      .from("account_metrics")
      .select("*")
      .eq("user_id", user.id)
      .gte("collected_at", startDate.toISOString())
      .order("collected_at", { ascending: true });

    // Also fetch social_connections for current follower counts
    const { data: socialConnections } = await supabase
      .from("social_connections")
      .select("platform, username, followers_count, profile_image_url, is_connected")
      .eq("user_id", user.id)
      .eq("is_connected", true);

    // ========== COMPUTE ENGAGEMENT ==========
    let engagement;
    let growthValue: string;

    if (hasRealMetrics) {
      const totalViews = filteredMetrics.reduce((s, m) => s + (m.impressions || 0), 0);
      const totalLikes = filteredMetrics.reduce((s, m) => s + (m.likes || 0), 0);
      const totalComments = filteredMetrics.reduce((s, m) => s + (m.comments || 0), 0);
      const totalShares = filteredMetrics.reduce((s, m) => s + (m.shares || 0), 0);
      const totalReach = filteredMetrics.reduce((s, m) => s + (m.reach || 0), 0);

      const engRate = totalViews > 0
        ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2)
        : "0";

      // Growth: compare first half vs second half of period
      const midDate = new Date((startDate.getTime() + now.getTime()) / 2);
      const firstHalf = filteredMetrics.filter(m => new Date(m.collected_at) < midDate);
      const secondHalf = filteredMetrics.filter(m => new Date(m.collected_at) >= midDate);
      const firstEng = firstHalf.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0), 0);
      const secondEng = secondHalf.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0), 0);
      growthValue = firstEng > 0 ? (((secondEng - firstEng) / firstEng) * 100).toFixed(1) : "0";

      engagement = {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        reach: totalReach,
        engagementRate: engRate,
      };
    } else {
      // Fallback: seeded data for new users
      const baseViews = totalPosts * 150 + Math.floor(rand() * 500);
      const baseLikes = Math.floor(baseViews * (0.05 + rand() * 0.1));
      const baseComments = Math.floor(baseLikes * (0.1 + rand() * 0.2));
      const baseShares = Math.floor(baseLikes * (0.05 + rand() * 0.15));
      const baseReach = Math.floor(baseViews * (1.2 + rand() * 0.5));

      engagement = {
        views: baseViews,
        likes: baseLikes,
        comments: baseComments,
        shares: baseShares,
        reach: baseReach,
        engagementRate: baseViews > 0 ? ((baseLikes + baseComments + baseShares) / baseViews * 100).toFixed(2) : "0",
      };
      growthValue = ((rand() - 0.3) * 20).toFixed(1);
    }

    // ========== CHART DATA ==========
    const days = period === "24h" ? 24 : period === "30d" ? 30 : period === "90d" ? 90 : 7;
    const isHourly = period === "24h";
    const chartData = [];

    if (hasRealMetrics) {
      // Group real metrics by time bucket
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

        const bucketMetrics = filteredMetrics.filter(m => {
          const d = new Date(m.collected_at);
          return d >= bucketStart && d < bucketEnd;
        });

        const label = isHourly
          ? bucketEnd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : bucketEnd.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });

        chartData.push({
          name: label,
          views: bucketMetrics.reduce((s, m) => s + (m.impressions || 0), 0),
          engagement: bucketMetrics.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0), 0),
          reach: bucketMetrics.reduce((s, m) => s + (m.reach || 0), 0),
        });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        if (isHourly) date.setHours(date.getHours() - i);
        else date.setDate(date.getDate() - i);

        const label = isHourly
          ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });

        const multiplier = 0.5 + rand();
        chartData.push({
          name: label,
          views: Math.floor((engagement.views / days) * multiplier),
          engagement: Math.floor((engagement.likes + engagement.comments) / days * multiplier),
          reach: Math.floor((engagement.reach / days) * multiplier),
        });
      }
    }

    // ========== PLATFORM BREAKDOWN ==========
    const platformBreakdown: Record<string, { posts: number; engagement: number }> = {};

    if (hasRealMetrics) {
      filteredMetrics.forEach(m => {
        const normalized = normalizePlatform(m.platform);
        if (!platformBreakdown[normalized]) platformBreakdown[normalized] = { posts: 0, engagement: 0 };
        platformBreakdown[normalized].posts++;
        platformBreakdown[normalized].engagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
      });
    } else {
      platformPosts.forEach(post => {
        post.platforms?.forEach((p: string) => {
          const normalized = normalizePlatform(p);
          if (!platformBreakdown[normalized]) platformBreakdown[normalized] = { posts: 0, engagement: 0 };
          platformBreakdown[normalized].posts++;
          platformBreakdown[normalized].engagement += Math.floor(rand() * 500 + 100);
        });
      });
    }

    // ========== TOP CONTENT ==========
    let topContent;
    if (hasRealMetrics) {
      // Aggregate metrics per post
      const postAgg: Record<string, { likes: number; impressions: number; comments: number; shares: number }> = {};
      filteredMetrics.forEach(m => {
        if (!postAgg[m.post_id]) postAgg[m.post_id] = { likes: 0, impressions: 0, comments: 0, shares: 0 };
        postAgg[m.post_id].likes += m.likes || 0;
        postAgg[m.post_id].impressions += m.impressions || 0;
        postAgg[m.post_id].comments += m.comments || 0;
        postAgg[m.post_id].shares += m.shares || 0;
      });

      const sortedPostIds = Object.entries(postAgg)
        .sort((a, b) => (b[1].likes + b[1].comments + b[1].shares) - (a[1].likes + a[1].comments + a[1].shares))
        .slice(0, 5)
        .map(e => e[0]);

      topContent = sortedPostIds.map(postId => {
        const post = (posts || []).find(p => p.id === postId);
        const agg = postAgg[postId];
        return {
          id: postId,
          content: post ? post.content.substring(0, 100) : "Post removido",
          platforms: post?.platforms || [],
          engagement: agg.likes + agg.comments + agg.shares,
          views: agg.impressions,
          publishedAt: post?.published_at || null,
        };
      });
    } else {
      topContent = platformPosts
        .filter(p => p.status === "published")
        .slice(0, 5)
        .map(post => ({
          id: post.id,
          content: post.content.substring(0, 100),
          platforms: post.platforms,
          engagement: Math.floor(rand() * 1000 + 200),
          views: Math.floor(rand() * 5000 + 500),
          publishedAt: post.published_at,
        }));
    }

    // ========== BEST TIMES from platform_hourly_performance ==========
    const { data: hourlyPerf } = await supabase
      .from("platform_hourly_performance")
      .select("*")
      .order("avg_likes", { ascending: false })
      .limit(10);

    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    let bestTimes;
    if (hourlyPerf && hourlyPerf.length > 0) {
      bestTimes = hourlyPerf.slice(0, 5).map((h, i) => ({
        day: dayNames[(i + 1) % 7],
        time: `${String(h.hour || 0).padStart(2, "0")}:00`,
        engagement: Math.round(
          ((h.avg_likes || 0) + (h.avg_comments || 0) + (h.avg_shares || 0)) /
          Math.max((h.avg_impressions || 1), 1) * 100
        ),
      }));
    } else {
      bestTimes = [
        { day: "Terça", time: "11:00", engagement: 85 },
        { day: "Quarta", time: "09:00", engagement: 82 },
        { day: "Quinta", time: "14:00", engagement: 78 },
        { day: "Sexta", time: "10:00", engagement: 75 },
        { day: "Segunda", time: "12:00", engagement: 72 },
      ];
    }

    // ========== FOLLOWER DATA ==========
    const followerData: Array<{
      platform: string;
      username: string | null;
      currentFollowers: number;
      growth: number;
      profileImage: string | null;
    }> = [];

    if (socialConnections && socialConnections.length > 0) {
      for (const conn of socialConnections) {
        const normalized = normalizePlatform(conn.platform);
        // Find matching account_metrics for growth calculation
        const connMetrics = (accountMetrics || []).filter(m => {
          // Match by social_account_id or by platform
          return true; // we'll use all metrics and match by platform below
        });

        // Get earliest and latest follower counts from account_metrics for this platform
        const platformAccMetrics = (accountMetrics || []).filter(m => m.social_account_id !== null);
        const earliest = platformAccMetrics.length > 0 ? platformAccMetrics[0]?.followers || 0 : 0;
        const latest = platformAccMetrics.length > 0 ? platformAccMetrics[platformAccMetrics.length - 1]?.followers || 0 : 0;
        const growth = earliest > 0 ? Math.round(((latest - earliest) / earliest) * 100) : 0;

        followerData.push({
          platform: normalized,
          username: conn.username,
          currentFollowers: conn.followers_count || 0,
          growth,
          profileImage: conn.profile_image_url,
        });
      }
    }

    const analytics = {
      overview: {
        totalPosts, publishedPosts, scheduledPosts, failedPosts, draftPosts,
        publishRate: totalPosts > 0 ? ((publishedPosts / totalPosts) * 100).toFixed(1) : 0,
      },
      engagement: { ...engagement, growth: growthValue },
      chartData,
      platformBreakdown,
      topContent,
      bestTimes,
      followerData,
      period,
      generatedAt: new Date().toISOString(),
      dataSource: hasRealMetrics ? "real" : "seeded",
    };

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-analytics:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
