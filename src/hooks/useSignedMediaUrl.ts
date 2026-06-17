import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a fresh signed URL for a private media file.
 * Accepts either a storage path (e.g. "userId/file.jpg") or an existing
 * signed URL — in which case the file path is extracted and re-signed.
 */
export function useSignedMediaUrl(input: string | null | undefined, expiresIn = 3600, bucketOverride?: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!input) {
      setUrl(null);
      return;
    }

    if (!input.includes('supabase.co/storage/')) {
      setUrl(input);
      return;
    }

    const buckets = ["media", "documents", "avatars", "posts", "thumbnails"];
    let path = input;
    let bucket = bucketOverride || "media";

    // Extract path and bucket from the URL
    for (const b of buckets) {
      const signMarker = `/object/sign/${b}/`;
      const publicMarker = `/object/public/${b}/`;
      
      if (input.includes(signMarker)) {
        bucket = b;
        const tail = input.split(signMarker)[1] ?? "";
        path = decodeURIComponent(tail.split("?")[0]);
        break;
      } else if (input.includes(publicMarker)) {
        bucket = b;
        path = decodeURIComponent(input.split(publicMarker)[1] ?? "");
        break;
      }
    }

    if (path.startsWith("/")) path = path.substring(1);

    const checkAndSign = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (cancelled) return;
      if (error || !data) {
        setUrl(input); // fall back to original
      } else {
        setUrl(data.signedUrl);
      }
    };

    checkAndSign();


    return () => {
      cancelled = true;
    };
  }, [input, expiresIn, bucketOverride]);

  return url;
}
