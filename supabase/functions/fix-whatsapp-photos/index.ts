import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const FETCH_TIMEOUT = 15000;

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

const FIX_NAMES = [
  "Central News", "Andje Wallace",
  "ADM - Marcha da Família", "ADM - IG. M Vida Eterna",
  "ADM - Tupã Pela Pátria", "ADM - Partido Liberal Tupã"
];

async function uploadToStorage(supabase: any, imageUrl: string, fileName: string): Promise<string> {
  const imgResp = await fetchWithTimeout(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://www.facebook.com/",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }
  });
  if (!imgResp.ok) throw new Error(`fetch image failed (${imgResp.status})`);
  const imgBlob = await imgResp.blob();
  const ct = imgResp.headers.get("content-type") || "image/png";
  const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
  const path = `whatsapp/${fileName}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, imgBlob, { contentType: ct, upsert: true });
  if (uploadError) throw new Error(`upload error: ${uploadError.message}`);
  const { data: pubUrl } = supabase.storage.from("profile-photos").getPublicUrl(path);
  return pubUrl.publicUrl + `?v=${Date.now()}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: allWa } = await supabase
      .from("social_connections")
      .select("*")
      .eq("platform", "whatsapp")
      .order("page_name");

    if (!allWa || allWa.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No WhatsApp connections found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const migrationLog: any[] = [];

    // Step 1: Find and merge duplicate connections by page_name
    // OAuth callback creates new rows with platform_user_id = WABA ID,
    // while old rows have platform_user_id = Facebook Page ID
    const byName: Record<string, any[]> = {};
    for (const conn of allWa) {
      const key = (conn.page_name || '').trim().toLowerCase();
      if (!byName[key]) byName[key] = [];
      byName[key].push(conn);
    }

    for (const [name, group] of Object.entries(byName)) {
      if (group.length <= 1) continue;
      // Sort by updated_at descending, most recent first
      group.sort((a: any, b: any) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
      const keeper = group[0];
      const duplicates = group.slice(1);
      // keeper = most recent (created by re-auth with WABA ID + correct photo)
      // duplicates = old rows (FB Page ID, empty/wrong photo)
      // Keep the OLD row active (dashboard knows it), copy photo FROM keeper, deactivate keeper
      const oldest = duplicates[duplicates.length - 1]; // last = oldest
      if (keeper.profile_image_url) {
        console.log(`[MIGRATE] ${name}: copying photo from keeper(${keeper.id}) to oldest(${oldest.id}) then deactivating keeper`);
        await supabase.from("social_connections").update({
          profile_image_url: keeper.profile_image_url,
          page_id: null,
          phone_number_id: keeper.phone_number_id || oldest.phone_number_id || null,
          updated_at: new Date().toISOString(),
        }).eq("id", oldest.id);
        await supabase.from("social_connections").update({
          is_connected: false,
          updated_at: new Date().toISOString(),
        }).eq("id", keeper.id);
        migrationLog.push({
          name: keeper.page_name,
          kept_id: oldest.id,
          deactivated_id: keeper.id,
          photo_truncated: keeper.profile_image_url.substring(0, 60) + "...",
        });
      }
    }

    if (migrationLog.length > 0) {
      console.log(`[MIGRATE] Merged ${migrationLog.length} duplicate groups`);
    }

    // Re-fetch after migrations
    const { data: refreshed } = await supabase
      .from("social_connections")
      .select("*")
      .eq("platform", "whatsapp")
      .eq("is_connected", true)
      .order("page_name");

    if (!refreshed) {
      return new Response(JSON.stringify({ success: true, message: "No connections after migration" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const diagnostics: any[] = [];
    const results: any[] = [];

    for (const conn of refreshed) {
      const isTarget = FIX_NAMES.some((n: string) => (conn.page_name || '').trim() === n);
      let profilePic = "";
      let phoneId = conn.phone_number_id;
      let bizName = conn.page_name || "WhatsApp Business";
      const log: any = {
        name: conn.page_name,
        isTarget,
        platform_user_id: conn.platform_user_id,
        before: {
          page_id: conn.page_id,
          phone_number_id: phoneId,
          profile_image_url: conn.profile_image_url,
        },
        debug: {} as any,
      };

      if (isTarget && conn.page_id) {
        console.log(`[FIX] ${conn.page_name}: clearing page_id=${conn.page_id}`);
        await supabase.from("social_connections").update({ page_id: null }).eq("id", conn.id);
        conn.page_id = null;
      }

      let wabaId = null;
      let wabaToken = conn.access_token;
      try {
        const { data: apiCred } = await supabase
          .from("api_credentials")
          .select("credentials")
          .eq("user_id", conn.user_id)
          .eq("platform", "whatsapp")
          .maybeSingle();
        if (apiCred?.credentials) {
          wabaId = apiCred.credentials.waba_id;
          if (apiCred.credentials.access_token) wabaToken = apiCred.credentials.access_token;
          if (!phoneId) phoneId = apiCred.credentials.phone_number_id;
        }
      } catch {}

      // Use WABA ID from api_credentials (correct after OAuth callback fix) or conn.platform_user_id
      const allWabaIds = [wabaId, conn.platform_user_id].filter((v: any) => v);
      // phone_numbers edge on WABA — the ONLY reliable source of profile_photo_url in v21.0
      for (const wid of allWabaIds) {
        if (profilePic) break;
        try {
          const pnUrl = `https://graph.facebook.com/v21.0/${wid}/phone_numbers?fields=id,display_phone_number,profile_photo_url,verified_name&access_token=${wabaToken}`;
          log.debug["list_nums_url"] = pnUrl.substring(0, 120) + "...";
          const phoneResp = await fetchWithTimeout(pnUrl);
          log.debug["list_nums_status"] = phoneResp.status;
          if (phoneResp.ok) {
            const phoneData = await phoneResp.json();
            if (phoneData.error) {
              log.debug["list_nums_error"] = `${phoneData.error.message} (code ${phoneData.error.code})`;
              continue;
            }
            if (phoneData.data && phoneData.data.length > 0) {
              log.debug["list_nums_count"] = phoneData.data.length;
              const connName = (conn.page_name || '').toLowerCase().trim();
              let matched = phoneData.data[0];
              if (connName) {
                for (const p of phoneData.data) {
                  const pName = (p.verified_name || p.display_phone_number || '').toLowerCase().trim();
                  if (pName && (connName.includes(pName) || pName.includes(connName))) {
                    matched = p;
                    break;
                  }
                }
              }
              phoneId = matched.id;
              bizName = matched.verified_name || matched.display_phone_number || bizName;
              if (matched.profile_photo_url) {
                profilePic = matched.profile_photo_url;
                log.debug["photo_found"] = true;
              }
              break;
            }
          }
        } catch (e) {
          console.warn(`[FIX] ${conn.page_name}: phone_numbers error via ${wid}:`, String(e));
        }
      }

      let storageUrl = "";
      if (profilePic && profilePic.startsWith("http")) {
        try {
          const baseId = conn.platform_user_id || conn.id;
          storageUrl = await uploadToStorage(supabase, profilePic, baseId);
          console.log(`[FIX] ${conn.page_name}: uploaded photo to storage: ${storageUrl}`);
        } catch (e) {
          console.warn(`[FIX] upload error for ${conn.page_name}:`, String(e));
        }
      }

      const finalPic = storageUrl || profilePic || conn.profile_image_url || "";
      log.after = {
        page_id: conn.page_id,
        phone_number_id: phoneId,
        profile_image_url: finalPic || "(empty)",
        phone_id_resolved: !!phoneId,
        waba_photo_found: !!profilePic,
        uploaded: !!storageUrl,
      };

      const updateData: any = { updated_at: new Date().toISOString() };
      if (isTarget) {
        if (finalPic) updateData.profile_image_url = finalPic;
        updateData.phone_number_id = phoneId || null;
        updateData.page_name = bizName;
      }
      if (finalPic && isTarget) {
        updateData.profile_image_url = finalPic;
      }
      if (isTarget) {
        await supabase.from("social_connections").update(updateData).eq("id", conn.id);
        if (finalPic) {
          await supabase.from("social_accounts")
            .update({ profile_picture: finalPic, username: bizName })
            .eq("user_id", conn.user_id)
            .eq("platform", "whatsapp")
            .eq("platform_user_id", conn.platform_user_id || "");
        }
      }

      diagnostics.push(log);
      results.push({ name: conn.page_name, isTarget, fixed: isTarget && (!!finalPic || !conn.page_id) });
    }

    return new Response(JSON.stringify({ success: true, migrationLog, results, diagnostics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
