/**
 * AI-Powered Layout Advisor
 * Analyzes canvas composition and suggests improvements based on design principles:
 * - Rule of Thirds
 * - Golden Ratio
 * - Visual Balance (weight distribution)
 * - Whitespace / breathing room
 * - Alignment consistency
 * - Focal point positioning
 */

import type { CanvasLayer } from '../CoverCanvasEngine';

export interface LayoutSuggestion {
  id: string;
  type: 'alignment' | 'balance' | 'whitespace' | 'golden-ratio' | 'rule-of-thirds' | 'hierarchy' | 'spacing';
  severity: 'info' | 'warning' | 'suggestion';
  title: string;
  description: string;
  /** Suggested layer updates: { layerId: Partial<CanvasLayer> } */
  fixes: Record<string, Partial<CanvasLayer>>;
  /** Visual preview — affected layer IDs */
  affectedLayerIds: string[];
}

/** Golden ratio constant */
const PHI = 1.618;

/** Thirds lines positions (0.333 and 0.667) */
const THIRD = 1 / 3;

/**
 * Analyze the full canvas and produce a list of layout suggestions.
 */
export function analyzeLayout(
  layers: CanvasLayer[],
  canvasWidth: number,
  canvasHeight: number,
): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  const visible = layers.filter((l) => l.visible && !l.locked);
  if (visible.length === 0) return suggestions;

  // 1. Rule of Thirds — check if focal layers are near thirds intersections
  suggestions.push(...checkRuleOfThirds(visible, canvasWidth, canvasHeight));

  // 2. Golden Ratio — check if key elements align with golden ratio divisions
  suggestions.push(...checkGoldenRatio(visible, canvasWidth, canvasHeight));

  // 3. Visual Balance — check weight distribution across vertical and horizontal axes
  suggestions.push(...checkVisualBalance(visible, canvasWidth, canvasHeight));

  // 4. Whitespace — check if layers are too close to edges
  suggestions.push(...checkWhitespace(visible, canvasWidth, canvasHeight));

  // 5. Alignment Consistency — check if layers are snapped to common edges
  suggestions.push(...checkAlignmentConsistency(visible));

  // 6. Spacing — check uniform spacing between layers
  suggestions.push(...checkUniformSpacing(visible));

  return suggestions;
}

function checkRuleOfThirds(
  layers: CanvasLayer[],
  cw: number,
  ch: number,
): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  const thirdsX = [cw * THIRD, cw * 2 * THIRD];
  const thirdsY = [ch * THIRD, ch * 2 * THIRD];

  // Find the largest text layer (likely the headline / focal point)
  const textLayers = layers.filter((l) => l.type === 'text');
  const headline = textLayers.sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0))[0];

  if (headline) {
    const cx = headline.x + headline.width / 2;
    const cy = headline.y + headline.height / 2;

    // Check if headline center is near any third intersection
    const nearThird = thirdsX.some((tx) => Math.abs(cx - tx) < cw * 0.08);
    const nearThirdY = thirdsY.some((ty) => Math.abs(cy - ty) < ch * 0.08);

    if (!nearThird && !nearThirdY) {
      // Suggest moving headline to nearest thirds intersection
      let bestDist = Infinity;
      let bestX = headline.x;
      let bestY = headline.y;
      for (const tx of thirdsX) {
        for (const ty of thirdsY) {
          const dist = Math.hypot(cx - tx, cy - ty);
          if (dist < bestDist) {
            bestDist = dist;
            bestX = tx - headline.width / 2;
            bestY = ty - headline.height / 2;
          }
        }
      }
      suggestions.push({
        id: 'rot- headline',
        type: 'rule-of-thirds',
        severity: 'suggestion',
        title: 'Mover para Regra dos Terços',
        description: `O título "${headline.name}" não está alinhado com os pontos de interseção da regra dos terços. Mover para (${Math.round(bestX)}, ${Math.round(bestY)}) pode melhorar a composição.`,
        fixes: { [headline.id]: { x: Math.round(bestX), y: Math.round(bestY) } },
        affectedLayerIds: [headline.id],
      });
    }
  }

  return suggestions;
}

function checkGoldenRatio(
  layers: CanvasLayer[],
  cw: number,
  ch: number,
): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  const goldenX = cw / PHI;
  const goldenX2 = cw - goldenX;

  // Check if any image layer is positioned at golden ratio line
  const images = layers.filter((l) => l.type === 'image' || l.type === 'logo');
  images.forEach((img) => {
    const rightEdge = img.x + img.width;
    const distToGolden = Math.min(
      Math.abs(img.x - goldenX),
      Math.abs(rightEdge - goldenX2),
      Math.abs(img.x - goldenX2),
      Math.abs(rightEdge - goldenX),
    );
    if (distToGolden > cw * 0.05) {
      const targetX = Math.abs(img.x - goldenX) < Math.abs(img.x - goldenX2) ? goldenX : goldenX2 - img.width;
      suggestions.push({
        id: `golden-${img.id}`,
        type: 'golden-ratio',
        severity: 'info',
        title: 'Alinhar com Razão Áurea',
        description: `A imagem "${img.name}" pode se beneficiar do alinhamento com a linha áurea (${Math.round(targetX)}px).`,
        fixes: { [img.id]: { x: Math.round(targetX) } },
        affectedLayerIds: [img.id],
      });
    }
  });

  return suggestions;
}

