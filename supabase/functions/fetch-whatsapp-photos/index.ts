// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

async function fetchProfilePhoto(
  phoneId: string,
  accessToken: string,
  wabaId?: string,
  platformUserId?: string
): Promise<string> {
  let profilePic = "";

  // Priority 1: whatsapp_business_profile
  try {
    const res = await fetch(
      `${GRAPH_API}/${phoneId}/whatsapp_business_profile?fields=profile_picture_url&access_token=${accessToken}`
    );
    if (res.ok) {
      const data = await res.json();
      profilePic = data.data?.[0]?.profile_picture_url || data.profile_picture_url || "";
    }
  } catch {}

  // Priority 2: Direct phone number node
  if (!profilePic) {
    try {
      const res = await fetch(
        `${GRAPH_API}/${phoneId}?fields=display_phone_number,profile_photo_url,verified_name&access_token=${accessToken}`
      );
      if (res.ok) {
        const data = await res.json();
        profilePic = data.profile_photo_url || "";
      }
    } catch {}
  }

  // Priority 3: WABA phone_numbers collection
  if (!profilePic && wabaId) {
    try {
      const res = await fetch(
        `${GRAPH_API}/${wabaId}/phone_numbers?fields=display_phone_number,profile_photo_url,verified_name&access_token=${accessToken}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.data?.length > 0) {
          profilePic = data.data[0].profile_photo_url || "";
        }
      }
    } catch {}
  }

  // Priority 4: Facebook Page fallback
  if (!profilePic && platformUserId) {
    try {
      const res = await fetch(
        `${GRAPH_API}/${platformUserId}/picture?redirect=false&type=large&access_token=${accessToken}`
      );
      if (res.ok) {
        const data = await res.json();
        profilePic = data.data?.url || "";
      }
    } catch {}
  }

  return profilePic;
}

async function uploadToStorage(
  supabase: any,
  url: string,
  fileName: string
): Promise<string | null> {
  try {
    const imgResp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.facebook.com/",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!imgResp.ok) return null;

    const blob = await imgResp.blob();
    const ct = imgResp.headers.get("content-type") || "image/png";
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const path = `whatsapp/${fileName}.${ext}`;

    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(path, blob, { contentType: ct, upsert: true });

    if (error) return null;

    const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth — try Bearer token first, fall back to query param
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) userId = user.id;
      } catch (e) {
        console.error("[FETCH-WA-PHOTOS] Auth error:", e);
      }
    }

    // Fallback: try user_id from body or query
    if (!userId) {
      const url = new URL(req.url);
      userId = url.searchParams.get("user_id");
    }
    if (!userId) {
      const body = await req.json().catch(() => ({}));
      userId = body.user_id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized", hint: "Pass Authorization header or user_id in body" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all WhatsApp connections for this user
    const { data: connections, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "whatsapp");

    if (connError) throw connError;

    const results: Array<{
      connection_id: string;
      page_name: string;
      photo_url: string | null;
      conversations_updated: number;
      error?: string;
    }> = [];

    for (const conn of connections ?? []) {
      const phoneId = conn.phone_number_id || conn.page_id;
      const accessToken = conn.access_token;

      if (!phoneId || !accessToken) {
        results.push({
          connection_id: conn.id,
          page_name: conn.page_name || "?",
          photo_url: null,
          conversations_updated: 0,
          error: "No phone_number_id or access_token",
        });
        continue;
      }

      try {
        // Fetch profile photo via 4-priority cascade
        const rawPicUrl = await fetchProfilePhoto(
          phoneId,
          accessToken,
          conn.waba_id || conn.platform_user_id,
          conn.platform_user_id
        );

        let finalUrl = rawPicUrl;

        // Upload to Supabase Storage for permanent serving
        if (rawPicUrl && rawPicUrl.startsWith("http")) {
          const uploaded = await uploadToStorage(
            supabase,
            rawPicUrl,
            `${userId}_${conn.id}`
          );
          if (uploaded) finalUrl = uploaded;
        }

        // Update social_connections
        if (finalUrl) {
          await supabase
            .from("social_connections")
            .update({
              profile_image_url: finalUrl,
              metadata: {
                ...(conn.metadata || {}),
                avatar_url: finalUrl,
                avatar_fetched_at: new Date().toISOString(),
              },
            } as any)
            .eq("id", conn.id);
        }

        // Update all whatsapp_conversations for this connection
        let conversationsUpdated = 0;
        if (finalUrl) {
          const { data: convos } = await supabase
            .from("whatsapp_conversations")
            .select("id")
            .eq("connection_id", conn.id)
            .eq("user_id", userId);

          for (const convo of convos ?? []) {
            await supabase
              .from("whatsapp_conversations")
              .update({ avatar_url: finalUrl })
              .eq("id", convo.id);
            conversationsUpdated++;
          }

          // Also update contacts table if linked
          for (const convo of convos ?? []) {
            if (convo.id) {
              const { data: fullConvo } = await supabase
                .from("whatsapp_conversations")
                .select("contact_id")
                .eq("id", convo.id)
                .maybeSingle();

              if (fullConvo?.contact_id) {
                await supabase
                  .from("contacts")
                  .update({ avatar_url: finalUrl })
                  .eq("id", fullConvo.contact_id);
              }
            }
          }
        }

        results.push({
          connection_id: conn.id,
          page_name: conn.page_name || "?",
          photo_url: finalUrl,
          conversations_updated: conversationsUpdated,
        });
      } catch (e) {
        results.push({
          connection_id: conn.id,
          page_name: conn.page_name || "?",
          photo_url: null,
          conversations_updated: 0,
          error: String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        connections_processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[FETCH-WA-PHOTOS] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
