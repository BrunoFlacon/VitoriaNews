import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  delta?: { sign: number; label: string };
  subtitle?: string;
}

export function CrmMetricCard({ title, value, icon: Icon, delta, subtitle }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-[28px] leading-none font-bold tabular-nums text-foreground">
        {value}
      </p>
      {delta ? <DeltaRow sign={delta.sign} label={delta.label} /> : subtitle ? (
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

function DeltaRow({ sign, label }: { sign: number; label: string }) {
  const tone =
    sign > 0 ? "text-primary" : sign < 0 ? "text-red-400" : "text-muted-foreground";
  const Arrow = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus;
  return (
    <div className={cn("mt-2 flex items-center gap-1 text-sm", tone)}>
      <Arrow className="h-4 w-4" aria-hidden />
      <span className="tabular-nums">{label}</span>
    </div>
  );
}
