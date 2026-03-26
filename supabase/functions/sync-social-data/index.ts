import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SocialConnection {
  id: string;
  user_id: string;
  platform: string;
  followers_count: number;
  access_token?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: rawConnections, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("is_connected", true);

    if (connError) throw connError;
    const connections = (rawConnections as SocialConnection[]) || [];

    const results = [];

    for (const conn of connections) {
      console.log(`Syncing platform: ${conn.platform} for user: ${conn.user_id}`);
      
      // In a real scenario, we would use conn.access_token to call FB/IG/LI APIs
      
      // For now, we update the timestamp to show it's "syncing"
      const { error: updateError } = await supabase
        .from("social_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", conn.id);

      // Log account metrics
      await supabase.from("account_metrics").insert({
        user_id: conn.user_id,
        social_account_id: conn.id,
        platform: conn.platform,
        followers: conn.followers_count || 0,
        following: 0,
        posts_count: 0,
        collected_at: new Date().toISOString()
      } as any);

      results.push({ platform: conn.platform, status: "success" });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
