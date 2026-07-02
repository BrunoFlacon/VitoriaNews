import React, { memo } from "react";
import { Lightbulb, Clock, Activity, Video, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface IntelligenceSectionProps {
  globalPeakHour: string | null;
  onTabChange?: (tab: "overview" | "social" | "messaging" | "traffic") => void;
  formatRecs?: any[];
}

export const IntelligenceSection = memo(({ globalPeakHour, onTabChange, formatRecs }: IntelligenceSectionProps) => {
  // Mock data for format performance
  const formats = [
    { name: "Reels / Shorts", views: 25400, percent: 85, color: "bg-sky-500" },
    { name: "Vídeos Longos", views: 18000, percent: 68, color: "bg-indigo-500" },
    { name: "Imagens / Carrossel", views: 12100, percent: 45, color: "bg-purple-500" },
    { name: "Texto / Newsletter", views: 3200, percent: 18, color: "bg-pink-500" },
  ];

  return (
    <Card className="p-5 shadow-xl border border-border/50 bg-card hover:shadow-2xl transition-all">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
        <div>
          <h3 className="font-display font-black text-lg text-white">Inteligência & Recomendações</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Insights preditivos e sugestões para otimizar suas publicações</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Performance por Formato */}
        <div className="bg-[#0a0b14]/50 border border-border/30 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                <Video className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold uppercase text-white tracking-wider">Performance por Formato</span>
            </div>
            <div className="space-y-3">
              {formats.map((f) => (
                <div key={f.name} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground truncate">{f.name}</span>
                    <span className="text-white">{f.views.toLocaleString("pt-BR")} visualizações</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                    <div className={`h-full ${f.color} rounded-full`} style={{ width: `${f.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Melhor Dia e Hora */}
        <div className="bg-[#0a0b14]/50 border border-border/30 rounded-xl p-5 flex flex-col justify-between min-h-[180px]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold uppercase text-white tracking-wider">Melhor Dia e Hora</span>
            </div>
            <div className="mt-2 space-y-1">
              <h2 className="text-3xl font-black text-white tracking-tight">
                {globalPeakHour || "Quarta-feira"}
              </h2>
              <p className="text-sm font-semibold text-purple-400">
                {globalPeakHour ? "Horário ideal de publicação" : "às 14:00 (Pico Médio)"}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
            Período com maior engajamento agregado em todas as plataformas conectadas nos últimos 30 dias.
          </p>
        </div>

        {/* Card 3: Tempo de Retenção */}
        <div className="bg-[#0a0b14]/50 border border-border/30 rounded-xl p-5 flex flex-col justify-between min-h-[180px]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold uppercase text-white tracking-wider">Tempo de Retenção</span>
            </div>
            <div className="mt-2 space-y-1">
              <h2 className="text-3xl font-black text-white tracking-tight">~30m</h2>
              <p className="text-sm font-semibold text-emerald-400">Duração média de retenção de vídeo</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/20 flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">Retenção de Vídeo (Facebook)</span>
            <button
              onClick={() => onTabChange?.("social")}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 group"
            >
              Ver gráfico
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
});

IntelligenceSection.displayName = "IntelligenceSection";
