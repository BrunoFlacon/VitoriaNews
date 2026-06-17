import React, { useState, useCallback, useMemo } from 'react';
import { cn, getProxyUrl } from "@/lib/utils";
import { User } from "lucide-react";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  onLoadSuccess?: () => void;
  placeholderIcon?: React.ReactNode;
  isExternal?: boolean;
  fallbackLetter?: string;
  isWhatsAppImage?: boolean;
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
  ...props 
}: SafeImageProps) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const signedUrl = useSignedMediaUrl(rawSrc);

  const resolvedSrc = useMemo(() => {
    if (!rawSrc) return null;

    const proxied = getProxyUrl(rawSrc);
    if (proxied !== rawSrc) return proxied;

    if (rawSrc.startsWith('http') || rawSrc.startsWith('blob:') || rawSrc.startsWith('data:') || isExternal) {
      return rawSrc;
    }

    return signedUrl || rawSrc;
  }, [rawSrc, isExternal, signedUrl]);

  const isWhatsAppUrl = rawSrc?.includes('whatsapp.net');

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

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
        {...(props as any)}
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
    <div className={cn("relative", className)}>
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
        {...(isWhatsAppUrl ? { fetchpriority: "low" } : {})}
        {...props}
      />
    </div>
  );
};

export default SafeImage;
