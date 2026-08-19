import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: any[] = [];

  // ===== FIX 1: Update social_accounts for Instagram with real IG IDs (178414...) to use Storage URLs =====
  const { data: igConns } = await supabase
    .from("social_connections")
    .select("platform_user_id, profile_image_url")
    .eq("platform", "instagram")
    .eq("is_connected", true);

  for (const conn of igConns || []) {
    if (conn.profile_image_url?.includes('supabase.co/storage/')) {
      // Update social_accounts to match
      const { error } = await supabase
        .from("social_accounts")
        .update({ profile_picture: conn.profile_image_url })
        .eq("platform_user_id", conn.platform_user_id)
        .eq("platform", "instagram");
      results.push({ action: "fix_ig_account", puid: conn.platform_user_id, error: error?.message || null });
    }
  }

  // ===== FIX 2: Upload Facebook profile pictures to Storage =====
  const { data: fbConns } = await supabase
    .from("social_connections")
    .select("id, platform_user_id, access_token, page_name, profile_image_url")
    .eq("platform", "facebook")
    .eq("is_connected", true);

  for (const conn of fbConns || []) {
    if (!conn.access_token || !conn.platform_user_id) continue;
    try {
      // Get fresh profile picture from Graph API
      const picRes = await fetch(
        `https://graph.facebook.com/v21.0/${conn.platform_user_id}/picture?type=large&redirect=false&access_token=${conn.access_token}`
      );
      const picData = await picRes.json();
      const freshUrl = picData.data?.url;
      
      if (freshUrl) {
        const imgResp = await fetch(freshUrl);
        if (imgResp.ok) {
          const imgBlob = await imgResp.blob();
          if (imgBlob.size > 1000) {
            const ct = imgResp.headers.get("content-type") || "image/jpeg";
            const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
            const fileName = `facebook/${conn.platform_user_id}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from("profile-photos")
              .upload(fileName, imgBlob, { contentType: ct, upsert: true });
            
            if (!uploadError) {
              const { data: pubUrl } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
              const storageUrl = pubUrl.publicUrl;
              
              await supabase.from("social_connections")
                .update({ profile_image_url: storageUrl, profile_picture: storageUrl })
                .eq("id", conn.id);
              
              await supabase.from("social_accounts")
                .update({ profile_picture: storageUrl })
                .eq("platform", "facebook")
                .eq("platform_user_id", conn.platform_user_id);
              
              results.push({ action: "fix_fb", page: conn.page_name, status: "uploaded", url: storageUrl });
            } else {
              results.push({ action: "fix_fb", page: conn.page_name, status: "upload_error", error: uploadError.message });
            }
          } else {
            results.push({ action: "fix_fb", page: conn.page_name, status: "too_small", size: imgBlob.size });
          }
        }
      } else {
        results.push({ action: "fix_fb", page: conn.page_name, status: "no_picture_url" });
      }
    } catch (e) {
      results.push({ action: "fix_fb", page: conn.page_name, status: "error", error: e.message });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), { headers: { "Content-Type": "application/json" } });
});
