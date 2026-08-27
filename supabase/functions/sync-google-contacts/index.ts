import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";
import { fetchWithTimeout } from "../_shared/fetchWithTimeout.ts";

const BATCH_SIZE = 100;
const RATE_LIMIT_DELAY_MS = 500;

const corsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function resolveGoogleToken(supabase: any, userId: string): Promise<string | null> {
  const { data: conn } = await supabase
    .from('social_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .in('platform', ['google', 'youtube'])
    .eq('is_connected', true)
    .maybeSingle();

  if (!conn?.access_token) {
    const { data: creds } = await supabase
      .from('api_credentials')
      .select('credentials')
      .eq('user_id', userId)
      .in('platform', ['google', 'youtube', 'google_cloud'])
      .limit(1);
    if (creds?.[0]?.credentials) {
      const c = creds[0].credentials as Record<string, string>;
      return c.access_token || c.people_api_key || null;
    }
    return null;
  }

  const expired = conn.token_expires_at && new Date(conn.token_expires_at) < new Date();
  if (!expired) return conn.access_token;

  if (!conn.refresh_token) return null;

  const refreshRes = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const refreshData = await refreshRes.json();
  if (!refreshData.access_token) return null;

  await supabase.from("social_connections").update({
    access_token: refreshData.access_token,
    token_expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId).eq("platform", conn.platform);

  return refreshData.access_token;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Servidor mal configurado — env vars ausentes" }), {
        status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: `Invalid session: ${authError?.message || "User not found"}` }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    let body: { members?: any[]; contacts?: any[]; googleToken?: string; table?: string } = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // Ignore parse errors — use defaults
    }

    let googleToken = body.googleToken;
    if (!googleToken) {
      googleToken = await resolveGoogleToken(supabase, user.id);
    }
    if (!googleToken) {
      return new Response(JSON.stringify({ status: 'skipped', message: 'Nenhum token Google configurado. Conecte sua Conta Google em Configurações.' }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Support both messaging_members and contacts table
    const sourceTable = body.table || 'messaging_members';
    let items = body.members || body.contacts || [];
    
    if (items.length === 0 && sourceTable === 'contacts') {
      const { data: allContacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id);
      if (allContacts?.length) items = allContacts;
    } else if (items.length === 0 && sourceTable === 'messaging_members') {
      const { data: allMembers } = await supabase
        .from('messaging_members')
        .select('*')
        .eq('user_id', user.id);
      if (allMembers?.length) items = allMembers;
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: 'Nenhum item para sincronizar' }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const results: any[] = [];
    let allFailed = true;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      if (i > 0) await delay(RATE_LIMIT_DELAY_MS);
      const batch = items.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (item: any) => {
        try {
          const contactBody: any = {};
          const name = item.full_name || item.name;
          const phone = item.phone_number || item.phone;
          const email = item.email;
          const company = item.company;
          const platform = item.platform || 'contacts';

          if (name) {
            const parts = name.split(' ');
            contactBody.names = [{
              displayName: name,
              givenName: parts[0] || name,
              familyName: parts.slice(1).join(' ') || '',
            }];
          }
          if (phone) {
            contactBody.phoneNumbers = [{ value: phone, type: "mobile" }];
          }
          if (email) {
            contactBody.emailAddresses = [{ value: email, type: "work" }];
          }
          if (company) {
            contactBody.organizations = [{ name: company }];
          }
          contactBody.biographies = [{
            value: `Sincronizado via Vitória News - ${platform}`,
            contentType: "TEXT_PLAIN",
          }];
          contactBody.userDefined = [
            { key: "platform", value: platform },
            { key: "source", value: sourceTable },
          ];

          let response;
          const existingGoogleId = item.google_contact_id;
          if (existingGoogleId) {
            response = await fetchWithTimeout(
              `https://people.googleapis.com/v1/${existingGoogleId}:updateContact?updatePersonFields=names,phoneNumbers,emailAddresses,organizations,biographies,userDefined`,
              {
                method: "PATCH",
                headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
                body: JSON.stringify(contactBody),
              }
            );
          } else {
            response = await fetchWithTimeout("https://people.googleapis.com/v1/people:createContact", {
              method: "POST",
              headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(contactBody),
            });
          }

          const data = await response.json();
          if (response.ok) {
            allFailed = false;
            const resourceName = data.resourceName;
            
            // Write back google_contact_id to the correct table
            if (sourceTable === 'contacts') {
              await supabase.from("contacts").update({
                google_contact_id: resourceName,
                updated_at: new Date().toISOString(),
              }).eq("id", item.id);
            } else {
              await supabase.from("messaging_members").update({
                google_contact_id: resourceName,
                updated_at: new Date().toISOString(),
              }).eq("user_id", user.id).eq("phone_number", phone).eq("platform", platform);
            }

            results.push({ name: name || phone, success: true, googleContactId: resourceName });
          } else {
            results.push({ name: name || phone, success: false, error: data.error?.message });
          }
        } catch (err: any) {
          results.push({ name: item.full_name || item.name || item.phone_number || item.phone, success: false, error: err.message });
        }
      }));
    }

    return new Response(JSON.stringify({ success: !allFailed, count: results.filter(r => r.success).length, results }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });
  }
});
