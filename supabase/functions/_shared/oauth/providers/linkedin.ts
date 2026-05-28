export function getAuthUrl(redirectUri: string, state: string, creds: any) {
  const clientId = creds.client_id;
  return `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: "openid profile email", // w_member_social r_member_social w_organization_social r_organization_social requerem produtos LinkedIn adicionais
  });
}
