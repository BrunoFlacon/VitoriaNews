import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { coverId, platform, type } = await req.json(); // type: 'impression' | 'click'

    if (!coverId || !platform) {
      return new Response(JSON.stringify({ error: "coverId and platform are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("cover_analytics")
      .select("*")
      .eq("id", coverId)
      .maybeSingle();

    if (existing) {
      const updates = type === "click"
        ? { clicks_count: (existing.clicks_count || 0) + 1, updated_at: new Date().toISOString() }
        : { impressions_count: (existing.impressions_count || 0) + 1, updated_at: new Date().toISOString() };

      await supabase.from("cover_analytics").update(updates).eq("id", coverId);
    }

    return new Response(JSON.stringify({ success: true, coverId, platform, event: type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
