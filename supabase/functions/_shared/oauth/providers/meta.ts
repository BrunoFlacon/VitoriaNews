export function getAuthUrl(platform: string, redirectUri: string, state: string, creds: any, bodyClientId?: string) {
  if (platform === "threads") {
    const threadsAppId = bodyClientId || creds.app_id;
    if (!threadsAppId) throw new Error("Threads App ID não configurado.");
    return `https://www.threads.net/oauth/authorize?` + new URLSearchParams({
      client_id: threadsAppId,
      redirect_uri: redirectUri,
      scope: "threads_basic,threads_content_publish,threads_manage_replies,threads_manage_insights",
      state,
      response_type: "code",
    });
  }

  const scope = platform === "instagram" 
    ? "instagram_basic,instagram_content_publish,instagram_manage_insights" 
    : "pages_show_list,pages_read_engagement,pages_manage_posts";

  return `https://www.facebook.com/v21.0/dialog/oauth?` + new URLSearchParams({
    client_id: creds.app_id,
    redirect_uri: redirectUri,
    scope,
    state,
    response_type: "code",
  });
}
