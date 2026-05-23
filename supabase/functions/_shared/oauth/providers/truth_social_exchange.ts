export async function exchangeTruthSocial(code: string, redirectUri: string, creds: any): Promise<any[]> {
  const clientId = creds.client_id;
  const clientSecret = creds.client_secret;
  
  if (!clientId || !clientSecret) throw new Error("Truth Social Client ID e Secret são obrigatórios.");

  const payload = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code
  });

  const res = await fetch("https://truthsocial.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString()
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 3600;

  const userRes = await fetch("https://truthsocial.com/api/v1/accounts/verify_credentials", { headers: { Authorization: `Bearer ${accessToken}` } });
  const userData = await userRes.json();

  return [{
    accessToken,
    refreshToken,
    expiresIn,
    platformUserId: userData.id,
    pageName: userData.display_name || userData.username,
    pageId: "",
    profileImageUrl: userData.avatar || "",
    username: userData.username,
    followers: userData.followers_count || 0,
    postsCount: userData.statuses_count || 0,
  }];
}
