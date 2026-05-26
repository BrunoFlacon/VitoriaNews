export function resolveCorsOrigin(req?: { headers: { get: (name: string) => string | null } } | Request): string {
  // Try both lowercase and uppercase to be safe, though Deno Headers are case-insensitive
  const origin = (req as Request)?.headers?.get?.("origin") || (req as Request)?.headers?.get?.("Origin");
  
  const fallback = "https://webradiovitoria.com.br";
  if (!origin) return fallback;
  
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    
    // Permitir localhost, 127.0.0.1 e subdomínios lovable/desenvolvimento
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.");
    const isLovable = hostname.endsWith(".lovable.app") || hostname.endsWith(".lovableproject.com");
    const isProduction = origin === "https://webradiovitoria.com.br";

    if (isLocal || isLovable || isProduction) {
      console.log(`[CORS] Verified origin: ${origin}`);
      return origin;
    }
    
    console.warn(`[CORS] Origin rejected: ${origin} (Hostname: ${hostname})`);
  } catch (e) {
    console.error(`[CORS] Invalid origin URL: ${origin}`, e);
  }
  
  return fallback;
}
