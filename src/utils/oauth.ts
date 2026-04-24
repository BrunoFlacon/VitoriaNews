export function getThreadsOAuthUrl() {
  const clientId = import.meta.env.VITE_META_APP_ID;

  if (!clientId) {
    throw new Error("META_APP_ID não configurado");
  }

  // Threads uses a specific redirect structure in some Meta Apps configurations
  const redirectUri = `${window.location.origin}/oauth/callback/threads`;

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  // Expanded scopes to allow the Robot to respond and publish
  url.searchParams.set("scope", "threads_basic,threads_content_publish,threads_manage_replies,threads_manage_insights");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", crypto.randomUUID());

  return url.toString();
}
