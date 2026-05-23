export async function exchangeGettr(manualToken: string, username: string): Promise<any[]> {
  if (!manualToken || !username) throw new Error("Token e Username do Gettr são obrigatórios.");

  let followers = 0;
  let postsCount = 0;
  try {
    const res = await fetch(`https://api.gettr.com/u/user/${username}/public`, {
      headers: { "x-app-auth": manualToken }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.result?.aux?.uinf?.[username]) {
        followers = data.result.aux.uinf[username].flw || 0;
        postsCount = data.result.aux.uinf[username].pst || 0;
      }
    }
  } catch {}

  return [{
    accessToken:     manualToken,
    refreshToken:    "",
    expiresIn:       86400 * 365,
    platformUserId:  username,
    pageName:        username,
    pageId:          "",
    profileImageUrl: "",
    username,
    followers,
    postsCount,
  }];
}
