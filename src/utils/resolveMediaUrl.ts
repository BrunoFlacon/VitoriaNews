import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve o file_url de uma mídia em URL de exibição:
 * - Paths relativos → publicUrl padrão;
 * - URLs do nosso storage (signed/public/self-hosted) → extrai o path e monta publicUrl;
 * - URLs absolutas de terceiros → usa direto.
 */
export function resolveMediaUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;

  // 1. Path relativo simples (UUID.ext) → publicUrl padrão (caso mais comum)
  if (!fileUrl.startsWith("http")) {
    const { data: pub } = supabase.storage.from("media").getPublicUrl(fileUrl);
    return pub?.publicUrl || null;
  }

  // 2. URLs do nosso storage — extrai o path para gerar publicUrl limpo
  //    Trata: supabase.co, supabase-kong:8000, kong:8000, localhost:*/supabase
  const storageMarkers = [
    "/object/sign/media/",
    "/object/public/media/",
    "/object/sign/documents/",
    "/object/public/documents/",
  ];

  let extractedPath: string | null = null;

  for (const marker of storageMarkers) {
    if (fileUrl.includes(marker)) {
      extractedPath = decodeURIComponent(
        fileUrl.split(marker)[1]?.split("?")[0] ?? "",
      );
      break;
    }
  }

  // Fallback: handle self-hosted URLs like http://supabase-kong:8000/storage/v1/object/public/media/...
  if (!extractedPath) {
    const bucketMatch = fileUrl.match(
      /\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\//,
    );
    if (bucketMatch) {
      // Use the regex match's end position to get the remainder after bucket
      const matchEnd = bucketMatch.index! + bucketMatch[0].length;
      const remainder = fileUrl.substring(matchEnd);
      extractedPath = decodeURIComponent(remainder.split("?")[0]);
    }
  }

  if (extractedPath) {
    if (extractedPath.startsWith("/")) extractedPath = extractedPath.substring(1);
    if (extractedPath) {
      const { data: pub } = supabase.storage
        .from("media")
        .getPublicUrl(extractedPath);
      return pub?.publicUrl || fileUrl;
    }
  }

  // 3. URLs de terceiros — usar direto
  return fileUrl;
}
