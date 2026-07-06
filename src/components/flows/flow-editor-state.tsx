"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { toast } from "sonner";

import { validateFlowForActivation, type ValidationIssue } from "@/lib/flows/validate";
import { unlinkNodeReferences } from "@/lib/flows/edges";
import { NODE_META, slugify, type BuilderNode, type NodeType } from "./shared";
import { supabase } from "@/integrations/supabase/client";

export interface BuilderState {
  name: string;
  description: string;
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: Record<string, unknown>;
  entry_node_key: string | null;
  nodes: BuilderNode[];
}

interface FlowMeta {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  version: number;
}

export interface FlowEditorContextValue {
  flow: FlowMeta;
  state: BuilderState;
  setState: (updaterOrValue: BuilderState | ((prev: BuilderState) => BuilderState)) => void;
  dirty: boolean;
  saving: boolean;
  activating: boolean;
  issues: ValidationIssue[];
  canActivate: boolean;
  addNode: (type: NodeType) => string;
  updateNode: (key: string, patch: Partial<BuilderNode>) => void;
  updateNodeConfig: (key: string, patch: Record<string, unknown>) => void;
  updateNodePosition: (key: string, x: number, y: number) => void;
  updateNodePositions: (positions: Record<string, { x: number; y: number }>) => void;
  removeNode: (key: string) => void;
  save: () => Promise<void>;
  setActiveState: (active: boolean) => Promise<void>;
  deleteFlow: () => Promise<void>;
  flashKey: string | null;
  requestFlash: (key: string) => void;
  onBack: () => void;
}

const FlowEditorCtx = createContext<FlowEditorContextValue | null>(null);

export function useFlowEditor(): FlowEditorContextValue {
  const ctx = useContext(FlowEditorCtx);
  if (!ctx) throw new Error("useFlowEditor must be called inside <FlowEditorProvider>");
  return ctx;
}

