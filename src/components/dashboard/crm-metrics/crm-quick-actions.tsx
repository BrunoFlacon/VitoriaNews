"use client";

import { UserPlus, Briefcase, Radio, Zap } from "lucide-react";
import type { ComponentType } from "react";

interface Action {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tint: string;
  onClick: () => void;
}

export function CrmQuickActions({
  onNewContact,
  onNewDeal,
  onNewBroadcast,
  onNewAutomation,
}: {
  onNewContact?: () => void;
  onNewDeal?: () => void;
  onNewBroadcast?: () => void;
  onNewAutomation?: () => void;
}) {
  const actions: Action[] = [
    { label: "Novo Contato", icon: UserPlus, tint: "text-primary", onClick: onNewContact ?? (() => {}) },
    { label: "Novo Negócio", icon: Briefcase, tint: "text-blue-400", onClick: onNewDeal ?? (() => {}) },
    { label: "Nova Transmissão", icon: Radio, tint: "text-amber-400", onClick: onNewBroadcast ?? (() => {}) },
    { label: "Nova Automação", icon: Zap, tint: "text-primary", onClick: onNewAutomation ?? (() => {}) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-border hover:bg-muted/60"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-muted ${a.tint}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
