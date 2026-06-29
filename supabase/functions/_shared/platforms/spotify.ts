import { PublishPayload } from './dispatcher.ts';
import { getPlatformCredentials } from "../credentials.ts";

export async function publishToSpotify(supabase: any, payload: PublishPayload): Promise<any> {
  const { content, mediaUrls, userId, contentType } = payload;
  const creds = await getPlatformCredentials(supabase, userId || "", "spotify");

  if (!creds.accessToken) {
    throw new Error("Spotify access token not found. Connect your account first.");
  }

  if (contentType === "audio" || contentType === "video") {
    const playlistName = content.slice(0, 100) || "My Post";
    const playlistRes = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: playlistName,
        description: `Published via Social Canvas Hub — ${new Date().toISOString().split('T')[0]}`,
        public: false
      })
    });

    const playlistData = await playlistRes.json();
    if (playlistData.error) {
      throw new Error(`Spotify API Error: ${playlistData.error.message}`);
    }

    return {
      success: true,
      platform: 'spotify',
      playlistId: playlistData.id,
      playlistUrl: playlistData.external_urls?.spotify || "",
      type: contentType,
    };
  }

  return { success: true, platform: 'spotify', info: 'Spotify text note recorded.' };
}
