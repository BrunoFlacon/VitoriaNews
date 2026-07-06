"use client";

import { useState } from "react";
import { MessageSquare, UserPlus, Briefcase, Radio, Zap, Inbox } from "lucide-react";
import type { ComponentType } from "react";
import type { ActivityItem, ActivityKind } from "@/lib/dashboard/crm-metrics-types";
import { cn } from "@/lib/utils";
import { CrmEmptyState } from "./crm-empty-state";
import { CrmSkeleton } from "./crm-skeleton";

interface ActivityFeedProps {
  items: ActivityItem[] | null;
  loading: boolean;
}

const PAGE_SIZES = [5, 10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZES)[number];

const KIND_THEME: Record<ActivityKind, { icon: ComponentType<{ className?: string }>; badge: string }> = {
  message: { icon: MessageSquare, badge: "bg-blue-500/10 text-blue-400" },
  contact: { icon: UserPlus, badge: "bg-primary/10 text-primary" },
  deal: { icon: Briefcase, badge: "bg-primary/10 text-primary" },
  broadcast: { icon: Radio, badge: "bg-amber-500/10 text-amber-400" },
  automation: { icon: Zap, badge: "bg-rose-500/10 text-rose-400" },
};

export function CrmActivityFeed({ items, loading }: ActivityFeedProps) {
  const [pageSize, setPageSize] = useState<PageSize>(5);

  const totalLoaded = items?.length ?? 0;
  const visible = items?.slice(0, pageSize) ?? [];
  const isSizeUseful = (size: PageSize, i: number) => i === 0 || totalLoaded > PAGE_SIZES[i - 1];

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Atividade Recente</h2>
      </header>

      {loading || !items ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <CrmSkeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-5">
          <CrmEmptyState
            icon={Inbox}
            title="Nenhuma atividade ainda"
            hint="Atividades de mensagens, negócios, transmissões e automações aparecerão aqui."
          />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {visible.map((it, i) => {
              const theme = KIND_THEME[it.kind];
              const Icon = theme.icon;
              const stripe = i % 2 === 0 ? "bg-transparent" : "bg-muted/40";
              return (
                <li key={it.id} className={cn(stripe, "transition-colors hover:bg-muted/40")}>
                  <div className="flex items-center gap-3 px-5 py-2.5">
                    <span className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full", theme.badge)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{it.text}</span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">
                      {relativeTime(it.at)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <footer className="flex items-center justify-between border-t border-border px-5 py-3 text-xs">
            <span className="text-muted-foreground tabular-nums">
              Mostrando {visible.length} de {totalLoaded}
              {totalLoaded === 50 ? "+" : ""}
            </span>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-muted-foreground">Exibir</span>
              {PAGE_SIZES.map((size, i) => {
                const disabled = !isSizeUseful(size, i);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPageSize(size)}
                    disabled={disabled}
                    className={cn(
                      "rounded-md px-2 py-1 font-medium tabular-nums transition-colors",
                      pageSize === size
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </footer>
        </>
      )}
    </section>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s atrás`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m atrás`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h atrás`;
  if (diffSec < 2_592_000) return `${Math.floor(diffSec / 86400)}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
