import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SUPABASE_ANON_KEY } from "@/integrations/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize platform identifiers to match socialPlatforms ids.
 * "x", "twitter", "x (twitter)" → "twitter"
 */
export function normalizePlatform(platform: string | null | undefined): string {
  if (!platform) return "";
  const value = platform.toLowerCase().trim();
  if (value === "x" || value === "twitter" || value === "x (twitter)") {
    return "twitter";
  }
  return value;
}

/**
 * Get display name for a normalized platform id.
 */
export function getPlatformDisplayName(platformId: string): string {
  const map: Record<string, string> = {
    twitter: "X (Twitter)",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    tiktok: "TikTok",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    pinterest: "Pinterest",
    snapchat: "Snapchat",
    threads: "Threads",
    site: "Website",
  };
  return map[platformId] || platformId;
}

/**
 * Wraps a URL with the proxy-media edge function to avoid 403 Forbidden errors.
 * WhatsApp CDN URLs (mmg.whatsapp.net, pps.whatsapp.net) use session-bound
 * signed tokens that expire quickly — skip them entirely to avoid 403 errors.
 */
/**
 * Get a proxy URL for WhatsApp media using the whatsapp-media-proxy Edge Function.
 */
export function getWhatsAppMediaUrl(mediaId: string, userId: string): string {
  if (!mediaId || !userId) return "";
  return `https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/whatsapp-media-proxy?mediaId=${mediaId}&userId=${userId}&apikey=${SUPABASE_ANON_KEY}`;
}

export function getProxyUrl(url: string | null | undefined): string {
  if (!url) return "";

  const problematicDomains = [
    "fbcdn.net", 
    "fbsbx.com", 
    "googleusercontent.com", 
    "graph.facebook.com",
    "cdninstagram.com",
    "instagram.fbcdn.net",
    "api.telegram.org",
    "twimg.com",
    "twitter.com",
    "linkedin.com/media",
    "whatsapp.net",
    "mmg.whatsapp",
    "pps.whatsapp"
  ];
  
  const shouldProxy = problematicDomains.some(domain => url.includes(domain));
  
  if (shouldProxy) {
    if (url.includes('proxy-media?url=')) return url;
    return `https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/proxy-media?url=${encodeURIComponent(url)}&apikey=${SUPABASE_ANON_KEY}`;
  }
  
  return url;
}
