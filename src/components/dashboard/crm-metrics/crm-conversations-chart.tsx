"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { ConversationsSeriesPoint } from "@/lib/dashboard/crm-metrics-types";
import { CrmEmptyState } from "./crm-empty-state";
import { CrmSkeleton } from "./crm-skeleton";
import { cn } from "@/lib/utils";

type RangeDays = 7 | 30 | 90;

interface ConversationsChartProps {
  series: Record<RangeDays, ConversationsSeriesPoint[] | null>;
  loading: boolean;
  range: RangeDays;
  onRangeChange: (r: RangeDays) => void;
}

const VB_W = 760;
const VB_H = 240;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

const RANGE_LABELS: Record<RangeDays, string> = { 7: "7 dias", 30: "30 dias", 90: "90 dias" };

export function CrmConversationsChart({ series, loading, range, onRangeChange }: ConversationsChartProps) {
  const data = series[range];

  const { maxY, niceTicks } = useMemo(() => {
    const arr = data ?? [];
    const max = arr.reduce((m, p) => Math.max(m, p.incoming, p.outgoing), 0);
    const ceil = niceCeil(max);
    const ticks = [0, ceil / 4, ceil / 2, (3 * ceil) / 4, ceil].map((v) => Math.round(v));
    return { maxY: ceil, niceTicks: Array.from(new Set(ticks)) };
  }, [data]);

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Conversas ao Longo do Tempo</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Volume diário de mensagens por direção</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
          {([7, 30, 90] as RangeDays[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </header>

      <div className="p-5">
        {loading || !data ? (
          <CrmSkeleton className="h-[240px] w-full" />
        ) : data.every((p) => p.incoming === 0 && p.outgoing === 0) ? (
          <CrmEmptyState
            icon={MessageSquare}
            title="Nenhuma atividade de mensagens neste período"
            hint="Envie ou receba mensagens para começar a preencher este gráfico."
          />
        ) : (
          <LineSvg data={data} maxY={maxY} ticks={niceTicks} />
        )}
      </div>

      <footer className="flex items-center gap-4 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <LegendDot color="#3b82f6" label="Recebidas" />
        <LegendDot color="#7c3aed" label="Enviadas" />
      </footer>
    </section>
  );
}

function LineSvg({ data, maxY, ticks }: { data: ConversationsSeriesPoint[]; maxY: number; ticks: number[] }) {
  const [hover, setHover] = useState<{ idx: number; tooltipLeftPx: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const chartW = VB_W - PADDING.left - PADDING.right;
  const chartH = VB_H - PADDING.top - PADDING.bottom;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;

  const yFor = (v: number) =>
    maxY === 0 ? PADDING.top + chartH : PADDING.top + chartH - (v / maxY) * chartH;
  const xFor = (i: number) => PADDING.left + i * stepX;

  const incomingPath = data.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.incoming)}`).join(" ");
  const outgoingPath = data.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.outgoing)}`).join(" ");

  useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    // Cache wrap rect and only refresh on resize — avoids getBoundingClientRect per mousemove
    let wrapRect = wrap.getBoundingClientRect();
    const ro = new ResizeObserver(() => { wrapRect = wrap.getBoundingClientRect(); });
    ro.observe(wrap);
    let rafId: number;
    let pending = false;
    const onMove = (e: MouseEvent) => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(() => {
        pending = false;
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const local = pt.matrixTransform(ctm.inverse());
        const xVb = local.x;
        if (xVb < PADDING.left - 8 || xVb > VB_W - PADDING.right + 8) {
          setHover(null);
          return;
        }
        const relative = xVb - PADDING.left;
        const idx = Math.max(0, Math.min(data.length - 1, Math.round(stepX === 0 ? 0 : relative / stepX)));
        const dataPointVbX = PADDING.left + idx * stepX;
        const dataPointPt = svg.createSVGPoint();
        dataPointPt.x = dataPointVbX;
        dataPointPt.y = 0;
        const screen = dataPointPt.matrixTransform(ctm);
        setHover({ idx, tooltipLeftPx: screen.x - wrapRect.left });
      });
    };
    const onLeave = () => setHover(null);
    svg.addEventListener("mousemove", onMove);
    svg.addEventListener("mouseleave", onLeave);
    return () => {
      svg.removeEventListener("mousemove", onMove);
      svg.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [data, stepX]);

  const hovered = hover !== null ? data[hover.idx] : null;
  const hoverX = hover !== null ? xFor(hover.idx) : 0;
  const labelStride = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-[240px] w-full" role="img" aria-label="Conversas por dia">
        {ticks.map((t) => {
          const y = yFor(t);
          return (
            <g key={t}>
              <line x1={PADDING.left} x2={VB_W - PADDING.right} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
              <text x={PADDING.left - 8} y={y} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px]">{t}</text>
            </g>
          );
        })}
        {data.map((p, i) =>
          i % labelStride === 0 ? (
            <text key={p.day} x={xFor(i)} y={VB_H - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              {shortDayLabel(p.day)}
            </text>
          ) : null,
        )}
        <path d={outgoingPath} fill="none" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={incomingPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={hoverX} x2={hoverX} y1={PADDING.top} y2={PADDING.top + chartH} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
            <circle cx={hoverX} cy={yFor(data[hover.idx].incoming)} r={3.5} fill="#3b82f6" />
            <circle cx={hoverX} cy={yFor(data[hover.idx].outgoing)} r={3.5} fill="#7c3aed" />
          </g>
        )}
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: `${hover.tooltipLeftPx}px` }}
        >
          <div className="font-medium text-popover-foreground">{longDayLabel(hovered.day)}</div>
          <div className="mt-1 flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-blue-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
              {hovered.incoming} recebidas
            </span>
            <span className="flex items-center gap-1.5 text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              {hovered.outgoing} enviadas
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function shortDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
}

function longDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", { weekday: "short", month: "short", day: "numeric" });
}

function niceCeil(max: number): number {
  if (max <= 0) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const normalised = max / pow;
  let nice: number;
  if (normalised <= 1) nice = 1;
  else if (normalised <= 2) nice = 2;
  else if (normalised <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}
