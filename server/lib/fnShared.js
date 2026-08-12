// Shared helpers for the local functions runtime (ported from Supabase Edge Functions).
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

export function json(body, status = 200) {
  return {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body,
  };
}

export function fnError(provider, stage, error, status = 400) {
  const message = error instanceof Error ? error.message : error;
  return json({ success: false, provider, stage, error: message }, status);
}

// Reads credentials for a platform from api_credentials, with smart cross-platform fallback
// (mirrors the Edge Function logic).
export async function getPlatformCreds(supabase, userId, platform) {
  const { data } = await supabase
    .from("api_credentials")
    .select("credentials")
    .eq("user_id", userId)
    .eq("platform", platform)
    .maybeSingle();
  return (data && data.credentials) || {};
}

export function getVal(creds, userKey, envKey) {
  const raw = creds?.[userKey] || (envKey ? process.env[envKey] : undefined);
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return null;
    return t;
  }
  return raw || null;
}

// Random UUID helper (Node 19+ has crypto.randomUUID globally)
export function uuid() {
  return crypto.randomUUID();
}
