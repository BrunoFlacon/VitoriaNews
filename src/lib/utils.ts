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
