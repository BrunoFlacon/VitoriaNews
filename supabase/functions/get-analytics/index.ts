// deno-lint-ignore-file
// @ts-ignore

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-authorization, x-client-timestamp",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function normalizePlatform(platform: string): string {
  const value = platform.toLowerCase().trim();
  if (value === "x" || value === "twitter" || value === "x (twitter)") {
    return "twitter";
  }
  return value;
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Configuração do servidor incompleta");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get("Authorization") || req.headers.get("X-Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    
    const { data, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !data?.user) throw new Error("Unauthorized");
    const userId = data.user.id;
    const body = await req.json().catch(() => ({}));
    const period = body.period || "30d";
    const platform = body.platform || "all";
    const postType = body.type || "all";
    const source = body.source || "dashboard";
    const startDateParam = body.start_date || null;
    const endDateParam = body.end_date || null;

    console.log(`Buscando analytics para usuário: ${userId}, período: ${period}${startDateParam ? `, start: ${startDateParam}, end: ${endDateParam}` : ''}`);

    const now = endDateParam ? new Date(endDateParam) : new Date();
    let days = 30;
    if (period === "24h") days = 1;
    else if (period === "7d") days = 7;
    else if (period === "90d") days = 90;
    else if (period === "365d") days = 365;
    else if (period === "730d") days = 730;
    else if (period === "1825d") days = 1825;
    else if (period === "all") days = 365 * 10;

    const startDate = startDateParam ? new Date(startDateParam) : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    if (isNaN(startDate.getTime())) {
      console.error(`[get-analytics] Invalid startDate. startDateParam: ${startDateParam}, now: ${now.toISOString()}, days: ${days}`);
      startDate.setTime(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const startISO = startDate.toISOString();
    const startDate10 = startISO.split("T")[0];

    const normPlatform = platform.toLowerCase().trim();
    const normalizePlatform = (p: string) => {
      const v = (p || "").toLowerCase().trim();
      if (v === "x" || v === "twitter" || v === "x (twitter)") return "twitter";
      if (v === "truth social") return "truthsocial";
      if (v === "google news") return "googlenews";
      if (v.includes("whatsapp")) return "whatsapp";
      if (v.includes("telegram")) return "telegram";
      if (v.includes("instagram")) return "instagram";
      if (v.includes("facebook")) return "facebook";
      if (v.includes("youtube")) return "youtube";
      if (v.includes("linkedin")) return "linkedin";
      if (v.includes("tiktok")) return "tiktok";
      return v;
    };

    // Check which services are configured with credentials
    const [credMetaRes, credGcloudRes, credOAuthRes] = await Promise.allSettled([
      supabase.from("api_credentials").select("credentials").eq("user_id", userId).eq("platform", "meta_ads").maybeSingle(),
      supabase.from("api_credentials").select("credentials").eq("user_id", userId).eq("platform", "google_cloud").maybeSingle(),
      supabase.from("social_connections").select("access_token").eq("user_id", userId).in("platform", ["google", "youtube"]).eq("is_connected", true).limit(1),
    ]);
    const metaCreds = credMetaRes.status === "fulfilled" ? credMetaRes.value.data?.credentials || null : null;
    const gcloudCreds = credGcloudRes.status === "fulfilled" ? credGcloudRes.value.data?.credentials || null : null;
    const hasOAuth = credOAuthRes.status === "fulfilled" && credOAuthRes.value.data && credOAuthRes.value.data.length > 0 && credOAuthRes.value.data[0].access_token;

    const metaAdsConfigured = metaCreds?.access_token ? true : false;
    const googleAdsConfigured = gcloudCreds?.ads_id ? true : false;
    const ga4Configured = gcloudCreds?.analytics_id && hasOAuth ? true : false;
    const searchConsoleConfigured = gcloudCreds?.search_console_id && hasOAuth ? true : false;
    const youtubeConfigured = hasOAuth ? true : false;

    const [postsRes, socialRes, accMetRes, postMetRes, msgRes, adsRes, gaRes, ytRes, mChanRes, googleAdsRes] = await Promise.allSettled([
      supabase.from("scheduled_posts").select("id, status, platforms, created_at, content").eq("user_id", userId).gte("created_at", startISO).order("created_at", { ascending: false }).limit(500),
      supabase.from("social_accounts").select("id, platform, page_name, display_name, username, followers, followers_count, subscribers_count, posts_count, profile_picture, last_synced_at, updated_at, platform_user_id, page_id").eq("user_id", userId),
      supabase.from("account_metrics").select("social_account_id, followers, collected_at").eq("user_id", userId).gte("collected_at", startISO).order("collected_at", { ascending: true }).limit(1000),
      supabase.from("post_metrics").select("post_id, external_id, likes, comments, shares, impressions, reach, platform, collected_at").eq("user_id", userId).gte("collected_at", startISO).limit(1000),
      supabase.from("messages").select("platform, status, created_at").eq("user_id", userId).gte("created_at", startISO).limit(2000),
      supabase.from("meta_ads_campaigns").select("impressions,reach,clicks,amount_spent,created_at").eq("user_id", userId).gte("created_at", startISO).limit(200),
      supabase.from("google_analytics_data").select("metric_name,metric_value,date").eq("user_id", userId).gte("date", startDate10).limit(500),
      supabase.from("youtube_analytics").select("views,likes,comments,date,subscribers_gained,watch_time_minutes,estimated_minutes_watched,title,metadata").eq("user_id", userId).gte("date", startDate10).limit(500),
      supabase.from("messaging_channels").select("id, platform, channel_name, page_name, username, channel_id, members_count, profile_picture, updated_at").eq("user_id", userId),
      supabase.from("google_ads_campaigns").select("impressions,clicks,cost_micros,conversions,date").eq("user_id", userId).gte("date", startDate10).limit(200),
    ]);

    const getD = (r: any) => r.status === "fulfilled" ? (r.value.data || []) : [];
    const rawPosts = getD(postsRes);
    const socialAccounts = getD(socialRes);
    const accMetrics = getD(accMetRes);
    const postMetrics = getD(postMetRes);
    const messages = getD(msgRes);
    const ads = getD(adsRes);
    const gaData = getD(gaRes);
    const ytData = getD(ytRes);
    const msgChannels = getD(mChanRes);
    const googleAds = getD(googleAdsRes);

    console.log(`Dados encontrados: Posts: ${rawPosts.length}, Contas: ${socialAccounts.length}, Mensagens: ${messages.length}, Canais: ${msgChannels.length}`);

    const accountMap = new Map();
    const processedExternalIds = new Set();

    for (const acc of socialAccounts) {
      const p = normalizePlatform(acc.platform);
      if (normPlatform !== "all" && p !== normPlatform) continue;
      
      const externalId = acc.platform_user_id || acc.page_id;
      if (externalId) processedExternalIds.add(`${p}_${externalId}`);

      const key = `${p}_${acc.id}`;
      const hist = accMetrics.filter(m => m.social_account_id === acc.id);
      const early = hist.length > 0 ? Number(hist[0].followers || 0) : 0;
      const latest = Number(acc.followers || acc.followers_count || 0);
      accountMap.set(key, {
        id: acc.id, platform: p, username: acc.page_name || acc.display_name || acc.username || "Perfil",
        currentFollowers: latest, postsCount: Number(acc.posts_count || 0),
        growth: early > 0 ? Math.round(((latest - early) / early) * 100) : 0,
        profileImage: acc.profile_picture, is_connected: true, last_synced_at: acc.last_synced_at || acc.updated_at,
      });
    }

    for (const ch of msgChannels) {
      const p = normalizePlatform(ch.platform);
      if (normPlatform !== "all" && p !== normPlatform) continue;
      
      // WhatsApp/Telegram: consolidate channels into a single aggregated entry per platform
      if (p === 'whatsapp' || p === 'telegram') {
        const existingKey = Array.from(accountMap.keys()).find(k => k.startsWith(`${p}_agg_`));
        if (existingKey) {
          const existing = accountMap.get(existingKey);
          existing.currentFollowers += Number(ch.members_count || 0);
          existing.postsCount += 0;
          if (ch.profile_picture && !existing.profileImage) existing.profileImage = ch.profile_picture;
          continue;
        }
        const aggKey = `${p}_agg_${ch.id}`;
        accountMap.set(aggKey, {
          id: ch.id, platform: p, username: p === 'whatsapp' ? 'WhatsApp' : 'Telegram',
          currentFollowers: Number(ch.members_count || 0), postsCount: 0, growth: 0,
          profileImage: ch.profile_picture, is_connected: true, last_synced_at: ch.updated_at,
        });
        continue;
      }

      const externalId = ch.channel_id;
      if (externalId && processedExternalIds.has(`${p}_${externalId}`)) continue; // Skip duplicate

      const key = `${p}_ch_${ch.id}`;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          id: ch.id, platform: p, username: ch.channel_name || ch.page_name || ch.username || "Canal",
          currentFollowers: Number(ch.members_count || 0), postsCount: 0, growth: 0,
          profileImage: ch.profile_picture, is_connected: true, last_synced_at: ch.updated_at,
        });
      }
    }

    const accounts = Array.from(accountMap.values());
    const totalFollowers = accounts.reduce((s, a) => s + (a.currentFollowers || 0), 0);

    const filteredPosts = rawPosts.filter(p => {
      if (postType !== "all" && p.status !== postType) return false;
      if (normPlatform !== "all") return (p.platforms || []).some(pl => normalizePlatform(pl) === normPlatform);
      return true;
    });

    const dashboardPostIds = new Set(rawPosts.map(p => p.id));
    const metrics = postMetrics.filter(m => {
      if (normPlatform !== "all" && normalizePlatform(m.platform) !== normPlatform) return false;
      if (source === "dashboard") {
        return m.post_id && dashboardPostIds.has(m.post_id);
      }
      return true;
    });
    
    let tViews = 0, tLikes = 0, tComms = 0, tShares = 0, tReach = 0, responseTime = 0;
    const platformBreakdown = {};
    const postContentMap = new Map(rawPosts.map(p => [p.id, p.content || '']));
    const metricsByPost = new Map();
    const hourlyEngagement = Array(24).fill(0);
    const dayEngagement = { "Segunda": 0, "Terça": 0, "Quarta": 0, "Quinta": 0, "Sexta": 0, "Sábado": 0, "Domingo": 0 };

    for (const m of metrics) {
      const eng = (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
      tViews += (m.impressions || 0); tLikes += (m.likes || 0); tComms += (m.comments || 0); tShares += (m.shares || 0); tReach += (m.reach || 0);

      const p = normalizePlatform(m.platform);
      if (!platformBreakdown[p]) platformBreakdown[p] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0 };
      platformBreakdown[p].posts++;
      platformBreakdown[p].engagement += eng;
      platformBreakdown[p].views += (m.impressions || 0);
      platformBreakdown[p].likes += (m.likes || 0);
      platformBreakdown[p].comments += (m.comments || 0);
      platformBreakdown[p].shares += (m.shares || 0);

      const d = new Date(m.collected_at);
      hourlyEngagement[d.getHours()] += eng;
      const day = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      const dayKey = day.charAt(0).toUpperCase() + day.slice(1).replace('-feira', '');
      if (dayEngagement[dayKey] !== undefined) dayEngagement[dayKey] += eng;

      const postKey = m.post_id || m.external_id;
      if (postKey) {
        if (!metricsByPost.has(postKey)) {
          metricsByPost.set(postKey, { id: postKey, engagement: eng, views: m.impressions || 0, platforms: [m.platform], publishedAt: m.collected_at, content: postContentMap.get(postKey) || '' });
        } else {
          const ex = metricsByPost.get(postKey);
          ex.engagement += eng; ex.views += (m.impressions || 0);
        }
      }
    }

    // Se for dashboard, vamos injetar os envios de mensagens e posts nas métricas de engajamento para não ficarem zerados
    if (source === "dashboard" || source === "all") {
      messages.forEach(m => {
        const d = new Date(m.created_at);
        const p = normalizePlatform(m.platform);
        
        tReach += 1;
        if (m.status === "sent") tViews += 1;
        
        if (!platformBreakdown[p]) platformBreakdown[p] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0 };
        platformBreakdown[p].posts += 1;
        
        hourlyEngagement[d.getHours()] += 1;
        const day = d.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dayKey = day.charAt(0).toUpperCase() + day.slice(1).replace('-feira', '');
        if (dayEngagement[dayKey] !== undefined) dayEngagement[dayKey] += 1;
      });

      rawPosts.forEach(p => {
         const platformName = (p.platforms && p.platforms.length > 0) ? normalizePlatform(p.platforms[0]) : "whatsapp";
         if (!platformBreakdown[platformName]) platformBreakdown[platformName] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0 };
         platformBreakdown[platformName].posts += 1;
      });
    }

    const gaViews = gaData.reduce((s, g) => s + (g.metric_name === "screenPageViews" ? Number(g.metric_value) : 0), 0);
    const scData = gaData.filter((g: any) => g.metric_name === "search_console");
    const scStats = scData.length > 0 ? scData.reduce((acc: any, g: any) => {
      const m = g.metadata || {};
      return {
        clicks: acc.clicks + (m.clicks || 0),
        impressions: acc.impressions + (m.impressions || 0),
        totalPosition: acc.totalPosition + ((m.position || 0) * (m.impressions || 1)),
        totalWeight: acc.totalWeight + (m.impressions || 1),
      };
    }, { clicks: 0, impressions: 0, totalPosition: 0, totalWeight: 0 }) : null;
    const searchConsoleStats = scStats ? {
      clicks: scStats.clicks,
      impressions: scStats.impressions,
      ctr: scStats.impressions > 0 ? (scStats.clicks / scStats.impressions * 100).toFixed(2) : "0",
      avgPosition: scStats.totalWeight > 0 ? (scStats.totalPosition / scStats.totalWeight).toFixed(1) : "0",
    } : searchConsoleConfigured ? { clicks: 0, impressions: 0, ctr: "0", avgPosition: "0" } : undefined;
    const ytViews = ytData.reduce((s, y) => s + (y.views || 0), 0);
    const ytSubscribersGained = ytData.reduce((s, y) => s + (y.subscribers_gained || 0), 0);
    const ytWatchTimeMinutes = ytData.reduce((s, y) => s + (y.watch_time_minutes || 0), 0);
    const ytAccount = socialAccounts.find((a: any) => a.platform === "youtube");
    const ytSubscribers = ytAccount?.subscribers_count || 0;

    // Só incluir YouTube/GA nos totais e chartData quando o filtro de plataforma for 'all' ou corresponder
    const includeYouTube = normPlatform === "all" || normPlatform === "youtube";
    const includeGA = normPlatform === "all" || normPlatform === "ga" || normPlatform === "googleanalytics";
    if (includeYouTube) tViews += ytViews;
    if (includeGA) tViews += gaViews;

    // Optimize chart data generation by pre-grouping metrics/messages by date
    const metricsByDate = new Map();
    const gaByDate = new Map();
    const ytByDate = new Map();
    const msgByDate = new Map();

    const getDateKey = (dateStr: string, is24h: boolean) => {
      const d = new Date(dateStr);
      if (is24h) {
        d.setMinutes(0, 0, 0);
        return d.getTime();
      }
      d.setHours(0, 0, 0, 0);
      return d.getTime();

    };

    const is24h = period === "24h";

    metrics.forEach(m => {
      const key = getDateKey(m.collected_at, is24h);
      if (!metricsByDate.has(key)) metricsByDate.set(key, []);
      metricsByDate.get(key).push(m);
    });

    gaData.forEach(g => {
      const key = getDateKey(g.date, is24h);
      if (!gaByDate.has(key)) gaByDate.set(key, []);
      gaByDate.get(key).push(g);
    });
    ytData.forEach(y => {
      const key = getDateKey(y.date, is24h);
      if (!ytByDate.has(key)) ytByDate.set(key, []);
      ytByDate.get(key).push(y);
    });

    messages.forEach(m => {
      const key = getDateKey(m.created_at, is24h);
      if (!msgByDate.has(key)) msgByDate.set(key, []);
      msgByDate.get(key).push(m);
    });

    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      if (is24h) {
        targetDate.setHours(targetDate.getHours() - i, 0, 0, 0);
      } else {
        targetDate.setDate(targetDate.getDate() - i);
        targetDate.setHours(0, 0, 0, 0);
      }
      
      const key = targetDate.getTime();
      const dayMetrics = metricsByDate.get(key) || [];
      const dayGa = gaByDate.get(key) || [];
      const dayYt = ytByDate.get(key) || [];
      const dayMsg = (source === "dashboard" || source === "all") ? (msgByDate.get(key) || []) : [];

      const gaViewsDay = includeGA ? dayGa.reduce((s,g)=>s+(g.metric_name === "screenPageViews" ? Number(g.metric_value) : 0), 0) : 0;
      const ytViewsDay = includeYouTube ? dayYt.reduce((s,y)=>s+(y.views||0), 0) : 0;
      const ytEngDay = includeYouTube ? dayYt.reduce((s,y)=>s+(y.likes||0)+(y.comments||0), 0) : 0;
      const ytLikesDay = includeYouTube ? dayYt.reduce((s,y)=>s+(y.likes||0),0) : 0;
      const ytCommentsDay = includeYouTube ? dayYt.reduce((s,y)=>s+(y.comments||0),0) : 0;

      chartData.push({
        name: is24h ? targetDate.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : targetDate.toLocaleDateString("pt-BR",{day:"numeric",month:"short"}),
        views: dayMetrics.reduce((s,m)=>s+(m.impressions||0), 0) + gaViewsDay + ytViewsDay + dayMsg.length,
        engagement: dayMetrics.reduce((s,m)=>s+(m.likes||0)+(m.comments||0)+(m.shares||0), 0) + ytEngDay,
        reach: dayMetrics.reduce((s,m)=>s+(m.reach||0), 0) + dayMsg.length,
        likes: dayMetrics.reduce((s,m)=>s+(m.likes||0),0) + ytLikesDay,
        comments: dayMetrics.reduce((s,m)=>s+(m.comments||0),0) + ytCommentsDay,
        shares: dayMetrics.reduce((s,m)=>s+(m.shares||0),0),
        posts: dayMetrics.length + dayMsg.length,
      });
    }

    const bestTimes = Object.entries(dayEngagement).map(([day, eng]) => {
       const bestHour = hourlyEngagement.indexOf(Math.max(...hourlyEngagement));
       return { day, time: `${bestHour}:00`, engagement: eng };
    }).sort((a,b) => b.engagement - a.engagement).slice(0, 3);

    // Final normalization check for message stats platforms
    const messageStatsByPlatform = { "whatsapp": { sent: 0, failed: 0 }, "telegram": { sent: 0, failed: 0 } };
    messages.forEach(m => {
      const rawP = m.platform || "unknown";
      const p = normalizePlatform(rawP);
      
      // Ensure we only track known platforms for the cards, but keep the raw ones if needed
      if (!messageStatsByPlatform[p]) messageStatsByPlatform[p] = { sent: 0, failed: 0 };
      
      if (m.status === "sent") messageStatsByPlatform[p].sent++;
      else if (m.status === "failed") messageStatsByPlatform[p].failed++;
      
      // Injetar no breakdown geral se não existir
      if (!platformBreakdown[p]) platformBreakdown[p] = { posts: 0, engagement: 0, views: 0, likes: 0, comments: 0, shares: 0 };
    });

    return new Response(
      JSON.stringify({
        overview: {
          totalPosts: filteredPosts.length,
          publishedPosts: filteredPosts.filter(p=>p.status==="published").length,
          scheduledPosts: filteredPosts.filter(p=>p.status==="scheduled").length,
          failedPosts: filteredPosts.filter(p=>p.status==="failed").length,
          draftPosts: filteredPosts.filter(p=>p.status==="draft").length,
          publishRate: filteredPosts.length > 0 ? ((filteredPosts.filter(p=>p.status==="published").length / filteredPosts.length) * 100).toFixed(1) : 0,
          totalFollowers,
          lastSyncedAt: now.toISOString(),
          responseTime: responseTime.toFixed(1) + "m"
        },
        engagement: { views: tViews, likes: tLikes, comments: tComms, shares: tShares, reach: tReach || totalFollowers, engagementRate: tViews > 0 ? ((tLikes+tComms+tShares)/tViews*100).toFixed(2) : "0", growth: "0" },
        chartData,
        platformBreakdown,
        topContent: Array.from(metricsByPost.values()).sort((a,b) => b.engagement - a.engagement).slice(0, 10),
        bestTimes,
        followerData: accounts.filter((a: any) => {
          if ((a.platform === 'whatsapp' || a.platform === 'telegram') && String(a.id).includes('_agg_')) {
            return !accounts.some((o: any) => o.platform === a.platform && !String(o.id).includes('_agg_'));
          }
          return true;
        }),
        adsStats: metaAdsConfigured ? ads.reduce((acc, ad) => ({ impressions: acc.impressions + (ad.impressions || 0), reach: acc.reach + (ad.reach || 0), clicks: acc.clicks + (ad.clicks || 0), spend: acc.spend + (ad.amount_spent || 0) }), { impressions: 0, reach: 0, clicks: 0, spend: 0 }) : null,
        googleAdsStats: googleAdsConfigured ? googleAds.reduce((acc: any, g: any) => ({ impressions: acc.impressions + (g.impressions || 0), clicks: acc.clicks + (g.clicks || 0), cost: acc.cost + ((g.cost_micros || 0) / 1000000), conversions: acc.conversions + (g.conversions || 0) }), { impressions: 0, clicks: 0, cost: 0, conversions: 0 }) : null,
        youtubeStats: youtubeConfigured && includeYouTube ? {
          views: ytViews,
          likes: ytData.reduce((s,y)=>s+(y.likes||0),0),
          comments: ytData.reduce((s,y)=>s+(y.comments||0),0),
          subscribersGained: ytSubscribersGained,
          watchTimeMinutes: ytWatchTimeMinutes,
          subscribers: ytSubscribers,
        } : null,
        gaStats: ga4Configured && includeGA ? { views: gaViews } : null,
        adsConfigured: googleAdsConfigured,
        searchConsoleStats,
        messageStats: { 
          totalSent: messages.filter(m => m.status === "sent").length, 
          totalFailed: messages.filter(m => m.status === "failed").length, 
          successRate: messages.length > 0 ? Math.round(messages.filter(m => m.status === "sent").length / messages.length * 100) : 0,
          platformStats: messageStatsByPlatform 
        },
        period, 
        dataSource: "real",
        generatedAt: now.toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("Erro crítico no Edge Function get-analytics:", err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
