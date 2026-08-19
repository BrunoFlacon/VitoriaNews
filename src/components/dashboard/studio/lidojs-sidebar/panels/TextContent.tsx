import { useEditor } from '../../EditorContext';
import type { CanvasLayer } from '../../CoverCanvasEngine';
import { PanelHeader } from '../PanelHeader';
import { addAHeading, addASubheading, addABodyText } from '../textPresets';

interface TextContentProps {
  onClose: () => void;
}

export const TextContent = ({ onClose }: TextContentProps) => {
  const { addLayer, selectLayer } = useEditor();

  const handleAddText = (
    text: string,
    fontSize: number,
    fontFamily: string = 'Inter, sans-serif',
    fontWeight: string = 'bold',
    color: string = '#FFFFFF',
  ) => {
    const layer: CanvasLayer = {
      id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `Texto: ${text.slice(0, 20)}`,
      type: 'text',
      x: 200,
      y: 200 + Math.random() * 100,
      width: 600,
      height: Math.max(60, fontSize * 2),
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: text,
      fontSize,
      fontFamily,
      fontWeight,
      color,
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowBlur: 10,
    };
    addLayer(layer);
    selectLayer(layer.id);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PanelHeader title="Texto" onClose={onClose} />

      {/* Quick-add buttons */}
      <div className="flex flex-col gap-2 p-4">
        <div
          className="text-[28px] leading-none p-4 font-bold bg-gray-100 rounded cursor-pointer select-none hover:bg-gray-200 transition-colors"
          onClick={() => handleAddText('TITULO', 64, 'Inter, sans-serif', 'bold', '#FFFFFF')}
        >
          Adicionar titulo
        </div>
        <div
          className="text-lg leading-none p-4 font-bold bg-gray-100 rounded cursor-pointer select-none hover:bg-gray-200 transition-colors"
          onClick={() => handleAddText('Subtitulo', 40, 'Inter, sans-serif', 'bold', '#FACC15')}
        >
          Adicionar subtitulo
        </div>
        <div
          className="text-xs leading-none p-4 font-bold bg-gray-100 rounded cursor-pointer select-none hover:bg-gray-200 transition-colors"
          onClick={() => handleAddText('Texto descritivo', 26, 'Inter, sans-serif', 'normal', '#CBD5E1')}
        >
          Adicionar texto pequeno
        </div>
      </div>

      {/* Text style presets */}
      <div className="grid grid-cols-2 gap-2 p-4">
        {[
          { label: 'Impact', fontFamily: 'Impact, sans-serif', fontSize: 56, color: '#FFFFFF' },
          { label: 'Oswald', fontFamily: 'Oswald, sans-serif', fontSize: 44, color: '#FFFFFF' },
          { label: 'Playfair', fontFamily: '"Playfair Display", serif', fontSize: 44, color: '#FACC15' },
          { label: 'Montserrat', fontFamily: 'Montserrat, sans-serif', fontSize: 40, color: '#FFFFFF' },
          { label: 'Bebas Neue', fontFamily: '"Bebas Neue", sans-serif', fontSize: 52, color: '#EF4444' },
          { label: 'Poppins', fontFamily: 'Poppins, sans-serif', fontSize: 36, color: '#FFFFFF' },
          { label: 'Raleway', fontFamily: 'Raleway, sans-serif', fontSize: 36, color: '#FFFFFF' },
          { label: 'Lato', fontFamily: 'Lato, sans-serif', fontSize: 36, color: '#FFFFFF' },
        ].map((style) => (
          <div
            key={style.label}
            className="cursor-pointer bg-gray-100 rounded p-2 flex items-center justify-center min-h-[70px] hover:bg-gray-200 transition-colors"
            onClick={() => handleAddText(style.label, style.fontSize, style.fontFamily, 'bold', style.color)}
          >
            <span
              className="text-center text-gray-700 truncate w-full"
              style={{
                fontFamily: style.fontFamily,
                fontSize: '16px',
                fontWeight: 700,
              }}
            >
              {style.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
