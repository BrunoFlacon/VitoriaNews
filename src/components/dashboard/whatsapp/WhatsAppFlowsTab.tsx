"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Workflow, Loader2, FileText } from "lucide-react";
import { FlowEditorShell } from "@/components/flows/flow-editor-shell";
import type { BuilderNode } from "@/components/flows/flow-editor-state";
import type { DbFlowRow } from "@/lib/flows/types";

/* ─── Status badge ─── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground" },
    active: { label: "Ativo", cls: "bg-green-500/15 text-green-400" },
    paused: { label: "Pausado", cls: "bg-amber-500/15 text-amber-400" },
    error: { label: "Erro", cls: "bg-red-500/15 text-red-400" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={cn("text-[11px] font-medium", m.cls)}>{m.label}</Badge>;
}

/* ─── Flow list view ─── */
function FlowListView({ onSelect, onCreate }: { onSelect: (id: string) => void; onCreate: () => void }) {
  const [flows, setFlows] = useState<DbFlowRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("flows")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) console.error("Error loading flows:", error);
    else setFlows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Description header */}
      <div className="px-6 pt-4 pb-2 border-b border-border/50 bg-card/30 shrink-0">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Crie e gerencie fluxos de conversa automatizados. Use o editor visual para montar sequências de mensagens,
          coleta de dados, condições e transferência para atendente.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
        <h2 className="text-sm font-semibold">Fluxos ({flows.length})</h2>
        <Button size="sm" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Novo fluxo
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Workflow className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum fluxo criado ainda.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Novo fluxo" para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {flows.map((f) => (
              <Card
                key={f.id}
                className="cursor-pointer hover:border-primary/40 transition-colors bg-card"
                onClick={() => onSelect(f.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold truncate">{f.name || "Sem nome"}</CardTitle>
                    <StatusBadge status={f.status} />
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {f.description || "Sem descrição"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {(f.nodes as any[])?.length ?? 0} nós
                    </span>
                    <span>
                      Criado {new Date(f.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Editor loader (loads flow data or creates new) ─── */
function FlowEditorLoader({ flowId, onBack }: { flowId: string | null; onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(flowId !== null);
  const [editorProps, setEditorProps] = useState<{
    flowId: string;
    userId: string;
    flowName: string;
    flowDescription: string;
    triggerType: string;
    triggerConfig: Record<string, unknown>;
    isActive: boolean;
    nodes: BuilderNode[];
    entryNodeKey: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    if (flowId === null) {
      // New flow — use defaults; create a placeholder row
      (async () => {
        const { data: newFlow, error } = await supabase
          .from("flows")
          .insert({ owner_id: user.id, user_id: user.id, name: "Novo fluxo", status: "draft" })
          .select()
          .single();
        if (error) {
          console.error("Error creating new flow:", error);
          toast({ title: "Erro", description: "Não foi possível criar o fluxo.", variant: "destructive" });
          onBack();
          return;
        }
        if (!cancelled && newFlow) {
          setEditorProps({
            flowId: newFlow.id,
            userId: user.id,
            flowName: newFlow.name ?? "",
            flowDescription: newFlow.description ?? "",
            triggerType: newFlow.trigger_type ?? "first_inbound_message",
            triggerConfig: (newFlow.trigger_config ?? {}) as Record<string, unknown>,
            isActive: newFlow.is_active ?? false,
            nodes: [],
            entryNodeKey: newFlow.entry_node_key ?? null,
          });
        }
      })();
      return;
    }

    // Existing flow — load from DB
    (async () => {
      setLoading(true);
      const { data: flow, error: flowErr } = await supabase
        .from("flows")
        .select("*")
        .eq("id", flowId)
        .single();
      if (flowErr || !flow) {
        console.error("Error loading flow:", flowErr);
        toast({ title: "Erro", description: "Fluxo não encontrado.", variant: "destructive" });
        if (!cancelled) onBack();
        return;
      }

      const { data: nodes, error: nodesErr } = await supabase
        .from("flow_nodes")
        .select("*")
        .eq("flow_id", flowId)
        .order("node_key");
      if (nodesErr) console.error("Error loading nodes:", nodesErr);

      const mappedNodes: BuilderNode[] = (nodes ?? []).map((n: any) => ({
        node_key: n.node_key,
        node_type: n.node_type,
        config: n.config ?? {},
        position_x: n.position_x ?? 0,
        position_y: n.position_y ?? 0,
      }));

      if (!cancelled) {
        setEditorProps({
          flowId: flow.id,
          userId: user.id,
          flowName: flow.name ?? "",
          flowDescription: flow.description ?? "",
          triggerType: flow.trigger_type ?? "first_inbound_message",
          triggerConfig: (flow.trigger_config ?? {}) as Record<string, unknown>,
          isActive: flow.is_active ?? false,
          nodes: mappedNodes,
          entryNodeKey: flow.entry_node_key ?? null,
        });
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [flowId, user, onBack, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!editorProps) return null;

  return (
    <FlowEditorShell
      flowId={editorProps.flowId}
      userId={editorProps.userId}
      flowName={editorProps.flowName}
      flowDescription={editorProps.flowDescription}
      triggerType={editorProps.triggerType}
      triggerConfig={editorProps.triggerConfig}
      isActive={editorProps.isActive}
      nodes={editorProps.nodes}
      entryNodeKey={editorProps.entryNodeKey}
      onBack={onBack}
    />
  );
}

/* ─── Main tab component ─── */
export function WhatsAppFlowsTab() {
  const [view, setView] = useState<"list" | "edit">("list");
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingFlowId(null);
    setView("edit");
  };

  const handleSelect = (id: string) => {
    setEditingFlowId(id);
    setView("edit");
  };

  const handleBack = () => {
    setView("list");
    setEditingFlowId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {view === "list" && (
        <FlowListView onSelect={handleSelect} onCreate={handleCreate} />
      )}
      {view === "edit" && (
        <FlowEditorLoader flowId={editingFlowId} onBack={handleBack} />
      )}
    </div>
  );
}
