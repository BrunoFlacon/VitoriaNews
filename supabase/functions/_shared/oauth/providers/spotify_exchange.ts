export async function exchangeSpotify(code: string, redirectUri: string, pkceVerifier: string, creds: any): Promise<any[]> {
  const clientId = creds.client_id;
  const clientSecret = creds.client_secret;
  
  if (!clientId || !clientSecret) throw new Error("Spotify Client ID e Secret são obrigatórios.");

  const payload = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: pkceVerifier
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: payload.toString()
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 3600;

  const userRes = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${accessToken}` } });
  const userData = await userRes.json();

  return [{
    accessToken,
    refreshToken,
    expiresIn,
    platformUserId: userData.id,
    pageName: userData.display_name || userData.id,
    pageId: "",
    profileImageUrl: userData.images?.[0]?.url || "",
    username: userData.id,
    followers: userData.followers?.total || 0,
    postsCount: 0,
  }];
}
