import { describe, it, expect } from "vitest";
import { AUTH_ERROR_MESSAGES, mapAuthError } from "../authErrors";

describe("mapAuthError", () => {
  it("retorna string vazia quando não há erro", () => {
    expect(mapAuthError(null)).toBe("");
    expect(mapAuthError(undefined)).toBe("");
  });

  it("traduz credenciais inválidas pelo código do GoTrue", () => {
    const error = {
      name: "AuthApiError",
      message: "Invalid login credentials",
      status: 400,
      code: "invalid_credentials",
    };

    expect(mapAuthError(error)).toBe(AUTH_ERROR_MESSAGES.invalidCredentials);
  });

  it("traduz credenciais inválidas quando só há a mensagem (GoTrue antigo)", () => {
    const error = { message: "invalid_grant", status: 400, code: "invalid_grant" };

    expect(mapAuthError(error)).toBe(AUTH_ERROR_MESSAGES.invalidCredentials);
  });

  it("avisa quando o e-mail ainda não foi confirmado", () => {
    const error = {
      name: "AuthApiError",
      message: "Email not confirmed",
      status: 400,
      code: "email_not_confirmed",
    };

    expect(mapAuthError(error)).toBe(AUTH_ERROR_MESSAGES.emailNotConfirmed);
  });

  it("avisa sobre rate limit quando a API responde 429", () => {
    const error = { name: "AuthApiError", message: "Too Many Requests", status: 429, code: "" };

    expect(mapAuthError(error)).toBe(AUTH_ERROR_MESSAGES.rateLimited);
  });

  it("avisa sobre rate limit quando só a mensagem indica excesso de tentativas", () => {
    expect(mapAuthError({ message: "Request rate limit reached" })).toBe(
      AUTH_ERROR_MESSAGES.rateLimited,
    );
  });

  it("reporta servidor indisponível em erro 5xx do Cloudflare (ex.: 522)", () => {
    const error = { name: "AuthRetryableFetchError", message: "HTTP 522", status: 522, code: "" };

    expect(mapAuthError(error)).toBe(AUTH_ERROR_MESSAGES.serverUnavailable);
  });

  it("reporta falha de conexão quando o fetch nem chegou ao servidor", () => {
    const error = { name: "AuthRetryableFetchError", message: "Failed to fetch", status: 0 };

    expect(mapAuthError(error)).toBe(AUTH_ERROR_MESSAGES.network);
  });

  it("reporta servidor indisponível quando a resposta não é JSON", () => {
    const error = {
      name: "AuthUnknownError",
      message: "Unexpected token '<', \"<!DOCTYPE\"... is not valid JSON",
      status: undefined,
    };

    expect(mapAuthError(error)).toBe(AUTH_ERROR_MESSAGES.serverUnavailable);
  });

  it("não promete erro de senha para falhas desconhecidas", () => {
    expect(mapAuthError({ message: "Something odd happened" })).toBe(
      AUTH_ERROR_MESSAGES.generic,
    );
  });
});
