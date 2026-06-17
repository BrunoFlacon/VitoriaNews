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
  let sanitized = input
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
export function getProxyUrl(url: string | null | undefined): string {
  if (!url) return "";
  
  // If it's already a Supabase function proxy, don't double proxy
  if (url.includes('/functions/v1/proxy-media?url=')) return url;
  
  // WhatsApp, Telegram, Facebook, Instagram CDNs block direct hotlinking — proxy via Supabase
  if (
    url.includes('pps.whatsapp.net') ||
    url.includes('scontent.whatsapp.net') ||
    url.includes('mmg.whatsapp.net') ||
    url.includes('api.telegram.org') ||
    url.includes('t.me') ||
    url.includes('ui-avatars.com') ||
    url.includes('platform-lookaside.fbsbx.com') ||
    url.includes('fbcdn.net') ||
    url.includes('cdninstagram.com')
  ) {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "ghtkdkauseesambzqfrd";
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
    return `${supabaseUrl}/functions/v1/proxy-media?url=${encodeURIComponent(url)}`;
  }
  
  return url;
}
