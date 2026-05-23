export function getAuthUrl(redirectUri: string, state: string, creds: any) {
  const clientId = creds.client_id;
  if (!clientId) throw new Error("Truth Social Client ID não configurado.");
  return `https://truthsocial.com/oauth/authorize?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read write follow",
    state,
  });
}
