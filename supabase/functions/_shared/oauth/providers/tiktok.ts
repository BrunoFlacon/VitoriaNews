export function getAuthUrl(redirectUri: string, state: string, creds: any, pkce: any) {
  const tiktokClientKey = creds.client_key || creds.client_id;
  if (!tiktokClientKey) throw new Error("TikTok Client Key não configurado.");

  return `https://www.tiktok.com/v2/auth/authorize/?` + new URLSearchParams({
    client_key: tiktokClientKey,
    response_type: "code",
    scope: "user.info.basic,video.list,video.publish",
    redirect_uri: redirectUri,
    state,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
  });
}
