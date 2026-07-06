"use client";

import { Clock } from "lucide-react";
import { DOW_PT_BR } from "@/lib/dashboard/crm-date-utils";
import type { ResponseTimeSummary } from "@/lib/dashboard/crm-metrics-types";
import { CrmEmptyState } from "./crm-empty-state";
import { CrmSkeleton } from "./crm-skeleton";

interface ResponseTimeChartProps {
  data: ResponseTimeSummary | null;
  loading: boolean;
  thresholdMinutes?: number;
}

export function CrmResponseTimeChart({ data, loading, thresholdMinutes = 5 }: ResponseTimeChartProps) {
  const hasData = data?.buckets.some((b) => b.avgMinutes != null) ?? false;

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Tempo Médio de Primeira Resposta</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Minutos para responder à primeira mensagem não respondida, por dia da semana
          </p>
        </div>
        <div className="flex items-center gap-3 text-right text-xs">
          {thresholdMinutes > 0 && (
            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-medium text-rose-300 tabular-nums">
              meta {thresholdMinutes}m
            </span>
          )}
          {data && (data.thisWeekAvg != null || data.lastWeekAvg != null) && (
            <div>
              <div className="text-muted-foreground">
                Esta semana: <span className="font-medium text-foreground tabular-nums">{fmt(data.thisWeekAvg)}</span>
              </div>
              <div className="text-muted-foreground">
                Semana passada: <span className="tabular-nums">{fmt(data.lastWeekAvg)}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="p-5">
        {loading || !data ? (
          <CrmSkeleton className="h-[260px] w-full" />
        ) : !hasData ? (
          <CrmEmptyState
            icon={Clock}
            title="Nenhuma resposta registrada ainda"
            hint="Este gráfico será preenchido conforme você responder mensagens de clientes."
          />
        ) : (
          <BarSvg data={data} />
        )}
      </div>
    </section>
  );
}

function BarSvg({ data }: { data: ResponseTimeSummary }) {
  const maxVal = Math.max(...data.buckets.map((b) => b.avgMinutes ?? 0), 1);
  const chartH = 200;
  const barW = 40;
  const gap = 16;
  const totalW = data.buckets.length * (barW + gap);
  const pad = { left: 10, right: 10, top: 8, bottom: 28 };

  return (
    <div className="flex items-center justify-center">
      <svg viewBox={`0 0 ${totalW + pad.left + pad.right} ${chartH + pad.top + pad.bottom}`} className="h-[260px] w-full" role="img" aria-label="Tempo de resposta por dia">
        {data.buckets.map((b, i) => {
          const h = b.avgMinutes != null ? (b.avgMinutes / maxVal) * chartH : 4;
          const x = pad.left + i * (barW + gap);
          const y = pad.top + chartH - h;
          const hasValue = b.avgMinutes != null;
          return (
            <g key={b.dow}>
              <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={4} fill={hasValue ? "#7c3aed" : "var(--muted)"} opacity={hasValue ? 1 : 0.4} />
              <text x={x + barW / 2} y={pad.top + chartH + 16} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {DOW_PT_BR[i]}
              </text>
              {hasValue && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" className="fill-foreground text-[10px] font-medium tabular-nums">
                  {b.avgMinutes!.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}
        {/* Baseline */}
        <line x1={pad.left} y1={pad.top + chartH} x2={pad.left + data.buckets.length * (barW + gap)} y2={pad.top + chartH} stroke="var(--border)" />
      </svg>
    </div>
  );
}

function fmt(mins: number | null): string {
  if (mins == null) return "—";
  if (mins < 1) return `${Math.max(1, Math.round(mins * 60))}s`;
  if (mins < 60) return `${mins.toFixed(1)}m`;
  return `${(mins / 60).toFixed(1)}h`;
}
