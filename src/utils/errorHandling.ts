export function isNetworkAbortError(err: any): boolean {
  if (!err) return false;
  const msg = err.message || String(err);
  return (
    msg.includes('AbortError') ||
    msg.includes('signal is aborted') ||
    msg.includes('TimeoutError') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError')
  );
}

export function isRetryableError(err: any): boolean {
  if (!err) return false;
  if (isNetworkAbortError(err)) return true;
  const status = err.status || err.code;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export function logNetworkError(context: string, err: any, suppress = false): void {
  if (isNetworkAbortError(err)) {
    if (!suppress) {
      console.debug(`[${context}] Network issue (suppressed):`, err.message);
    }
    return;
  }
  console.error(`[${context}]`, err);
}

export function getErrorMessage(err: any, fallback = 'Erro desconhecido'): string {
  if (!err) return fallback;
  if (isNetworkAbortError(err)) return 'Conexão interrompida ou tempo esgotado';
  return err.message || err.error || fallback;
}