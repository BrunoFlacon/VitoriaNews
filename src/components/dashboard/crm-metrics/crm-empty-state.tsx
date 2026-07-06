import { BarChart3 } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export function CrmEmptyState({
  title = "Sem dados suficientes",
  hint,
  icon: Icon = BarChart3,
  className,
}: {
  title?: string;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/40 px-4 py-6 text-center",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
