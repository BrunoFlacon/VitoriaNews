import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
});


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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || req.headers.get("X-Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const userId = user.id;
    const creds = await getCredentials(supabase, userId, "google_cloud");
    const analyticsId = creds?.analytics_id || creds?.ga4_property_id || creds?.analyticsId;

    if (!analyticsId) {
      return new Response(JSON.stringify({ status: "skipped", message: "Google Analytics Property ID not configured" }), {
        status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const propertyId = analyticsId.replace("properties/", "");
    const results: any[] = [];

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
          status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ status: "skipped", message: "Google OAuth connection missing" }), {
        status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Capture historical data since creation (or as far back as GA4 allows, usually 2 years)
    const metricSets = [
      { name: "overview", metrics: ["activeUsers", "sessions", "screenPageViews"], dimensions: ["date"] }
    ];

    const now = new Date();
    const startDate = "2020-01-01"; // Fetch from a safe "creation" point
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];

    for (const metricSet of metricSets) {
      const requestBody = {
        dateRanges: [{ startDate, endDate: yesterday }],
        metrics: metricSet.metrics.map(m => ({ name: m })),
        dimensions: metricSet.dimensions.map(d => ({ name: d })),
        limit: 100000 // High limit for historical data
      };

      try {
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

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[GA Collect] API error for ${metricSet.name}: ${res.status} ${errText}`);
          results.push({ name: metricSet.name, status: "error", error: errText });
          continue;
        }

        const data = await res.json();
        const rows = data.rows || [];
        const insertData = [];

        for (const row of rows) {
          const dateStr = row.dimensionValues[0].value;
          const formattedDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
          
          for (let i = 0; i < metricSet.metrics.length; i++) {
            insertData.push({
              user_id: userId,
              property_id: propertyId,
              metric_name: metricSet.metrics[i],
              metric_value: parseFloat(row.metricValues[i].value),
              dimension: "date",
              dimension_value: formattedDate,
              date: formattedDate,
              created_at: new Date().toISOString()
            });
          }
        }

        if (insertData.length > 0) {
          // Use UPSERT to avoid duplicates
          const { error } = await supabase.from("google_analytics_data").upsert(insertData, {
             onConflict: "user_id,property_id,metric_name,date"
          });
          if (error) console.error("[GA Collect] Upsert error:", error);
        }

        results.push({ name: metricSet.name, status: "synced", count: insertData.length });
      } catch (fetchErr: any) {
        console.warn(`[GA Collect] Fetch failed for ${metricSet.name}:`, fetchErr?.message);
        results.push({ name: metricSet.name, status: "error", error: fetchErr?.message || "fetch failed" });
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
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[GA Collect] Fatal error:", error);
    return new Response(JSON.stringify({ status: "skipped", message: error?.message || "Unknown error" }), {
      status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });
  }
});

