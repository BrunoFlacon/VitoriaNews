import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const FETCH_TIMEOUT = 15000;

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone_number_id, access_token } = await req.json();

    if (!phone_number_id || !access_token) {
      return new Response(JSON.stringify({
        valid: false,
        error: "phone_number_id and access_token are required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate by fetching phone number info from Meta Graph API
    const url = `https://graph.facebook.com/v22.0/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,account_review_status&access_token=${access_token}`;

    const resp = await fetchWithTimeout(url, {
      headers: { "Accept": "application/json" }
    });

    const data = await resp.json();

    if (!resp.ok || data.error) {
      return new Response(JSON.stringify({
        valid: false,
        error: data.error?.message || `HTTP ${resp.status}`,
        code: data.error?.code || resp.status,
        type: data.error?.type || null,
        fbtrace_id: data.error?.fbtrace_id || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      phone_number_id: data.id,
      display_phone_number: data.display_phone_number,
      verified_name: data.verified_name,
      quality_rating: data.quality_rating,
      code_verification_status: data.code_verification_status,
      account_review_status: data.account_review_status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      valid: false,
      error: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
