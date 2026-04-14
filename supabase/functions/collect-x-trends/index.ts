import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const twitterCreds = await getCredentials(supabase, userId, "twitter");
    const bearerToken = twitterCreds?.bearer_token || twitterCreds?.bearerToken || twitterCreds?.access_token;

    if (!bearerToken) {
      return new Response(JSON.stringify({ error: "Twitter/X Bearer Token not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const results: any[] = [];

    // Trending topics for Brazil (WOEID 23424768)
    const trendingQueries = [
      "#Brasil", "#Política", "#Economia", "#Tecnologia", "#Esportes",
      "#Entretenimento", "#Saúde", "#Educação", "#Cultura", "#Ciência"
    ];

    // Search recent tweets for each trending query
    for (const query of trendingQueries) {
      try {
        const searchUrl = `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=public_metrics,created_at,author_id&expansions=author_id&user.fields=username,name,profile_image_url,public_metrics`;
        
        const res = await fetch(searchUrl, {
          headers: { "Authorization": `Bearer ${bearerToken}` }
        });
        const data = await res.json();

        if (data.errors) {
          results.push({ query, status: "error", error: data.errors[0]?.message || "API error" });
          continue;
        }

        const tweets = data.data || [];
        const users = data.includes?.users || [];

        const tweetData = tweets.map((t: any) => {
          const author = users.find((u: any) => u.id === t.author_id);
          return {
            id: t.id,
            text: t.text,
            created_at: t.created_at,
            author: author ? { username: author.username, name: author.name, profile_image_url: author.profile_image_url } : null,
            metrics: t.public_metrics || {}
          };
        });

        results.push({
          query,
          status: "synced",
          tweet_count: tweets.length,
          tweets: tweetData
        });

        // Save to political_trends table
        for (const tweet of tweetData) {
          await supabase.from("political_trends").insert({
            user_id: userId,
            trend_query: query,
            content: tweet.text,
            source: "x_twitter",
            metrics: tweet.metrics,
            author_info: tweet.author,
            detected_at: tweet.created_at || new Date().toISOString(),
            metadata: { platform: "x", type: "tweet" }
          });
        }
      } catch (err: any) {
        results.push({ query, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      synced: results.length,
      results,
      total_tweets: results.reduce((s: number, r: any) => s + (r.tweet_count || 0), 0)
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
