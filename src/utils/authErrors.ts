/**
 * Tradução dos erros do Supabase Auth (GoTrue) para mensagens exibíveis.
 *
 * Antes, qualquer falha virava "Email ou senha incorretos." — o que esconde
 * problemas reais (servidor fora do ar, rate limit, e-mail não confirmado)
 * e faz o usuário tentar senhas corretas repetidamente.
 */

export const AUTH_ERROR_MESSAGES = {
  invalidCredentials: "Email ou senha incorretos.",
  emailNotConfirmed: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
  rateLimited: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
  serverUnavailable:
    "Servidor de autenticação indisponível no momento. Tente novamente em instantes.",
  network: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  generic: "Não foi possível entrar agora. Tente novamente em instantes.",
} as const;

export interface AuthErrorLike {
  name?: string | null;
  message?: string | null;
  status?: number | null;
  code?: string | number | null;
}

const NETWORK_MESSAGE_PATTERN =
  /failed to fetch|networkerror|network error|load failed|timeout|timed out|aborted/i;

function normalize(error: AuthErrorLike) {
  return {
    name: typeof error.name === "string" ? error.name : "",
    message: typeof error.message === "string" ? error.message : "",
    status: typeof error.status === "number" ? error.status : undefined,
    code: typeof error.code === "string" ? error.code.toLowerCase() : "",
  };
}

export function mapAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error) return "";

  const { name, message, status, code } = normalize(error);
  const normalizedMessage = message.toLowerCase();

  if (
    status === 429 ||
    code === "over_request_rate_limit" ||
    code === "too_many_requests" ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests")
  ) {
    return AUTH_ERROR_MESSAGES.rateLimited;
  }

  if (code === "email_not_confirmed" || normalizedMessage.includes("email not confirmed")) {
    return AUTH_ERROR_MESSAGES.emailNotConfirmed;
  }

  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid grant")
  ) {
    return AUTH_ERROR_MESSAGES.invalidCredentials;
  }

  if (status === 0 || NETWORK_MESSAGE_PATTERN.test(message)) {
    return AUTH_ERROR_MESSAGES.network;
  }

  if (
    (status !== undefined && status >= 500) ||
    name === "AuthUnknownError" ||
    name === "AuthRetryableFetchError"
  ) {
    return AUTH_ERROR_MESSAGES.serverUnavailable;
  }

  return AUTH_ERROR_MESSAGES.generic;
}

/**
 * Fecha o diagnóstico de falhas de conectividade.
 *
 * Erros de rede chegam ao JS como "Failed to fetch" tanto quando o backend
 * está fora (Cloudflare 522, sem header CORS) quanto quando a conexão do
 * usuário caiu. Só a sonda de health distingue os dois casos.
 */
export async function describeLoginFailure(
  error: AuthErrorLike | null | undefined,
  probeServer: () => Promise<boolean>,
): Promise<string> {
  const message = mapAuthError(error);
  if (message !== AUTH_ERROR_MESSAGES.network) return message;

  const reachable = await probeServer();
  return reachable ? message : AUTH_ERROR_MESSAGES.serverUnavailable;
}
