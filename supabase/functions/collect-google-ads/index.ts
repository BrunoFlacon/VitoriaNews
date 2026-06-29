import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";
import { fetchWithTimeout } from "../_shared/fetchWithTimeout.ts";

const corsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
});

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

    const { data: gcloud } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", "google_cloud")
      .maybeSingle();
    const creds = gcloud?.credentials as Record<string, string> | undefined;
    const adsId = creds?.ads_id || "";

    if (!adsId.trim()) {
      return new Response(JSON.stringify({ error: "Google Ads Customer ID não configurado. Salve o ID em Configurações > APIs > Google Cloud." }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const cleaned = adsId.replace(/[\s\-_]/g, '');
    if (!/^\d{10}$/.test(cleaned)) {
      return new Response(JSON.stringify({ error: "Google Ads Customer ID inválido. Deve ter 10 dígitos (ex: 123-456-7890)." }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const customerId = cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

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
        status: "skipped",
        message: "Google Ads precisa de conta Google conectada via OAuth. Conecte em Redes Sociais primeiro."
      }), {
        status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const devToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";
    const loginCustomerId = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID") || "";

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    let apiResult: any[] = [];

    if (devToken) {
      const gaul = `"${loginCustomerId || customerId}"`;
      const query = `
        SELECT campaign.id, campaign.name, campaign.status,
               metrics.impressions, metrics.clicks, metrics.cost_micros,
               metrics.conversions
        FROM campaign
        WHERE segments.date BETWEEN '${thirtyDaysAgo}' AND '${yesterday}'
        ORDER BY segments.date
      `;

      try {
        const gaRes = await fetchWithTimeout(`https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "developer-token": devToken,
            "login-customer-id": loginCustomerId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, pageSize: 1000 }),
        });

        if (gaRes.ok) {
          const gaData = await gaRes.json();
          apiResult = gaData.results || [];

          const rows = apiResult.map((r: any) => ({
            user_id: userId,
            campaign_id: r.campaign?.id || "unknown",
            campaign_name: r.campaign?.name || null,
            status: r.campaign?.status || null,
            impressions: Number(r.metrics?.impressions || 0),
            clicks: r.metrics?.clicks || 0,
            cost_micros: r.metrics?.costMicros || 0,
            conversions: r.metrics?.conversions || 0,
            date: yesterday,
          }));

          for (const row of rows) {
            await supabase.from("google_ads_campaigns").upsert(row, {
              onConflict: "user_id,campaign_id,date",
              ignoreDuplicates: false,
            });
          }
        } else {
          const errBody = await gaRes.text();
          return new Response(JSON.stringify({
            status: "error",
            message: `Google Ads API error: ${gaRes.status}. ${errBody}`,
            hint: "Verifique se o Developer Token está configurado e aprovado no Google Ads."
          }), {
            status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
          });
        }
      } catch (fetchErr: any) {
        return new Response(JSON.stringify({
          status: "error",
          message: `Erro ao chamar Google Ads API: ${fetchErr.message}`,
        }), {
          status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
        });
      }
    } else {
      return new Response(JSON.stringify({
        status: "skipped",
        message: "Google Ads Developer Token não configurado nas env vars. Configure GOOGLE_ADS_DEVELOPER_TOKEN no Supabase para coletar dados reais. O Customer ID está salvo corretamente."
      }), {
        status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      status: "success",
      campaigns: apiResult.length,
      message: `${apiResult.length} campanhas sincronizadas do Google Ads.`
    }), {
      status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });
  }
});
