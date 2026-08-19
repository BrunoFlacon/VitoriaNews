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

    // Fetch all WhatsApp connections
    const { data: connections, error: connErr } = await supabase
      .from("social_connections")
      .select("*")
      .eq("platform", "whatsapp");

    if (connErr) {
      return new Response(JSON.stringify({ error: connErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const conn of connections || []) {
      try {
        let token = conn.access_token;
        if (!token) {
          const { data: credsData } = await supabase
            .from("api_credentials")
            .select("credentials")
            .eq("user_id", conn.user_id)
            .eq("platform", "whatsapp")
            .maybeSingle();
          token = (credsData?.credentials as any)?.access_token;
        }

        let phoneId = conn.phone_number_id;
        let bizName = conn.page_name || "WhatsApp Business";
        let profilePic = "";

        if (token) {
          // Attempt 1: Resolve phone_number_id if missing
          if (!phoneId && conn.platform_user_id) {
            try {
              const pResp = await fetch(
                `https://graph.facebook.com/v21.0/${conn.platform_user_id}/phone_numbers?access_token=${token}`
              );
              if (pResp.ok) {
                const pData = await pResp.json();
                if (pData.data && pData.data.length > 0) {
                  phoneId = pData.data[0].id;
                  bizName = pData.data[0].verified_name || pData.data[0].display_phone_number || bizName;
                  await supabase
                    .from("social_connections")
                    .update({ phone_number_id: phoneId, page_name: bizName })
                    .eq("id", conn.id);
                }
              }
            } catch (e: any) {
              console.error(`[WA-FIX] phone_number_id lookup failed for ${conn.id}:`, e.message);
            }
          }

          // Attempt 2: Query whatsapp_business_profile
          if (phoneId && !profilePic) {
            try {
              const bResp = await fetch(
                `https://graph.facebook.com/v21.0/${phoneId}/whatsapp_business_profile?fields=profile_picture_url&access_token=${token}`
              );
              if (bResp.ok) {
                const bData = await bResp.json();
                profilePic = bData.data?.[0]?.profile_picture_url || bData.profile_picture_url || "";
              }
            } catch (e: any) {
              console.error(`[WA-FIX] whatsapp_business_profile lookup failed:`, e.message);
            }
          }

          // Attempt 3: Query phone node directly
          if (phoneId && !profilePic) {
            try {
              const pnResp = await fetch(
                `https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,profile_photo_url,verified_name&access_token=${token}`
              );
              if (pnResp.ok) {
                const pnData = await pnResp.json();
                profilePic = pnData.profile_photo_url || "";
                bizName = pnData.verified_name || pnData.display_phone_number || bizName;
              }
            } catch (e: any) {
              console.error(`[WA-FIX] phone node lookup failed:`, e.message);
            }
          }

          // Attempt 4: Facebook Page picture fallback
          if (!profilePic && conn.platform_user_id) {
            try {
              const picResp = await fetch(
                `https://graph.facebook.com/v21.0/${conn.platform_user_id}/picture?type=large&redirect=false&access_token=${token}`
              );
              if (picResp.ok) {
                const picData = await picResp.json();
                profilePic = picData.data?.url || "";
              }
            } catch (e: any) {
              console.error(`[WA-FIX] FB picture fallback failed:`, e.message);
            }
          }
        }

        // Upload to Storage if valid
        let finalStorageUrl = "";
        if (profilePic && profilePic.startsWith("http")) {
          try {
            const imgResp = await fetch(profilePic, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "https://www.facebook.com/",
              },
            });
            if (imgResp.ok) {
              const imgBlob = await imgResp.blob();
              if (imgBlob.size > 1000) {
                const ct = imgResp.headers.get("content-type") || "image/jpeg";
                const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
                const fileName = `whatsapp/${conn.platform_user_id || conn.id}.${ext}`;

                const { error: uploadErr } = await supabase.storage
                  .from("profile-photos")
                  .upload(fileName, imgBlob, { contentType: ct, upsert: true });

                if (!uploadErr) {
                  const { data: pubUrl } = supabase.storage
                    .from("profile-photos")
                    .getPublicUrl(fileName);
                  finalStorageUrl = pubUrl.publicUrl;
                } else {
                  console.error(`[WA-FIX] Storage upload error:`, uploadErr.message);
                }
              } else {
                console.warn(`[WA-FIX] Image too small (${imgBlob.size} bytes), skipping upload.`);
              }
            }
          } catch (e: any) {
            console.error(`[WA-FIX] Image fetch/upload exception:`, e.message);
          }
        }

        // Use fallback default avatar if no custom photo was retrieved
        if (!finalStorageUrl) {
          // If we couldn't fetch custom photo, construct public URL or keep current if valid
          finalStorageUrl = conn.profile_image_url || "";
        }

        if (finalStorageUrl) {
          // Update social_connections
          await supabase
            .from("social_connections")
            .update({
              profile_image_url: finalStorageUrl,
              profile_picture: finalStorageUrl,
              is_connected: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conn.id);

          // Update social_accounts
          if (conn.platform_user_id) {
            await supabase
              .from("social_accounts")
              .upsert({
                user_id: conn.user_id,
                platform: "whatsapp",
                platform_user_id: conn.platform_user_id,
                username: bizName,
                page_name: bizName,
                profile_picture: finalStorageUrl,
                is_connected: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: "user_id,platform,platform_user_id" });
          }

          // Update api_credentials
          const { data: existingCreds } = await supabase
            .from("api_credentials")
            .select("credentials")
            .eq("user_id", conn.user_id)
            .eq("platform", "whatsapp")
            .maybeSingle();

          const credsObj = (existingCreds?.credentials as any) || {};
          await supabase
            .from("api_credentials")
            .upsert({
              user_id: conn.user_id,
              platform: "whatsapp",
              credentials: {
                ...credsObj,
                profile_image_url: finalStorageUrl,
              },
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,platform" });
        }

        results.push({
          id: conn.id,
          page_name: bizName,
          platform_user_id: conn.platform_user_id,
          phone_number_id: phoneId,
          profile_image_url: finalStorageUrl,
          fetchedFromMeta: !!profilePic,
        });
      } catch (e: any) {
        results.push({ id: conn.id, error: e.message });
      }
    }

    return new Response(JSON.stringify({ success: true, count: results.length, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