export function uniqueNodeKey(base: string, existing: BuilderNode[]): string {
  if (!existing.some((n) => n.node_key === base)) return base;
  let i = 2;
  while (existing.some((n) => n.node_key === `${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

export function defaultConfigFor(type: NodeType): Record<string, unknown> {
  switch (type) {
    case "start": return { next_node_key: "" };
    case "send_message": return { text: "", next_node_key: "" };
    case "send_buttons": return { text: "", buttons: [{ reply_id: "yes", title: "Yes", next_node_key: "" }] };
    case "send_list": return { text: "", button_label: "View options", sections: [{ title: "", rows: [{ reply_id: "row_1", title: "Option 1", next_node_key: "" }] }] };
    case "send_media": return { media_type: "image", media_url: "", caption: "", filename: "", next_node_key: "" };
    case "collect_input": return { prompt_text: "", var_key: "answer", next_node_key: "" };
    case "condition": return { subject: "var", subject_key: "", operator: "equals", value: "", true_next: "", false_next: "" };
    case "set_tag": return { mode: "add", tag_id: "", next_node_key: "" };
    case "handoff": return { note: "" };
    case "end": return {};
  }
}

export function applyNodePositions(
  nodes: BuilderNode[],
  positions: Record<string, { x: number; y: number }>,
): BuilderNode[] {
  return nodes.map((n) => {
    const next = positions[n.node_key];
    return next ? { ...n, position_x: Math.round(next.x), position_y: Math.round(next.y) } : n;
  });
}

interface ProviderProps {
  flowId: string;
  userId: string;
  initialName: string;
  initialDescription: string;
  initialTriggerType: string;
  initialTriggerConfig: Record<string, unknown>;
  initialIsActive: boolean;
  initialNodes: BuilderNode[];
  initialEntryNodeKey: string | null;
  onBack: () => void;
  children: ReactNode;
}

export function FlowEditorProvider({
  flowId, userId, initialName, initialDescription, initialTriggerType,
  initialTriggerConfig, initialIsActive, initialNodes, initialEntryNodeKey,
  onBack, children,
}: ProviderProps) {
  const [state, setStateRaw] = useState<BuilderState>(() => ({
    name: initialName,
    description: initialDescription,
    trigger_type: initialTriggerType as BuilderState["trigger_type"],
    trigger_config: initialTriggerConfig,
    entry_node_key: initialEntryNodeKey,
    nodes: initialNodes,
  }));

  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [dirty, setDirty] = useState(false);

  const setState = useCallback<typeof setStateRaw>((updaterOrValue) => {
    setDirty(true);
    setStateRaw(updaterOrValue);
  }, []);

  const [flashKey, setFlashKey] = useState<string | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const requestFlash = useCallback((key: string) => {
    if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
    setFlashKey(key);
    flashTimeoutRef.current = window.setTimeout(() => { setFlashKey(null); flashTimeoutRef.current = null; }, 1600);
  }, []);
  useEffect(() => () => { if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current); }, []);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const issues = useMemo<ValidationIssue[]>(
    () => validateFlowForActivation(
      { name: state.name, trigger_type: state.trigger_type, trigger_config: state.trigger_config, entry_node_key: state.entry_node_key },
      state.nodes,
    ),
    [state],
  );
  const canActivate = useMemo(() => issues.every((i) => i.severity !== "error"), [issues]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("flows").update({
        name: state.name,
        description: state.description || null,
        trigger_type: state.trigger_type,
        trigger_config: state.trigger_config,
        entry_node_key: state.entry_node_key,
        version: 1,
      }).eq("id", flowId);
      if (error) throw error;

      // Replace all nodes: delete existing, insert new
      const { error: delErr } = await supabase.from("flow_nodes").delete().eq("flow_id", flowId);
      if (delErr) throw delErr;

      if (state.nodes.length > 0) {
        const { error: insErr } = await supabase.from("flow_nodes").insert(
          state.nodes.map((n) => ({
            flow_id: flowId,
            node_key: n.node_key,
            node_type: n.node_type,
            config: n.config,
            position_x: n.position_x ?? 0,
            position_y: n.position_y ?? 0,
          }))
        );
        if (insErr) throw insErr;
      }

      setDirty(false);
      toast.success("Fluxo salvo.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }, [flowId, state]);

  const setActiveState = useCallback(async (active: boolean) => {
    if (active && !canActivate) {
      toast.error("Corrija os problemas abaixo antes de ativar.");
      return;
    }
    setActivating(true);
    try {
      if (active) await save();
      const { error } = await supabase.from("flows").update({ is_active: active }).eq("id", flowId);
      if (error) throw error;
      toast.success(active ? "Fluxo ativado." : "Fluxo pausado.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar status.");
    } finally {
      setActivating(false);
    }
  }, [canActivate, save, flowId]);

  const deleteFlow = useCallback(async () => {
    const yes = window.confirm(`Excluir "${state.name}"? Isso não pode ser desfeito.`);
    if (!yes) return;
    try {
      const { error } = await supabase.from("flows").delete().eq("id", flowId);
      if (error) throw error;
      toast.success("Fluxo excluído.");
      onBack();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir.");
    }
  }, [flowId, state.name, onBack]);

  const updateNode = useCallback((key: string, patch: Partial<BuilderNode>) => {
    setState((s) => ({ ...s, nodes: s.nodes.map((n) => n.node_key === key ? { ...n, ...patch } : n) }));
  }, [setState]);

  const updateNodeConfig = useCallback((key: string, configPatch: Record<string, unknown>) => {
    setState((s) => ({
      ...s,
      nodes: s.nodes.map((n) => n.node_key === key ? { ...n, config: { ...n.config, ...configPatch } } : n),
    }));
  }, [setState]);

  const updateNodePosition = useCallback((key: string, x: number, y: number) => {
    setState((s) => ({
      ...s,
      nodes: s.nodes.map((n) => n.node_key === key ? { ...n, position_x: Math.round(x), position_y: Math.round(y) } : n),
    }));
  }, [setState]);

  const updateNodePositions = useCallback((positions: Record<string, { x: number; y: number }>) => {
    setStateRaw((s) => ({ ...s, nodes: applyNodePositions(s.nodes, positions) }));
  }, []);

  const addNode = useCallback((type: NodeType): string => {
    const meta = NODE_META[type];
    const base = slugify(meta.label, type);
    let createdKey = base;
    setState((s) => {
      const node_key = uniqueNodeKey(base, s.nodes);
      createdKey = node_key;
      return {
        ...s,
        nodes: [...s.nodes, { node_key, node_type: type, config: defaultConfigFor(type) }],
        entry_node_key: s.entry_node_key ?? (type === "start" ? node_key : s.entry_node_key ?? null),
      };
    });
    return createdKey;
  }, [setState]);

  const removeNode = useCallback((key: string) => {
    setState((s) => ({
      ...s,
      nodes: unlinkNodeReferences(s.nodes.filter((n) => n.node_key !== key), key),
      entry_node_key: s.entry_node_key === key ? null : s.entry_node_key,
    }));
  }, [setState]);

  const flow: FlowMeta = { id: flowId, user_id: userId, created_at: "", updated_at: "", is_active: initialIsActive, version: 1 };

  const value = useMemo<FlowEditorContextValue>(() => ({
    flow, state, setState, dirty, saving, activating, issues, canActivate,
    addNode, updateNode, updateNodeConfig, updateNodePosition, updateNodePositions, removeNode,
    save, setActiveState, deleteFlow, flashKey, requestFlash, onBack,
  }), [flow, state, setState, dirty, saving, activating, issues, canActivate,
      addNode, updateNode, updateNodeConfig, updateNodePosition, updateNodePositions,
      removeNode, save, setActiveState, deleteFlow, flashKey, requestFlash, onBack]);

  return <FlowEditorCtx.Provider value={value}>{children}</FlowEditorCtx.Provider>;
}
