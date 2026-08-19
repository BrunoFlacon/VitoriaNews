import React from "react";
import { 
  Undo2, Redo2, Type, Move, Bold, Italic, Palette, Layers, Lock, Unlock, 
  Copy, Trash2, ArrowUp, ArrowDown, ShieldCheck, Grid, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { CanvasLayer } from "./CoverCanvasEngine";

interface StudioToolbarProps {
  selectedLayer: CanvasLayer | null;
  onUpdateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayerOrder: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showSafeZones: boolean;
  onToggleSafeZones: () => void;
}

export const FONT_FAMILIES = [
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
  { name: "Oswald", value: "'Oswald', sans-serif" },
  { name: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Impact", value: "Impact, sans-serif" },
];

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
  selectedLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayerOrder,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showSafeZones,
  onToggleSafeZones,
}) => {
  if (!selectedLayer) {
    return (
      <div className="flex items-center justify-between p-3 bg-card/60 rounded-2xl border border-border/60">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
            className="w-9 h-9 rounded-xl"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Y)"
            className="w-9 h-9 rounded-xl"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <div className="h-5 w-px bg-border/60 mx-1" />
          <Button
            variant={showSafeZones ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleSafeZones}
            className="gap-1.5 text-xs font-bold rounded-xl h-9"
          >
            <Grid className="w-4 h-4" />
            Margens Seguras: {showSafeZones ? "ON" : "OFF"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground italic hidden sm:block">
          Clique em qualquer elemento do canvas para editar suas propriedades.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-card/80 rounded-2xl border border-border/80 shadow-md">
      {/* Left: History & Layer Controls */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Desfazer (Ctrl+Z)"
          className="w-8 h-8 rounded-xl"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Refazer (Ctrl+Y)"
          className="w-8 h-8 rounded-xl"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </Button>

        <div className="h-4 w-px bg-border/60 mx-1" />

        {/* Font Family Selector (if Text) */}
        {selectedLayer.type === "text" && (
          <>
            <Select
              value={selectedLayer.fontFamily || "Inter, sans-serif"}
              onValueChange={(val) => onUpdateLayer(selectedLayer.id, { fontFamily: val })}
            >
              <SelectTrigger className="w-[140px] h-8 rounded-xl text-xs bg-background">
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.name} value={font.value}>
                    <span style={{ fontFamily: font.value }}>{font.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Font Size Input */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  onUpdateLayer(selectedLayer.id, {
                    fontSize: Math.max(12, (selectedLayer.fontSize || 48) - 4),
                  })
                }
                className="w-8 h-8 rounded-xl text-xs"
              >
                -
              </Button>
              <span className="text-xs font-bold w-7 text-center">
                {selectedLayer.fontSize || 48}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  onUpdateLayer(selectedLayer.id, {
                    fontSize: Math.min(180, (selectedLayer.fontSize || 48) + 4),
                  })
                }
                className="w-8 h-8 rounded-xl text-xs"
              >
                +
              </Button>
            </div>

            {/* Color Picker */}
            <div className="flex items-center gap-1 border border-border/60 rounded-xl px-2 py-1 bg-background">
              <Palette className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="color"
                value={selectedLayer.color || "#FFFFFF"}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
              />
            </div>
          </>
        )}
      </div>

      {/* Right: Layer Operations */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMoveLayerOrder(selectedLayer.id, "up")}
          title="Avançar Camada"
          className="w-8 h-8 rounded-xl"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMoveLayerOrder(selectedLayer.id, "down")}
          title="Recuar Camada"
          className="w-8 h-8 rounded-xl"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onUpdateLayer(selectedLayer.id, { locked: !selectedLayer.locked })}
          title={selectedLayer.locked ? "Desbloquear" : "Bloquear Posição"}
          className="w-8 h-8 rounded-xl"
        >
          {selectedLayer.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDuplicateLayer(selectedLayer.id)}
          title="Duplicar Camada"
          className="w-8 h-8 rounded-xl"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDeleteLayer(selectedLayer.id)}
          title="Excluir Camada"
          className="w-8 h-8 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
