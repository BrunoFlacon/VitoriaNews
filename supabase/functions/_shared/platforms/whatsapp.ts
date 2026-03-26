import { PublishPayload } from './dispatcher.ts';
import { getMetaCredentials } from "../credentials.ts";

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

  const body: any = {
    messaging_product: "whatsapp",
    to: recipient,
  };

  if (mediaUrls && mediaUrls.length > 0) {
    body.type = "image";
    body.image = {
      link: mediaUrls[0],
      caption: content,
    };
  } else {
    body.type = "text";
    body.text = {
      body: content,
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

  return { success: true, platform: 'whatsapp', messageId: data.messages?.[0]?.id };
}
