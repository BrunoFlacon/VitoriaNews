import { PublishPayload } from './dispatcher.ts';
import { getMetaCredentials } from "../credentials.ts";

// Limite de caption da Cloud API do WhatsApp
const CAPTION_LIMIT = 1024;

// Sobe a mídia para o WhatsApp (media_id) — elimina dependência de URL pública
async function uploadWhatsAppMedia(
  accessToken: string,
  phoneNumberId: string,
  mediaUrl: string,
  mimeType: string,
  fileName: string
): Promise<string> {
  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) {
    throw new Error(`WhatsApp media: não foi possível baixar o arquivo da URL (HTTP ${fileRes.status}).`);
  }
  const bytes = new Uint8Array(await fileRes.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("WhatsApp media: arquivo vazio (0 bytes).");
  }

  const boundary = `----SocialCanvasHub${Date.now().toString(36)}`;
  const encoder = new TextEncoder();
  const lines: Uint8Array[] = [];
  const push = (s: string) => lines.push(encoder.encode(s));

  push(`--${boundary}\r\n`);
  push(`Content-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`);
  push(`--${boundary}\r\n`);
  push(`Content-Disposition: form-data; name="type"\r\n\r\n${mimeType}\r\n`);
  push(`--${boundary}\r\n`);
  push(`Content-Disposition: form-data; name="file"; filename="${fileName.replace(/[^\w.\-]/g, "_")}"\r\n`);
  push(`Content-Type: ${mimeType}\r\n\r\n`);
  lines.push(bytes);
  push(`\r\n--${boundary}--\r\n`);

  let totalLength = 0;
  for (const l of lines) totalLength += l.byteLength;
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const l of lines) {
    body.set(l, offset);
    offset += l.byteLength;
  }

  const uploadRes = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": String(totalLength),
      },
      body,
    }
  );
  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !uploadData?.id) {
    throw new Error(`WhatsApp media upload error: ${uploadData?.error?.message || `HTTP ${uploadRes.status}`}`);
  }
  return uploadData.id;
}

async function ensureWhatsAppConversation(
  supabase: any,
  phoneNumberId: string,
  recipient: string,
  userId: string,
  content: string,
  postId?: string
): Promise<string | null> {
  const { data: conn } = await supabase
    .from("social_connections")
    .select("id")
    .eq("platform", "whatsapp")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();
  if (!conn) return null;

  let contactName = recipient;
  if (postId) {
    const { data: msg } = await supabase
      .from("messages")
      .select("recipient_name")
      .eq("id", postId)
      .maybeSingle();
    if (msg?.recipient_name) contactName = msg.recipient_name;
  }

  const { data: existing } = await supabase
    .from("whatsapp_conversations")
    .select("id")
    .eq("connection_id", conn.id)
    .eq("contact_wa_id", recipient)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_preview: content,
        last_message_at: new Date().toISOString(),
        contact_name: contactName,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: newConv } = await supabase
    .from("whatsapp_conversations")
    .insert({
      user_id: userId,
      connection_id: conn.id,
      contact_wa_id: recipient,
      contact_name: contactName,
      last_message_preview: content,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    })
    .select("id")
    .maybeSingle();

  return newConv?.id || null;
}

export async function publishToWhatsApp(supabase: any, payload: PublishPayload) {
  const { content, mediaUrls, userId, options } = payload;
  const meta = await getMetaCredentials(supabase, userId || "", "whatsapp", options?.targetProfileId);

  if (!meta.accessToken || !meta.phoneNumberId) {
    throw new Error("WhatsApp access token or Phone Number ID not found. Connect your account first.");
  }
  
  const recipient = options?.recipientPhone || options?.chatId;
  if (!recipient) {
    throw new Error("Recipient phone number is required for WhatsApp.");
  }

  const url = `https://graph.facebook.com/v21.0/${meta.phoneNumberId}/messages`;

  /** Infer media type from URL/file extension */
  function inferMediaType(url: string): "image" | "video" | "audio" | "document" {
    const ext = url.split(".").pop()?.toLowerCase() || "";
    if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "opus", "aac", "m4a"].includes(ext)) return "audio";
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
    if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "rar"].includes(ext)) return "document";
    return "document"; // default to document for unknown types
  }

  /** Detect mime type category from URL for WhatsApp API */
  function mimeCategory(url: string): string {
    const ext = url.split(".").pop()?.toLowerCase() || "";
    if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video/mp4";
    if (["mp3", "wav", "ogg", "opus", "aac", "m4a"].includes(ext)) return "audio/ogg";
    if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
    if (["png"].includes(ext)) return "image/png";
    if (["gif"].includes(ext)) return "image/gif";
    if (["webp"].includes(ext)) return "image/webp";
    if (["pdf"].includes(ext)) return "application/pdf";
    return "application/octet-stream";
  }

  const body: any = {
    messaging_product: "whatsapp",
    to: recipient,
  };

  // --- TEMPLATE MESSAGE ---
  if (options?.templateName) {
    body.type = "template";
    body.template = {
      name: options.templateName,
      language: {
        code: options.templateLanguage || "pt_BR",
      },
    };
    // Add template variables if provided
    if (options.templateVariables) {
      const vars = typeof options.templateVariables === "string"
        ? JSON.parse(options.templateVariables)
        : options.templateVariables;
      const params = Object.values(vars).map((v: any) => ({
        type: "text",
        text: String(v),
      }));
      if (params.length > 0) {
        body.template.components = [
          { type: "body", parameters: params },
        ];
      }
    }
    // Header media for template (image/video/document)
    if (options.templateHeaderMediaUrl) {
      const headerType = inferMediaType(options.templateHeaderMediaUrl);
      const headerComponent: any = {
        type: "header",
        parameters: [
          {
            type: headerType === "video" ? "video" : headerType === "document" ? "document" : "image",
            [headerType === "video" ? "video" : headerType === "document" ? "document" : "image"]: {
              link: options.templateHeaderMediaUrl,
            },
          },
        ],
      };
      if (!body.template.components) body.template.components = [];
      body.template.components.unshift(headerComponent);
    }
  }
  // --- MEDIA MESSAGE (image/video/audio/document) ---
  else if (mediaUrls && mediaUrls.length > 0) {
    const mediaType = inferMediaType(mediaUrls[0]);
    body.type = mediaType;
    const mediaField: any = {
      link: mediaUrls[0],
    };
    // Caption only for image/video/document (not audio)
    if (mediaType !== "audio" && content) {
      mediaField.caption = content;
    }
    // Filename for documents
    if (mediaType === "document") {
      const fileName = mediaUrls[0].split("/").pop() || "file";
      mediaField.filename = fileName;
    }
    body[mediaType] = mediaField;
  }
  // --- TEXT MESSAGE ---
  else {
    body.type = "text";
    body.text = {
      body: content || "",
      preview_url: true,
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${meta.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`WhatsApp API Error: ${data.error.message}`);
  }

  const convId = await ensureWhatsAppConversation(
    supabase, meta.phoneNumberId, recipient, userId, content, options?.postId
  );

  if (convId && options?.postId) {
    await supabase
      .from("messages")
      .update({ conversation_id: convId })
      .eq("id", options.postId);
  }

  return { success: true, platform: 'whatsapp', messageId: data.messages?.[0]?.id, conversationId: convId };
}
