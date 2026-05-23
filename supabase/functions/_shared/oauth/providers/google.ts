export function getAuthUrl(redirectUri: string, state: string, creds: any) {
  const scopes = ["openid", "profile", "email", "https://www.googleapis.com/auth/youtube"].join(" ");
  return `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: creds.client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state,
  });
}
