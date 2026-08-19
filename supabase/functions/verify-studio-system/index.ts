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

    const checks: Record<string, any> = {};

    // 1. Check cover_projects
    try {
      const { data, error } = await supabase.from("cover_projects").select("id").limit(1);
      checks.cover_projects = error ? { status: "error", message: error.message } : { status: "ok", count: data?.length };
    } catch (e: any) {
      checks.cover_projects = { status: "exception", error: e.message };
    }

    // 2. Check cover_templates
    try {
      const { data, error } = await supabase.from("cover_templates").select("id").limit(1);
      checks.cover_templates = error ? { status: "error", message: error.message } : { status: "ok", count: data?.length };
    } catch (e: any) {
      checks.cover_templates = { status: "exception", error: e.message };
    }

    // 3. Check cover_analytics
    try {
      const { data, error } = await supabase.from("cover_analytics").select("id").limit(1);
      checks.cover_analytics = error ? { status: "error", message: error.message } : { status: "ok", count: data?.length };
    } catch (e: any) {
      checks.cover_analytics = { status: "exception", error: e.message };
    }

    // 4. Test bucket media-covers
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasCoverBucket = buckets?.some(b => b.name === 'media-covers');
      if (!hasCoverBucket) {
        await supabase.storage.createBucket('media-covers', { public: true });
        checks.bucket_media_covers = { status: "created" };
      } else {
        checks.bucket_media_covers = { status: "ok" };
      }
    } catch (e: any) {
      checks.bucket_media_covers = { status: "exception", error: e.message };
    }

    return new Response(JSON.stringify({ success: true, checks }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
