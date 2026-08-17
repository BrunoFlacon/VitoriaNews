// @ts-ignore
declare const Deno: any;

/**
 * Verifica acesso de sistema (pg_cron / função-para-função).
 *
 * Aceita:
 *  1. As chaves injetadas pela plataforma no ambiente da função
 *     (novo formato: sb_secret_... / sb_publishable_...);
 *  2. As chaves armazenadas na tabela `settings`
 *     (formato JWT antigo, enviado pelos jobs pg_cron):
 *       - 'supabase_service_role_key'
 *       - 'service_role_key'
 *
 * O valor pode vir no header `apikey` ou no header `Authorization: Bearer ...`.
 */
export async function isSystemAccess(
  supabase: any,
  apikey: string | null,
  authHeader: string | null
): Promise<boolean> {
  const envSrk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const envAnon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const apikeyValue = apikey || "";
  const authValue = (authHeader || "").replace(/^Bearer\s+/i, "");

  if (apikeyValue && (apikeyValue === envSrk || apikeyValue === envAnon)) return true;
  if (authValue && (authValue === envSrk || authValue === envAnon)) return true;

  try {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["supabase_service_role_key", "service_role_key"]);
    for (const row of data || []) {
      const stored = row?.value;
      if (!stored) continue;
      if (apikeyValue && apikeyValue === stored) return true;
      if (authValue && authValue === stored) return true;
    }
  } catch {
    // Sem acesso às settings → não é acesso de sistema por esse caminho.
  }
  return false;
}
