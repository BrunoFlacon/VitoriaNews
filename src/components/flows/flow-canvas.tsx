"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges, Background, BackgroundVariant, Controls, Handle, MiniMap, Panel, Position,
  ReactFlow, ReactFlowProvider, useReactFlow,
  type Connection, type Node as RfNode, type Edge as RfEdge, type NodeChange, type NodeProps, type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { applyEdgeConnection, deriveCanvasEdges, outgoingSlots } from "@/lib/flows/edges";
import { autoLayout, shouldAutoLayout } from "@/lib/flows/layout";
import { NODE_META, NodeIconChip, groupNodeTypesByCategory, nodeColors, summarizeNode, type BuilderNode, type NodeType } from "./shared";
import { useFlowEditor } from "./flow-editor-state";
import { NodeConfigForm } from "./forms/node-config-form";

interface NodeData extends Record<string, unknown> {
  node: BuilderNode;
  allNodes: BuilderNode[];
  isEntry: boolean;
  isFlashed: boolean;
}

const NODE_W = 240;
const NODE_H = 72;

function rfNode(bn: BuilderNode, allNodes: BuilderNode[], isEntry: boolean, isFlashed: boolean): RfNode<NodeData> {
  return {
    id: bn.node_key,
    type: "flowNode",
    position: { x: bn.position_x ?? 0, y: bn.position_y ?? 0 },
    data: { node: bn, allNodes, isEntry, isFlashed },
    width: NODE_W,
    height: NODE_H,
  };
}

