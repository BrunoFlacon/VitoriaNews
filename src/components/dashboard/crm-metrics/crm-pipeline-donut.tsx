"use client";

import { GitBranch } from "lucide-react";
import type { PipelineDonutData } from "@/lib/dashboard/crm-metrics-types";
import { formatCurrencyShort } from "@/lib/currency";
import { CrmEmptyState } from "./crm-empty-state";
import { CrmSkeleton } from "./crm-skeleton";

interface PipelineDonutProps {
  data: PipelineDonutData | null;
  loading: boolean;
  currency?: string;
}

export function CrmPipelineDonut({ data, loading, currency = "BRL" }: PipelineDonutProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Valor do Pipeline</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Negócios abertos por estágio</p>
      </header>

      <div className="flex flex-1 flex-col p-5">
        {loading || !data ? (
          <CrmSkeleton className="h-56 w-full" />
        ) : data.stages.length === 0 ? (
          <CrmEmptyState
            icon={GitBranch}
            title="Nenhum negócio aberto"
            hint="Crie negócios no Pipeline para ver a distribuição por estágio."
          />
        ) : (
          <>
            <Donut data={data} currency={currency} />
            <ul className="mt-5 space-y-2">
              {data.stages.map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-xs">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span className="flex-1 truncate text-muted-foreground">{s.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {s.dealCount} negócio{s.dealCount === 1 ? "" : "s"}
                  </span>
                  <span className="w-20 text-right text-muted-foreground tabular-nums">
                    {formatCurrencyShort(s.totalValue, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function Donut({ data, currency }: { data: PipelineDonutData; currency: string }) {
  const size = 200;
  const r = 80;
  const ringWidth = 18;
  const cx = size / 2;
  const cy = size / 2;

  const totalRaw = data.totalValue || 1;
  const minFrac = 0.02;
  const rawShares = data.stages.map((s) => s.totalValue / totalRaw);
  const floored = rawShares.map((x) => Math.max(x, minFrac));
  const floorSum = floored.reduce((a, b) => a + b, 0);
  const shares = floored.map((x) => x / floorSum);

  const offsets: number[] = [0];
  for (let i = 0; i < shares.length; i++) offsets.push(offsets[i] + shares[i]);
  const segments = data.stages.map((s, i) => {
    const start = offsets[i] * Math.PI * 2 - Math.PI / 2;
    const end = offsets[i + 1] * Math.PI * 2 - Math.PI / 2;
    return { path: arcPath(cx, cy, r, start, end), color: s.color, id: s.id };
  });

  return (
    <div className="flex items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-48 w-48" role="img" aria-label="Valor do pipeline por estágio">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--muted)" strokeWidth={ringWidth} />
        {segments.map((seg) => (
          <path key={seg.id} d={seg.path} fill="none" stroke={seg.color} strokeWidth={ringWidth} strokeLinecap="butt" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">Total</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-foreground text-[18px] font-semibold tabular-nums">
          {formatCurrencyShort(data.totalValue, currency)}
        </text>
      </svg>
    </div>
  );
}

function arcPath(cx: number, cy: number, r: number, startRad: number, endRad: number): string {
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endRad - startRad > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}
