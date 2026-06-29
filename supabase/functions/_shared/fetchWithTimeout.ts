export function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  timeout = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), options.timeout || timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}
