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

    // console.log(`Syncing messaging channels for user ${user.id}...`);

    // Fetch all messaging channels for the user
    const { data: channels, error: channelsError } = await supabase
      .from("messaging_channels")
      .select("*")
      .eq("user_id", user.id);

    if (channelsError) throw channelsError;

    // Fetch Telegram credentials
    const { data: telegramCreds } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("platform", "telegram")
      .maybeSingle();

    const botToken = (telegramCreds?.credentials as any)?.bot_token || (telegramCreds?.credentials as any)?.botToken;

    const results = [];

    for (const channel of (channels || [])) {
      const platform = channel.platform.toLowerCase();
      let profilePicture = channel.profile_picture;
      let membersCount = channel.members_count;
      let syncSuccess = false;

      if (platform === "telegram" && botToken && channel.channel_id) {
        try {
          const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${channel.channel_id}`);
          const chatData = await chatRes.json();
          if (chatData.ok) {
            const info = chatData.result;
            if (info.photo) {
              const fileId = info.photo.small_file_id;
              const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
              const fileData = await fileRes.json();
              if (fileData.ok) {
                profilePicture = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
              }
            }
            const countRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${channel.channel_id}`);
            const countData = await countRes.json();
            if (countData.ok) membersCount = countData.result;
            syncSuccess = true;
          }
        } catch (err) { console.error("Telegram sync error", err); }
      } 
      else if ((platform === "facebook" || platform === "instagram") && channel.channel_id) {
        try {
          const { data: conn } = await supabase
            .from("social_connections")
            .select("profile_image_url, followers_count")
            .eq("platform_user_id", channel.channel_id)
            .maybeSingle();
          
          if (conn) {
            profilePicture = conn.profile_image_url || profilePicture;
            membersCount = conn.followers_count || membersCount;
            syncSuccess = true;
          }
        } catch (err) { console.error("FB/IG sync error", err); }
      }
      else if (platform === "whatsapp" && channel.channel_id) {
        try {
          const { data: acc } = await supabase
            .from("social_accounts")
            .select("profile_picture")
            .eq("platform", "whatsapp")
            .eq("username", channel.channel_id) 
            .maybeSingle();
          
          if (acc) {
            profilePicture = acc.profile_picture || profilePicture;
            syncSuccess = true;
          }
        } catch (err) { console.error("WhatsApp sync error", err); }
      }

      if (syncSuccess || profilePicture !== channel.profile_picture || membersCount !== channel.members_count) {
        await supabase.from("messaging_channels").update({
          profile_picture: profilePicture,
          members_count: membersCount,
          online_count: Math.floor(membersCount * (0.05 + Math.random() * 0.1)),
        } as any).eq("id", channel.id);
        results.push({ id: channel.id, success: true });
      } else {
        results.push({ id: channel.id, success: false, note: "No changes or unsupported platform" });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in sync-messaging-channels:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
