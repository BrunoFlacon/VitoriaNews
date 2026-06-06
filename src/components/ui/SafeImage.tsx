import React, { useState, useCallback, useMemo } from 'react';
import { cn, getProxyUrl } from "@/lib/utils";
import { User } from "lucide-react";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  onLoadSuccess?: () => void;
  placeholderIcon?: React.ReactNode;
  /**
   * If true, immediately shows fallback for WhatsApp images
   * WhatsApp images often fail with 403 due to hotlink protection
   */
  isWhatsAppImage?: boolean;
  /**
   * Single character to show as fallback when image fails
   */
  fallbackLetter?: string;
}

/**
 * SafeImage Component
 * 
 * A robust image component that handles:
 * - Loading states with skeleton
 * - Error fallbacks with placeholders
 * - WhatsApp image protection (403 errors) - auto-detected from URL
 * - Accessibility
 * - Performance optimizations (lazy loading, async decoding)
 */
export const SafeImage = ({ 
  src: rawSrc, 
  fallback, 
  alt, 
  className, 
  onLoadSuccess, 
  placeholderIcon,
  isWhatsAppImage = false,
  fallbackLetter,
  ...props 
}: SafeImageProps) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const src = useMemo(() => getProxyUrl(rawSrc), [rawSrc]);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setLoading(false);
    onLoadSuccess?.();
  }, [onLoadSuccess]);

  // Check if this is likely a WhatsApp image based on URL (check rawSrc before proxy)
  const isWhatsAppUrl = isWhatsAppImage || 
    rawSrc?.includes('whatsapp.net') || 
    rawSrc?.includes('mmg.whatsapp') || 
    rawSrc?.includes('pps.whatsapp') ||
    src?.includes('whatsapp.net') || 
    src?.includes('mmg.whatsapp') || 
    src?.includes('pps.whatsapp') ||
    decodeURIComponent(src || '').includes('whatsapp.net');

  // .octet-stream files are binaries without a proper browser-displayable extension
  const isOctetStream = rawSrc?.endsWith('.octet-stream') || src?.endsWith('.octet-stream');

  const shouldSkip = !src || error || isOctetStream;

  if (shouldSkip) {
    // If a custom fallback is provided, use it
    if (fallback) {
      return (
        <img 
          src={fallback} 
          alt={alt} 
          className={className} 
          {...props} 
        />
      );
    }

    // Default placeholder with icon or initials
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
      {/* Loading skeleton */}
      {loading && (
        <div 
          className={cn(
            "absolute inset-0 bg-muted animate-pulse rounded-lg",
            className
          )}
        />
      )}
      
      <img
        src={src}
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
        {...props}
      />
    </div>
  );
};

export default SafeImage;
