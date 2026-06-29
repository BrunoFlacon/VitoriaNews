import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";
import { fetchWithTimeout } from "../_shared/fetchWithTimeout.ts";

const corsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
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

    const authHeader = req.headers.get("Authorization");
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
    const searchConsoleId = creds?.search_console_id || creds?.searchConsoleId;

    if (!searchConsoleId) {
      return new Response(JSON.stringify({ error: "Search Console site URL not configured" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const siteUrl = searchConsoleId.startsWith("sc-domain:") ? searchConsoleId : `https://${searchConsoleId}/`;

    let accessToken: string | null = null;
    for (const p of ["google", "youtube"]) {
      const { data: tok } = await supabase
        .from("social_connections")
        .select("access_token, refresh_token, token_expires_at")
        .eq("user_id", userId)
        .eq("platform", p)
        .eq("is_connected", true)
        .maybeSingle();
      if (tok?.access_token) {
        const expired = tok.token_expires_at && new Date(tok.token_expires_at) < new Date();
        if (!expired) {
          accessToken = tok.access_token;
          break;
        }
        if (tok.refresh_token) {
          try {
            const refreshRes = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: creds?.client_id || Deno.env.get("GOOGLE_CLIENT_ID") || "",
                client_secret: creds?.client_secret || Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
                refresh_token: tok.refresh_token,
                grant_type: "refresh_token",
              }),
            });
            const refreshData = await refreshRes.json();
            if (refreshData.access_token) {
              accessToken = refreshData.access_token;
              await supabase.from("social_connections").update({
                access_token: refreshData.access_token,
                token_expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              }).eq("user_id", userId).eq("platform", p);
              break;
            }
          } catch (_e) { /* refresh failed */ }
        }
      }
    }

    if (!accessToken) {
      return new Response(JSON.stringify({
        error: "Google OAuth access token não encontrado ou expirado sem refresh. Reconecte sua conta Google em Redes Sociais.",
        hint: "Connect via OAuth in Settings > Google"
      }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Sync incremental: buscar apenas desde a última data coletada
    const { data: lastScData } = await supabase
      .from("google_analytics_data")
      .select("date")
      .eq("user_id", userId)
      .eq("property_id", siteUrl)
      .eq("metric_name", "search_console")
      .order("date", { ascending: false })
      .limit(1);
    const lastScDate = lastScData?.length > 0 ? new Date(lastScData[0].date) : null;
    const thirtyDaysAgo = lastScDate
      ? new Date(Math.max(lastScDate.getTime(), now.getTime() - 30 * 24 * 60 * 60 * 1000))
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const results: any[] = [];
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalPosition = 0;
    let totalPositionWeight = 0;

    const overallBody = {
      startDate: thirtyDaysAgo.toISOString().split("T")[0],
      endDate: yesterday.toISOString().split("T")[0],
      dimensions: ["date"],
      rowLimit: 100,
      startRow: 0
    };

    try {
      const res = await fetchWithTimeout(
        `https://searchconsole.googleapis.com/v1/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(overallBody)
        }
      );
      const data = await res.json();

      if (data.error) {
        results.push({ type: "overall", status: "error", error: data.error.message });
      } else {
        const rows = data.rows || [];
        for (const row of rows) {
          totalClicks += row.clicks || 0;
          totalImpressions += row.impressions || 0;
          totalPosition += (row.position || 0) * (row.impressions || 1);
          totalPositionWeight += row.impressions || 1;

          await supabase.from("google_analytics_data").upsert({
            user_id: userId,
            property_id: siteUrl,
            metric_name: "search_console",
            metric_value: row.clicks || 0,
            dimension: "date,clicks,impressions,ctr,position",
            dimension_value: `${row.keys?.[0] || ""} | ${row.clicks || 0} | ${row.impressions || 0} | ${row.ctr || 0} | ${row.position || 0}`,
            date: row.keys?.[0] ? new Date(row.keys[0]).toISOString().split("T")[0] : null,
            metadata: {
              type: "search_console",
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              position: row.position
            },
            created_at: new Date().toISOString()
          }, { onConflict: "user_id,property_id,metric_name,date,dimension_value" });
        }
        results.push({ type: "overall", status: "synced", rows: rows.length });
      }
    } catch (err: any) {
      results.push({ type: "overall", status: "error", error: err.message });
    }

    const queriesBody = {
      startDate: thirtyDaysAgo.toISOString().split("T")[0],
      endDate: yesterday.toISOString().split("T")[0],
      dimensions: ["query"],
      rowLimit: 50,
      startRow: 0
    };

    try {
      const res = await fetch(
        `https://searchconsole.googleapis.com/v1/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(queriesBody)
        }
      );
      const data = await res.json();

      if (data.error) {
        results.push({ type: "queries", status: "error", error: data.error.message });
      } else {
        results.push({ type: "queries", status: "synced", rows: (data.rows || []).length, top_queries: data.rows?.slice(0, 10) || [] });
      }
    } catch (err: any) {
      results.push({ type: "queries", status: "error", error: err.message });
    }

    const pagesBody = {
      startDate: thirtyDaysAgo.toISOString().split("T")[0],
      endDate: yesterday.toISOString().split("T")[0],
      dimensions: ["page"],
      rowLimit: 50,
      startRow: 0
    };

    try {
      const res = await fetch(
        `https://searchconsole.googleapis.com/v1/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(pagesBody)
        }
      );
      const data = await res.json();

      if (data.error) {
        results.push({ type: "pages", status: "error", error: data.error.message });
      } else {
        results.push({ type: "pages", status: "synced", rows: (data.rows || []).length, top_pages: data.rows?.slice(0, 10) || [] });
      }
    } catch (err: any) {
      results.push({ type: "pages", status: "error", error: err.message });
    }

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : "0";
    const avgPosition = totalPositionWeight > 0 ? (totalPosition / totalPositionWeight).toFixed(1) : "0";

    return new Response(JSON.stringify({
      success: true,
      site_url: siteUrl,
      synced: results.length,
      results,
      aggregated: {
        total_clicks: totalClicks,
        total_impressions: totalImpressions,
        avg_ctr: avgCtr,
        avg_position: avgPosition
      }
    }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

