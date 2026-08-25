import { useEditor } from '../../EditorContext';
import { PanelHeader } from '../PanelHeader';
import { GRADIENT_PRESETS, SOLID_COLOR_PRESETS } from '../../lidojs-config/shapes';

/** Convert any CSS color to #rrggbb for <input type="color"> */
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

interface BackgroundContentProps {
  onClose: () => void;
}

export const BackgroundContent = ({ onClose }: BackgroundContentProps) => {
  const { backgroundColor, setBackgroundColor, setBackgroundGradient } = useEditor();

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PanelHeader title="Fundo" onClose={onClose} />

      <div className="p-4">
        {/* Solid Colors */}
        <div className="py-2 font-bold text-sm text-white/80">Cores Solidas</div>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {SOLID_COLOR_PRESETS.map((color) => (
            <div
              key={color}
              className="aspect-square cursor-pointer border border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => { setBackgroundColor(color); setBackgroundGradient(null); }}
              title={color}
            />
          ))}
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-3 bg-white/5 p-3 mb-4">
          <input
            type="color"
            value={toHexColor(backgroundColor)}
            onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundGradient(null); }}
            className="w-10 h-10 cursor-pointer bg-transparent border-0"
          />
          <span className="text-xs font-mono font-bold uppercase text-white/60">Cor personalizada</span>
        </div>

        {/* Gradient presets */}
        <div className="py-2 font-bold text-sm text-white/80">Gradientes</div>
        <div className="grid grid-cols-3 gap-2">
          {GRADIENT_PRESETS.map((grad) => (
            <div
              key={grad.id}
              className="aspect-square cursor-pointer hover:scale-105 transition-transform flex items-end relative overflow-hidden"
              style={{ background: grad.css }}
              onClick={() => {
                setBackgroundGradient(grad.css);
                setBackgroundColor(grad.colors[0]);
              }}
            >
              <span className="text-[9px] text-white font-medium bg-black/30 w-full text-center py-0.5">
                {grad.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
