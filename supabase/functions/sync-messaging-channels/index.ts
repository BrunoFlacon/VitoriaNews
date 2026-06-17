// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const authHeader = req.headers.get("Authorization")!;
    
    // Auth client for user validation
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service key client for internal operations
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error("[sync-messaging-channels] Auth error:", authError?.message || "No user found");
      return new Response(JSON.stringify({ 
          error: "Unauthorized", 
          details: authError?.message || "Invalid or expired session" 
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
    
    // ── Helper: Ensure Storage Bucket exists ────────────────────────────────
    async function ensureBucketExists() {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.find((b: any) => b.id === "media");
        if (!exists) {
          const { error } = await supabase.storage.createBucket("media", { public: true });
          if (error) console.error("Error creating bucket:", error.message);
          else console.log("Bucket 'media' created successfully");
        }
      } catch (e) { console.error("ensureBucketExists failed", e); }
    }
    await ensureBucketExists();

    // ── Helper: Download and Upload to Storage ──────────────────────────────
    async function downloadAndUploadImage(url: string, path: string): Promise<string | null> {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        
        const { data, error } = await supabase.storage
          .from("media")
          .upload(path, blob, { contentType: blob.type, upsert: true });
        
        if (error) {
          console.error(`Storage error for ${path}:`, error.message);
          return null;
        }
        
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
        return publicUrl;
      } catch (e) {
        console.error(`Download/Upload failed for ${path}:`, e);
        return null;
      }
    }

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
                const tempUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                const permanentUrl = await downloadAndUploadImage(tempUrl, `channels/telegram_${channel.channel_id}.jpg`);
                profilePicture = permanentUrl || tempUrl;
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
          } else {
             // Fallback to social_connections
             const { data: conn } = await supabase
               .from("social_connections")
               .select("profile_picture")
               .eq("platform", "whatsapp")
               .maybeSingle();
             if (conn?.profile_picture) {
               profilePicture = conn.profile_picture;
               syncSuccess = true;
             }
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
