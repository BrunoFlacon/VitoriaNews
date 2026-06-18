import { useMemo } from "react";
import { getMediaUrl } from "@/utils/mediaUtils";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";

export function useResolvedMediaUrl(input: string | null | undefined): string | null {
  const fullUrl = useMemo(() => getMediaUrl(input), [input]);
  const signedUrl = useSignedMediaUrl(fullUrl);

  return useMemo(() => {
    if (!input) return null;

    if (signedUrl) return signedUrl;

    if (fullUrl && fullUrl.includes('supabase.co/storage/')) return null;

    return fullUrl || null;
  }, [input, fullUrl, signedUrl]);
}