function checkVisualBalance(
  layers: CanvasLayer[],
  cw: number,
  ch: number,
): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];

  // Calculate visual weight on left vs right half
  let leftWeight = 0;
  let rightWeight = 0;
  let topWeight = 0;
  let bottomWeight = 0;

  layers.forEach((l) => {
    const area = l.width * l.height;
    const cx = l.x + l.width / 2;
    const cy = l.y + l.height / 2;
    if (cx < cw / 2) leftWeight += area;
    else rightWeight += area;
    if (cy < ch / 2) topWeight += area;
    else bottomWeight += area;
  });

  const totalWeight = leftWeight + rightWeight;
  if (totalWeight > 0) {
    const leftRatio = leftWeight / totalWeight;
    const imbalance = Math.abs(leftRatio - 0.5);

    if (imbalance > 0.2) {
      const heavySide = leftRatio > 0.5 ? 'esquerda' : 'direita';
      const lightSide = leftRatio > 0.5 ? 'direita' : 'esquerda';
      suggestions.push({
        id: 'balance-h',
        type: 'balance',
        severity: 'warning',
        title: 'Desequilibrio Horizontal',
        description: `O lado ${heavySide} tem muito mais peso visual que o ${lightSide}. Considere redistribuir elementos ou adicionar contrapeso.`,
        fixes: {},
        affectedLayerIds: [],
      });
    }
  }

  const totalWeightV = topWeight + bottomWeight;
  if (totalWeightV > 0) {
    const topRatio = topWeight / totalWeightV;
    const imbalanceV = Math.abs(topRatio - 0.5);
    if (imbalanceV > 0.25) {
      suggestions.push({
        id: 'balance-v',
        type: 'balance',
        severity: 'warning',
        title: 'Desequilibrio Vertical',
        description: `A composição está pesada para ${topRatio > 0.5 ? 'cima' : 'baixo'}. Considere mover elementos para equilibrar.`,
        fixes: {},
        affectedLayerIds: [],
      });
    }
  }

  return suggestions;
}

function checkWhitespace(
  layers: CanvasLayer[],
  cw: number,
  ch: number,
): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  const marginThreshold = Math.min(cw, ch) * 0.03; // 3% minimum margin

  layers.forEach((l) => {
    const issues: string[] = [];
    if (l.x < marginThreshold) issues.push('borda esquerda');
    if (l.y < marginThreshold) issues.push('borda superior');
    if (l.x + l.width > cw - marginThreshold) issues.push('borda direita');
    if (l.y + l.height > ch - marginThreshold) issues.push('borda inferior');

    if (issues.length > 0) {
      suggestions.push({
        id: `whitespace-${l.id}`,
        type: 'whitespace',
        severity: 'suggestion',
        title: 'Espaço Insuficiente nas Bordas',
        description: `A camada "${l.name}" está muito próxima às ${issues.join(' e ')}. Adicione margem para respiração.`,
        fixes: {},
        affectedLayerIds: [l.id],
      });
    }
  });

  return suggestions;
}

function checkAlignmentConsistency(layers: CanvasLayer[]): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  if (layers.length < 2) return suggestions;

  // Group layers by approximate x-position (within 5px tolerance)
  const xGroups = new Map<number, CanvasLayer[]>();
  layers.forEach((l) => {
    const rounded = Math.round(l.x / 5) * 5;
    const existing = xGroups.get(rounded) || [];
    existing.push(l);
    xGroups.set(rounded, existing);
  });

  // Check for near-misses — layers that are almost aligned but not quite
  const allLefts = layers.map((l) => l.x).sort((a, b) => a - b);
  for (let i = 0; i < allLefts.length - 1; i++) {
    const diff = Math.abs(allLefts[i + 1] - allLefts[i]);
    if (diff > 1 && diff < 15) {
      // These two layers are close but not aligned — suggest snapping
      const nearLayers = layers.filter(
        (l) => Math.abs(l.x - allLefts[i]) < 15 || Math.abs(l.x - allLefts[i + 1]) < 15,
      );
      if (nearLayers.length >= 2) {
        const targetX = Math.round((allLefts[i] + allLefts[i + 1]) / 2);
        const fixes: Record<string, Partial<CanvasLayer>> = {};
        nearLayers.forEach((l) => {
          fixes[l.id] = { x: targetX };
        });
        suggestions.push({
          id: `align-x-${i}`,
          type: 'alignment',
          severity: 'suggestion',
          title: 'Alinhar Camadas',
          description: `${nearLayers.length} camadas estão quase alinhadas mas não completamente. Alinhar em X=${targetX} cria consistência visual.`,
          fixes,
          affectedLayerIds: nearLayers.map((l) => l.id),
        });
        break; // One suggestion at a time
      }
    }
  }

  return suggestions;
}

function checkUniformSpacing(layers: CanvasLayer[]): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  if (layers.length < 3) return suggestions;

  // Sort by Y then check vertical spacing
  const sorted = [...layers].sort((a, b) => a.y - b.y);
  const gaps: { gap: number; before: CanvasLayer; after: CanvasLayer }[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const bottomOfA = sorted[i].y + sorted[i].height;
    const gap = sorted[i + 1].y - bottomOfA;
    if (gap > 0 && gap < 100) {
      gaps.push({ gap: Math.round(gap), before: sorted[i], after: sorted[i + 1] });
    }
  }

  if (gaps.length >= 2) {
    const avgGap = gaps.reduce((s, g) => s + g.gap, 0) / gaps.length;
    const inconsistent = gaps.filter((g) => Math.abs(g.gap - avgGap) > 5);

    if (inconsistent.length > 0) {
      suggestions.push({
        id: 'spacing-v',
        type: 'spacing',
        severity: 'suggestion',
        title: 'Espaçamento Inconsistente',
        description: `Os espaços verticais entre camadas variam (${inconsistent.map((g) => g.gap + 'px').join(', ')}). Use espaçamento uniforme de ~${Math.round(avgGap)}px.`,
        fixes: {},
        affectedLayerIds: inconsistent.flatMap((g) => [g.before.id, g.after.id]),
      });
    }
  }

  return suggestions;
}
