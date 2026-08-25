import { describe, it, expect } from "vitest";
import { getInitialOrientation } from "@/utils/orientation";

describe("getInitialOrientation", () => {
  // ── Formatos verticais por postType ──────────────────────────────
  it("retorna 'vertical' quando postType é 'story'", () => {
    expect(getInitialOrientation([], "story")).toBe("vertical");
  });

  it("retorna 'vertical' quando postType é 'live'", () => {
    expect(getInitialOrientation([], "live")).toBe("vertical");
  });

  it("retorna 'vertical' quando postType é 'shorts'", () => {
    expect(getInitialOrientation([], "shorts")).toBe("vertical");
  });

  it("retorna 'vertical' quando postType é 'reels'", () => {
    expect(getInitialOrientation([], "reels")).toBe("vertical");
  });

  // ── Formatos verticais por plataforma ────────────────────────────
  it("retorna 'vertical' quando plataforma inclui 'story'", () => {
    expect(getInitialOrientation(["story"])).toBe("vertical");
  });

  it("retorna 'vertical' quando plataforma inclui 'live'", () => {
    expect(getInitialOrientation(["live"])).toBe("vertical");
  });

  it("retorna 'vertical' quando plataforma inclui 'shorts'", () => {
    expect(getInitialOrientation(["shorts"])).toBe("vertical");
  });

  it("retorna 'vertical' quando plataforma inclui 'reels'", () => {
    expect(getInitialOrientation(["reels"])).toBe("vertical");
  });

  // ── Múltiplas plataformas, uma é vertical ────────────────────────
  it("retorna 'vertical' quando pelo menos uma plataforma é vertical", () => {
    expect(getInitialOrientation(["instagram", "reels", "facebook"])).toBe(
      "vertical",
    );
  });

  // ── Formatos horizontais (default) ───────────────────────────────
  it("retorna 'horizontal' quando postType é 'carousel'", () => {
    expect(getInitialOrientation([], "carousel")).toBe("horizontal");
  });

  it("retorna 'horizontal' quando postType é 'text'", () => {
    expect(getInitialOrientation([], "text")).toBe("horizontal");
  });

  it("retorna 'horizontal' quando postType não definido e sem plataformas verticais", () => {
    expect(getInitialOrientation([])).toBe("horizontal");
  });

  it("retorna 'horizontal' quando postType é undefined e plataformas são horizontais", () => {
    expect(getInitialOrientation(["facebook", "linkedin"])).toBe("horizontal");
  });

  // ── postType vertical tem prioridade sobre plataformas ───────────
  it("retorna 'vertical' quando postType é 'live' mesmo com plataformas horizontais", () => {
    expect(
      getInitialOrientation(["facebook", "linkedin"], "live"),
    ).toBe("vertical");
  });

  // ── Casos edge ───────────────────────────────────────────────────
  it("retorna 'horizontal' quando postType é string vazia", () => {
    expect(getInitialOrientation([], "")).toBe("horizontal");
  });

  it("retorna 'horizontal' com plataformas case-sensitive (não matchea 'Story')", () => {
    expect(getInitialOrientation(["Story"])).toBe("horizontal");
  });

  it("retorna 'horizontal' quando plataforma é 'instagram' (não é formato vertical por si só)", () => {
    expect(getInitialOrientation(["instagram"])).toBe("horizontal");
  });
});
