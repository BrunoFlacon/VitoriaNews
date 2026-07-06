"use client";

import { useEffect, useState } from "react";
import { GitFork, List } from "lucide-react";

import { FlowBuilder } from "./flow-builder";
import { FlowCanvas } from "./flow-canvas";
import { FlowEditorProvider, type BuilderNode } from "./flow-editor-state";
import { EditorHeader } from "./header";
import { ValidationPanel } from "./validation-panel";
import { NODE_META, nodeColors, type NodeType } from "./shared";
import { cn } from "@/lib/utils";

const MOBILE_BREAKPOINT = "(max-width: 767px)";
type View = "canvas" | "list";
const STORAGE_KEY = "wacrm.flowEditor.view";
const LEGEND_TYPES = Object.keys(NODE_META) as NodeType[];

interface Props {
  flowId: string;
  userId: string;
  flowName: string;
  flowDescription: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  isActive: boolean;
  nodes: BuilderNode[];
  entryNodeKey: string | null;
  onBack: () => void;
}

export function FlowEditorShell({
  flowId, userId, flowName, flowDescription, triggerType,
  triggerConfig, isActive, nodes, entryNodeKey, onBack,
}: Props) {
  const [view, setView] = useState<View>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "canvas" || saved === "list") return saved;
    } catch { /* ignore */ }
    return "canvas";
  });

  const isMobile = useMatchMedia(MOBILE_BREAKPOINT);
  const effectiveView: View = isMobile ? "list" : view;

  const choose = (next: View) => {
    setView(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  };

  return (
    <FlowEditorProvider
      flowId={flowId}
      userId={userId}
      initialName={flowName}
      initialDescription={flowDescription}
      initialTriggerType={triggerType}
      initialTriggerConfig={triggerConfig}
      initialIsActive={isActive}
      initialNodes={nodes}
      initialEntryNodeKey={entryNodeKey}
      onBack={onBack}
    >
      <div className="flex h-full min-h-0 flex-col">
        <EditorHeader />

        {!isMobile && (
          <div className="flex items-center gap-4 px-6 py-3.5">
            <div role="group" aria-label="Visualização" className="inline-flex gap-0.5 rounded-lg border border-border bg-muted p-0.5">
              <SegButton active={effectiveView === "canvas"} onClick={() => choose("canvas")} icon={<GitFork className="h-3.5 w-3.5" />} label="Canvas" />
              <SegButton active={effectiveView === "list"} onClick={() => choose("list")} icon={<List className="h-3.5 w-3.5" />} label="Lista" />
            </div>
            <div className="ml-auto hidden flex-wrap items-center gap-x-3.5 gap-y-1.5 lg:flex">
              {LEGEND_TYPES.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: nodeColors(t).solid }} />
                  {NODE_META[t].label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="relative mx-6 min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card-2">
          {effectiveView === "canvas" ? (
            <FlowCanvas />
          ) : (
            <div className="absolute inset-0 overflow-y-auto">
              <FlowBuilder />
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-3">
          <ValidationPanel />
        </div>
      </div>
    </FlowEditorProvider>
  );
}

function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function SegButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
    >
      {icon}{label}
    </button>
  );
}
