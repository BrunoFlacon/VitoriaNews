/**
 * Extract all {{N}} variable indices from a template text string.
 * Returns sorted deduplicated array of indices (1-based).
 */
export function extractVariableIndices(text: string): number[] {
  const regex = /\{\{(\d+)\}\}/g;
  const indices = new Set<number>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    indices.add(parseInt(match[1], 10));
  }
  const sorted = [...indices].sort((a, b) => a - b);
  return sorted;
}
