import { PublishPayload } from './dispatcher.ts';
import { getPlatformCredentials } from "../credentials.ts";

export async function publishToX(supabase: any, payload: PublishPayload) {
  const { content, mediaUrls, userId } = payload;
  const creds = await getPlatformCredentials(supabase, userId || "", "twitter");

  if (!creds.accessToken) {
    throw new Error("X (Twitter) access token not found. Connect your account first.");
  }

  // X API v2 (Manage Tweets)
  const body: any = {
    text: content,
  };

  if (mediaUrls && mediaUrls.length > 0) {
    // Media upload is complex in X v1.1/v2
    // For now, we'll try to include the URL in the text if simple upload is not available
    // OR we'd need to implement the chunked upload.
    // Simplifying: append media URL if one is provided
    body.text = `${content}\n\n${mediaUrls[0]}`;
  }

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (data.errors) {
    throw new Error(`X API Error: ${data.errors[0].message}`);
  }

  return { success: true, platform: 'twitter', tweetId: data.data?.id };
}
