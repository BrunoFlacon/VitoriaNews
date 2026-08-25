import React from 'react';
import { PanelHeader } from '../PanelHeader';
import { COVER_PRESETS, CoverPreset } from '../../PresetSelector';
import { cn } from '@/lib/utils';
import { useEditor } from '../../EditorContext';
import { useToast } from '@/hooks/use-toast';

interface FormatosContentProps {
  onClose: () => void;
}

export const FormatosContent: React.FC<FormatosContentProps> = ({ onClose }) => {
  const { setCanvasSize, canvasWidth, canvasHeight } = useEditor();
  const { toast } = useToast();

  const handleSelectPreset = (preset: CoverPreset) => {
    setCanvasSize(preset.width, preset.height);
    toast({
      title: `Formato: ${preset.name}`,
      description: `${preset.width}x${preset.height} (${preset.aspectRatio})`,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#151521] text-white">
      <PanelHeader title="Formatos de Capa" onClose={onClose} />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
          Selecione o Formato
        </h3>
        
        <div className="grid grid-cols-1 gap-3">
          {COVER_PRESETS.map((preset) => {
            const Icon = preset.icon;
            // Check if current canvas size matches preset
            const isSelected = preset.width === canvasWidth && preset.height === canvasHeight;
            
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={cn(
                  "flex flex-col text-left p-3.5 border transition-all relative overflow-hidden group",
                  isSelected
                    ? "bg-blue-600/20 border-blue-500 ring-1 ring-blue-500/50 shadow-lg shadow-blue-500/10"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    "p-2 transition-transform group-hover:scale-110",
                    isSelected ? "bg-blue-500 text-white" : "bg-white/10 text-white/70"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-black/50 text-white/80 border border-white/10">
                    {preset.aspectRatio}
                  </span>
                </div>
                <p className="text-sm font-bold text-white mb-0.5 truncate">
                  {preset.name}
                </p>
                <p className="text-[10px] text-white/50 line-clamp-2 mb-2">
                  {preset.description}
                </p>
                <div className="flex items-center gap-1 flex-wrap mt-auto">
                  {preset.platforms.map((p) => (
                    <span
                      key={p}
                      className="text-[9px] font-semibold px-1.5 py-0.5 bg-white/5 text-white/70 border border-white/10"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
