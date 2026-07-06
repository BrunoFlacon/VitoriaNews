"use client";

import {
  Flag, GitFork, Inbox, ListChecks, ListPlus,
  MessageCircle, Paperclip, PlayCircle, Tag, UserPlus, Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NodeType =
  | "start" | "send_message" | "send_buttons" | "send_list"
  | "send_media" | "collect_input" | "condition" | "set_tag"
  | "handoff" | "end";

export interface BuilderNode {
  node_key: string;
  node_type: NodeType;
  config: Record<string, unknown>;
  position_x?: number;
  position_y?: number;
}

export type NodeCategory = "messaging" | "logic" | "flow";

export const NODE_CATEGORIES: { id: NodeCategory; label: string }[] = [
  { id: "messaging", label: "Messaging" },
  { id: "logic", label: "Logic & data" },
  { id: "flow", label: "Flow control" },
];

export const NODE_META: Record<
  NodeType,
  { label: string; icon: typeof Workflow; color: string; blurb: string; category: NodeCategory }
> = {
  start: { label: "Start", icon: PlayCircle, color: "text-emerald-400", blurb: "Entry point of the flow", category: "flow" },
  send_message: { label: "Send message", icon: MessageCircle, color: "text-sky-400", blurb: "Sends a WhatsApp text message", category: "messaging" },
  send_buttons: { label: "Send buttons", icon: ListChecks, color: "text-primary", blurb: "Sends quick-reply buttons", category: "messaging" },
  send_list: { label: "Send list", icon: ListPlus, color: "text-indigo-400", blurb: "Sends a tappable list of options", category: "messaging" },
  send_media: { label: "Send media", icon: Paperclip, color: "text-cyan-400", blurb: "Sends an image, video, or document", category: "messaging" },
  collect_input: { label: "Collect input", icon: Inbox, color: "text-teal-400", blurb: "Asks a question, saves the reply", category: "logic" },
  condition: { label: "If / else", icon: GitFork, color: "text-fuchsia-400", blurb: "Branches on a rule", category: "logic" },
  set_tag: { label: "Tag contact", icon: Tag, color: "text-pink-400", blurb: "Adds or removes a contact tag", category: "logic" },
  handoff: { label: "Handoff to agent", icon: UserPlus, color: "text-amber-400", blurb: "Hands the conversation to a human", category: "flow" },
  end: { label: "End", icon: Flag, color: "text-muted-foreground", blurb: "Ends the flow", category: "flow" },
};

export function groupNodeTypesByCategory(
  types: NodeType[]
): { id: NodeCategory; label: string; types: NodeType[] }[] {
  return NODE_CATEGORIES.map(({ id, label }) => ({
    id, label,
    types: types.filter((t) => NODE_META[t].category === id),
  })).filter((group) => group.types.length > 0);
}

const NODE_HUE: Record<NodeType, { l: number; c: number; h: number }> = {
  start: { l: 0.62, c: 0.13, h: 162 },
  send_message: { l: 0.6, c: 0.18, h: 293 },
  send_buttons: { l: 0.62, c: 0.16, h: 254 },
  send_list: { l: 0.62, c: 0.15, h: 277 },
  send_media: { l: 0.65, c: 0.12, h: 210 },
  collect_input: { l: 0.65, c: 0.1, h: 185 },
  condition: { l: 0.72, c: 0.15, h: 65 },
  set_tag: { l: 0.65, c: 0.15, h: 350 },
  handoff: { l: 0.65, c: 0.17, h: 16 },
  end: { l: 0.55, c: 0.01, h: 260 },
};

export interface NodeColors {
  solid: string; soft: string; ring: string; text: string;
}

export function nodeColors(type: NodeType): NodeColors {
  const t = NODE_HUE[type];
  const solid = `oklch(${t.l} ${t.c} ${t.h})`;
  return {
    solid,
    soft: `oklch(${t.l} ${t.c} ${t.h} / 0.14)`,
    ring: `oklch(${t.l} ${t.c} ${t.h} / 0.45)`,
    text: `color-mix(in oklch, ${solid}, var(--foreground) 38%)`,
  };
}

export function NodeIconChip({
  type, size = 24, iconSize = 14, className,
}: {
  type: NodeType; size?: number; iconSize?: number; className?: string;
}) {
  const meta = NODE_META[type];
  const c = nodeColors(type);
  const Icon = meta.icon;
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-lg", className)}
      style={{ width: size, height: size, background: c.soft, color: c.solid }}
    >
      <Icon size={iconSize} />
    </span>
  );
}

