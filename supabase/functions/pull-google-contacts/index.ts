import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";
import { fetchWithTimeout } from "../_shared/fetchWithTimeout.ts";

const corsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
});

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
      return new Response(JSON.stringify({ error: "Servidor mal configurado" }), {
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

    let googleToken = (await req.json().catch(() => ({}))).googleToken;
    if (!googleToken) {
      googleToken = await resolveGoogleToken(supabase, user.id);
    }
    if (!googleToken) {
      return new Response(JSON.stringify({ status: 'skipped', message: 'Nenhum token Google configurado.' }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Fetch all contacts from Google People API with pagination
    const allGoogleContacts: any[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    const MAX_PAGES = 10;

    do {
      const url = new URL("https://people.googleapis.com/v1/people/me/connections");
      url.searchParams.set("personFields", "names,phoneNumbers,emailAddresses,organizations,biographies,userDefined,resourceName");
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetchWithTimeout(url.toString(), {
        headers: { Authorization: `Bearer ${googleToken}` },
      });

      if (!res.ok) {
        const err = await res.json();
        return new Response(JSON.stringify({ error: err.error?.message || "Failed to fetch Google contacts" }), {
          status: res.status, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
        });
      }

      const data = await res.json();
      const connections = data.connections || [];
      allGoogleContacts.push(...connections);
      pageToken = data.nextPageToken;
      pageCount++;
    } while (pageToken && pageCount < MAX_PAGES);

    if (allGoogleContacts.length === 0) {
      return new Response(JSON.stringify({ success: true, imported: 0, updated: 0, skipped: 0, message: "Nenhum contato encontrado no Google" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Get existing contacts to avoid duplicates
    const { data: existingContacts } = await supabase
      .from("contacts")
      .select("id, phone, google_contact_id")
      .eq("user_id", user.id);

    const existingByGoogleId = new Map<string, any>();
    const existingByPhone = new Map<string, any>();
    for (const c of existingContacts ?? []) {
      if (c.google_contact_id) existingByGoogleId.set(c.google_contact_id, c);
      if (c.phone) existingByPhone.set(c.phone.replace(/\D/g, ""), c);
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const person of allGoogleContacts) {
      const resourceName = person.resourceName;
      const name = person.names?.[0]?.displayName || null;
      const phone = person.phoneNumbers?.[0]?.value || null;
      const email = person.emailAddresses?.[0]?.value || null;
      const company = person.organizations?.[0]?.name || null;

      if (!phone && !name) { skipped++; continue; }

      // Check if already synced by google_contact_id
      const existingByGId = existingByGoogleId.get(resourceName);
      if (existingByGId) {
        // Update existing
        await supabase.from("contacts").update({
          name: name || existingByGId.name,
          phone: phone || existingByGId.phone,
          email: email || existingByGId.email,
          company: company || existingByGId.company,
          updated_at: new Date().toISOString(),
        }).eq("id", existingByGId.id);
        updated++;
        continue;
      }

      // Check if exists by phone
      if (phone) {
        const normPhone = phone.replace(/\D/g, "");
        const existingByPh = existingByPhone.get(normPhone);
        if (existingByPh) {
          // Link google_contact_id
          await supabase.from("contacts").update({
            google_contact_id: resourceName,
            name: name || existingByPh.name,
            email: email || existingByPh.email,
            company: company || existingByPh.company,
            updated_at: new Date().toISOString(),
          }).eq("id", existingByPh.id);
          existingByGoogleId.set(resourceName, { ...existingByPh, google_contact_id: resourceName });
          updated++;
          continue;
        }
      }

      // Create new contact
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          user_id: user.id,
          name,
          phone,
          email,
          company,
          google_contact_id: resourceName,
        })
        .select("id")
        .single();

      if (newContact) {
        imported++;
        if (phone) existingByPhone.set(phone.replace(/\D/g, ""), { id: newContact.id, phone });
        existingByGoogleId.set(resourceName, { id: newContact.id, google_contact_id: resourceName });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported,
      updated,
      skipped,
      total: allGoogleContacts.length,
      message: `${imported} importados, ${updated} atualizados, ${skipped} ignorados`,
    }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });
  }
});
