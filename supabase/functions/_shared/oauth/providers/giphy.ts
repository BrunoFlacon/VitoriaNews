export async function exchangeGiphy(apiKey: string, supabase: any, userId: string): Promise<any[]> {
  if (!apiKey) throw new Error("API Key do Giphy é obrigatória.");

  const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=1`);
  const data = await res.json();
  if (data.meta?.status !== 200) throw new Error(data.meta?.msg || "Giphy API Key inválida.");

  let channelName = "GIPHY Channel";
  let channelSlug = "";
  let avatarUrl   = "";
  try {
    const channelRes = await fetch(`https://api.giphy.com/v1/channels/search?api_key=${apiKey}&limit=1&q=*`);
    const channelData = await channelRes.json();
    if (channelData.data?.[0]) {
      channelName = channelData.data[0].display_name || channelName;
      channelSlug = channelData.data[0].slug || channelName;
      avatarUrl = channelData.data[0].user?.avatar_url || "";
    }
  } catch {}

  return [{
    accessToken:     apiKey,
    refreshToken:    "",
    expiresIn:       86400 * 365,
    platformUserId:  channelSlug || apiKey.substring(0, 10),
    pageName:        channelName,
    pageId:          "",
    profileImageUrl: avatarUrl,
    username:        channelSlug,
    followers:       0,
    postsCount:      0,
  }];
}
