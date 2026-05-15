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

  // Check if this is likely a WhatsApp image based on URL
  const isWhatsAppUrl = isWhatsAppImage || 
    src?.includes('whatsapp.net') || 
    src?.includes('mmg.whatsapp') || 
    src?.includes('pps.whatsapp');

  // WhatsApp CDN images (mmg.whatsapp.net, pps.whatsapp.net) use session-bound
  // signed tokens that expire quickly and enforce hotlink protection (403).
  // Skip loading entirely and go straight to fallback to avoid console errors.
  const shouldSkip = !src || error;

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
          <div className="flex flex-col items-center justify-center text-muted-foreground/40">
            <User className="w-1/3 h-1/3" />
            <span className="text-[8px] font-bold uppercase tracking-tighter mt-1">
              {alt?.substring(0, 2).toUpperCase() || "SC"}
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
