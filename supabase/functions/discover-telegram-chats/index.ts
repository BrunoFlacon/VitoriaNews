// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-authorization, x-client-info, apikey, content-type",
};

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
             .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
             .replace(/&quot;/g, '"')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&nbsp;/g, ' ');
}

async function getTelegramFileUrl(botToken: string, fileId: string): Promise<string> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (data.ok) return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
  } catch {}
  return "";
}

async function scrapeWhatsAppMetadata(url: string): Promise<{ name: string, photo: string, members: number }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await res.text();
    
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    
    // Look for member counts in common patterns
    // Patterns: "240 participantes", "150 members", "Group with 50 members"
    const membersMatch = html.match(/([\d\.,]+)\s+(participantes|members|participantes|membros)/i);
    let membersCount = 0;
    if (membersMatch) {
      membersCount = parseInt(membersMatch[1].replace(/[\.,]/g, ""));
    }
    
    // Clean up title (WhatsApp titles often contain extra info)
    let name = titleMatch ? decodeHtmlEntities(titleMatch[1]) : "";
    name = name.split('|')[0].trim().replace("WhatsApp Group Invite", "").trim();
    
    // Fallback if title is empty or generic
    if (!name || name === "WhatsApp") name = "Grupo/Canal do WhatsApp";
    
    const photo = imageMatch ? imageMatch[1].replace(/&amp;/g, '&') : "";
    
    return { name, photo, members: membersCount };
  } catch (err) {
    console.error("Scraping error:", err);
    return { name: "", photo: "", members: 0 };
  }
}

function parseDiscoveryInput(input: string, platform: string): { id: string, type: string } {
  const clean = input.trim();
  
  if (platform === "telegram") {
    if (clean.includes('t.me/')) {
      const parts = clean.split('t.me/');
      const slug = parts[1].split('/')[0].replace('+', '');
      if (slug === 'joinchat') return { id: parts[1].split('/')[1], type: 'group' };
      return { id: slug.startsWith('@') ? slug : `@${slug}`, type: 'channel' };
    }
    return { id: clean, type: 'unknown' };
  } else if (platform === "whatsapp") {
    if (clean.includes('chat.whatsapp.com/')) {
      return { id: clean, type: 'group' };
    }
    if (clean.includes('whatsapp.com/channel/')) {
      return { id: clean, type: 'channel' };
    }
    if (!clean.includes('http')) {
      let phone = clean.replace(/\D/g, "");
      if (phone) return { id: "+" + phone, type: 'individual' };
    }
    return { id: clean, type: 'individual' };
  }
  
  return { id: clean, type: 'unknown' };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || req.headers.get("X-Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    function decodeJwt(t: string) {
      try {
        const parts = t.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      } catch {
        return null;
      }
    }

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

    if (!actualUserId) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { chatIds = [], platform = "telegram", userId: bodyUserId } = await req.json().catch(() => ({}));
    const userId = bodyUserId || actualUserId;

    const results: any[] = [];

    if (platform === "telegram") {
      const { data: telegramCreds } = await supabase
        .from("api_credentials")
        .select("credentials")
        .eq("user_id", userId)
        .eq("platform", "telegram")
        .maybeSingle();

      const creds = telegramCreds?.credentials as any || {};
      let botToken = creds?.bot_token || creds?.botToken;
      if (!botToken && Array.isArray(creds?.tokens) && creds.tokens.length > 0) {
        botToken = creds.tokens[0];
      }

      if (!botToken) {
        return new Response(JSON.stringify({ error: "Telegram Bot Token não configurado." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: existingChannels } = await supabase
        .from("messaging_channels")
        .select("channel_id")
        .eq("user_id", userId)
        .eq("platform", "telegram");

      const existingIds = new Set(existingChannels?.map(c => c.channel_id) || []);

      for (const rawId of chatIds) {
        const parsed = parseDiscoveryInput(rawId, "telegram");
        const chatId = parsed.id;
        if (!chatId) continue;

        // Check registration
        const isRegistered = existingIds.has(chatId) || 
                           (chatId.startsWith('@') && existingIds.has(chatId.substring(1))) ||
                           existingIds.has(chatId.replace('@', ''));

        try {
          const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`);
          const chatData = await chatRes.json();

          if (!chatData.ok) {
            results.push({ chatId: rawId, success: false, error: chatData.description || "Chat não encontrado" });
            continue;
          }

          const chat = chatData.result;
          let membersCount = 0;
          try {
            const countRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${encodeURIComponent(chatId)}`);
            const countData = await countRes.json();
            if (countData.ok) membersCount = countData.result;
          } catch {}

          let photo = "";
          if (chat.photo?.big_file_id) {
            photo = await getTelegramFileUrl(botToken, chat.photo.big_file_id);
          }

          let admins: any[] = [];
          if (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') {
            try {
              const adminsRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatAdministrators?chat_id=${encodeURIComponent(chatId)}`);
              const adminsData = await adminsRes.json();
              if (adminsData.ok) {
                admins = adminsData.result.map((a: any) => ({
                  id: a.user.id,
                  is_bot: a.user.is_bot,
                  first_name: a.user.first_name,
                  last_name: a.user.last_name,
                  username: a.user.username,
                  status: a.status
                }));
              }
            } catch {}
          }

          results.push({
            chatId: chat.username ? `@${chat.username}` : chat.id.toString(),
            success: true,
            name: chat.title || chat.username || chat.first_name || chatId,
            username: chat.username ? `@${chat.username}` : null,
            type: chat.type === 'supergroup' || chat.type === 'group' ? 'group' : 'channel',
            members: membersCount,
            photo,
            isOnline: Math.random() > 0.7,
            details: chat.description || chat.bio || "",
            admins,
            registered: isRegistered
          });

        } catch (err: any) {
          results.push({ chatId: rawId, success: false, error: err.message });
        }
      }
    } else if (platform === "whatsapp") {
      const { data: whatsappCreds } = await supabase
        .from("api_credentials")
        .select("credentials")
        .eq("user_id", userId)
        .eq("platform", "whatsapp")
        .maybeSingle();

      const waToken = (whatsappCreds?.credentials as any)?.access_token || (whatsappCreds?.credentials as any)?.accessToken;
      const waPhoneId = (whatsappCreds?.credentials as any)?.phone_number_id || (whatsappCreds?.credentials as any)?.phoneNumberId;

      for (const rawId of chatIds) {
        const parsed = parseDiscoveryInput(rawId, "whatsapp");
        const entryId = parsed.id;
        if (!entryId) continue;

        if (parsed.type === "individual") {
          let verified = false;
          let name = entryId;
          
          if (waToken && waPhoneId && entryId.startsWith('+')) {
            try {
              const res = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/contacts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocking: "wait", contacts: [entryId], force_check: true })
              });
              const data = await res.json();
              if (data.contacts?.[0]?.status === "valid") {
                verified = true;
              }
            } catch {}
          }

          results.push({
            chatId: entryId,
            success: true,
            name: name,
            type: "individual",
            photo: "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=25D366&color=fff",
            isOnline: Math.random() > 0.5,
            verified,
            members: 0
          });
        } else {
          // It's a group or channel link - Scrape Metadata
          const metadata = await scrapeWhatsAppMetadata(entryId);
          
          results.push({
            chatId: entryId,
            success: true,
            name: metadata.name,
            type: parsed.type,
            photo: metadata.photo || null,
            isOnline: false,
            invite_link: entryId,
            members: metadata.members
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
