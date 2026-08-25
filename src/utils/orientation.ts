/**
 * Determina a orientação inicial baseada no tipo de post e plataformas selecionadas.
 *
 * - Stories, Lives, Shorts, Reels → vertical (9:16)
 * - Carrossel e outros → horizontal
 */
export function getInitialOrientation(
  platforms: string[],
  postType?: string,
): "horizontal" | "vertical" {
  const verticalFormats = ["story", "live", "shorts", "reels"];
  if (postType && verticalFormats.includes(postType)) return "vertical";
  if (platforms.some((p) => verticalFormats.includes(p))) return "vertical";
  return "horizontal";
}
