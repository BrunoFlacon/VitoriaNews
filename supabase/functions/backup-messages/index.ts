import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";

declare const Deno: any;

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

// AES-GCM Encryption using Web Crypto API
async function encryptMessageData(text: string, keyString: string): Promise<{ encryptedBase64: string, ivBase64: string }> {
  // Hash the keyString to get a valid 256-bit key
  const keyMaterial = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keyString));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    encodedText
  );

  const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
  const ivArray = Array.from(iv);
  
  const encryptedBase64 = btoa(Array.from(encryptedArray, (b) => String.fromCharCode(b)).join(""));
  const ivBase64 = btoa(Array.from(ivArray, (b) => String.fromCharCode(b)).join(""));
  
  return { encryptedBase64, ivBase64 };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const backupSecretKey = Deno.env.get("MESSAGE_BACKUP_KEY");
  if (!backupSecretKey) {
    console.error("[BACKUP] MESSAGE_BACKUP_KEY env var not set");
    return new Response(JSON.stringify({ error: "Server configuration error: backup key not set" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Buscar todos os usuários ativos
    const { data: users, error: usersError } = await supabase.from("profiles").select("user_id");
    if (usersError) throw usersError;

    console.log(`[BACKUP] Starting backup for ${users?.length} users.`);

    for (const user of (users || [])) {
      const userId = user.user_id;

      // 2. Buscar mensagens das últimas 24h
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", yesterday);

      if (msgError) {
        console.error(`[BACKUP] Error fetching messages for user ${userId}:`, msgError);
        continue;
      }

      if (!messages || messages.length === 0) continue;

      // 3. Agrupar por plataforma e chat
      const grouped = messages.reduce((acc: any, msg) => {
        const platform = msg.platform || "unknown";
        const chatId = msg.recipient_phone || msg.recipient_name || msg.channel_id || "general";
        const key = `${platform}:${chatId}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(msg);
        return acc;
      }, {});

      for (const [key, chatMsgs] of Object.entries(grouped)) {
        const [platform, chatId] = key.split(":");
        const content = JSON.stringify(chatMsgs);
        
        // 4. Criptografia forte (AES-GCM 256-bit) "Assim como funciona no WhatsApp e Telegram"
        const { encryptedBase64, ivBase64 } = await encryptMessageData(content, backupSecretKey);

        const payloadToSave = JSON.stringify({
          data: encryptedBase64,
          iv: ivBase64,
          algorithm: "AES-GCM",
          timestamp: new Date().toISOString()
        });

        const dateStr = new Date().toISOString().split("T")[0];
        const fileName = `${userId}/${platform}/${chatId}_${dateStr}.json.enc`;

        // 5. Salvar no Storage
        const { error: uploadError } = await supabase.storage
          .from("backups")
          .upload(fileName, payloadToSave, {
            contentType: "application/json",
            upsert: true
          });

        if (uploadError) {
          console.error(`[BACKUP] Upload error for ${fileName}:`, uploadError);
          continue;
        }

        // 6. Registrar na tabela de backups
        await supabase.from("message_backups").upsert({
          user_id: userId,
          platform,
          chat_id: chatId,
          backup_date: dateStr,
          file_path: fileName,
          metadata: { count: (chatMsgs as any[]).length, encrypted: true, algorithm: "AES-GCM" }
        }, { onConflict: "user_id,platform,chat_id,backup_date" });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Backups encrypted and processed successfully" }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" }
    });
  }
});

