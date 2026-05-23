export function getAuthUrl(redirectUri: string, state: string, creds: any) {
  const appId = creds.app_id || creds.client_id;
  if (!appId) throw new Error("Kwai App ID não configurado.");
  return `https://open.kwai.com/oauth2/connect?` + new URLSearchParams({
    app_id:        appId,
    scope:         "user_info,photo_video_list,follow_list",
    response_type: "code",
    ua:            "pc",
    redirect_uri,
    state,
  });
}
