import React from "react";
import { 
  Square, Circle, Star, ArrowRight, ShieldCheck, Sparkles, Radio, Newspaper, Minus, Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudioElementsTabProps {
  onAddBadgeLayer: (style: "live" | "podcast" | "exclusive" | "news") => void;
  onAddShapeLayer: (shapeType: "rectangle" | "circle" | "star" | "arrow" | "divider") => void;
}

export const StudioElementsTab: React.FC<StudioElementsTabProps> = ({
  onAddBadgeLayer,
  onAddShapeLayer,
}) => {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">
          Formas & Elementos
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Adicione formas geométricas, selos em destaque e divisores.
        </p>
      </div>

      {/* Shapes Section */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
          Formas Geométricas
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddShapeLayer("rectangle")}
            className="gap-2 text-xs font-bold rounded-xl justify-start h-10"
          >
            <Square className="w-4 h-4 text-blue-400" />
            Retângulo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddShapeLayer("circle")}
            className="gap-2 text-xs font-bold rounded-xl justify-start h-10"
          >
            <Circle className="w-4 h-4 text-purple-400" />
            Círculo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddShapeLayer("star")}
            className="gap-2 text-xs font-bold rounded-xl justify-start h-10"
          >
            <Star className="w-4 h-4 text-amber-400" />
            Estrela
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddShapeLayer("arrow")}
            className="gap-2 text-xs font-bold rounded-xl justify-start h-10"
          >
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            Seta Indicativa
          </Button>
        </div>
      </div>

      {/* Official Badges */}
      <div className="space-y-2 pt-2">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
          Selos de Destaque (Badges)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddBadgeLayer("live")}
            className="gap-2 text-xs font-bold rounded-xl justify-start h-10 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Sparkles className="w-4 h-4 text-red-500" />
            AO VIVO 🔴
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddBadgeLayer("podcast")}
            className="gap-2 text-xs font-bold rounded-xl justify-start h-10 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <Radio className="w-4 h-4 text-blue-500" />
            PODCAST 🎙️
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddBadgeLayer("exclusive")}
            className="gap-2 text-xs font-bold rounded-xl justify-start h-10 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <Tag className="w-4 h-4 text-purple-500" />
            EXCLUSIVO ⭐
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddBadgeLayer("news")}
            className="gap-2 text-xs font-bold rounded-xl justify-start h-10 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            <Newspaper className="w-4 h-4 text-amber-500" />
            URGENTE ⚡
          </Button>
        </div>
      </div>
    </div>
  );
};
