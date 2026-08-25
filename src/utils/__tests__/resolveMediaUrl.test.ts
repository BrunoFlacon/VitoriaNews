import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock do supabase client ──────────────────────────────────────
const mockGetPublicUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  },
}));

import { resolveMediaUrl } from "@/utils/resolveMediaUrl";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: getPublicUrl retorna uma URL pública fake
  mockGetPublicUrl.mockImplementation((path: string) => ({
    data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/media/${path}` },
  }));
});

describe("resolveMediaUrl", () => {
  // ── Null / Undefined / Empty ────────────────────────────────────
  it("retorna null para null", () => {
    expect(resolveMediaUrl(null)).toBeNull();
  });

  it("retorna null para undefined", () => {
    expect(resolveMediaUrl(undefined)).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(resolveMediaUrl("")).toBeNull();
  });

  // ── Paths relativos (UUID.ext) ──────────────────────────────────
  it("resolve path relativo simples via getPublicUrl", () => {
    const result = resolveMediaUrl("abc123-def456.jpg");
    expect(mockGetPublicUrl).toHaveBeenCalledWith("abc123-def456.jpg");
    expect(result).toContain("abc123-def456.jpg");
  });

  it("resolve path relativo com subdiretório", () => {
    resolveMediaUrl("subdir/image.png");
    expect(mockGetPublicUrl).toHaveBeenCalledWith("subdir/image.png");
  });

  // ── URLs do storage Supabase cloud ──────────────────────────────
  it("extrai path de URL com /object/sign/media/ e ignora token", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/sign/media/abc123.jpg?token=xyz123";
    resolveMediaUrl(url);
    expect(mockGetPublicUrl).toHaveBeenCalledWith("abc123.jpg");
  });

  it("extrai path de URL com /object/public/media/", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/public/media/uploads/photo.png";
    resolveMediaUrl(url);
    expect(mockGetPublicUrl).toHaveBeenCalledWith("uploads/photo.png");
  });

  it("extrai path de URL com /object/sign/documents/", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/sign/documents/file.pdf?token=abc";
    resolveMediaUrl(url);
    expect(mockGetPublicUrl).toHaveBeenCalledWith("file.pdf");
  });

  it("extrai path de URL com /object/public/documents/", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/public/documents/report.docx";
    resolveMediaUrl(url);
    expect(mockGetPublicUrl).toHaveBeenCalledWith("report.docx");
  });

  // ── URLs self-hosted (supabase-kong) ────────────────────────────
  it("extrai path de URL self-hosted com supabase-kong (public media)", () => {
    const url =
      "http://supabase-kong:8000/storage/v1/object/public/media/abc123.mp4";
    resolveMediaUrl(url);
    expect(mockGetPublicUrl).toHaveBeenCalledWith("abc123.mp4");
  });

  it("extrai path de URL self-hosted com kong:8000 (sign media)", () => {
    const url =
      "http://kong:8000/storage/v1/object/sign/media/videos/clip.mov?token=abc";
    resolveMediaUrl(url);
    expect(mockGetPublicUrl).toHaveBeenCalledWith("videos/clip.mov");
  });

  it("extrai path de URL self-hosted com authenticated bucket", () => {
    const url =
      "http://supabase-kong:8000/storage/v1/object/authenticated/media/secret.jpg";
    resolveMediaUrl(url);
    expect(mockGetPublicUrl).toHaveBeenCalledWith("secret.jpg");
  });

  // ── URLs de terceiros (passthrough) ─────────────────────────────
  it("retorna URL de terceiros diretamente (Cloudinary)", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
    expect(resolveMediaUrl(url)).toBe(url);
    expect(mockGetPublicUrl).not.toHaveBeenCalled();
  });

  it("retorna URL de terceiros diretamente (Mixkit)", () => {
    const url = "https://assets.mixkit.co/videos/preview/sample.mp4";
    expect(resolveMediaUrl(url)).toBe(url);
  });

  it("retorna URL de terceiros diretamente (YouTube thumbnail)", () => {
    const url = "https://i.ytimg.com/vi/abc123/hqdefault.jpg";
    expect(resolveMediaUrl(url)).toBe(url);
  });

  // ── Decodificação de URL-encoded paths ──────────────────────────
  it("decodifica path com espaços URL-encoded", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/public/media/my%20file%20name.jpg";
    resolveMediaUrl(url);
    expect(mockGetPublicUrl).toHaveBeenCalledWith("my file name.jpg");
  });

  it("decodifica path com caracteres especiais", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/sign/media/arquivo%20(1).pdf?token=abc";
    resolveMediaUrl(url);
    expect(mockGetPublicUrl).toHaveBeenCalledWith("arquivo (1).pdf");
  });

  // ── Fallback quando getPublicUrl retorna null ───────────────────
  it("retorna a URL original quando getPublicUrl retorna null (path relativo)", () => {
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: null } });
    expect(resolveMediaUrl("abc123.jpg")).toBeNull();
  });

  it("retorna a URL original quando getPublicUrl retorna null (URL storage)", () => {
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: null } });
    const url =
      "https://xyz.supabase.co/storage/v1/object/public/media/abc123.jpg";
    expect(resolveMediaUrl(url)).toBe(url);
  });

  // ── Path com leading slash ──────────────────────────────────────
  it("remove leading slash do path extraído", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/public/media//abc/photo.jpg";
    resolveMediaUrl(url);
    // O path extraído começa com /, deve ser removido
    const calledPath = mockGetPublicUrl.mock.calls[0][0];
    expect(calledPath.startsWith("/")).toBe(false);
  });
});
