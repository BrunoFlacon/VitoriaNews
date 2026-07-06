"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CircleAlert, Plus, Trash2, ChevronDown, ChevronUp, CornerDownRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NODE_META, NodeIconChip, groupNodeTypesByCategory, nodeColors, slugify, summarizeNode, type BuilderNode, type NodeType } from "./shared";
import { NodeConfigForm } from "./forms/node-config-form";
import { NodeKeySelect } from "./forms/fields";
import { IssueLine } from "./validation-panel";
import { useFlowEditor } from "./flow-editor-state";

export function FlowBuilder() {
  const { state, setState, issues, flashKey, addNode: addNodeCtx, updateNode, updateNodeConfig, removeNode: removeNodeCtx } = useFlowEditor();

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(state.nodes.map((n) => n.node_key)));
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const addNode = useCallback((type: NodeType) => {
    const key = addNodeCtx(type);
    setExpanded((prev) => new Set([...prev, key]));
  }, [addNodeCtx]);

  const removeNode = useCallback((key: string) => {
    removeNodeCtx(key);
    setExpanded((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }, [removeNodeCtx]);

  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }, []);

  const setNodeRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(key, el); else nodeRefs.current.delete(key);
  }, []);

  const expandedWithFlash = useMemo(() => {
    if (!flashKey || expanded.has(flashKey)) return expanded;
    return new Set([...expanded, flashKey]);
  }, [expanded, flashKey]);

  useEffect(() => {
    if (!flashKey) return;
    requestAnimationFrame(() => {
      nodeRefs.current.get(flashKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [flashKey]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-7">
      <TriggerPanel state={state} setState={setState} triggerIssues={issues.filter((i) => i.scope === "trigger")} />

      <EntryPicker state={state} setState={setState} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">Nodes ({state.nodes.length})</h2>
          <AddNodeButton onAdd={addNode} />
        </div>

        {state.nodes.length === 0 ? (
          <div className="border-border bg-card/50 text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            Adicione um nó <strong>Start</strong>, depois <strong>Send buttons</strong>, depois <strong>Handoff</strong>.
          </div>
        ) : (
          state.nodes.map((node) => (
            <NodeCard
              key={node.node_key}
              node={node}
              allNodes={state.nodes}
              expanded={expandedWithFlash.has(node.node_key)}
              isEntry={state.entry_node_key === node.node_key}
              isFlashed={flashKey === node.node_key}
              cardRef={setNodeRef(node.node_key)}
              issues={issues.filter((i) => i.scope === "node" && i.node_key === node.node_key)}
              onToggle={() => toggleExpanded(node.node_key)}
              onUpdate={(patch) => updateNode(node.node_key, patch)}
              onUpdateConfig={(patch) => updateNodeConfig(node.node_key, patch)}
              onRemove={() => removeNode(node.node_key)}
              onSetEntry={() => setState((s: any) => ({ ...s, entry_node_key: node.node_key }))}
            />
          ))
        )}
      </section>
    </div>
  );
}

function KeywordsInput({ keywords, onChange }: { keywords: string[]; onChange: (keywords: string[]) => void }) {
  const [draft, setDraft] = useState(keywords.join(", "));

  function commit() {
    const parsed = draft.split(",").map((k) => k.trim()).filter(Boolean);
    setDraft(parsed.join(", "));
    onChange(parsed);
  }

  return (
    <Input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
      placeholder="suporte, ajuda, oi" className="bg-muted" />
  );
}

function TriggerPanel({ state, setState, triggerIssues }: any) {
  return (
    <section className="border-border bg-card rounded-lg border p-4">
      <h2 className="text-foreground mb-3 text-sm font-semibold">Gatilho</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Quando…</label>
          <Select value={state.trigger_type} onValueChange={(v: string) =>
            setState((s: any) => ({ ...s, trigger_type: v, trigger_config: v === "keyword" ? { keywords: [] } : {} }))
          }>
            <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="keyword">Mensagem contém palavra-chave</SelectItem>
              <SelectItem value="first_inbound_message">Primeira mensagem do contato</SelectItem>
              <SelectItem value="manual">Apenas manual (sem auto-gatilho)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {state.trigger_type === "keyword" && (
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">Palavras-chave (separadas por vírgula)</label>
            <KeywordsInput keywords={Array.isArray(state.trigger_config?.keywords) ? state.trigger_config.keywords : []}
              onChange={(keywords) => setState((s: any) => ({ ...s, trigger_config: { ...s.trigger_config, keywords } }))} />
          </div>
        )}
      </div>
      {triggerIssues.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">{triggerIssues.map((i: any, ix: number) => <IssueLine key={ix} issue={i} />)}</div>
      )}
    </section>
  );
}

function EntryPicker({ state, setState }: any) {
  if (state.nodes.length === 0) return null;
  return (
    <section className="border-border bg-card flex items-center gap-3 rounded-lg border p-3">
      <CornerDownRight className="text-primary h-4 w-4 shrink-0" />
      <span className="text-muted-foreground text-xs">Nó de entrada:</span>
      <NodeKeySelect value={state.entry_node_key} nodes={state.nodes}
        onChange={(key: string | null) => setState((s: any) => ({ ...s, entry_node_key: key }))}
        placeholder="Escolha o primeiro nó…" className="max-w-xs flex-1" />
    </section>
  );
}

function NodeCard({ node, allNodes, expanded, isEntry, isFlashed, cardRef, issues, onToggle, onUpdate, onUpdateConfig, onRemove, onSetEntry }: any) {
  const meta = NODE_META[node.node_type as NodeType];
  const c = nodeColors(node.node_type as NodeType);
  const hasError = issues.some((i: any) => i.severity === "error");
  const preview = summarizeNode(node);

  return (
    <div ref={cardRef} className={cn("bg-card relative overflow-hidden rounded-xl border transition-shadow duration-500",
      hasError ? "border-red-500/40" : isEntry ? "border-primary/50" : "border-border",
      isFlashed && "ring-primary ring-offset-background ring-2 ring-offset-2")}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: c.solid }} />
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 pl-5 text-left">
        <NodeIconChip type={node.node_type as NodeType} size={32} iconSize={16} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[11px] font-semibold tracking-wider uppercase" style={{ color: c.text }}>{meta.label}</span>
            <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">{node.node_key}</code>
            {isEntry && <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px]">Entry</Badge>}
          </div>
          {!expanded && preview && <p className="text-muted-foreground mt-0.5 truncate text-xs">{preview}</p>}
        </div>
        {hasError && <CircleAlert className="h-3.5 w-3.5 shrink-0 text-red-400" />}
        {expanded ? <ChevronUp className="text-muted-foreground h-4 w-4" /> : <ChevronDown className="text-muted-foreground h-4 w-4" />}
      </button>

      {expanded && (
        <div className="border-border border-t px-4 py-4">
          <NodeConfigWithAdvanced node={node} allNodes={allNodes} onUpdate={onUpdate} onUpdateConfig={onUpdateConfig} />
          <div className="border-border mt-4 flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              {!isEntry && <Button variant="ghost" size="sm" onClick={onSetEntry}>Definir como entrada</Button>}
            </div>
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" /> Remover nó
            </Button>
          </div>
          {issues.length > 0 && (
            <div className="mt-3 flex flex-col gap-1 rounded-md bg-red-500/5 p-2">
              {issues.map((i: any, ix: number) => <IssueLine key={ix} issue={i} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NodeConfigWithAdvanced({ node, allNodes, onUpdate, onUpdateConfig }: any) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <NodeConfigForm node={node} allNodes={allNodes} showAdvanced={showAdvanced} onUpdateConfig={onUpdateConfig} />
      <div className="border-border border-t pt-3">
        <button type="button" onClick={() => setShowAdvanced((v: boolean) => !v)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showAdvanced ? "Ocultar" : "Mostrar"} avançado
        </button>
        {showAdvanced && (
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Node key (identificador interno)</label>
              <Input value={node.node_key} onChange={(e) => onUpdate({ node_key: slugify(e.target.value, node.node_key) })} className="bg-muted font-mono text-xs" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddNodeButton({ onAdd }: { onAdd: (type: NodeType) => void }) {
  const types: NodeType[] = ["start", "send_buttons", "send_list", "send_message", "send_media", "collect_input", "condition", "set_tag", "handoff", "end"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border bg-card text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors" aria-label="Adicionar nó">
        <Plus className="h-3.5 w-3.5" /> Adicionar nó
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border bg-popover">
        {groupNodeTypesByCategory(types).map((group, i) => (
          <div key={group.id}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{group.label}</DropdownMenuLabel>
            {group.types.map((t) => {
              const meta = NODE_META[t];
              return (
                <DropdownMenuItem key={t} onClick={() => onAdd(t)}>
                  <meta.icon className={cn("h-3.5 w-3.5", meta.color)} /> {meta.label}
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
