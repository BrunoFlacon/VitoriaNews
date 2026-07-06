"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { NODE_META, type BuilderNode } from "../shared";

export function TextRow({
  label, value, onChange, rows = 1,
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      {rows > 1 ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="bg-muted" />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-muted" />
      )}
    </div>
  );
}

export function NextNodeRow({
  value, allNodes, currentKey, onChange, label,
}: {
  value: string; allNodes: BuilderNode[]; currentKey: string; onChange: (v: string) => void; label: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <NodeKeySelect value={value || null} nodes={allNodes} excludeKey={currentKey} onChange={(v) => onChange(v ?? "")} placeholder="Pick a next node…" />
    </div>
  );
}

export function NodeKeySelect({
  value, nodes, excludeKey, onChange, placeholder, className,
}: {
  value: string | null; nodes: BuilderNode[]; excludeKey?: string;
  onChange: (v: string | null) => void; placeholder?: string; className?: string;
}) {
  const options = nodes.filter((n) => n.node_key !== excludeKey);
  return (
    <Select value={value ?? "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
      <SelectTrigger className={cn("bg-muted", className)}>
        <SelectValue placeholder={placeholder ?? "—"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— None —</SelectItem>
        {options.map((n) => {
          const Icon = NODE_META[n.node_type].icon;
          return (
            <SelectItem key={n.node_key} value={n.node_key}>
              <span className="inline-flex items-center gap-1.5">
                <Icon className={cn("h-3 w-3", NODE_META[n.node_type].color)} />
                {n.node_key}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
