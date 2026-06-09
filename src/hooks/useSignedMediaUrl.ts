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

    if (!input.includes('supabase.co/storage/')) {
      setUrl(input);
      return;
    }

    let path = input;
    const marker = "/object/sign/media/";
    if (input.includes(marker)) {
      const tail = input.split(marker)[1] ?? "";
      path = decodeURIComponent(tail.split("?")[0]);
    } else if (input.includes("/object/public/media/")) {
      path = decodeURIComponent(input.split("/object/public/media/")[1] ?? "");
    }

    if (!path) {
      setUrl(null);
      return;
    }

    const checkAndSign = async () => {
      const { data: fileList, error: listError } = await supabase.storage
        .from('media')
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop(),
          limit: 1,
        });

      if (cancelled) return;

      if (listError || !fileList?.length) {
        setUrl(null);
        return;
      }

      const { data, error } = await supabase.storage
        .from('media')
        .createSignedUrl(path, expiresIn);

      if (cancelled) return;
      if (error || !data) {
        setUrl(null);
      } else {
        setUrl(data.signedUrl);
      }
    };

    checkAndSign();

    return () => {
      cancelled = true;
    };
  }, [input, expiresIn]);

  return url;
}
