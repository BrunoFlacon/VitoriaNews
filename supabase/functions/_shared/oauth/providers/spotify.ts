export function getAuthUrl(redirectUri: string, state: string, creds: any, pkce: any) {
  const clientId = creds.client_id;
  if (!clientId) throw new Error("Spotify Client ID não configurado.");
  return `https://accounts.spotify.com/authorize?` + new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: "user-read-private user-read-email user-follow-read user-top-read playlist-read-private user-library-read",
    code_challenge_method: "S256",
    code_challenge: pkce.challenge,
  });
}
