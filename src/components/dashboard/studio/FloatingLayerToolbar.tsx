import React from 'react';
import { useEditor } from './EditorContext';
import {
  Eraser, Copy, Trash2,
  Bold, AlignLeft, AlignCenter, AlignRight, Lock, Unlock,
  ArrowUp, ArrowDown, Eye, EyeOff,
  Group, Ungroup, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingLayerToolbarProps {
  layerId: string;
}

/** Alignment toolbar shown when multiple layers are selected */
const MultiSelectToolbar: React.FC<{ layerIds: string[] }> = ({ layerIds }) => {
  const { layers, canvasWidth, canvasHeight, updateLayer, updateSelectedLayers, removeSelectedLayers,
    duplicateSelectedLayers, groupSelectedLayers, ungroupSelectedLayers } = useEditor();

  const selectedLayers = layers.filter((l) => layerIds.includes(l.id));
  if (selectedLayers.length < 2) return null;

  // Check if any layers share a group
  const hasGroup = selectedLayers.some((l) => l.groupId);

  const alignToCanvas = (axis: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    selectedLayers.forEach((l) => {
      const updates: Partial<typeof l> = {};
      switch (axis) {
        case 'left': updates.x = 0; break;
        case 'center': updates.x = Math.round((canvasWidth - l.width) / 2); break;
        case 'right': updates.x = Math.round(canvasWidth - l.width); break;
        case 'top': updates.y = 0; break;
        case 'middle': updates.y = Math.round((canvasHeight - l.height) / 2); break;
        case 'bottom': updates.y = Math.round(canvasHeight - l.height); break;
      }
      updateLayer(l.id, updates);
    });
  };

  const distribute = (axis: 'horizontal' | 'vertical') => {
    if (selectedLayers.length < 3) return;
    const sorted = [...selectedLayers].sort((a, b) =>
      axis === 'horizontal' ? a.x - b.x : a.y - b.y
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSize = axis === 'horizontal'
      ? (last.x + last.width) - first.x
      : (last.y + last.height) - first.y;
    const totalLayerSize = sorted.reduce((sum, l) =>
      sum + (axis === 'horizontal' ? l.width : l.height), 0
    );
    const gap = (totalSize - totalLayerSize) / (sorted.length - 1);
    let offset = axis === 'horizontal' ? first.x : first.y;
    sorted.forEach((l) => {
      const size = axis === 'horizontal' ? l.width : l.height;
      updateLayer(l.id, {
        [axis === 'horizontal' ? 'x' : 'y']: Math.round(offset),
      });
      offset += size + gap;
    });
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[#1E1E2D]/95 backdrop-blur-md px-2 py-1 border border-white/10 shadow-2xl z-20 pointer-events-auto">
      <span className="text-[10px] text-white/50 font-mono px-1.5 whitespace-nowrap">
        {layerIds.length} selecionadas
      </span>

      <div className="w-px h-3.5 bg-white/20 mx-1" />

      {/* Align to canvas */}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => alignToCanvas('left')} title="Alinhar à esquerda">
        <AlignStartHorizontal className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => alignToCanvas('center')} title="Centralizar horizontal">
        <AlignCenterHorizontal className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => alignToCanvas('right')} title="Alinhar à direita">
        <AlignEndHorizontal className="w-3 h-3" />
      </Button>

      <div className="w-px h-3.5 bg-white/20 mx-1" />

      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => alignToCanvas('top')} title="Alinhar ao topo">
        <AlignStartVertical className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => alignToCanvas('middle')} title="Centralizar vertical">
        <AlignCenterVertical className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => alignToCanvas('bottom')} title="Alinhar ao fundo">
        <AlignEndVertical className="w-3 h-3" />
      </Button>

      <div className="w-px h-3.5 bg-white/20 mx-1" />

      {/* Distribute */}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => distribute('horizontal')} title="Distribuir horizontal" disabled={layerIds.length < 3}>
        <AlignHorizontalDistributeCenter className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => distribute('vertical')} title="Distribuir vertical" disabled={layerIds.length < 3}>
        <AlignVerticalDistributeCenter className="w-3 h-3" />
      </Button>

      <div className="w-px h-3.5 bg-white/20 mx-1" />

      {/* Group / Ungroup */}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={groupSelectedLayers} title="Agrupar" disabled={layerIds.length < 2}>
        <Group className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={ungroupSelectedLayers} title="Desagrupar" disabled={!hasGroup}>
        <Ungroup className="w-3 h-3" />
      </Button>

      <div className="w-px h-3.5 bg-white/20 mx-1" />

      {/* Duplicate */}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={duplicateSelectedLayers} title="Duplicar selecionadas">
        <Copy className="w-3 h-3" />
      </Button>

      {/* Delete */}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={removeSelectedLayers} title="Excluir selecionadas">
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
};

