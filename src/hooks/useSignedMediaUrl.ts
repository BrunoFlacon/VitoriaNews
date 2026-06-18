import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const exp = payload.exp;
    if (typeof exp === 'number') {
      return exp * 1000 < Date.now();
    }
  } catch (e) {
    return true;
  }
  return true;
}

function isSupabaseUrlExpired(url: string): boolean {
  if (!url) return false;
  const match = url.match(/[?&]token=([^&]+)/);
  if (!match) return false;
  return isTokenExpired(match[1]);
}

/**
 * Generates a fresh signed URL for a private media file.
 * Accepts either a storage path (e.g. "userId/file.jpg") or an existing
 * signed URL — in which case the file path is extracted and re-signed.
 */
export function useSignedMediaUrl(input: string | null | undefined, expiresIn = 3600, bucketOverride?: string) {
  const getInitialUrl = () => {
    if (!input) return null;
    if (!input.includes('supabase.co/storage/')) return input;
    if (input.includes('token=') && isSupabaseUrlExpired(input)) {
      return null;
    }
    return input;
  };

  const [url, setUrl] = useState<string | null>(getInitialUrl);

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

    if (input.includes('token=') && !isSupabaseUrlExpired(input)) {
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