function FlowCanvasInner() {
  const { state, updateNodePosition, updateNodePositions, updateNodeConfig, removeNode, flashKey, addNode, useFlowEditor: _ } = useFlowEditor();
  const { fitView } = useReactFlow();

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const sheetNode = state.nodes.find((n) => n.node_key === selectedNode) ?? null;

  // Flash tracking
  const flashNodeRef = useRef<string | null>(null);
  const prevFlashKey = useRef<string | null>(null);
  if (flashKey !== prevFlashKey.current) {
    prevFlashKey.current = flashKey;
    flashNodeRef.current = flashKey;
  }

  const nodes = useMemo<RfNode<NodeData>[]>(
    () => state.nodes.map((bn) => rfNode(bn, state.nodes, state.entry_node_key === bn.node_key, flashNodeRef.current === bn.node_key)),
    [state.nodes, state.entry_node_key, flashNodeRef.current]
  );

  const edges = useMemo<RfEdge[]>(
    () => deriveCanvasEdges(state.nodes).map((e) => ({
      id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle,
      label: e.label, animated: false,
      style: { stroke: "oklch(0.6 0.02 260)", strokeWidth: 1.5 },
      labelStyle: { fontSize: 10, fill: "oklch(0.6 0.02 260)" },
      labelBgStyle: { fill: "oklch(0.16 0.01 260)", fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      type: "smoothstep",
    })),
    [state.nodes]
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const next = applyNodeChanges(changes, nodes);
    // Extract positions from drag changes
    for (const ch of changes) {
      if (ch.type === "position" && ch.position && ch.dragging === false) {
        updateNodePosition(ch.id, ch.position.x, ch.position.y);
      }
    }
  }, [nodes, updateNodePosition]);

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || !conn.sourceHandle) return;
    const node = state.nodes.find((n) => n.node_key === conn.source);
    if (!node) return;
    const patch = applyEdgeConnection(node, conn.sourceHandle, conn.target);
    if (patch) updateNodeConfig(conn.source, patch);
  }, [state.nodes, updateNodeConfig]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: RfNode) => {
    setSelectedNode(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDelete = useCallback(() => {
    if (selectedNode) { removeNode(selectedNode); setSelectedNode(null); }
  }, [selectedNode, removeNode]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) {
      onDelete();
    }
  }, [selectedNode, onDelete]);

  // Auto-layout on mount
  useEffect(() => {
    if (shouldAutoLayout(state.nodes)) {
      const edges = deriveCanvasEdges(state.nodes);
      const positions = autoLayout(
        state.nodes.map((n) => ({ id: n.node_key, width: NODE_W, height: NODE_H })),
        edges.map((e) => ({ source: e.source, target: e.target }))
      );
      if (positions.size > 0) {
        const posObj: Record<string, { x: number; y: number }> = {};
        positions.forEach((p, k) => { posObj[k] = p; });
        updateNodePositions(posObj);
        // Fit view after positions are set
        setTimeout(() => fitView({ duration: 200 }), 50);
      }
    } else {
      setTimeout(() => fitView({ duration: 200 }), 50);
    }
  }, []);

  const addNodeAtCenter = useCallback((type: NodeType) => {
    const key = addNode(type);
    const viewport = document.querySelector(".react-flow__viewport");
    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      // Rough center estimate
      updateNodePosition(key, rect.width / 2 - NODE_W / 2, rect.height / 2 - NODE_H / 2);
    }
    setSelectedNode(key);
  }, [addNode, updateNodePosition]);

  return (
    <div className="h-full w-full" onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={null}
        selectionOnDrag
        panOnDrag={[2]}
        selectNodesOnDrag={false}
        minZoom={0.15}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="oklch(0.3 0.01 260 / 0.3)" />
        <Controls showInteractive={false} className="[&>button]:bg-card [&>button]:border-border [&>button]:text-muted-foreground" />
        <MiniMap
          nodeColor={(n) => nodeColors((n.data as NodeData)?.node?.node_type ?? "start").solid}
          maskColor="oklch(0.1 0.01 260 / 0.6)"
          style={{ background: "oklch(0.14 0.01 260)" }}
          className="rounded-lg border border-border"
        />
        <Panel position="bottom-center">
          <AddCanvasNodeButton onAdd={addNodeAtCenter} />
        </Panel>
      </ReactFlow>

      <Sheet open={!!sheetNode} onOpenChange={(o) => { if (!o) setSelectedNode(null); }}>
        <SheetContent className="w-[400px] sm:w-[540px] border-l border-border bg-popover overflow-y-auto">
          {sheetNode && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <NodeIconChip type={sheetNode.node_type} size={28} iconSize={14} />
                  {NODE_META[sheetNode.node_type].label}
                  <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{sheetNode.node_key}</code>
                </SheetTitle>
                <SheetDescription>{NODE_META[sheetNode.node_type].blurb}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4">
                <NodeConfigForm
                  node={sheetNode}
                  allNodes={state.nodes}
                  showAdvanced={true}
                  onUpdateConfig={(patch) => updateNodeConfig(sheetNode.node_key, patch)}
                />
              </div>
              <SheetFooter className="mt-6 border-t border-border pt-4">
                <Button variant="outline" size="sm" onClick={() => {
                  removeNode(sheetNode.node_key);
                  setSelectedNode(null);
                }} className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover nó
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };

function FlowNode({ data }: NodeProps<NodeData>) {
  const { node, allNodes, isEntry, isFlashed } = data;
  const meta = NODE_META[node.node_type];
  const c = nodeColors(node.node_type);
  const preview = summarizeNode(node);
  const slots = outgoingSlots(node);
  const hasSlots = slots.length > 0;

  return (
    <div className={cn(
      "relative rounded-xl border bg-card shadow-sm transition-shadow",
      isEntry ? "border-primary/50" : "border-border",
      isFlashed && "ring-primary ring-offset-background ring-2 ring-offset-2"
    )} style={{ width: NODE_W }}>
      {/* Type-colored top strip */}
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: `1px solid ${c.ring}` }}>
        <NodeIconChip type={node.node_type} size={22} iconSize={12} />
        <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: c.text }}>{meta.label}</span>
        {isEntry && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold text-primary">ENTRY</span>}
      </div>
      {preview && (
        <div className="px-3 py-2">
          <p className="text-[11px] leading-tight text-muted-foreground line-clamp-2">{preview}</p>
        </div>
      )}

      {/* Source handles */}
      {slots.map((slot) => (
        <Handle
          key={slot.id}
          type="source"
          position={Position.Bottom}
          id={slot.id}
          style={{
            left: `${((slots.indexOf(slot) + 1) / (slots.length + 1)) * 100}%`,
            background: c.solid, width: 10, height: 10, border: `2px solid ${c.ring}`,
          }}
          title={slot.label}
        />
      ))}
      {!hasSlots && (
        <Handle type="source" position={Position.Bottom} id="end" style={{ background: c.solid, width: 10, height: 10, border: `2px solid ${c.ring}`, visibility: "hidden" }} />
      )}
      <Handle type="target" position={Position.Top} id="target" style={{ background: c.solid, width: 10, height: 10, border: `2px solid ${c.ring}` }} />
    </div>
  );
}

function AddCanvasNodeButton({ onAdd }: { onAdd: (type: NodeType) => void }) {
  const types: NodeType[] = ["start", "send_buttons", "send_list", "send_message", "send_media", "collect_input", "condition", "set_tag", "handoff", "end"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="bg-card/95 backdrop-blur">
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar nó
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="border-border bg-popover">
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

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
