import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Downloads a remote image and saves it to Supabase Storage (media bucket).
 * This prevents broken images when social media URLs expire (like Meta's).
 */
export async function cacheProfileImage(
  supabase: any,
  userId: string,
  platform: string,
  remoteUrl: string,
  platformUserId: string
): Promise<string | null> {
  if (!remoteUrl || remoteUrl.startsWith('data:') || remoteUrl.includes('supabase.co')) {
    return remoteUrl;
  }

  // Never persist raw Meta CDN/Graph URLs — return null on failure so callers keep last cache
  const isEphemeralUrl = remoteUrl.includes('fbcdn') || remoteUrl.includes('graph.facebook.com');

  const attempt = async (): Promise<string | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(remoteUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr?.name === 'AbortError') {
        console.warn(`[MEDIA] Fetch timeout for ${platform} image`);
      } else {
        console.warn(`[MEDIA] Fetch error for ${platform} image:`, fetchErr?.message);
      }
      return null;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[MEDIA] Failed to fetch remote image: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = contentType.split("/")[1] || "jpg";
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    const filePath = `profiles/${platform}/${platformUserId}.${ext}`;

    const { error } = await supabase.storage
      .from('media')
      .upload(filePath, buffer, { contentType, upsert: true });

    if (error) {
      console.error("[MEDIA] Upload error:", error);
      return null;
    }

    const { data: signedData } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, 365 * 24 * 60 * 60);
    return signedData?.signedUrl || null;
  };

  try {
    console.log(`[MEDIA] Caching image for ${platform}:${platformUserId}`);
    let result = await attempt();
    if (!result) {
      console.log(`[MEDIA] Retrying once for ${platform}:${platformUserId}...`);
      await new Promise(r => setTimeout(r, 1000));
      result = await attempt();
    }
    if (!result && !isEphemeralUrl) {
      return remoteUrl; // non-ephemeral URLs are safe to return as fallback
    }
    return result; // null on failure for ephemeral URLs
  } catch (err) {
    console.error("[MEDIA] Caching process failed:", err);
    return null;
  }
}
