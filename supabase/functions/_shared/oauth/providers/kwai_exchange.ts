export async function exchangeKwai(code: string, redirectUri: string, creds: any): Promise<any[]> {
  const appId = creds.app_id || creds.client_id;
  const appSecret = creds.app_secret || creds.client_secret;

  if (!appId || !appSecret) throw new Error("Kwai App ID e Secret são obrigatórios.");

  const res = await fetch(`https://open.kwai.com/oauth2/access_token?app_id=${appId}&app_secret=${appSecret}&code=${code}&grant_type=authorization_code`);
  const data = await res.json();
  if (data.result !== 1) throw new Error(data.error_msg || "Falha na troca de token do Kwai.");

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 86400 * 30; // approx 1 month
  const openId = data.open_id;

  const userRes = await fetch(`https://open.kwai.com/openapi/user_info?access_token=${accessToken}&app_id=${appId}`);
  const userData = await userRes.json();
  const userInfo = userData.user_info || {};

  return [{
    accessToken,
    refreshToken,
    expiresIn,
    platformUserId: openId,
    pageName: userInfo.user_name || openId,
    pageId: "",
    profileImageUrl: userInfo.user_head || "",
    username: openId,
    followers: userInfo.fan_count || 0,
    postsCount: userInfo.video_count || 0,
  }];
}
