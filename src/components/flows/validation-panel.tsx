"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationIssue } from "@/lib/flows/validate";
import { useFlowEditor } from "./flow-editor-state";

export function ValidationPanel() {
  const { issues, requestFlash } = useFlowEditor();

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-600/50 bg-background p-3 text-sm font-medium text-emerald-300">
        <CircleCheck className="h-4 w-4 shrink-0" />
        Sem problemas. Pronto para ativar.
      </div>
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <div className={cn("rounded-lg border bg-background p-3", errors.length > 0 ? "border-red-500/40" : "border-amber-500/40")}>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        {errors.length > 0 ? <CircleAlert className="h-4 w-4 text-red-400" /> : <CircleAlert className="h-4 w-4 text-amber-400" />}
        {errors.length} erro(s), {warnings.length} aviso(s)
      </div>
      <div className="flex flex-col gap-1">
        {issues.map((i, ix) => <IssueLine key={ix} issue={i} onJump={requestFlash} />)}
      </div>
    </div>
  );
}

export function IssueLine({ issue, onJump }: { issue: ValidationIssue; onJump?: (key: string) => void }) {
  const tone = issue.severity === "error" ? "text-red-300" : "text-amber-300";
  const iconTone = issue.severity === "error" ? "text-red-400" : "text-amber-400";
  const body = (
    <>
      <CircleAlert className={cn("mt-0.5 h-3 w-3 shrink-0", iconTone)} />
      <span className="min-w-0 flex-1">
        {issue.node_key && <code className="mr-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">{issue.node_key}</code>}
        {issue.message}
      </span>
    </>
  );

  if (issue.node_key && onJump) {
    return (
      <button type="button" onClick={() => onJump(issue.node_key!)}
        className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/60", tone)}
        aria-label={`Ir para nó ${issue.node_key}`}>
        {body}
      </button>
    );
  }
  return <div className={cn("flex items-start gap-2 rounded-md px-2 py-1 text-xs", tone)}>{body}</div>;
}
