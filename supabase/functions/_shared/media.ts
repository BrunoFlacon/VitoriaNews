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
    
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      console.warn(`[MEDIA] Failed to fetch remote image: ${response.statusText}`);
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

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[MEDIA] Caching process failed:", err);
    return remoteUrl;
  }
}
