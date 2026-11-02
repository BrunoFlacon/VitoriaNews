import { describe, it, expect, vi } from "vitest";
import { AUTH_HEALTH_PATH, isAuthServerReachable } from "../authServerHealth";

describe("isAuthServerReachable", () => {
  it("considera o servidor acessível quando /auth/v1/health responde 200", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }));

    await expect(
      isAuthServerReachable("https://supabase.example.com", { fetchImpl }),
    ).resolves.toBe(true);
  });

  it("considera indisponível quando o Cloudflare responde 522", async () => {
    const fetchImpl = vi.fn(async () => new Response("error code: 522", { status: 522 }));

    await expect(
      isAuthServerReachable("https://supabase.example.com", { fetchImpl }),
    ).resolves.toBe(false);
  });

  it("considera indisponível quando o fetch falha (CORS / offline)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(
      isAuthServerReachable("https://supabase.example.com", { fetchImpl }),
    ).resolves.toBe(false);
  });

  it("considera indisponível quando o servidor não responde no tempo limite", async () => {
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    await expect(
      isAuthServerReachable("https://supabase.example.com", { fetchImpl, timeoutMs: 10 }),
    ).resolves.toBe(false);
  });

  it("normaliza a barra final e usa o caminho de health", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }));

    await isAuthServerReachable("https://supabase.example.com/", { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      `https://supabase.example.com${AUTH_HEALTH_PATH}`,
      expect.objectContaining({ method: "GET", mode: "cors" }),
    );
  });

  it("não tenta a rede quando não há URL configurada", async () => {
    const fetchImpl = vi.fn();

    await expect(isAuthServerReachable("", { fetchImpl })).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
