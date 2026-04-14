import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    function decodeJwt(t: string) {
      try {
        const parts = t.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      } catch {
        return null;
      }
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("X-Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace(/^Bearer\s+/i, "");
    let actualUserId: string | undefined;

    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) actualUserId = user.id;
    } catch {}

    if (!actualUserId) {
      const payload = decodeJwt(token);
      if (payload?.sub) actualUserId = payload.sub;
    }

    if (!actualUserId) throw new Error("Unauthorized");
    const userId = actualUserId;

    const { platform } = await req.json();
    if (platform !== "telegram") throw new Error("Only telegram supported for this trigger");

    // Fetch credentials
    const { data: credsData, error: credsError } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", "telegram")
      .maybeSingle();

    if (credsError) throw credsError;
    
    // Support both snake_case and camelCase
    const credentials = credsData?.credentials as any;
    let botToken = credentials?.bot_token || credentials?.botToken;
    if (!botToken && Array.isArray(credentials?.tokens) && credentials.tokens.length > 0) {
      botToken = credentials.tokens[0];
    }

    console.log(`[TELEGRAM SYNC] User: ${userId}, Raw token length: ${botToken?.length || 0}`);

    if (!botToken) {
      console.error("[TELEGRAM SYNC] Bot Token not found in credentials");
      throw new Error("Telegram Bot Token not found in credentials");
    }

    // Clean token: remove "bot" prefix if present and trim
    botToken = botToken.trim();
    if (botToken.toLowerCase().startsWith("bot")) {
      botToken = botToken.substring(3).trim();
      console.log("[TELEGRAM SYNC] Stripped 'bot' prefix from token");
    }

    // console.log(`Syncing Telegram info for user ${userId}...`);

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
      user_id: userId,
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
        profile_picture: profilePicture,
        bot_id: botInfo.id
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[TELEGRAM SYNC ERROR FINAL]:", error);
    // Return 200 so supabase-js doesn't throw, enabling us to read the JSON body
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || "Unknown error",
      details: error.stack || "",
      stage: "functional_error"
    }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
