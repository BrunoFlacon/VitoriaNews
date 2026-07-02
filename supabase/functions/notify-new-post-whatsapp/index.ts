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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { connection_id, user_id, title, content, media_url, platform } = await req.json();

    if (!connection_id || !user_id) {
      return new Response(JSON.stringify({
        success: false,
        error: "connection_id and user_id are required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the WhatsApp connection details
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("user_id", user_id)
      .eq("platform", "whatsapp")
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({
        success: false,
        error: "WhatsApp connection not found"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve access token and phone number ID
    let accessToken = connection.access_token;
    let phoneNumberId = connection.phone_number_id;

    if (!phoneNumberId) {
      const { data: apiCred } = await supabase
        .from("api_credentials")
        .select("credentials")
        .eq("user_id", user_id)
        .eq("platform", "whatsapp")
        .maybeSingle();

      if (apiCred?.credentials) {
        phoneNumberId = apiCred.credentials.phone_number_id;
        if (!accessToken && apiCred.credentials.access_token) {
          accessToken = apiCred.credentials.access_token;
        }
      }
    }

    if (!phoneNumberId || !accessToken) {
      return new Response(JSON.stringify({
        success: false,
        error: "Could not resolve WhatsApp API credentials"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build message text
    const platformLabel = platform || "redes sociais";
    const messageTitle = title || content?.substring(0, 100) || "Novo post!";
    const fullContent = content ? `${messageTitle}\n\n${content.substring(0, 1000)}` : messageTitle;

    // Fetch recent contacts (last 50 people who sent messages to this WABA)
    const { data: recentContacts } = await supabase
      .from("messages")
      .select("sender_id, sender_name, recipient_phone")
      .eq("user_id", user_id)
      .eq("platform", "whatsapp")
      .not("sender_id", "is", null)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (!recentContacts || recentContacts.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No recent contacts found for this WhatsApp account"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate by sender_id
    const seen = new Set();
    const uniqueContacts = recentContacts.filter(c => {
      const key = c.sender_id || c.recipient_phone;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Send notification via Meta Cloud API
    const sendResults: any[] = [];
    let sentCount = 0;
    let failCount = 0;

    for (const contact of uniqueContacts) {
      const to = contact.sender_id?.replace(/[^0-9]/g, "") || contact.recipient_phone?.replace(/[^0-9]/g, "");
      if (!to || to.length < 7) {
        failCount++;
        continue;
      }

      const msgBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: fullContent }
      };

      if (media_url) {
        msgBody.type = "media";
        (msgBody as any).media = {
          link: media_url,
          caption: messageTitle
        };
        delete (msgBody as any).text;
        (msgBody as any).type = "image";
      }

      try {
        const msgResp = await fetchWithTimeout(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(msgBody),
          }
        );

        const msgData = await msgResp.json();
        if (msgResp.ok && msgData.messages?.[0]?.id) {
          sentCount++;
          sendResults.push({ to, wa_message_id: msgData.messages[0].id, status: "sent" });
        } else {
          failCount++;
          sendResults.push({ to, error: msgData.error?.message || `HTTP ${msgResp.status}`, status: "failed" });
        }
      } catch (err) {
        failCount++;
        sendResults.push({ to, error: String(err), status: "failed" });
      }
    }

    // Log the notification broadcast
    await supabase.from("messages").insert({
      user_id,
      platform: "whatsapp",
      platform_user_id: connection.platform_user_id,
      sender_id: phoneNumberId,
      sender_name: connection.page_name || "Sistema",
      recipient_phone: "broadcast",
      content: `[Notificação Automática] Novo post publicado: ${messageTitle}. Enviado para ${sentCount} contatos.`,
      status: sentCount > 0 ? "sent" : "failed",
      message_type: "broadcast",
      direction: "outgoing",
      metadata: {
        is_system_log: true,
        broadcast_total: uniqueContacts.length,
        broadcast_sent: sentCount,
        broadcast_failed: failCount,
        post_title: messageTitle,
        connection_id,
      },
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      sentCount,
      failCount,
      total: uniqueContacts.length,
      results: sendResults,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
