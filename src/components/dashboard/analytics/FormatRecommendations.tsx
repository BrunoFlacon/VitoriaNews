import React from "react";
import { Lightbulb, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FormatData {
  type: string;
  count: number;
}

interface FormatRecommendationsProps {
  data?: FormatData[];
}

export const FormatRecommendations = (props: FormatRecommendationsProps = {}) => {
  const { data } = props;
  const hasData = data !== undefined && data.length > 0;

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Lightbulb className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-display font-bold text-lg md:text-xl text-white">Recomendações de Formatos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasData
              ? "Baseado no desempenho real da sua audiência"
              : "Analise seus conteúdos para receber recomendações personalizadas"}
          </p>
        </div>
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Render real data here when available */}
          {data?.slice(0, 4).map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/10 border border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase text-muted-foreground">{item.type}</span>
              </div>
              <p className="text-2xl font-bold text-white">{item.count.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">publicações</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-muted/10 rounded-xl border border-dashed border-border/60">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-sm text-foreground mb-1">Nenhum dado disponível</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Publique conteúdos em diferentes formatos para que possamos analisar o desempenho
            e recomendar os melhores formatos para sua audiência.
          </p>
        </div>
      )}
    </Card>
  );
};
