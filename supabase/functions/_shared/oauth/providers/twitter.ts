export function getAuthUrl(redirectUri: string, state: string, creds: any, pkce: any) {
  const twitterKey = creds.client_id;
  if (!twitterKey) throw new Error("Client ID do X (Twitter) não configurado.");
  return `https://twitter.com/i/oauth2/authorize?` + new URLSearchParams({
    response_type: "code",
    client_id: twitterKey,
    redirect_uri: redirectUri,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
  });
}
