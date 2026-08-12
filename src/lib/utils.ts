import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return n.toLocaleString('pt-BR');
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
 * Simple XSS Sanitizer to strip dangerous tags and attributes.
 * Prevents execution of injected scripts while keeping the text clean.
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  
  // Basic cleanup: remove script tags and on* attributes
  const sanitized = input
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    .replace(/on\w+="[^"]*"/gim, "")
    .replace(/on\w+='[^']*'/gim, "")
    .replace(/javascript:[^"']*/gim, "");

  // Optional: fully strip all HTML tags if we want text-only
  // sanitized = sanitized.replace(/<[^>]*>?/gm, '');

  return sanitized.trim();
}

/**
 * Ensures media URLs are correctly parsed, especially for Supabase and external proxies.
 * Centralizes proxy logic for WhatsApp/Instagram/Facebook CDN images that block direct hotlinking.
 */
export function getWhatsAppMediaUrl(mediaId: string, userId: string): string | null {
  if (!mediaId || !userId) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/functions/v1/whatsapp-media-proxy?mediaId=${mediaId}&userId=${userId}`;
}

export function getProxyUrl(url: string | null | undefined): string {
  if (!url) return "";

  // URLs já proxied ou locais não precisam de novo proxy
  if (url.startsWith('/api/')) return url;
  if (url.includes('/api/proxy-image?url=')) return url;
  if (url.includes('media-relay?url=') || url.includes('proxy-media?url=')) return url;

  const isLocalMode = import.meta.env.VITE_USE_LOCAL_DB === 'true';
  const localProxyBase = '/api/proxy-image';

  function toLocalProxy(originalUrl: string): string {
    return `${localProxyBase}?url=${encodeURIComponent(originalUrl)}`;
  }

  // Em modo local, TODO storage do Supabase é redirecionado para o proxy local
  if (isLocalMode && url.includes('supabase.co/storage/')) {
    return toLocalProxy(url);
  }
  // Em modo remoto, URLs do storage do Supabase são servidas diretamente
  if (url.includes('supabase.co/storage/')) return url;

  const problematicDomains = [
    "fbcdn.net", 
    "fbsbx.com", 
    "googleusercontent.com",
    "ggpht.com",
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
    if (isLocalMode) {
      // Em modo local, proxy direto sem passar pelo Supabase
      return toLocalProxy(url);
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl) return url;
    const anonParam = supabaseKey ? `&apikey=${supabaseKey}` : '';
    return `${supabaseUrl}/functions/v1/media-relay?url=${encodeURIComponent(url)}${anonParam}`;
  }
  
  return url;
}
