import { useEditor } from '../../EditorContext';
import type { CanvasLayer } from '../../CoverCanvasEngine';
import { PanelHeader } from '../PanelHeader';
import { SHAPE_DEFINITIONS, LINE_DEFINITIONS } from '../../lidojs-config/shapes';

interface ShapeContentProps {
  onClose: () => void;
}

/** Scale shape to a reasonable canvas size (proportional to canvas) */
function shapeScaleFactor(canvasWidth: number, canvasHeight: number): number {
  const minDim = Math.min(canvasWidth, canvasHeight);
  // Target ~25% of the smaller canvas dimension
  return Math.max(1, Math.round(minDim * 0.25) / 64);
}

export const ShapeContent = ({ onClose }: ShapeContentProps) => {
  const { addLayer, selectLayer, canvasWidth, canvasHeight } = useEditor();
  const scale = shapeScaleFactor(canvasWidth, canvasHeight);

  const addShape = (shapeDef: (typeof SHAPE_DEFINITIONS)[number]) => {
    const w = Math.round(shapeDef.width * scale);
    const h = Math.round(shapeDef.height * scale);
    const layer: CanvasLayer = {
      id: `shape_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `Forma: ${shapeDef.label}`,
      type: 'shape',
      shapeType: 'svg',
      svgPath: shapeDef.svgPath,
      x: Math.round((canvasWidth - w) / 2),
      y: Math.round((canvasHeight - h) / 2),
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: shapeDef.type,
      color: '#3B82F6',
    };
    addLayer(layer);
    selectLayer(layer.id);
  };

  const addLine = (lineDef: (typeof LINE_DEFINITIONS)[number]) => {
    const lineW = Math.round(canvasWidth * 0.3);
    const layer: CanvasLayer = {
      id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `Linha: ${lineDef.label}`,
      type: 'shape',
      shapeType: 'arrow',
      x: Math.round((canvasWidth - lineW) / 2),
      y: Math.round(canvasHeight / 2) - 2,
      width: lineW,
      height: 4,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: 'divider',
      color: '#FFFFFF',
    };
    addLayer(layer);
    selectLayer(layer.id);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PanelHeader title="Formas" onClose={onClose} />

      <div className="p-4">
        {/* Lines/Arrows section */}
        <div className="py-2 font-bold text-sm text-white/80">Linhas / Setas</div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {LINE_DEFINITIONS.map((line) => (
            <div
              key={line.id}
              className="w-full aspect-square relative cursor-pointer hover:bg-white/10 flex items-center justify-center"
              onClick={() => addLine(line)}
            >
              <svg width="48" height="48" viewBox="0 0 48 48">
                <line
                  x1="4" y1="24" x2="44" y2="24"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeDasharray={
                    line.style === 'shortDashes' ? '6,3' :
                    line.style === 'dots' ? '3,3' : undefined
                  }
                />
                {(line.arrowEnd === 'arrow' || line.arrowEnd === 'triangle') && (
                  <polygon points="40,18 46,24 40,30" fill="#FFFFFF" />
                )}
                {line.arrowEnd === 'circle' && (
                  <circle cx="44" cy="24" r="3" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                )}
                {line.arrowEnd === 'square' && (
                  <rect x="41" y="21" width="6" height="6" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                )}
                {line.arrowEnd === 'bar' && (
                  <line x1="46" y1="18" x2="46" y2="30" stroke="#FFFFFF" strokeWidth="2" />
                )}
                {(line.arrowStart === 'arrow' || line.arrowStart === 'triangle') && (
                  <polygon points="8,18 2,24 8,30" fill="#FFFFFF" />
                )}
                {line.arrowStart === 'circle' && (
                  <circle cx="4" cy="24" r="3" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                )}
                {line.arrowStart === 'square' && (
                  <rect x="1" y="21" width="6" height="6" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                )}
                {line.arrowStart === 'bar' && (
                  <line x1="2" y1="18" x2="2" y2="30" stroke="#FFFFFF" strokeWidth="2" />
                )}
              </svg>
              <span className="absolute bottom-0 text-[8px] text-white/60 truncate w-full text-center px-0.5">
                {line.label}
              </span>
            </div>
          ))}
        </div>

        {/* Shapes section */}
        <div className="py-2 font-bold text-sm text-white/80">Formas</div>
        <div className="grid grid-cols-4 gap-2">
          {SHAPE_DEFINITIONS.map((shape) => (
            <div
              key={shape.type}
              className="w-full aspect-square relative cursor-pointer hover:bg-white/10 flex items-center justify-center"
              onClick={() => addShape(shape)}
            >
              <svg width="40" height="40" viewBox="0 0 64 64">
                <path d={shape.svgPath} fill="none" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
              <span className="absolute bottom-0 text-[8px] text-white/60 truncate w-full text-center px-0.5">
                {shape.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
