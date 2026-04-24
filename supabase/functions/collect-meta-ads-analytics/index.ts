import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const creds = await getCredentials(supabase, userId, "meta_ads");
    const accessToken = creds?.access_token || creds?.system_user_token || creds?.accessToken;
    let adAccountId = creds?.ad_account_id || creds?.adAccountId || "";

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Meta Ads access token not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!adAccountId) {
      // Try to fetch first ad account
      const accountsRes = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name&access_token=${accessToken}`
      );
      const accountsData = await accountsRes.json();
      if (accountsData.error) {
        return new Response(JSON.stringify({ error: `Failed to fetch ad accounts: ${accountsData.error.message}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (accountsData.data?.length > 0) {
        adAccountId = accountsData.data[0].id;
      } else {
        return new Response(JSON.stringify({ error: "No ad accounts found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Normalize ad account ID
    if (!adAccountId.startsWith("act_")) {
      adAccountId = `act_${adAccountId.replace("act_", "")}`;
    }

    const results: any[] = [];
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalReach = 0;

    // Fetch campaigns
    const campaignsRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,stop_time&access_token=${accessToken}&limit=100`
    );
    const campaignsData = await campaignsRes.json();

    if (campaignsData.error) {
      return new Response(JSON.stringify({ error: `Failed to fetch campaigns: ${campaignsData.error.message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const campaigns = campaignsData.data || [];

    for (const campaign of campaigns) {
      try {
        // Fetch insights for this campaign
        const insightsRes = await fetch(
          `https://graph.facebook.com/v21.0/${campaign.id}/insights?fields=impressions,clicks,spend,reach,frequency,ctr,cpc,cpm,actions&access_token=${accessToken}&limit=1`
        );
        const insightsData = await insightsRes.json();

        if (insightsData.error) {
          results.push({ campaign_id: campaign.id, name: campaign.name, status: "error", error: insightsData.error.message });
          continue;
        }

        const insight = insightsData.data?.[0] || {};
        const impressions = parseInt(insight.impressions || "0");
        const clicks = parseInt(insight.clicks || "0");
        const spend = parseFloat(insight.spend || "0");
        const reach = parseInt(insight.reach || "0");
        const frequency = parseFloat(insight.frequency || "0");
        const ctr = parseFloat(insight.ctr || "0");
        const cpc = parseFloat(insight.cpc || "0");
        const cpm = parseFloat(insight.cpm || "0");

        // Parse actions for conversions
        let conversions = 0;
        if (insight.actions) {
          const linkClicks = insight.actions.find((a: any) => a.action_type === "link_click");
          if (linkClicks) conversions = parseInt(linkClicks.value || "0");
        }

        // Upsert campaign data
        await supabase.from("meta_ads_campaigns").upsert({
          user_id: userId,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          daily_budget: campaign.daily_budget ? campaign.daily_budget / 100 : null,
          lifetime_budget: campaign.lifetime_budget ? campaign.lifetime_budget / 100 : null,
          amount_spent: spend,
          impressions,
          clicks,
          reach,
          frequency,
          ctr,
          cpc,
          cpm,
          conversions,
          metadata: {
            ad_account_id: adAccountId,
            stop_time: campaign.stop_time,
            collected_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,campaign_id" });

        totalImpressions += impressions;
        totalClicks += clicks;
        totalSpend += spend;
        totalReach += reach;

        results.push({
          campaign_id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          impressions,
          clicks,
          spend,
          reach
        });
      } catch (err: any) {
        results.push({ campaign_id: campaign.id, name: campaign.name, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      ad_account_id: adAccountId,
      total_campaigns: campaigns.length,
      synced: results.length,
      aggregated: {
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: totalSpend,
        reach: totalReach,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : "0",
        cpc: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : "0",
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions * 1000).toFixed(2) : "0"
      },
      results
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
