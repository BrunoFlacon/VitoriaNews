import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch pending jobs, ordered by creation, limited batch
    const { data: jobs, error } = await supabase
      .from("job_queue")
      .select("*")
      .eq("status", "pending")
      .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let processed = 0;

    for (const job of jobs) {
      // Mark as processing
      await supabase.from("job_queue").update({ status: "processing", attempts: job.attempts + 1 }).eq("id", job.id);

      try {
        let result;
        switch (job.job_type) {
          case "publish":
            result = await supabase.functions.invoke("publish-post", { body: job.payload });
            break;
          case "collect_analytics":
            result = await supabase.functions.invoke("collect-social-analytics", { body: job.payload });
            break;
          case "text_to_speech":
            result = await supabase.functions.invoke("text-to-speech", { body: job.payload });
            break;
          case "transcribe":
            result = await supabase.functions.invoke("transcribe-media", { body: job.payload });
            break;
          default:
            // console.log(`Unknown job type: ${job.job_type}`);
        }

        // Mark completed
        await supabase.from("job_queue").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);

        // Log success
        await supabase.from("system_logs").insert({
          user_id: job.user_id,
          service: `job_queue.${job.job_type}`,
          level: "info",
          message: `Job ${job.id} completed successfully`,
          metadata: { job_id: job.id, result },
        });

        processed++;
      } catch (jobError) {
        const attempts = job.attempts + 1;
        const maxAttempts = job.max_attempts || 3;

        if (attempts >= maxAttempts) {
          // Max retries reached
          await supabase.from("job_queue").update({
            status: "failed",
            error_message: String(jobError),
          }).eq("id", job.id);
        } else {
          // Exponential backoff: 1min, 5min, 25min
          const delayMs = Math.pow(5, attempts - 1) * 60 * 1000;
          const nextRetry = new Date(Date.now() + delayMs).toISOString();

          await supabase.from("job_queue").update({
            status: "pending",
            next_retry_at: nextRetry,
            error_message: String(jobError),
          }).eq("id", job.id);
        }

        // Log error
        await supabase.from("system_logs").insert({
          user_id: job.user_id,
          service: `job_queue.${job.job_type}`,
          level: "error",
          message: `Job ${job.id} failed (attempt ${attempts}/${maxAttempts})`,
          metadata: { job_id: job.id, error: String(jobError) },
        });
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
