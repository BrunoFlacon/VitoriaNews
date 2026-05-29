export function getAuthUrl(redirectUri: string, state: string, creds: any, _pkce?: any) {
  const tiktokClientKey = creds.client_key || creds.client_id;
  if (!tiktokClientKey) throw new Error("TikTok Client Key não configurado.");

  const params: Record<string, string> = {
    client_key: tiktokClientKey,
    response_type: "code",
    scope: "user.info.basic,video.list,video.publish",
    redirect_uri: redirectUri,
    state,
  };

  return `https://www.tiktok.com/v2/auth/authorize/?` + new URLSearchParams(params);
}
