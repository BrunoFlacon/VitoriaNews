/**
 * Sonda leve do servidor de autenticação.
 *
 * Quando o login falha com erro de rede (status 0 / "Failed to fetch"), o
 * browser não expõe se o problema é a conexão do usuário ou o backend fora do
 * ar — requisições bloqueadas por CORS/Cloudflare 522 chegam ao JS apenas como
 * "Failed to fetch". Um GET em `/auth/v1/health` desfaz a ambiguidade.
 */

export const AUTH_HEALTH_PATH = "/auth/v1/health";

export interface HealthProbeOptions {
  /** Tempo máximo de espera antes de considerar o servidor inacessível. */
  timeoutMs?: number;
  /** Injeção de dependência para testes. */
  fetchImpl?: typeof fetch;
}

export async function isAuthServerReachable(
  baseUrl: string,
  { timeoutMs = 5000, fetchImpl = fetch }: HealthProbeOptions = {},
): Promise<boolean> {
  if (!baseUrl) return false;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("Timeout", "TimeoutError")),
    timeoutMs,
  );

  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/+$/, "")}${AUTH_HEALTH_PATH}`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    });

    // Cloudflare responde 522/523/... quando a origem cai: HTTP existe,
    // mas o backend não está atendendo.
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
