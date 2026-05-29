export function getAuthUrl(redirectUri: string, state: string, creds: any) {
  const clientId = creds.client_id;
  return `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: "openid profile email r_organization_social w_organization_social", // Marketing Developer Platform necessário para páginas empresariais
  });
}
