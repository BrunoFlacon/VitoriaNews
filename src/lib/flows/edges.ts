/**
 * Derive canvas edges from the flow's node list.
 */

import type { BuilderNode } from "@/components/flows/shared";

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  label?: string;
}

export function deriveCanvasEdges(nodes: BuilderNode[]): CanvasEdge[] {
  const knownKeys = new Set(nodes.map((n) => n.node_key));
  const edges: CanvasEdge[] = [];

  for (const node of nodes) {
    const cfg = node.config;
    switch (node.node_type) {
      case "start":
      case "send_message":
      case "send_media":
      case "collect_input":
      case "set_tag": {
        const next = (cfg as { next_node_key?: string }).next_node_key;
        if (next && knownKeys.has(next)) {
          edges.push({
            id: `${node.node_key}--next--${next}`,
            source: node.node_key,
            target: next,
            sourceHandle: "next",
          });
        }
        break;
      }

      case "condition": {
        const trueNext = (cfg as { true_next?: string }).true_next;
        const falseNext = (cfg as { false_next?: string }).false_next;
        if (trueNext && knownKeys.has(trueNext)) {
          edges.push({
            id: `${node.node_key}--true--${trueNext}`,
            source: node.node_key,
            target: trueNext,
            sourceHandle: "true",
            label: "true",
          });
        }
        if (falseNext && knownKeys.has(falseNext)) {
          edges.push({
            id: `${node.node_key}--false--${falseNext}`,
            source: node.node_key,
            target: falseNext,
            sourceHandle: "false",
            label: "false",
          });
        }
        break;
      }

      case "send_buttons": {
        const buttons = Array.isArray((cfg as { buttons?: unknown }).buttons)
          ? ((cfg as { buttons: Array<Record<string, unknown>> }).buttons)
          : [];
        for (const btn of buttons) {
          const replyId = typeof btn.reply_id === "string" ? btn.reply_id : null;
          const next = typeof btn.next_node_key === "string" ? btn.next_node_key : null;
          const title = typeof btn.title === "string" ? btn.title : null;
          if (!replyId || !next || !knownKeys.has(next)) continue;
          edges.push({
            id: `${node.node_key}--button:${replyId}--${next}`,
            source: node.node_key,
            target: next,
            sourceHandle: `button:${replyId}`,
            label: title ?? replyId,
          });
        }
        break;
      }

      case "send_list": {
        const sections = Array.isArray((cfg as { sections?: unknown }).sections)
          ? ((cfg as { sections: Array<Record<string, unknown>> }).sections)
          : [];
        for (const section of sections) {
          const rows = Array.isArray(section.rows)
            ? (section.rows as Array<Record<string, unknown>>)
            : [];
          for (const row of rows) {
            const replyId = typeof row.reply_id === "string" ? row.reply_id : null;
            const next = typeof row.next_node_key === "string" ? row.next_node_key : null;
            const title = typeof row.title === "string" ? row.title : null;
            if (!replyId || !next || !knownKeys.has(next)) continue;
            edges.push({
              id: `${node.node_key}--row:${replyId}--${next}`,
              source: node.node_key,
              target: next,
              sourceHandle: `row:${replyId}`,
              label: title ?? replyId,
            });
          }
        }
        break;
      }

      case "handoff":
      case "end":
        break;
    }
  }

  return edges;
}

// ============================================================
// Inverse operations
// ============================================================

export interface OutgoingSlot {
  id: string;
  label: string;
}

export function outgoingSlots(node: BuilderNode): OutgoingSlot[] {
  const cfg = node.config;
  switch (node.node_type) {
    case "start":
    case "send_message":
    case "send_media":
    case "collect_input":
    case "set_tag":
      return [{ id: "next", label: "Next" }];

    case "condition":
      return [
        { id: "true", label: "true" },
        { id: "false", label: "false" },
      ];

    case "send_buttons": {
      const buttons = Array.isArray((cfg as { buttons?: unknown }).buttons)
        ? ((cfg as { buttons: Array<Record<string, unknown>> }).buttons)
        : [];
      return buttons
        .filter((b) => typeof b.reply_id === "string" && b.reply_id)
        .map((b) => {
          const replyId = b.reply_id as string;
          const title = typeof b.title === "string" ? b.title : null;
          return { id: `button:${replyId}`, label: title ?? replyId };
        });
    }

    case "send_list": {
      const sections = Array.isArray((cfg as { sections?: unknown }).sections)
        ? ((cfg as { sections: Array<Record<string, unknown>> }).sections)
        : [];
      const slots: OutgoingSlot[] = [];
      for (const section of sections) {
        const rows = Array.isArray(section.rows)
          ? (section.rows as Array<Record<string, unknown>>)
          : [];
        for (const row of rows) {
          const replyId = typeof row.reply_id === "string" ? row.reply_id : null;
          if (!replyId) continue;
          const title = typeof row.title === "string" ? row.title : null;
          slots.push({ id: `row:${replyId}`, label: title ?? replyId });
        }
      }
      return slots;
    }

    case "handoff":
    case "end":
      return [];
  }
}

