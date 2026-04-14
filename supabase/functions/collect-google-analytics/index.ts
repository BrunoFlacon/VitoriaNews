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
    const creds = await getCredentials(supabase, userId, "google_cloud");
    const analyticsId = creds?.analytics_id || creds?.analyticsId || creds?.ga4_property_id;
    const siteUrl = creds?.site_url || creds?.search_console_id;

    if (!analyticsId) {
      return new Response(JSON.stringify({ error: "Google Analytics Property ID not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Normalize property ID
    const propertyId = analyticsId.replace("properties/", "");
    const results: any[] = [];

    // GA4 requires OAuth2 service account token
    // For now, we'll use a simpler approach with the API key if available
    // In production, you'd need to set up a service account and exchange for access token

    // Define common metrics to fetch
    const metricSets = [
      {
        name: "overview",
        metrics: ["activeUsers", "sessions", "screenPageViews", "userEngagementDuration", "bounceRate"],
        dimensions: ["date"]
      },
      {
        name: "traffic_sources",
        metrics: ["activeUsers", "sessions", "screenPageViews"],
        dimensions: ["sessionDefaultChannelGrouping", "date"]
      },
      {
        name: "top_pages",
        metrics: ["screenPageViews", "activeUsers", "averageSessionDuration"],
        dimensions: ["pagePath", "pageTitle"]
      },
      {
        name: "geography",
        metrics: ["activeUsers", "sessions"],
        dimensions: ["country", "city"]
      },
      {
        name: "devices",
        metrics: ["activeUsers", "sessions"],
        dimensions: ["deviceCategory", "browser"]
      }
    ];

    // Try to get access token from service account or use existing OAuth token
    const { data: gaToken } = await supabase
      .from("social_connections")
      .select("access_token")
      .eq("user_id", userId)
      .eq("platform", "google")
      .eq("is_connected", true)
      .maybeSingle();

    const gaAccessToken = gaToken?.access_token;

    if (!gaAccessToken) {
      // Try with API key approach for limited data
      const apiKey = creds?.api_key || creds?.maps_api_key;
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: "No Google OAuth connection or API key found. Please connect Google account or add API key.",
          hint: "Connect via OAuth in Settings > Google, or add an API key in Google Cloud credentials"
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // With API key only, we can't access GA4 data directly
      // Return placeholder indicating OAuth is needed
      return new Response(JSON.stringify({
        success: false,
        message: "GA4 API requires OAuth2 authentication. Please connect your Google account via OAuth in Settings.",
        property_id: propertyId,
        hint: "Go to Settings > APIs > Google > Connect with OAuth"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch data from GA4 Reporting API
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const metricSet of metricSets) {
      try {
        const requestBody = {
          dateRanges: [{ startDate: thirtyDaysAgo.toISOString().split("T")[0], endDate: yesterday.toISOString().split("T")[0] }],
          metrics: metricSet.metrics.map(m => ({ name: m })),
          dimensions: metricSet.dimensions.map(d => ({ name: d })),
          limit: 100,
          orderBys: [{ metric: { metricName: metricSet.metrics[0] }, desc: true }]
        };

        const res = await fetch(
          `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${gaAccessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          }
        );

        const data = await res.json();

        if (data.error) {
          results.push({ name: metricSet.name, status: "error", error: data.error.message });
          continue;
        }

        const rows = data.rows || [];
        let totalUsers = 0;
        let totalSessions = 0;
        let totalPageViews = 0;

        for (const row of rows) {
          const dimensionValues = row.dimensionValues?.map((d: any) => d.value) || [];
          const metricValues = row.metricValues?.map((m: any) => parseFloat(m.value || "0")) || [];

          // Save each row
          for (let i = 0; i < metricSet.metrics.length; i++) {
            await supabase.from("google_analytics_data").insert({
              user_id: userId,
              property_id: propertyId,
              metric_name: metricSet.metrics[i],
              metric_value: metricValues[i] || 0,
              dimension: metricSet.dimensions.join(","),
              dimension_value: dimensionValues.join(" | "),
              date: dimensionValues[0] ? new Date(dimensionValues[0]).toISOString().split("T")[0] : null,
              metadata: { metric_set: metricSet.name, dimensions: dimensionValues },
              created_at: new Date().toISOString()
            });
          }

          totalUsers += metricValues[0] || 0;
          totalSessions += metricValues[1] || 0;
          totalPageViews += metricValues[2] || 0;
        }

        results.push({
          name: metricSet.name,
          status: "synced",
          rows: rows.length,
          total_users: totalUsers,
          total_sessions: totalSessions,
          total_page_views: totalPageViews
        });
      } catch (err: any) {
        results.push({ name: metricSet.name, status: "error", error: err.message });
      }
    }

    // Get aggregated stats
    const { data: aggregatedData } = await supabase
      .from("google_analytics_data")
      .select("metric_name, metric_value")
      .eq("user_id", userId)
      .eq("property_id", propertyId)
      .in("metric_name", ["activeUsers", "sessions", "screenPageViews"])
      .order("created_at", { ascending: false })
      .limit(100);

    const aggregated = {
      active_users: 0,
      sessions: 0,
      page_views: 0
    };

    if (aggregatedData) {
      for (const row of aggregatedData) {
        if (row.metric_name === "activeUsers") aggregated.active_users += parseFloat(row.metric_value || "0");
        if (row.metric_name === "sessions") aggregated.sessions += parseFloat(row.metric_value || "0");
        if (row.metric_name === "screenPageViews") aggregated.page_views += parseFloat(row.metric_value || "0");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      property_id: propertyId,
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
