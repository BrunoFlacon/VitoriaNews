// _shared/media.ts — Detecção de tipo e orientação de mídia compartilhada
// por todos os adapters (substitui inferências duplicadas/incompletas).

export type MediaKind = 'image' | 'video' | 'audio' | 'document';

const EXT_TO_KIND: Record<string, MediaKind> = {
  // Imagens
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  bmp: 'image', svg: 'image', avif: 'image', heic: 'image', heif: 'image',
  // Vídeos
  mp4: 'video', mov: 'video', webm: 'video', avi: 'video', mkv: 'video',
  m4v: 'video', mpeg: 'video', mpg: 'video', '3gp': 'video', ts: 'video',
  // Áudio
  mp3: 'audio', wav: 'audio', ogg: 'audio', opus: 'audio', aac: 'audio',
  m4a: 'audio', flac: 'audio', wma: 'audio', oga: 'audio',
  // Documentos
  pdf: 'document', doc: 'document', docx: 'document', xls: 'document',
  xlsx: 'document', ppt: 'document', pptx: 'document', txt: 'document',
  csv: 'document', zip: 'document', rar: 'document', '7z': 'document',
};

/** Detecta o tipo de mídia a partir da URL (extensão real, ignorando query/hash). */
export function detectMediaType(url: string): MediaKind {
  const clean = (url || '').split('?')[0].split('#')[0].toLowerCase();
  const ext = clean.split('.').pop() || '';
  return EXT_TO_KIND[ext] || 'document';
}

/** Detecta se a URL é de vídeo (extensão conhecida de vídeo). */
export function isVideoUrl(url: string): boolean {
  return detectMediaType(url) === 'video';
}

/** Detecta se a URL é de imagem. */
export function isImageUrl(url: string): boolean {
  return detectMediaType(url) === 'image';
}

/**
 * Detecta a orientação aproximada pelo nome do arquivo (convenções de upload).
 * Fallback: 'horizontal' (mais comum em uploads genéricos).
 */
export function detectOrientation(url: string): 'vertical' | 'square' | 'horizontal' {
  const base = (url || '').split('/').pop()?.toLowerCase() || '';
  if (/(reel|short|story|vertical|9x16|9_16|9:16|1080x1920|1080\*1920|720x1280|1080x1350)/.test(base)) return 'vertical';
  if (/(square|1x1|1_1|1:1|1080x1080|1080\*1080)/.test(base)) return 'square';
  if (/(landscape|horizontal|16x9|16_9|16:9|1920x1080|1280x720|16x10)/.test(base)) return 'horizontal';
  return 'horizontal';
}

/**
 * Baixa uma imagem de URL externa e armazena no Supabase Storage.
 * Retorna a URL pública do storage ou null em caso de falha.
 */
export async function cacheProfileImage(
  adminClient: any,
  userId: string,
  platform: string,
  imageUrl: string | null | undefined,
  identifier: string
): Promise<string | null> {
  if (!imageUrl) return null;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
      redirect: "follow"
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`[CACHE-IMG] Fetch failed (${response.status}) for ${imageUrl}`);
      return null;
    }
    
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      console.warn(`[CACHE-IMG] Not an image (${contentType}) for ${imageUrl}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) return null;
    
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const filePath = `profiles/${platform}/${identifier}.${ext}`;
    
    const { error } = await adminClient.storage
      .from('media')
      .upload(filePath, buffer, { contentType, upsert: true });
    
    if (error) {
      console.error(`[CACHE-IMG] Upload failed:`, error.message);
      return null;
    }
    
    const { data: urlData } = adminClient.storage.from('media').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;
    
    if (publicUrl) {
      // Update social_connections.profile_image_url for this platform/user
      await adminClient
        .from("social_connections")
        .update({ profile_image_url: publicUrl, profile_picture: publicUrl })
        .eq("user_id", userId)
        .eq("platform", platform)
        .eq("platform_user_id", identifier);
    }
    
    console.log(`[CACHE-IMG] Cached ${platform}:${identifier} → ${publicUrl}`);
    return publicUrl;
  } catch (err: any) {
    console.error(`[CACHE-IMG] Exception:`, err.message);
    return null;
  }
}
