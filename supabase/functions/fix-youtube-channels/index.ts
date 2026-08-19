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

    // Get all YouTube channels
    const { data: channels, error } = await supabase
      .from("social_connections")
      .select("*")
      .eq("platform", "youtube");

    if (error) throw error;

    const updated: any[] = [];

    for (const ch of channels || []) {
      // Re-activate real YouTube channel IDs starting with "UC"
      if (ch.platform_user_id && ch.platform_user_id.startsWith("UC")) {
        await supabase
          .from("social_connections")
          .update({ is_connected: true, updated_at: new Date().toISOString() })
          .eq("id", ch.id);

        await supabase
          .from("social_accounts")
          .upsert({
            user_id: ch.user_id,
            platform: "youtube",
            platform_user_id: ch.platform_user_id,
            username: ch.page_name,
            page_name: ch.page_name,
            profile_picture: ch.profile_image_url || ch.profile_picture,
            is_connected: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,platform,platform_user_id" });

        updated.push({ id: ch.id, name: ch.page_name, puid: ch.platform_user_id, status: "activated" });
      }
    }

    return new Response(JSON.stringify({ success: true, count: updated.length, updated }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
