import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn, getProxyUrl } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUtils";
import { supabase } from "@/integrations/supabase/client";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  onLoadSuccess?: () => void;
  placeholderIcon?: React.ReactNode;
  isExternal?: boolean;
  fallbackLetter?: string;
  isWhatsAppImage?: boolean;
  fetchPriority?: "high" | "low" | "auto";
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

export const SafeImage = ({ 
  src: rawSrc, 
  fallback, 
  alt, 
  className, 
  onLoadSuccess, 
  placeholderIcon,
  isExternal = false,
  fallbackLetter,
  isWhatsAppImage,
  fetchPriority,
  ...props 
}: SafeImageProps) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const signedUrlRef = useRef<string | null>(null);

  const resolvedBase = useMemo(() => getMediaUrl(rawSrc), [rawSrc]);

  const resolvedSrc = useMemo(() => {
    if (!rawSrc) return null;

    const url = signedUrl || resolvedBase;
    if (!url) return null;

    const proxied = getProxyUrl(url);
    if (proxied !== url) return proxied;

    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:') || isExternal) {
      return url;
    }

    return url;
  }, [rawSrc, resolvedBase, isExternal, signedUrl]);

  const isWhatsAppUrl = rawSrc?.includes('whatsapp.net');

  useEffect(() => {
    setError(false);
    setLoading(true);
    setSignedUrl(null);
    signedUrlRef.current = null;
  }, [rawSrc]);

  const trySignedUrl = useCallback(() => {
    const path = resolvedBase ? extractStoragePath(resolvedBase) : null;
    if (!path || signedUrlRef.current) return;

    supabase.storage
      .from('media')
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) {
          signedUrlRef.current = data.signedUrl;
          setSignedUrl(data.signedUrl);
          setError(false);
          setLoading(true);
        } else {
          setError(true);
          setLoading(false);
        }
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [resolvedBase]);

  const handleError = useCallback(() => {
    if (resolvedBase?.includes('supabase.co/storage/') && !signedUrlRef.current) {
      trySignedUrl();
    } else {
      setError(true);
      setLoading(false);
    }
  }, [resolvedBase, trySignedUrl]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    onLoadSuccess?.();
  }, [onLoadSuccess]);

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
    <div className={cn("relative overflow-hidden", className)}>
      {loading && (
        <div 
          className={cn(
            "absolute inset-0 bg-muted animate-pulse rounded-lg",
            className
          )}
        />
      )}
      
      <img
        src={resolvedSrc}
        alt={alt}
        className={cn(
          className,
          loading ? "opacity-0" : "opacity-100 transition-opacity duration-300"
        )}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        fetchpriority={isWhatsAppUrl ? "low" : fetchPriority}
        {...props}
      />
    </div>
  );
};

export default SafeImage;