export function slugify(s: string, fallback: string): string {
  const cleaned = s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

export function truncate(s: string, max = 80): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1) + "…";
}

export function summarizeNode(node: BuilderNode): string | null {
  const cfg = node.config;
  switch (node.node_type) {
    case "start":
    case "end":
      return null;
    case "send_message": {
      const text = typeof cfg.text === "string" ? cfg.text : "";
      return text.length > 0 ? truncate(text) : null;
    }
    case "send_buttons": {
      const text = typeof cfg.text === "string" ? cfg.text : "";
      const buttons = Array.isArray(cfg.buttons) ? (cfg.buttons as Array<Record<string, unknown>>) : [];
      const titles = buttons.map((b) => (typeof b.title === "string" ? b.title : "")).filter(Boolean).join(" / ");
      if (text.length > 0) return titles ? `${truncate(text, 40)} · ${truncate(titles, 35)}` : truncate(text);
      return titles || null;
    }
    case "send_list": {
      const text = typeof cfg.text === "string" ? cfg.text : "";
      const sections = Array.isArray(cfg.sections) ? (cfg.sections as Array<Record<string, unknown>>) : [];
      const rowCount = sections.reduce<number>((sum, s) => sum + (Array.isArray(s.rows) ? s.rows.length : 0), 0);
      if (text.length > 0) return rowCount > 0 ? `${truncate(text, 50)} · ${rowCount} option(s)` : truncate(text);
      return rowCount > 0 ? `${rowCount} option(s)` : null;
    }
    case "send_media": {
      const mediaType = typeof cfg.media_type === "string" ? cfg.media_type : "";
      const filename = typeof cfg.filename === "string" ? cfg.filename : "";
      const url = typeof cfg.media_url === "string" ? cfg.media_url : "";
      const caption = typeof cfg.caption === "string" ? cfg.caption : "";
      const label = mediaType ? mediaType.charAt(0).toUpperCase() + mediaType.slice(1) : "Media";
      if (!url) return `${label} (no file uploaded)`;
      const name = filename || url.split("/").pop() || "file";
      return caption ? `${label}: ${truncate(name, 30)} · ${truncate(caption, 40)}` : `${label}: ${truncate(name, 60)}`;
    }
    case "collect_input": {
      const prompt = typeof cfg.prompt_text === "string" ? cfg.prompt_text : "";
      const varKey = typeof cfg.var_key === "string" ? cfg.var_key : "";
      if (prompt.length > 0) return varKey ? `${truncate(prompt, 50)} → vars.${varKey}` : truncate(prompt);
      return varKey ? `→ vars.${varKey}` : null;
    }
    case "condition": {
      const subjectKey = typeof cfg.subject_key === "string" ? cfg.subject_key : "";
      if (!subjectKey) return null;
      const op = cfg.operator === "equals" ? "==" : cfg.operator === "contains" ? "contains" : cfg.operator === "present" ? "exists" : "missing";
      const value = typeof cfg.value === "string" ? cfg.value : "";
      const valStr = (cfg.operator === "equals" || cfg.operator === "contains") && value ? ` "${truncate(value, 20)}"` : "";
      return `${subjectKey} ${op}${valStr}`;
    }
    case "set_tag": {
      const mode = cfg.mode === "remove" ? "Remove" : "Add";
      const tagId = typeof cfg.tag_id === "string" ? cfg.tag_id : "";
      return tagId ? `${mode} tag ${tagId.slice(0, 8)}…` : `${mode} tag (none)`;
    }
    case "handoff": {
      const note = typeof cfg.note === "string" ? cfg.note : "";
      return note.length > 0 ? truncate(note) : null;
    }
  }
}
