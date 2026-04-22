import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a fresh signed URL for a private media file.
 * Accepts either a storage path (e.g. "userId/file.jpg") or an existing
 * signed URL — in which case the file path is extracted and re-signed.
 */
export function useSignedMediaUrl(input: string | null | undefined, expiresIn = 3600) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!input) {
      setUrl(null);
      return;
    }

    // Extract path from a previously signed URL if needed
    let path = input;
    const marker = "/object/sign/media/";
    if (input.includes(marker)) {
      const tail = input.split(marker)[1] ?? "";
      path = decodeURIComponent(tail.split("?")[0]);
    } else if (input.includes("/object/public/media/")) {
      path = decodeURIComponent(input.split("/object/public/media/")[1] ?? "");
    }

    supabase.storage
      .from("media")
      .createSignedUrl(path, expiresIn)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setUrl(input); // fall back to original
        } else {
          setUrl(data.signedUrl);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [input, expiresIn]);

  return url;
}
