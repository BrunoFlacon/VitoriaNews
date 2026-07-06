/**
 * Dagre-based auto-layout for the flow canvas.
 */

import Dagre from "@dagrejs/dagre";

export interface LayoutNode {
  id: string;
  width?: number;
  height?: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface LayoutOptions {
  direction?: "TB" | "LR";
  rankSep?: number;
  nodeSep?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

const DEFAULTS: Required<LayoutOptions> = {
  direction: "TB",
  rankSep: 80,
  nodeSep: 60,
  defaultWidth: 240,
  defaultHeight: 90,
};

export function shouldAutoLayout(
  nodes: Array<{ position_x?: number | null; position_y?: number | null }>,
): boolean {
  if (nodes.length === 0) return false;
  return nodes.every(
    (n) => (n.position_x ?? 0) === 0 && (n.position_y ?? 0) === 0,
  );
}

export function autoLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: LayoutOptions = {},
): Map<string, LayoutPosition> {
  const opts = { ...DEFAULTS, ...options };
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
  });

  for (const n of nodes) {
    g.setNode(n.id, {
      width: n.width ?? opts.defaultWidth,
      height: n.height ?? opts.defaultHeight,
    });
  }
  for (const e of edges) {
    if (g.node(e.source) && g.node(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  Dagre.layout(g);

  const positions = new Map<string, LayoutPosition>();
  for (const n of nodes) {
    const laid = g.node(n.id);
    if (!laid) continue;
    positions.set(n.id, {
      x: laid.x - (n.width ?? opts.defaultWidth) / 2,
      y: laid.y - (n.height ?? opts.defaultHeight) / 2,
    });
  }
  return positions;
}
