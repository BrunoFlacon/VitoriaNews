import React from "react";
import { Users, Eye, MousePointerClick, Clock } from "lucide-react";

interface YouTubeSummaryCardsProps {
  data?: {
    newSubscribers?: number;
    views?: number;
    ctr?: number;
    watchTimeHours?: number;
  };
}

const CARD_CONFIG = [
  { key: "newSubscribers", icon: Users, label: "Novos Inscritos (7 dias)", color: "text-red-400", bg: "bg-red-500/10", borderColor: "border-red-500" },
  { key: "views", icon: Eye, label: "Visualizações", color: "text-blue-400", bg: "bg-blue-500/10", borderColor: "border-blue-500" },
  { key: "ctr", icon: MousePointerClick, label: "Taxa de Clique (CTR)", color: "text-yellow-400", bg: "bg-yellow-500/10", borderColor: "border-yellow-500" },
  { key: "watchTimeHours", icon: Clock, label: "Tempo de Exibição (Horas)", color: "text-purple-400", bg: "bg-purple-500/10", borderColor: "border-purple-500" },
];

export const YouTubeSummaryCards = ({ data }: YouTubeSummaryCardsProps) => {
  const hasRealData = data !== undefined;

  const getValue = (key: string): string => {
    if (!data) return "—";
    switch (key) {
      case "newSubscribers": return `+ ${data.newSubscribers?.toLocaleString('pt-BR') ?? "—"}`;
      case "views": return data.views?.toLocaleString('pt-BR') ?? "—";
      case "ctr": return data.ctr != null ? `${data.ctr}%` : "—";
      case "watchTimeHours": return data.watchTimeHours ? `${data.watchTimeHours}h` : "—";
      default: return "—";
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARD_CONFIG.map((cfg) => (
        <div
          key={cfg.key}
          className={`p-4 rounded-xl bg-card border border-border/50 hover:border-border transition-all ${hasRealData ? "" : "opacity-60"}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
              <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{cfg.label}</span>
          </div>
          <p className="text-2xl font-bold text-white">{getValue(cfg.key)}</p>
          {!hasRealData && (
            <p className="text-[10px] text-muted-foreground mt-1">Configure nas APIs</p>
          )}
        </div>
      ))}
    </div>
  );
};
