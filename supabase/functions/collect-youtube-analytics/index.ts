import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheProfileImage } from "_shared/media.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function getCredentials(supabase: any, userId: string, platform: string): Promise<Record<string, any>> {
  try {
    const { data } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", platform)
      .maybeSingle();
    return data?.credentials || {};
  } catch {
    return {};
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = user.id;
    const creds = await getCredentials(supabase, userId, "google_cloud");
    const ytApiKey = creds?.youtube_api_key || creds?.apiKey;

    // Try to get OAuth token from YouTube connection
    const { data: ytConnection } = await supabase
      .from("social_connections")
      .select("access_token, platform_user_id")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .eq("is_connected", true)
      .maybeSingle();

    const ytAccessToken = ytConnection?.access_token;

    if (!ytAccessToken && !ytApiKey) {
      return new Response(JSON.stringify({ 
        success: true, 
        synced: 0, 
        reason: "YouTube OAuth connection or API key not configured" 
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const results: any[] = [];
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalSubscribersGained = 0;

    // Step 1: Get channel ID
    let channelId = ytConnection?.platform_user_id;
    if (!channelId && ytAccessToken) {
      const channelsRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
        { headers: { Authorization: `Bearer ${ytAccessToken}` } }
      );
      const channelsData = await channelsRes.json();
      if (channelsData.items?.[0]) {
        channelId = channelsData.items[0].id;
      }
    }

    if (!channelId) {
      return new Response(JSON.stringify({ 
        success: true, 
        synced: 0, 
        reason: "Could not determine YouTube channel ID" 
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 2: Get channel statistics
    if (ytAccessToken) {
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,brandingSettings&id=${channelId}`,
        { headers: { Authorization: `Bearer ${ytAccessToken}` } }
      );
      const statsData = await statsRes.json();
      const ch = statsData.items?.[0];
      if (ch) {
        const stats = ch.statistics || {};
        const snippet = ch.snippet || {};
        const branding = ch.brandingSettings?.image || {};

        const [cachedAvatar, cachedCover] = await Promise.all([
          cacheProfileImage(supabase, userId, "youtube", snippet.thumbnails?.high?.url, channelId),
          cacheProfileImage(supabase, userId, "youtube", branding.bannerExternalUrl, `${channelId}_cover`)
        ]);

        // Update social_accounts with latest data
        await supabase.from("social_accounts").upsert({
          user_id: userId,
          platform: "youtube",
          platform_user_id: channelId,
          username: snippet.customUrl || snippet.title || "",
          page_name: snippet.title || "",
          profile_picture: cachedAvatar || snippet.thumbnails?.high?.url || "",
          cover_photo: cachedCover || branding.bannerExternalUrl || "",
          followers_count: parseInt(stats.subscriberCount || "0"),
          subscribers_count: parseInt(stats.subscriberCount || "0"),
          posts_count: parseInt(stats.videoCount || "0"),
          views: parseInt(stats.viewCount || "0"),
          metadata: { posts_count: parseInt(stats.videoCount || "0") },
          is_connected: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,platform,platform_user_id" });

        results.push({
          type: "channel_stats",
          channel_id: channelId,
          title: snippet.title,
          subscribers: parseInt(stats.subscriberCount || "0"),
          videos: parseInt(stats.videoCount || "0"),
          views: parseInt(stats.viewCount || "0"),
          cover_photo: branding.bannerExternalUrl || ""
        });
      }
    }

    // Step 3: Get recent videos with detailed stats
    if (ytAccessToken) {
      const now = new Date();
      const fiveYearsAgo = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
      // YouTube API expects RFC 3339 formatted date-time values (e.g. 1970-01-01T00:00:00Z)
      const publishedAfter = fiveYearsAgo.toISOString().split('.')[0] + "Z";

      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&order=date&maxResults=50&publishedAfter=${publishedAfter}`,
        { headers: { Authorization: `Bearer ${ytAccessToken}` } }
      );
      const searchData = await searchRes.json();

      if (searchData.items?.length > 0) {
        const videoIds = searchData.items.map((v: any) => v.id.videoId).join(",");
        const videosRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}`,
          { headers: { Authorization: `Bearer ${ytAccessToken}` } }
        );
        const videosData = await videosRes.json();

        for (const video of (videosData.items || [])) {
          const vStats = video.statistics || {};
          const vSnippet = video.snippet || {};
          const vDetails = video.contentDetails || {};

          const views = parseInt(vStats.viewCount || "0");
          const likes = parseInt(vStats.likeCount || "0");
          const comments = parseInt(vStats.commentCount || "0");
          const watchTimeMinutes = Math.round((parseInt(vStats.viewCount || "0") * 3) / 60); // estimate ~3min avg

          totalViews += views;
          totalLikes += likes;
          totalComments += comments;

          await supabase.from("youtube_analytics").insert({
            user_id: userId,
            video_id: video.id,
            channel_id: channelId,
            views,
            watch_time_minutes: watchTimeMinutes,
            likes,
            comments,
            subscribers_gained: 0,
            date: vSnippet.publishedAt ? new Date(vSnippet.publishedAt).toISOString().split("T")[0] : null,
            metadata: {
              title: vSnippet.title,
              description: vSnippet.description?.substring(0, 200),
              thumbnail: vSnippet.thumbnails?.high?.url,
              duration: vDetails.duration,
              published_at: vSnippet.publishedAt,
              tags: vSnippet.tags || []
            },
            created_at: new Date().toISOString()
          });

          results.push({
            type: "video",
            video_id: video.id,
            title: vSnippet.title,
            views,
            likes,
            comments,
            published_at: vSnippet.publishedAt
          });
        }
      }
    }

    // Step 4: If only API key (no OAuth), get public channel data
    if (ytApiKey && !ytAccessToken) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${ytApiKey}`
      );
      const data = await res.json();
      const ch = data.items?.[0];
      if (ch) {
        const stats = ch.statistics || {};
        const snippet = ch.snippet || {};
        const branding = ch.brandingSettings?.image || {};

        const [cachedAvatar, cachedCover] = await Promise.all([
          cacheProfileImage(supabase, userId, "youtube", snippet.thumbnails?.high?.url, channelId),
          cacheProfileImage(supabase, userId, "youtube", branding.bannerExternalUrl, `${channelId}_cover`)
        ]);

        await supabase.from("social_accounts").upsert({
          user_id: userId,
          platform: "youtube",
          platform_user_id: channelId,
          username: snippet.customUrl || snippet.title || "",
          page_name: snippet.title || "",
          profile_picture: cachedAvatar || snippet.thumbnails?.high?.url || "",
          cover_photo: cachedCover || branding.bannerExternalUrl || "",
          followers_count: parseInt(stats.subscriberCount || "0"),
          subscribers_count: parseInt(stats.subscriberCount || "0"),
          posts_count: parseInt(stats.videoCount || "0"),
          views: parseInt(stats.viewCount || "0"),
          metadata: { posts_count: parseInt(stats.videoCount || "0") },
          is_connected: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,platform,platform_user_id" });

        results.push({
          type: "channel_stats",
          channel_id: channelId,
          title: snippet.title,
          subscribers: parseInt(stats.subscriberCount || "0"),
          videos: parseInt(stats.videoCount || "0"),
          views: parseInt(stats.viewCount || "0"),
          cover_photo: branding.bannerExternalUrl || "",
          note: "Limited data - OAuth needed for video-level analytics"
        });
      }
    }

    // Get aggregated stats
    const { data: aggregatedData } = await supabase
      .from("youtube_analytics")
      .select("views, likes, comments, subscribers_gained")
      .eq("user_id", userId)
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(100);

    const aggregated = {
      total_views: totalViews,
      total_likes: totalLikes,
      total_comments: totalComments,
      total_subscribers_gained: totalSubscribersGained
    };

    if (aggregatedData?.length > 0) {
      aggregated.total_views = aggregatedData.reduce((s: number, r: any) => s + (r.views || 0), 0);
      aggregated.total_likes = aggregatedData.reduce((s: number, r: any) => s + (r.likes || 0), 0);
      aggregated.total_comments = aggregatedData.reduce((s: number, r: any) => s + (r.comments || 0), 0);
      aggregated.total_subscribers_gained = aggregatedData.reduce((s: number, r: any) => s + (r.subscribers_gained || 0), 0);
    }

    return new Response(JSON.stringify({
      success: true,
      channel_id: channelId,
      synced: results.length,
      results,
      aggregated
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
