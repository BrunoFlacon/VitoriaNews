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
    return remoteUrl; // Already cached or data URI
  }

  try {
    console.log(`[MEDIA] Caching image for ${platform}:${platformUserId} from ${remoteUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    let response: Response;
    try {
      response = await fetch(remoteUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr?.name === 'AbortError') {
        console.warn(`[MEDIA] Fetch timeout for ${platform} image — returning original URL`);
      } else {
        console.warn(`[MEDIA] Fetch error for ${platform} image:`, fetchErr?.message);
      }
      return remoteUrl;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[MEDIA] Failed to fetch remote image: ${response.status} ${response.statusText}`);
      return remoteUrl;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const extension = contentType.split("/")[1] || "jpg";
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    // Deterministic path: profiles/[platform]/[platform_user_id].ext
    // We use platformUserId to avoid duplicates if multiple users follow the same channel (though unlikely for private profiles)
    const fileName = `${platformUserId}.${extension}`;
    const filePath = `profiles/${platform}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error("[MEDIA] Upload error:", error);
      return remoteUrl;
    }

    const { data: signedData } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, 365 * 24 * 60 * 60);
    return signedData?.signedUrl || remoteUrl;
  } catch (err) {
    console.error("[MEDIA] Caching process failed:", err);
    return null;
  }
}
