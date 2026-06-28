import React, { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn, getProxyUrl } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUtils";
import { supabase } from "@/integrations/supabase/client";

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'fetchPriority'> {
  fallback?: string;
  onLoadSuccess?: () => void;
  placeholderIcon?: React.ReactNode;
  isExternal?: boolean;
  fallbackLetter?: string;
  isWhatsAppImage?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  /** Explicit aspect ratio (e.g. "16/9", "1") to prevent CLS */
  aspectRatio?: string;
  /** Default container height when image is loading (CLS prevention) */
  containerHeight?: number | string;
}

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
      // exp is in seconds, Date.now() is in milliseconds
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

function extractStoragePath(url: string): string | null {
  const patterns = [
    /\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+?)(?:\?|$)/,
    /storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+?)(?:\?|$)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

export const SafeImage = memo(({ 
  src: rawSrc, 
  fallback, 
  alt, 
  className, 
  onLoadSuccess, 
  placeholderIcon,
  isExternal = false,
  fallbackLetter,
  isWhatsAppImage,
  fetchPriority: _fetchPriority,
  loading: imgLoading = "lazy",
  aspectRatio = "1",
  containerHeight,
  ...props 
}: SafeImageProps) => {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const signedUrlRef = useRef<string | null>(null);

  const resolvedBase = useMemo(() => getMediaUrl(rawSrc), [rawSrc]);

  const resolvedSrc = useMemo(() => {
    if (!rawSrc) return null;

    const url = signedUrl || resolvedBase;
    if (!url) return null;

    // Pre-emptively block rendering if the initial URL is an expired Supabase signed URL
    if (!signedUrl && resolvedBase && resolvedBase.includes('supabase.co/storage/') && resolvedBase.includes('token=')) {
      if (isSupabaseUrlExpired(resolvedBase)) {
        return null;
      }
    }

    const proxied = getProxyUrl(url);
    if (proxied !== url) return proxied;

    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:') || isExternal) {
      return url;
    }

    return url;
  }, [rawSrc, resolvedBase, isExternal, signedUrl]);

  const isWhatsAppUrl = rawSrc?.includes('whatsapp.net');
  const fetchpriority = isWhatsAppUrl ? "low" : (_fetchPriority || "auto");

  const trySignedUrl = useCallback(() => {
    const path = resolvedBase ? extractStoragePath(resolvedBase) : null;
    if (!path || signedUrlRef.current) return;

    // Set a temporary token placeholder to prevent duplicate signing calls in parallel renders
    signedUrlRef.current = "signing_in_progress";

    supabase.storage
      .from('media')
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) {
          signedUrlRef.current = data.signedUrl;
          setSignedUrl(data.signedUrl);
          setError(false);
          setIsLoading(true);
        } else {
          signedUrlRef.current = null;
          setError(true);
          setIsLoading(false);
        }
      })
      .catch(() => {
        signedUrlRef.current = null;
        setError(true);
        setIsLoading(false);
      });
  }, [resolvedBase]);

  useEffect(() => {
    setError(false);
    setIsLoading(true);
    setSignedUrl(null);
    signedUrlRef.current = null;

    // If the base URL is expired on mount/change, immediately start re-signing without rendering it
    if (resolvedBase && resolvedBase.includes('supabase.co/storage/') && resolvedBase.includes('token=')) {
      if (isSupabaseUrlExpired(resolvedBase)) {
        trySignedUrl();
      }
    }
  }, [rawSrc, resolvedBase, trySignedUrl]);

  const handleError = useCallback(() => {
    if (resolvedBase?.includes('supabase.co/storage/') && (!signedUrlRef.current || signedUrlRef.current === "signing_in_progress")) {
      signedUrlRef.current = null;
      trySignedUrl();
    } else {
      setError(true);
      setIsLoading(false);
    }
  }, [resolvedBase, trySignedUrl]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoadSuccess?.();
  }, [onLoadSuccess]);

  const containerStyle = useMemo(() => ({
    contain: 'paint' as const,
    aspectRatio: aspectRatio || undefined,
    minHeight: containerHeight || undefined,
  }), [aspectRatio, containerHeight]);

  const imgClasses = useMemo(() => {
    if (!className) return "object-cover";
    const fits = className.split(' ').filter(c => c.startsWith('object-'));
    return fits.length > 0 ? fits.join(' ') : "object-cover";
  }, [className]);

  const shouldSkip = !resolvedSrc || error;

  if (shouldSkip) {
    if (fallback) return <img src={fallback} alt={alt} className={className} {...props} />;

    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/50 rounded-full overflow-hidden",
          className
        )} 
      >
        {placeholderIcon || (
          <div className="flex items-center justify-center text-muted-foreground/40">
            <span className="text-xs font-black uppercase tracking-tighter">
              {fallbackLetter || alt?.substring(0, 1).toUpperCase() || "?"}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)} style={containerStyle}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      <img
        src={resolvedSrc}
        alt={alt}
        className={cn(
          "w-full h-full",
          imgClasses,
          isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-200"
        )}
        onError={handleError}
        onLoad={handleLoad}
        decoding="async"
        referrerPolicy="no-referrer"
        fetchpriority={fetchpriority}
        loading={imgLoading}
        {...props}
      />
    </div>
  );
});

export default SafeImage;
