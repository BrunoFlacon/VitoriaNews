import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: connections, error } = await supabase
    .from("social_connections")
    .select("*")
    .eq("platform", "instagram")
    .eq("is_connected", true);

  if (error) return new Response(JSON.stringify({ error }), { headers: { "Content-Type": "application/json" } });

  const results = [];
  for (const conn of connections || []) {
    try {
      const igUserId = conn.platform_user_id;
      const fields = "followers_count,media_count,name,username,profile_picture_url";
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}?fields=${fields}&access_token=${conn.access_token}`
      );
      const fbData = await res.json();

      let uploadResult = null;
      let finalUrl = fbData.profile_picture_url || conn.profile_image_url;

      if (fbData.profile_picture_url) {
        const imgResp = await fetch(fbData.profile_picture_url);
        if (imgResp.ok) {
          const imgBlob = await imgResp.blob();
          const ct = imgResp.headers.get("content-type") || "image/jpeg";
          const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
          const fileName = `instagram/${conn.platform_user_id || conn.id}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("profile-photos")
            .upload(fileName, imgBlob, { contentType: ct, upsert: true });
          
          if (!uploadError) {
             const { data: pubUrl } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
             finalUrl = pubUrl.publicUrl;
             uploadResult = "Success: " + finalUrl;
          } else {
             uploadResult = "Error: " + JSON.stringify(uploadError);
          }
        } else {
          uploadResult = "Fetch Error: " + imgResp.status;
        }
      }

      // Update DB
      await supabase.from("social_connections").update({ profile_image_url: finalUrl }).eq("id", conn.id);

      results.push({ id: conn.id, name: conn.page_name, fbData, uploadResult, finalUrl });
    } catch (e) {
      results.push({ id: conn.id, error: e.message });
    }
  }

  return new Response(JSON.stringify({ results }), { headers: { "Content-Type": "application/json" } });
});
