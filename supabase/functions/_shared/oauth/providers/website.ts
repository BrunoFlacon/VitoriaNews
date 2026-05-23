export async function exchangeWebsite(url: string): Promise<any[]> {
  if (!url) throw new Error("URL do Website é obrigatória.");
  
  let domain = url;
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    domain = urlObj.hostname;
  } catch {}

  let favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  let postsCount = 0;

  try {
    const rssRes = await fetch(`https://${domain}/feed`, { headers: { "User-Agent": "SocialCanvasHub/1.0" } });
    if (rssRes.ok) {
      const rssText = await rssRes.text();
      postsCount = (rssText.match(/<item>|<entry>/gi) || []).length;
    }
  } catch {}

  return [{
    accessToken:     `website_${domain}_${Date.now()}`,
    refreshToken:    "",
    expiresIn:       86400 * 365,
    platformUserId:  domain,
    pageName:        domain,
    pageId:          "",
    profileImageUrl: favicon,
    username:        domain,
    followers:       0,
    postsCount,
  }];
}