export function applyEdgeConnection(
  node: BuilderNode,
  sourceHandle: string,
  targetKey: string,
): Record<string, unknown> | null {
  switch (node.node_type) {
    case "start":
    case "send_message":
    case "send_media":
    case "collect_input":
    case "set_tag":
      if (sourceHandle === "next") return { next_node_key: targetKey };
      return null;

    case "condition":
      if (sourceHandle === "true") return { true_next: targetKey };
      if (sourceHandle === "false") return { false_next: targetKey };
      return null;

    case "send_buttons": {
      if (!sourceHandle.startsWith("button:")) return null;
      const replyId = sourceHandle.slice("button:".length);
      const buttons = Array.isArray((node.config as { buttons?: unknown }).buttons)
        ? (node.config as { buttons: Array<Record<string, unknown>> }).buttons
        : [];
      if (!buttons.some((b) => b.reply_id === replyId)) return null;
      return {
        buttons: buttons.map((b) =>
          b.reply_id === replyId ? { ...b, next_node_key: targetKey } : b,
        ),
      };
    }

    case "send_list": {
      if (!sourceHandle.startsWith("row:")) return null;
      const replyId = sourceHandle.slice("row:".length);
      const sections = Array.isArray((node.config as { sections?: unknown }).sections)
        ? (node.config as { sections: Array<Record<string, unknown>> }).sections
        : [];
      let matched = false;
      const next = sections.map((s) => {
        const rows = Array.isArray(s.rows)
          ? (s.rows as Array<Record<string, unknown>>)
          : [];
        return {
          ...s,
          rows: rows.map((r) => {
            if (r.reply_id === replyId) {
              matched = true;
              return { ...r, next_node_key: targetKey };
            }
            return r;
          }),
        };
      });
      return matched ? { sections: next } : null;
    }

    case "handoff":
    case "end":
      return null;
  }
}

export function unlinkNodeReferences(
  nodes: BuilderNode[],
  deletedKey: string,
): BuilderNode[] {
  return nodes.map((n) => {
    const patched = patchedConfigWithoutKey(n, deletedKey);
    return patched ? { ...n, config: patched } : n;
  });
}

function patchedConfigWithoutKey(
  node: BuilderNode,
  deletedKey: string,
): Record<string, unknown> | null {
  const cfg = node.config;
  switch (node.node_type) {
    case "start":
    case "send_message":
    case "send_media":
    case "collect_input":
    case "set_tag": {
      const next = (cfg as { next_node_key?: string }).next_node_key;
      if (next !== deletedKey) return null;
      return { ...cfg, next_node_key: "" };
    }

    case "condition": {
      const c = cfg as { true_next?: string; false_next?: string };
      const trueMatch = c.true_next === deletedKey;
      const falseMatch = c.false_next === deletedKey;
      if (!trueMatch && !falseMatch) return null;
      return {
        ...cfg,
        ...(trueMatch ? { true_next: "" } : {}),
        ...(falseMatch ? { false_next: "" } : {}),
      };
    }

    case "send_buttons": {
      const buttons = Array.isArray((cfg as { buttons?: unknown }).buttons)
        ? (cfg as { buttons: Array<Record<string, unknown>> }).buttons
        : [];
      if (!buttons.some((b) => b.next_node_key === deletedKey)) return null;
      return {
        ...cfg,
        buttons: buttons.map((b) =>
          b.next_node_key === deletedKey ? { ...b, next_node_key: "" } : b,
        ),
      };
    }

    case "send_list": {
      const sections = Array.isArray((cfg as { sections?: unknown }).sections)
        ? (cfg as { sections: Array<Record<string, unknown>> }).sections
        : [];
      let dirty = false;
      const next = sections.map((s) => {
        const rows = Array.isArray(s.rows)
          ? (s.rows as Array<Record<string, unknown>>)
          : [];
        return {
          ...s,
          rows: rows.map((r) => {
            if (r.next_node_key === deletedKey) {
              dirty = true;
              return { ...r, next_node_key: "" };
            }
            return r;
          }),
        };
      });
      return dirty ? { ...cfg, sections: next } : null;
    }

    case "handoff":
    case "end":
      return null;
  }
}
