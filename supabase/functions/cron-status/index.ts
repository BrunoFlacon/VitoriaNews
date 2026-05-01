import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Query cron jobs
    const { data: jobs, error: jobsErr } = await supabase.rpc("get_cron_jobs");
    if (jobsErr) {
      // Fallback: direct query via SQL isn't possible with client, return empty
      console.error("Error fetching cron jobs:", jobsErr);
    }

    // Query recent run details
    const { data: runs, error: runsErr } = await supabase.rpc("get_cron_run_details");
    if (runsErr) {
      console.error("Error fetching cron runs:", runsErr);
    }

    return new Response(
      JSON.stringify({ jobs: jobs || [], runs: runs || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cron-status error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
