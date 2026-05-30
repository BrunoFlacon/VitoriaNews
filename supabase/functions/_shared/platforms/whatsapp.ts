import { PublishPayload, ContentType } from './dispatcher.ts';
import { getMetaCredentials } from "../credentials.ts";

function buildWhatsAppBody(payload: PublishPayload): any {
  const { content, mediaUrls, options } = payload;
  const recipient = options?.recipientPhone || options?.chatId;
  const base: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
  };

  if (payload.contentType === 'location') {
    const coords = content.split(',').map(Number);
    base.type = "location";
    base.location = {
      longitude: coords[1] || 0,
      latitude: coords[0] || 0,
      name: options?.locationName || "",
      address: options?.locationAddress || ""
    };
    return base;
  }

  if (payload.contentType === 'contact') {
    base.type = "contacts";
    base.contacts = [{ name: { formatted_name: content }, phones: [{ phone: options?.recipientPhone || "", type: "MAIN" }] }];
    return base;
  }

  if (payload.contentType === 'text') {
    base.type = "text";
    base.text = { preview_url: true, body: content };
    return base;
  }

  if (payload.contentType === 'sticker') {
    base.type = "sticker";
    base.sticker = { link: mediaUrls?.[0] || "" };
    return base;
  }

  if (payload.contentType === 'image') {
    base.type = "image";
    base.image = { link: mediaUrls?.[0] || "", caption: content };
    return base;
  }

  if (payload.contentType === 'video') {
    base.type = "video";
    base.video = { link: mediaUrls?.[0] || "", caption: content };
    return base;
  }

  if (payload.contentType === 'audio' || payload.contentType === 'voice') {
    base.type = "audio";
    base.audio = { link: mediaUrls?.[0] || "" };
    return base;
  }

  if (payload.contentType === 'document') {
    const filename = options?.filename || options?.fileName || "document";
    base.type = "document";
    base.document = {
      link: mediaUrls?.[0] || "",
      caption: content,
      filename
    };
    return base;
  }

  base.type = "text";
  base.text = { preview_url: true, body: content };
  return base;
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
  const body = buildWhatsAppBody(payload);

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

  return { success: true, platform: 'whatsapp', messageId: data.messages?.[0]?.id };
}
