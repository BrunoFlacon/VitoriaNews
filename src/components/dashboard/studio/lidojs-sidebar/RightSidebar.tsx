import { useState, useMemo } from 'react';
import { useEditor } from '../EditorContext';
import { PanelHeader } from './PanelHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  Lock, Unlock, Copy, Trash2, Bold, AlignLeft, AlignCenter, AlignRight,
  Move, RotateCw, Maximize, Sun, Contrast, Droplets, Palette, Type,
  Blend, Layers, Circle, Square, X
} from 'lucide-react';
import { STUDIO_FONTS, FONT_CATEGORIES, loadFontBatch, type FontEntry } from '../lidojs-config/palette';

/** Convert any CSS color string to #rrggbb for <input type="color"> */
function toHexColor(color: string | undefined | null): string {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color.length === 4
    ? '#' + color[1]+color[1] + color[2]+color[2] + color[3]+color[3]
    : color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
  }
  return '#000000';
}

const BADGE_STYLES = [
  { value: 'live', label: 'Ao Vivo' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'exclusive', label: 'Exclusivo' },
  { value: 'news', label: 'Notícias' },
] as const;

/** Categorized font selector with search */
const FontSelector = ({ value, onChange }: { value: string; onChange: (family: string) => void }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    let fonts = STUDIO_FONTS;
    if (category !== 'all') {
      fonts = fonts.filter((f) => f.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      fonts = fonts.filter((f) =>
        f.name.toLowerCase().includes(q) || f.tags.some((t) => t.includes(q))
      );
    }
    return fonts;
  }, [search, category]);

  // Load visible fonts
  useMemo(() => {
    loadFontBatch(filtered.map((f) => f.name));
  }, [filtered]);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar fonte..."
          className="w-full h-7 px-2 pl-7 bg-white/5 border border-white/10 text-[10px] text-white outline-none focus:border-blue-500"
        />
        <Type size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
      </div>
      {/* Category tabs */}
      <div className="flex gap-0.5 flex-wrap">
        {FONT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider border transition-colors ${
              category === cat.id
                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {/* Font list */}
      <div className="max-h-[200px] overflow-y-auto space-y-0.5 border border-white/10 bg-white/5">
        {filtered.map((f) => (
          <button
            key={f.name}
            onClick={() => onChange(f.family)}
            className={`w-full text-left px-2 py-1.5 text-[10px] transition-colors ${
              value === f.family
                ? 'bg-blue-500/20 text-blue-300'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            style={{ fontFamily: f.family }}
          >
            <span className="font-medium">{f.name}</span>
            <span className="text-white/20 ml-1.5 text-[8px]">{f.category}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-3 text-[10px] text-white/30 text-center">Nenhuma fonte encontrada</div>
        )}
      </div>
    </div>
  );
};

/** Shared toggle switch component */
const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    className={`w-8 h-4 relative cursor-pointer transition-colors ${
      value ? 'bg-blue-600' : 'bg-white/20'
    }`}
  >
    <div
      className={`w-3 h-3 bg-white absolute top-0.5 shadow-sm transition-transform ${
        value ? 'right-0.5' : 'left-0.5'
      }`}
    />
  </button>
);

/** Section divider */
const Divider = () => <div className="h-px bg-white/10 w-full" />;

/** Blend mode options */
const BLEND_MODES = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturação' },
  { value: 'color', label: 'Cor' },
  { value: 'luminosity', label: 'Luminosidade' },
] as const;

const COLOR_OVERLAY_MODES = [
  { value: 'overlay', label: 'Overlay' },
  { value: 'screen', label: 'Screen' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturação' },
  { value: 'color', label: 'Cor' },
  { value: 'luminosity', label: 'Luminosidade' },
] as const;

/** Blend, Mask & Overlay controls */
const BlendEffectsControls = () => {
  const { layers, selectedLayerId, updateLayer } = useEditor();
  const layer = layers.find(l => l.id === selectedLayerId);
  if (!layer) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
        <Blend size={12} /> Blend & Efeitos
      </h3>

      {/* Blend Mode */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/50">Modo de Mistura</label>
        <Select
          value={layer.blendMode || 'source-over'}
          onValueChange={(val) => updateLayer(layer.id, { blendMode: val as GlobalCompositeOperation })}
        >
          <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs text-white w-full">
            <SelectValue placeholder="Normal" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E1E2D] border-white/10 text-white max-h-[200px] overflow-y-auto">
            {BLEND_MODES.map(bm => (
              <SelectItem key={bm.value} value={bm.value}>{bm.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clipping Mask */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/50 flex items-center gap-1">
          <Layers size={10} /> Máscara de Recorte
        </label>
        <div className="flex gap-1">
          <button
            onClick={() => updateLayer(layer.id, { mask: undefined })}
            className={`flex-1 px-2 py-1.5 text-[10px] border transition-colors ${
              !layer.mask
                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
            }`}
          >
            Nenhuma
          </button>
          <button
            onClick={() => updateLayer(layer.id, { mask: { type: 'rectangle' } })}
            className={`flex-1 px-2 py-1.5 text-[10px] border transition-colors flex items-center justify-center gap-1 ${
              layer.mask?.type === 'rectangle'
                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
            }`}
          >
            <Square size={10} /> Retângulo
          </button>
          <button
            onClick={() => updateLayer(layer.id, { mask: { type: 'ellipse' } })}
            className={`flex-1 px-2 py-1.5 text-[10px] border transition-colors flex items-center justify-center gap-1 ${
              layer.mask?.type === 'ellipse'
                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
            }`}
          >
            <Circle size={10} /> Elipse
          </button>
          <button
            onClick={() => updateLayer(layer.id, { mask: { type: 'inverted-ellipse' } })}
            className={`flex-1 px-2 py-1.5 text-[10px] border transition-colors flex items-center justify-center gap-1 ${
              layer.mask?.type === 'inverted-ellipse'
                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
            }`}
          >
            <X size={10} /> Inv. Elipse
          </button>
        </div>
      </div>

      {/* Color Overlay */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/50">Sobreposição de Cor</label>
        <div className="flex gap-2 items-center">
          <div className="flex items-center h-8 bg-white/5 border border-white/10 px-2 gap-2 flex-1">
            <input
              type="color"
              value={toHexColor(layer.colorOverlay || '#000000')}
              onChange={(e) => updateLayer(layer.id, { colorOverlay: e.target.value })}
              className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
            />
            <span className="text-[10px] font-mono text-white/60">{layer.colorOverlay || '—'}</span>
          </div>
          <div className="w-16">
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={layer.colorOverlayOpacity ?? 0}
              onChange={(e) => updateLayer(layer.id, { colorOverlayOpacity: Number(e.target.value) })}
              className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono text-center"
              title="Opacidade (0-1)"
            />
          </div>
        </div>
        {(layer.colorOverlayOpacity ?? 0) > 0 && (
          <Select
            value={layer.colorOverlayMode || 'overlay'}
            onValueChange={(val) => updateLayer(layer.id, { colorOverlayMode: val as GlobalCompositeOperation })}
          >
            <SelectTrigger className="h-7 bg-white/5 border-white/10 text-[10px] text-white w-full">
              <SelectValue placeholder="Modo" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E1E2D] border-white/10 text-white max-h-[150px] overflow-y-auto">
              {COLOR_OVERLAY_MODES.map(cm => (
                <SelectItem key={cm.value} value={cm.value}>{cm.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/50">Sobreposição Gradiente</label>
        <div className="flex gap-2">
          <div className="flex items-center h-8 bg-white/5 border border-white/10 px-2 gap-2 flex-1">
            <input
              type="color"
              value={toHexColor(layer.gradientOverlay?.stops?.[0]?.color || '#000000')}
              onChange={(e) => {
                const stops = layer.gradientOverlay?.stops || [
                  { offset: 0, color: '#000000', opacity: 1 },
                  { offset: 1, color: '#FFFFFF', opacity: 0 },
                ];
                updateLayer(layer.id, {
                  gradientOverlay: {
                    angle: layer.gradientOverlay?.angle ?? 135,
                    stops: [{ ...stops[0], color: e.target.value }, ...stops.slice(1)],
                  },
                });
              }}
              className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
              title="Cor inicial"
            />
            <input
              type="color"
              value={toHexColor(layer.gradientOverlay?.stops?.[1]?.color || '#FFFFFF')}
              onChange={(e) => {
                const stops = layer.gradientOverlay?.stops || [
                  { offset: 0, color: '#000000', opacity: 1 },
                  { offset: 1, color: '#FFFFFF', opacity: 0 },
                ];
                updateLayer(layer.id, {
                  gradientOverlay: {
                    angle: layer.gradientOverlay?.angle ?? 135,
                    stops: [stops[0], { ...stops[1], color: e.target.value }],
                  },
                });
              }}
              className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
              title="Cor final"
            />
            <span className="text-[10px] font-mono text-white/60">Gradiente</span>
          </div>
          <div className="w-16">
            <Input
              type="number"
              min={0}
              max={360}
              step={15}
              value={layer.gradientOverlay?.angle ?? 135}
              onChange={(e) => {
                const stops = layer.gradientOverlay?.stops || [
                  { offset: 0, color: '#000000', opacity: 1 },
                  { offset: 1, color: '#FFFFFF', opacity: 0 },
                ];
                updateLayer(layer.id, {
                  gradientOverlay: {
                    angle: Number(e.target.value),
                    stops,
                  },
                });
              }}
              className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono text-center"
              title="Ângulo"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 bg-white/5 border border-white/10 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
          onClick={() => {
            if (layer.gradientOverlay) {
              updateLayer(layer.id, { gradientOverlay: undefined });
            } else {
              updateLayer(layer.id, {
                gradientOverlay: {
                  angle: 135,
                  stops: [
                    { offset: 0, color: '#000000', opacity: 0.6 },
                    { offset: 1, color: '#000000', opacity: 0 },
                  ],
                },
              });
            }
          }}
        >
          {layer.gradientOverlay ? 'Remover Gradiente' : 'Aplicar Gradiente'}
        </Button>
      </div>
    </div>
  );
};

/** Position/Size/Rotation controls for any layer */
const TransformControls = () => {
  const { layers, selectedLayerId, updateLayer } = useEditor();
  const layer = layers.find(l => l.id === selectedLayerId);
  if (!layer) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
        <Move size={12} /> Posição e Tamanho
      </h3>

      {/* X, Y */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-white/50">X</label>
          <Input
            type="number"
            value={Math.round(layer.x)}
            onChange={e => updateLayer(layer.id, { x: Number(e.target.value) })}
            className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-white/50">Y</label>
          <Input
            type="number"
            value={Math.round(layer.y)}
            onChange={e => updateLayer(layer.id, { y: Number(e.target.value) })}
            className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono"
          />
        </div>
      </div>

      {/* W, H */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-white/50">Largura</label>
          <Input
            type="number"
            value={Math.round(layer.width)}
            onChange={e => updateLayer(layer.id, { width: Math.max(1, Number(e.target.value)) })}
            className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-white/50">Altura</label>
          <Input
            type="number"
            value={Math.round(layer.height)}
            onChange={e => updateLayer(layer.id, { height: Math.max(1, Number(e.target.value)) })}
            className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono"
          />
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-1">
        <label className="text-[10px] text-white/50 flex items-center gap-1">
          <RotateCw size={10} /> Rotação ({Math.round(layer.rotation || 0)}°)
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="-180" max="180" step="1"
            value={layer.rotation || 0}
            onChange={e => updateLayer(layer.id, { rotation: Number(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <Input
            type="number"
            value={Math.round(layer.rotation || 0)}
            onChange={e => updateLayer(layer.id, { rotation: Number(e.target.value) })}
            className="w-16 h-8 bg-white/5 border-white/10 text-xs text-white font-mono text-center"
          />
        </div>
      </div>
    </div>
  );
};

export const RightSidebar = () => {
  const {
    layers, selectedLayerId, updateLayer,
    moveLayerOrder, removeLayer, duplicateLayer,
    backgroundColor, setBackgroundColor,
    canvasWidth, canvasHeight, setCanvasSize,
    clipContent, setClipContent,
  } = useEditor();

  const toggleLock = (id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (layer) updateLayer(id, { locked: !layer.locked });
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Track previous canvas size for proportional scaling
  const handleApplyScale = () => {
    // Scale all layers to fit within the current canvas dimensions proportionally
    // Uses the difference between original canvas size and new canvas size
    // The inputs already updated canvasWidth/canvasHeight via setCanvasSize,
    // so we just need to scale layers. We use a fixed reference point.
    if (canvasWidth > 0 && canvasHeight > 0) {
      // Find the bounding box of all layers
      if (layers.length === 0) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      layers.forEach(l => {
        minX = Math.min(minX, l.x);
        minY = Math.min(minY, l.y);
        maxX = Math.max(maxX, l.x + l.width);
        maxY = Math.max(maxY, l.y + l.height);
      });
      const boundsW = maxX - minX;
      const boundsH = maxY - minY;
      if (boundsW <= 0 || boundsH <= 0) return;

      // Scale factor to fit all layers within 90% of canvas (leave margin)
      const targetW = canvasWidth * 0.9;
      const targetH = canvasHeight * 0.9;
      const scale = Math.min(targetW / boundsW, targetH / boundsH, 1);

      // Center offset
      const offsetX = (canvasWidth - boundsW * scale) / 2 - minX * scale;
      const offsetY = (canvasHeight - boundsH * scale) / 2 - minY * scale;

      layers.forEach(l => {
        updateLayer(l.id, {
          x: Math.round(l.x * scale + offsetX),
          y: Math.round(l.y * scale + offsetY),
          width: Math.round(l.width * scale),
          height: Math.round(l.height * scale),
        });
      });
    }
  };

  return (
    <div className="flex flex-col bg-[#151521] border-l border-white/10 shrink-0 text-white z-10 w-full">
      <PanelHeader title={selectedLayer ? `Propriedades: ${selectedLayer.name.substring(0, 20)}` : "Propriedades da Página"} />

      <div className="p-4 flex flex-col gap-6 overflow-y-auto">
        {!selectedLayer ? (
          // === PAGE PROPERTIES ===
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <Maximize size={12} /> Tamanho
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/70">Largura</label>
                  <Input
                    type="number"
                    value={canvasWidth}
                    onChange={e => setCanvasSize(Number(e.target.value), canvasHeight)}
                    className="h-9 bg-[#1E1E2D] border-white/10 text-sm text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/70">Altura</label>
                  <Input
                    type="number"
                    value={canvasHeight}
                    onChange={e => setCanvasSize(canvasWidth, Number(e.target.value))}
                    className="h-9 bg-[#1E1E2D] border-white/10 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-9"
                onClick={handleApplyScale}
                title="Ajustar todas as camadas proporcionalmente ao novo tamanho"
              >
                Aplicar Proporção
              </Button>
            </div>

            <Divider />

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Fundo & Layout</h3>

              <div className="flex items-center justify-between">
                <label className="text-xs text-white/70">Cor de Fundo</label>
                <div className="flex items-center gap-2 bg-[#1E1E2D] p-1 border border-white/10">
                  <input
                    type="color"
                    value={toHexColor(backgroundColor)}
                    onChange={e => setBackgroundColor(e.target.value)}
                    className="w-6 h-6 cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-white/70">Cortar Conteúdo (Clip)</label>
                <Toggle value={clipContent} onChange={setClipContent} />
              </div>
            </div>
          </div>
        ) : (
          // === LAYER PROPERTIES ===
          <>
            {/* Transform controls (position, size, rotation) for ALL layer types */}
            <TransformControls />

            <Divider />

            {/* TEXT PROPERTIES */}
            {selectedLayer.type === 'text' && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Texto</h3>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Conteúdo</label>
                  <Input
                    value={selectedLayer.content}
                    onChange={e => updateLayer(selectedLayer.id, { content: e.target.value })}
                    className="h-8 bg-white/5 border-white/10 text-xs text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-white/50">Tamanho da Fonte</label>
                    <Input
                      type="number"
                      value={selectedLayer.fontSize || 60}
                      onChange={e => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                      className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-white/50">Cor da Fonte</label>
                    <div className="flex items-center h-8 bg-white/5 border border-white/10 px-2 gap-2">
                      <input
                        type="color"
                        value={toHexColor(selectedLayer.color)}
                        onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })}
                        className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span className="text-[10px] font-mono text-white/80">{selectedLayer.color || "#FFFFFF"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 flex items-center gap-1">
                    <Type size={10} /> Família da Fonte
                  </label>
                  <FontSelector
                    value={selectedLayer.fontFamily || "Inter, sans-serif"}
                    onChange={(val) => updateLayer(selectedLayer.id, { fontFamily: val })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Estilo</label>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-8 bg-white/5 border border-white/10 ${selectedLayer.fontWeight === 'bold' ? 'bg-white/20 text-white' : 'text-white/70'} hover:bg-white/10`}
                      onClick={() => updateLayer(selectedLayer.id, { fontWeight: selectedLayer.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      title="Negrito"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-8 bg-white/5 border border-white/10 ${(!((selectedLayer as any).textAlign) || (selectedLayer as any).textAlign === 'left') ? 'bg-white/20 text-white' : 'text-white/70'} hover:bg-white/10`}
                      onClick={() => updateLayer(selectedLayer.id, { textAlign: 'left' } as any)}
                      title="Alinhar à Esquerda"
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-8 bg-white/5 border border-white/10 ${((selectedLayer as any).textAlign === 'center') ? 'bg-white/20 text-white' : 'text-white/70'} hover:bg-white/10`}
                      onClick={() => updateLayer(selectedLayer.id, { textAlign: 'center' } as any)}
                      title="Centralizar"
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-8 bg-white/5 border border-white/10 ${((selectedLayer as any).textAlign === 'right') ? 'bg-white/20 text-white' : 'text-white/70'} hover:bg-white/10`}
                      onClick={() => updateLayer(selectedLayer.id, { textAlign: 'right' } as any)}
                      title="Alinhar à Direita"
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Text Shadow */}
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Sombra</label>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center h-8 bg-white/5 border border-white/10 px-2 gap-2">
                        <input
                          type="color"
                          value={toHexColor(selectedLayer.shadowColor)}
                          onChange={e => updateLayer(selectedLayer.id, { shadowColor: e.target.value })}
                          className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-[10px] font-mono text-white/60">Cor</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        type="number"
                        value={selectedLayer.shadowBlur || 0}
                        onChange={e => updateLayer(selectedLayer.id, { shadowBlur: Number(e.target.value) })}
                        placeholder="Blur"
                        className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Outline / Stroke */}
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Contorno do Texto</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex items-center h-8 bg-white/5 border border-white/10 px-2 gap-2">
                        <input
                          type="color"
                          value={toHexColor(selectedLayer.strokeColor)}
                          onChange={e => updateLayer(selectedLayer.id, { strokeColor: e.target.value })}
                          className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-[10px] font-mono text-white/60">Cor</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={selectedLayer.strokeWidth || 0}
                        onChange={e => updateLayer(selectedLayer.id, { strokeWidth: Math.max(0, Number(e.target.value)) })}
                        placeholder="Largura"
                        className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SHAPE PROPERTIES */}
            {selectedLayer.type === 'shape' && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Forma</h3>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Tipo</label>
                  <div className="h-8 bg-white/5 border border-white/10 px-3 flex items-center text-xs text-white/60 capitalize">
                    {selectedLayer.shapeType || 'Retângulo'}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Cor da Forma</label>
                  <div className="flex items-center h-8 bg-white/5 border border-white/10 px-2 gap-2 w-full">
                    <input
                      type="color"
                      value={toHexColor(selectedLayer.color)}
                      onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })}
                      className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="text-[10px] font-mono text-white/80">{selectedLayer.color || "#3B82F6"}</span>
                  </div>
                </div>

                {/* Stroke / Border */}
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Contorno (Borda)</label>
                  <div className="flex gap-2">
                    <div className="flex items-center h-8 bg-white/5 border border-white/10 px-2 gap-2 flex-1">
                      <input
                        type="color"
                        value={toHexColor(selectedLayer.strokeColor)}
                        onChange={e => updateLayer(selectedLayer.id, { strokeColor: e.target.value })}
                        className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span className="text-[10px] font-mono text-white/60">Cor</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={selectedLayer.strokeWidth || 0}
                        onChange={e => updateLayer(selectedLayer.id, { strokeWidth: Math.max(0, Number(e.target.value)) })}
                        placeholder="px"
                        className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Shadow */}
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Sombra</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex items-center h-8 bg-white/5 border border-white/10 px-2 gap-2">
                        <input
                          type="color"
                          value={toHexColor(selectedLayer.shadowColor)}
                          onChange={e => updateLayer(selectedLayer.id, { shadowColor: e.target.value })}
                          className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-[10px] font-mono text-white/60">Cor</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={selectedLayer.shadowBlur || 0}
                        onChange={e => updateLayer(selectedLayer.id, { shadowBlur: Number(e.target.value) })}
                        placeholder="Blur"
                        className="h-8 bg-white/5 border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* IMAGE / LOGO PROPERTIES */}
            {(selectedLayer.type === 'image' || selectedLayer.type === 'logo') && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  {selectedLayer.type === 'logo' ? 'Logo' : 'Imagem'}
                </h3>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Fonte</label>
                  <div className="h-8 bg-white/5 border border-white/10 px-2 flex items-center text-[10px] text-white/60 overflow-hidden text-ellipsis whitespace-nowrap">
                    {selectedLayer.content ? (selectedLayer.content.startsWith('data:') ? 'Dados locais (PNG)' : (() => { try { return new URL(selectedLayer.content).hostname; } catch { return selectedLayer.content.substring(0, 40); } })()) : '—'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white text-[10px]"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const url = ev.target?.result as string;
                          const img = new Image();
                          img.onload = () => {
                            // Scale to fit within current layer bounds, preserving aspect
                            let w = img.naturalWidth;
                            let h = img.naturalHeight;
                            const maxW = Math.max(selectedLayer.width, 400);
                            const maxH = Math.max(selectedLayer.height, 300);
                            if (w > maxW) { h = h * (maxW / w); w = maxW; }
                            if (h > maxH) { w = w * (maxH / h); h = maxH; }
                            updateLayer(selectedLayer.id, {
                              content: url,
                              width: Math.round(w),
                              height: Math.round(h),
                            });
                          };
                          img.src = url;
                        };
                        reader.readAsDataURL(file);
                      };
                      input.click();
                    }}
                  >
                    Substituir Imagem
                  </Button>
                </div>

                {/* Preview thumbnail */}
                {selectedLayer.content && (
                  <div className="w-full h-24 bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                    <img
                      src={selectedLayer.content}
                      alt={selectedLayer.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}

                {/* Image Adjustments */}
                <Divider />
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                    <Sun size={12} /> Ajustes da Imagem
                  </h3>

                  {/* Brightness */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/50 flex items-center gap-1">
                      <Sun size={10} /> Brilho ({selectedLayer.brightness ?? 100}%)
                    </label>
                    <input
                      type="range" min="0" max="200" step="5"
                      value={selectedLayer.brightness ?? 100}
                      onChange={e => updateLayer(selectedLayer.id, { brightness: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/50 flex items-center gap-1">
                      <Contrast size={10} /> Contraste ({selectedLayer.contrast ?? 100}%)
                    </label>
                    <input
                      type="range" min="0" max="200" step="5"
                      value={selectedLayer.contrast ?? 100}
                      onChange={e => updateLayer(selectedLayer.id, { contrast: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/50 flex items-center gap-1">
                      <Droplets size={10} /> Saturação ({selectedLayer.saturation ?? 100}%)
                    </label>
                    <input
                      type="range" min="0" max="200" step="5"
                      value={selectedLayer.saturation ?? 100}
                      onChange={e => updateLayer(selectedLayer.id, { saturation: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Hue Rotate */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/50 flex items-center gap-1">
                      <Palette size={10} /> Matiz ({selectedLayer.hueRotate ?? 0}°)
                    </label>
                    <input
                      type="range" min="0" max="360" step="5"
                      value={selectedLayer.hueRotate ?? 0}
                      onChange={e => updateLayer(selectedLayer.id, { hueRotate: Number(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Reset adjustments */}
                  <Button
                    variant="ghost" size="sm"
                    className="w-full h-7 bg-white/5 border border-white/10 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
                    onClick={() => updateLayer(selectedLayer.id, { brightness: 100, contrast: 100, saturation: 100, hueRotate: 0 })}
                  >
                    Restaurar Ajustes
                  </Button>
                </div>
              </div>
            )}

            {/* BADGE PROPERTIES */}
            {selectedLayer.type === 'badge' && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Badge</h3>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Texto do Badge</label>
                  <Input
                    value={selectedLayer.content}
                    onChange={e => updateLayer(selectedLayer.id, { content: e.target.value })}
                    className="h-8 bg-white/5 border-white/10 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50">Estilo</label>
                  <Select
                    value={selectedLayer.badgeStyle || 'live'}
                    onValueChange={(val) => updateLayer(selectedLayer.id, { badgeStyle: val as any })}
                  >
                    <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs text-white w-full">
                      <SelectValue placeholder="Estilo do badge" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1E2D] border-white/10 text-white">
                      {BADGE_STYLES.map(b => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Divider />

            {/* OPACITY */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/50">Opacidade ({Math.round((selectedLayer.opacity || 1) * 100)}%)</label>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={selectedLayer.opacity ?? 1}
                onChange={e => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            <Divider />

            {/* BLEND, MASK & OVERLAYS */}
            <BlendEffectsControls />

            <Divider />

            {/* LAYER ACTIONS */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-white/50 uppercase">Posição e Ações</h3>

              <div className="grid grid-cols-4 gap-1">
                <Button variant="outline" size="sm" className="h-8 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white/70" onClick={() => moveLayerOrder(selectedLayer.id, 'top')} title="Trazer para Frente">
                  <ChevronsUp size={14} />
                </Button>
                <Button variant="outline" size="sm" className="h-8 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white/70" onClick={() => moveLayerOrder(selectedLayer.id, 'up')} title="Avançar">
                  <ArrowUp size={14} />
                </Button>
                <Button variant="outline" size="sm" className="h-8 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white/70" onClick={() => moveLayerOrder(selectedLayer.id, 'down')} title="Recuar">
                  <ArrowDown size={14} />
                </Button>
                <Button variant="outline" size="sm" className="h-8 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white/70" onClick={() => moveLayerOrder(selectedLayer.id, 'bottom')} title="Enviar para Fundo">
                  <ChevronsDown size={14} />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-2">
                <Button variant="outline" size="sm" className="h-8 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white/70" onClick={() => toggleLock(selectedLayer.id)} title={selectedLayer.locked ? "Destravar" : "Travar"}>
                  {selectedLayer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </Button>
                <Button variant="outline" size="sm" className="h-8 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white/70" onClick={() => duplicateLayer(selectedLayer.id)} title="Duplicar">
                  <Copy size={14} />
                </Button>
                <Button variant="outline" size="sm" className="h-8 bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300" onClick={() => removeLayer(selectedLayer.id)} title="Apagar">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
