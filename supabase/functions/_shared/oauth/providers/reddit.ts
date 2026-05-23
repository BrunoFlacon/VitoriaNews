export function getAuthUrl(redirectUri: string, state: string, creds: any) {
  const clientId = creds.client_id;
  return `https://www.reddit.com/api/v1/authorize?` + new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    state,
    redirect_uri: redirectUri,
    duration: "permanent",
    scope: "identity,read,submit",
  });
}
