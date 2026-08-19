import { useEditor } from '../../EditorContext';
import { PanelHeader } from '../PanelHeader';
import { GRADIENT_PRESETS, SOLID_COLOR_PRESETS } from '../../lidojs-config/shapes';

interface BackgroundContentProps {
  onClose: () => void;
}

export const BackgroundContent = ({ onClose }: BackgroundContentProps) => {
  const { setBackgroundColor } = useEditor();

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PanelHeader title="Fundo" onClose={onClose} />

      <div className="p-4">
        {/* Solid Colors */}
        <div className="py-2 font-bold text-sm text-gray-700">Cores Solidas</div>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {SOLID_COLOR_PRESETS.map((color) => (
            <div
              key={color}
              className="aspect-square rounded cursor-pointer border border-gray-200 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => setBackgroundColor(color)}
              title={color}
            />
          ))}
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-3 bg-gray-100 p-3 rounded-xl mb-4">
          <input
            type="color"
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
          />
          <span className="text-xs font-mono font-bold uppercase text-gray-600">Cor personalizada</span>
        </div>

        {/* Gradient presets (display only - we show them as color options) */}
        <div className="py-2 font-bold text-sm text-gray-700">Gradientes</div>
        <div className="grid grid-cols-3 gap-2">
          {GRADIENT_PRESETS.map((grad) => (
            <div
              key={grad.id}
              className="aspect-square rounded cursor-pointer hover:scale-105 transition-transform flex items-end relative overflow-hidden"
              style={{ background: grad.css }}
              onClick={() => setBackgroundColor(grad.colors[0])}
            >
              <span className="text-[9px] text-white font-medium bg-black/30 w-full text-center py-0.5 rounded-b">
                {grad.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
