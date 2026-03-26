import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { platform } = await req.json();
    if (platform !== "telegram") throw new Error("Only telegram supported for this trigger");

    // Fetch credentials
    const { data: credsData, error: credsError } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("platform", "telegram")
      .maybeSingle();

    if (credsError) throw credsError;
    
    // Support both snake_case and camelCase
    const credentials = credsData?.credentials as any;
    const botToken = credentials?.bot_token || credentials?.botToken;

    if (!botToken) throw new Error("Telegram Bot Token not found in credentials");

    // console.log(`Syncing Telegram info for user ${user.id}...`);

    // 1. Get Bot Info
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) throw new Error(`Telegram API Error (getMe): ${meData.description}`);

    const botInfo = meData.result;
    let profilePicture = "";

    // 2. Get Profile Photo
    try {
      const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${botInfo.id}&limit=1`);
      const photosData = await photosRes.json();
      if (photosData.ok && photosData.result.photos.length > 0) {
        const fileId = photosData.result.photos[0][0].file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();
        if (fileData.ok) {
          profilePicture = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        }
      }
    } catch (photoErr) {
      // Silent fail for photo
    }

    const { error: upsertError } = await supabase.from("social_accounts").upsert({
      user_id: user.id,
      platform: "telegram",
      platform_user_id: botInfo.id.toString(),
      username: botInfo.username,
      display_name: botInfo.first_name,
      profile_picture: profilePicture,
      followers: 0, // Bots don't have followers in the same sense, but we can track chats later
      posts_count: 0,
      views: 0,
      likes: 0,
      shares: 0,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,platform,platform_user_id" });

    if (upsertError) throw upsertError;

    // console.log(`Telegram sync successful for @${botInfo.username}`);

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        username: botInfo.username,
        display_name: botInfo.first_name,
        profile_picture: profilePicture
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
