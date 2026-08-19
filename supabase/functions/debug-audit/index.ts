import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get ALL connections with both image fields
  const { data: connections, error } = await supabase
    .from("social_connections")
    .select("id, platform, page_name, platform_user_id, profile_image_url, profile_picture, is_connected")
    .in("platform", ["instagram", "facebook", "youtube", "whatsapp", "threads"])
    .eq("is_connected", true);

  if (error) return new Response(JSON.stringify({ error }), { headers: { "Content-Type": "application/json" } });

  const results = (connections || []).map(c => ({
    platform: c.platform,
    page_name: c.page_name,
    platform_user_id: c.platform_user_id,
    profile_image_url: c.profile_image_url,
    profile_image_url_is_storage: c.profile_image_url?.includes('supabase.co/storage/') || false,
    profile_image_url_is_cdn: c.profile_image_url?.includes('fbcdn.net') || c.profile_image_url?.includes('scontent') || false,
    profile_picture: c.profile_picture,
    profile_picture_is_storage: c.profile_picture?.includes('supabase.co/storage/') || false,
    profile_picture_is_cdn: c.profile_picture?.includes('fbcdn.net') || c.profile_picture?.includes('scontent') || false,
  }));

  // Get YouTube specifically
  const { data: ytAll } = await supabase
    .from("social_connections")
    .select("id, platform, page_name, platform_user_id, is_connected, profile_image_url")
    .eq("platform", "youtube");

  // Get social_accounts for instagram
  const { data: igAccounts } = await supabase
    .from("social_accounts")
    .select("platform, platform_user_id, username, profile_picture, page_name")
    .in("platform", ["instagram", "youtube"]);

  return new Response(JSON.stringify({ 
    connections: results,
    youtube_all: ytAll,
    social_accounts_ig_yt: igAccounts
  }, null, 2), { headers: { "Content-Type": "application/json" } });
});
