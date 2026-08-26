// Centralized Server & Environment Configuration for Social Canvas Hub (Vitória News)
// Changes to server URLs or branding here automatically propagate across the application.

const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://supabase.webradiovitoria.com.br";
const IS_DEV = import.meta.env.DEV;

/** Real public Supabase VPS endpoint */
export const REAL_SUPABASE_URL = ENV_SUPABASE_URL.replace(/\/+$/, "");

/** 
 * Effective Supabase URL: Uses Vite local proxy (`/supabase`) in DEV mode 
 * to avoid CORS issues and simplify localhost development, or REAL_SUPABASE_URL in production.
 */
export const SUPABASE_URL = IS_DEV ? `${window.location.origin}/supabase` : REAL_SUPABASE_URL;

/** 
 * Base URL for Edge Functions invocations.
 */
export const FUNCTIONS_BASE_URL = `${SUPABASE_URL}/functions/v1`;

/** 
 * System Official Branding Details
 */
export const SYSTEM_BRAND = {
  name: "Vitória News",
  fullTitle: "Vitória News — Rede Vitória de Comunicação",
  tagline: "Painel Oficial de Gestão e Notícias",
  copyright: "© Vitória News. Todos os direitos reservados.",
} as const;

/**
 * Resolves a given media path or storage URL to a fully-qualified public URL.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  let cleanUrl = url.trim();
  
  // If old hardcoded Supabase domain exists, replace with active VPS URL
  if (cleanUrl.includes("ghtkdkauseesambzqfrd.supabase.co")) {
    cleanUrl = cleanUrl.replace(/https:\/\/ghtkdkauseesambzqfrd\.supabase\.co/g, REAL_SUPABASE_URL);
  }
  
  // Relative storage path (/storage/v1/object/public/...)
  if (cleanUrl.startsWith("/storage/")) {
    return `${SUPABASE_URL}${cleanUrl}`;
  }
  
  return cleanUrl;
}

/**
 * Gets the standard OAuth callback URL for a given platform.
 */
export function getOAuthCallbackUrl(platform: string): string {
  return `${window.location.origin}/oauth/callback/${platform}`;
}