export const FloatingLayerToolbar: React.FC<FloatingLayerToolbarProps> = ({ layerId }) => {
  const { layers, selectedLayerIds, removeLayer, duplicateLayer, setCutoutMode, updateLayer, moveLayerOrder } = useEditor();
  
  // Show multi-select toolbar when more than one layer is selected
  if (selectedLayerIds.length > 1) {
    return <MultiSelectToolbar layerIds={selectedLayerIds} />;
  }

  const layer = layers.find(l => l.id === layerId);
  if (!layer) return null;

  const isImage = layer.type === 'image' || layer.type === 'logo';
  const isText = layer.type === 'text';

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[#1E1E2D]/95 backdrop-blur-md px-2 py-1 border border-white/10 shadow-2xl z-20 pointer-events-auto">
      {/* ── Image-specific tools ── */}
      {isImage && (
        <>
          <Button 
            variant="ghost" size="sm" 
            className="h-7 px-2 text-[11px] text-white hover:bg-white/10 gap-1"
            onClick={() => setCutoutMode(true)}
          >
            <Eraser className="w-3 h-3" />
            BG Remover
          </Button>
          <div className="w-px h-3.5 bg-white/20 mx-1" />
        </>
      )}

      {/* ── Text-specific tools ── */}
      {isText && (
        <>
          <button
            onClick={() => updateLayer(layerId, { fontWeight: layer.fontWeight === 'bold' ? 'normal' : 'bold' })}
            className={`h-7 px-1.5 text-[11px] font-bold transition-colors ${
              layer.fontWeight === 'bold' ? 'text-blue-400 bg-blue-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Bold size={12} />
          </button>
          <button
            onClick={() => updateLayer(layerId, { textAlign: 'left' })}
            className={`h-7 px-1.5 transition-colors ${
              layer.textAlign === 'left' ? 'text-blue-400 bg-blue-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <AlignLeft size={12} />
          </button>
          <button
            onClick={() => updateLayer(layerId, { textAlign: 'center' })}
            className={`h-7 px-1.5 transition-colors ${
              layer.textAlign === 'center' ? 'text-blue-400 bg-blue-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <AlignCenter size={12} />
          </button>
          <button
            onClick={() => updateLayer(layerId, { textAlign: 'right' })}
            className={`h-7 px-1.5 transition-colors ${
              layer.textAlign === 'right' ? 'text-blue-400 bg-blue-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <AlignRight size={12} />
          </button>
          <div className="w-px h-3.5 bg-white/20 mx-1" />
          <span className="text-[10px] text-white/50 font-mono px-1">{layer.fontSize || 60}px</span>
          <div className="w-px h-3.5 bg-white/20 mx-1" />
        </>
      )}

      {/* ── Common tools (all layer types) ── */}
      {/* Duplicate */}
      <Button 
        variant="ghost" size="icon" 
        className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => duplicateLayer(layerId)}
        title="Duplicar"
      >
        <Copy className="w-3 h-3" />
      </Button>
      
      {/* Lock/Unlock */}
      <Button 
        variant="ghost" size="icon" 
        className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => updateLayer(layerId, { locked: !layer.locked })}
        title={layer.locked ? "Desbloquear" : "Bloquear"}
      >
        {layer.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
      </Button>

      {/* Visibility */}
      <Button 
        variant="ghost" size="icon" 
        className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => updateLayer(layerId, { visible: !layer.visible })}
        title={layer.visible ? "Ocultar" : "Mostrar"}
      >
        {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-white/40" />}
      </Button>

      {/* Layer order */}
      <Button 
        variant="ghost" size="icon" 
        className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => moveLayerOrder(layerId, 'up')}
        title="Avançar"
      >
        <ArrowUp className="w-3 h-3" />
      </Button>
      <Button 
        variant="ghost" size="icon" 
        className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => moveLayerOrder(layerId, 'down')}
        title="Recuar"
      >
        <ArrowDown className="w-3 h-3" />
      </Button>

      <div className="w-px h-3.5 bg-white/20 mx-1" />

      {/* Delete */}
      <Button 
        variant="ghost" size="icon" 
        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
        onClick={() => removeLayer(layerId)}
        title="Excluir"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
};
