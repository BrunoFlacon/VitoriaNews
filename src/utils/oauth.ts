export function getThreadsOAuthUrl(customClientId?: string) {
  const clientId = customClientId || import.meta.env.VITE_META_APP_ID;

  if (!clientId) {
    throw new Error("META_APP_ID não configurado");
  }

  // Threads uses a specific redirect structure in some Meta Apps configurations
  const redirectUri = `${window.location.origin}/oauth/callback/threads`; // NOTE: Make sure this is exactly registered in the Meta App settings, sometimes with trailing slash.

  const url = new URL("https://threads.net/oauth/authorize");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  // Expanded scopes to allow the Robot to respond and publish
  url.searchParams.set("scope", "threads_basic,threads_content_publish,threads_manage_replies,threads_manage_insights");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", crypto.randomUUID());

  return url.toString();
}
