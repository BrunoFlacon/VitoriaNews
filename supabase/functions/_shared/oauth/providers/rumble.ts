export async function exchangeRumble(manualToken: string, username: string): Promise<any[]> {
  if (!username) throw new Error("Username do Rumble é obrigatório.");
  let videoCount = 0;
  try {
    const rssRes = await fetch(`https://rumble.com/c/${username}/rss`, { headers: { "User-Agent": "SocialCanvasHub/1.0" } });
    if (!rssRes.ok) {
      const rssRes2 = await fetch(`https://rumble.com/user/${username}/rss`, { headers: { "User-Agent": "SocialCanvasHub/1.0" } });
      if (rssRes2.ok) {
        const rssText = await rssRes2.text();
        videoCount = (rssText.match(/<item>/g) || []).length;
      }
    } else {
      const rssText = await rssRes.text();
      videoCount = (rssText.match(/<item>/g) || []).length;
    }
  } catch {}

  return [{
    accessToken:     manualToken || `rumble_${username}_${Date.now()}`,
    refreshToken:    "",
    expiresIn:       86400 * 365,
    platformUserId:  username,
    pageName:        username,
    pageId:          "",
    profileImageUrl: "",
    username,
    followers:       0,
    postsCount:      videoCount,
  }];
}
