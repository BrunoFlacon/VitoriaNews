import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
  if (value === "x" || value === "twitter" || value === "x (twitter)") return "twitter";
  if (value === "truth social") return "truthsocial";
  if (value === "google news") return "googlenews";
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
  if (!mediaId || !userId || !SUPABASE_URL) return "";
  return `${SUPABASE_URL}/functions/v1/whatsapp-media-proxy?mediaId=${mediaId}&userId=${userId}`;
}

export function getProxyUrl(url: string | null | undefined): string {
  if (!url) return "";

  // URLs já proxied ou do nosso storage não precisam de proxy
  if (url.includes('media-relay?url=') || url.includes('proxy-media?url=')) return url;
  if (url.includes('supabase.co/storage/')) return url;

  const problematicDomains = [
    "fbcdn.net", 
    "fbsbx.com", 
    "googleusercontent.com", 
    "graph.facebook.com",
    "graph.threads.net",
    "cdninstagram.com",
    "instagram.fbcdn.net",
    "api.telegram.org",
    "twimg.com",
    "twitter.com",
    "whatsapp.net",
    "linkedin.com/media",
    "tiktok.com",
    "tiktokv.com",
    "tiktokcdn.com",
    "tiktokcdn-us.com",
    "threads.net"
  ];
  
  const shouldProxy = problematicDomains.some(domain => url.includes(domain));
  
  if (shouldProxy) {
    if (!SUPABASE_URL) return url;
    const anonParam = SUPABASE_ANON_KEY ? `&apikey=${SUPABASE_ANON_KEY}` : '';
    return `${SUPABASE_URL}/functions/v1/media-relay?url=${encodeURIComponent(url)}${anonParam}`;
  }
  
  return url;
}
