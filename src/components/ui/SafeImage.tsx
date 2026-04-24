import React, { useState } from 'react';
import { cn } from "@/lib/utils";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  onLoadSuccess?: () => void;
}

export const SafeImage = ({ src, fallback, alt, className, onLoadSuccess, ...props }: SafeImageProps) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // If no src or error, we don't want generic "random" images. 
  // We'll return a premium-looking placeholder with initials if needed.
  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    if (onLoadSuccess) onLoadSuccess();
  };

  if (!src || error) {
    if (fallback) return <img src={fallback} alt={alt} className={className} {...props} />;
    
    return (
      <div className={cn("flex items-center justify-center bg-muted/30 rounded-full", className)} {...(props as any)}>
        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
          {alt?.substring(0, 2) || "SC"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(className, loading ? "opacity-0" : "opacity-100 transition-opacity duration-300")}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
};
