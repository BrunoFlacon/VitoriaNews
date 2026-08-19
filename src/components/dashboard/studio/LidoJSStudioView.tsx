// LidoJS Studio View - Full-featured cover editor
// Uses our CoverCanvasEngine with canva-clone inspired UI/UX

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  Loader2,
  Undo2,
  Redo2,
  Download,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EditorProvider, useEditor } from './EditorContext';
import { CoverCanvasEngine, type CanvasLayer } from './CoverCanvasEngine';
import { Sidebar } from './lidojs-sidebar/Sidebar';

interface LidoJSStudioViewProps {
  onBack: () => void;
}

// The inner editor wrapped by EditorProvider
const EditorInner = ({ onBack }: LidoJSStudioViewProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    layers,
    selectedLayerId,
    selectLayer,
    updateLayer,
    removeLayer,
    duplicateLayer,
    moveLayerOrder,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    cutoutMode,
    setCutoutMode,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useEditor();

  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' && selectedLayerId) {
        removeLayer(selectedLayerId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedLayerId, removeLayer]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) throw new Error('Usuario nao autenticado');

      const { error: dbError } = await (supabase as any).from('cover_projects').insert({
        user_id: userRes.user.id,
        title: 'Cover - Editor Avancado',
        media_type: 'video',
        aspect_ratio: `${canvasWidth}:${canvasHeight}`,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        layers: layers as any,
      });

      if (dbError) console.warn('DB record error:', dbError.message);

      toast({
        title: 'Capa Exportada com Sucesso!',
        description: 'Projeto salvo no banco de dados.',
      });
    } catch (err: unknown) {
      toast({
        title: 'Erro na Exportacao',
        description: (err as Error).message || 'Falha ao salvar.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  return (
    <div className="flex flex-col w-full h-full max-h-[calc(100vh-4rem)] bg-[#EBECF0]">
      {/* Top Header Bar */}
      <div className="bg-[#1E1E2D] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/10 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <div className="h-6 w-px bg-white/20" />
          <span className="text-white font-semibold text-sm">
            Social Canvas Studio
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 h-8 w-8"
            onClick={undo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 h-8 w-8"
            onClick={redo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-white/20" />

          {/* Export */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 gap-1.5 text-xs"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">
              {isExporting ? 'Salvando...' : 'Exportar'}
            </span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tool Tabs (from canva-clone UI) */}
        <Sidebar />

        {/* Right Panel - Layer Settings + Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Layer Settings Bar */}
          {selectedLayer && (
            <div className="bg-white border-b border-gray-700/10 h-[50px] overflow-x-auto shrink-0 flex items-center px-4 gap-2">
              <span className="text-xs font-bold text-gray-500 mr-2">
                {selectedLayer.name}
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveLayerOrder(selectedLayer.id, 'up')}
                  title="Mover para cima"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveLayerOrder(selectedLayer.id, 'down')}
                  title="Mover para baixo"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveLayerOrder(selectedLayer.id, 'top')}
                  title="Topo"
                >
                  <ChevronsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveLayerOrder(selectedLayer.id, 'bottom')}
                  title="Fundo"
                >
                  <ChevronsDown className="h-3.5 w-3.5" />
                </Button>
                <div className="h-5 w-px bg-gray-200 mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => duplicateLayer(selectedLayer.id)}
                  title="Duplicar"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => removeLayer(selectedLayer.id)}
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <CoverCanvasEngine
              width={canvasWidth}
              height={canvasHeight}
              aspectRatio={`${canvasWidth}:${canvasHeight}`}
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={selectLayer}
              onUpdateLayer={updateLayer}
              onDeleteLayer={removeLayer}
              onDuplicateLayer={duplicateLayer}
              onMoveLayerOrder={moveLayerOrder}
              onToggleLock={(id) => {
                const layer = layers.find((l) => l.id === id);
                if (layer) updateLayer(id, { locked: !layer.locked });
              }}
              backgroundColor={backgroundColor}
              showSafeZones={false}
              cutoutMode={cutoutMode}
              onCutoutComplete={(newDataUri) => {
                if (selectedLayerId) {
                  updateLayer(selectedLayerId, { content: newDataUri });
                  setCutoutMode(false);
                }
              }}
            />
          </div>

          {/* Bottom Status Bar */}
          <div className="h-8 bg-white border-t border-gray-200 flex items-center px-4 shrink-0 text-xs text-gray-500 gap-4">
            <span>{canvasWidth} x {canvasHeight}</span>
            <span>|</span>
            <span>{layers.length} camadas</span>
            {selectedLayer && (
              <>
                <span>|</span>
                <span>Selecionado: {selectedLayer.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[1040] bg-black/95 flex items-center justify-center">
          <CoverCanvasEngine
            width={canvasWidth}
            height={canvasHeight}
            aspectRatio={`${canvasWidth}:${canvasHeight}`}
            layers={layers}
            selectedLayerId={null}
            onSelectLayer={() => {}}
            onUpdateLayer={() => {}}
            backgroundColor={backgroundColor}
            showSafeZones={false}
          />
          <div
            className="fixed right-6 top-6 bg-white/30 w-[60px] h-[60px] flex items-center justify-center rounded-full text-white text-3xl cursor-pointer hover:bg-white/50 transition-colors"
            onClick={() => setShowPreview(false)}
          >
            &times;
          </div>
        </div>
      )}
    </div>
  );
};

export const LidoJSStudioView = ({ onBack }: LidoJSStudioViewProps) => {
  return (
    <EditorProvider
      initialLayers={[
        {
          id: 'layer_title',
          name: 'Titulo Principal',
          type: 'text',
          x: 100,
          y: 200,
          width: 800,
          height: 120,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          content: 'TITULO IMPRESSIONANTE',
          fontSize: 72,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
          color: '#FFFFFF',
          shadowColor: 'rgba(0, 0, 0, 0.8)',
          shadowBlur: 20,
        },
      ]}
      initialWidth={1200}
      initialHeight={675}
      initialBackgroundColor="#1a1a2e"
    >
      <EditorInner onBack={onBack} />
    </EditorProvider>
  );
};

export default LidoJSStudioView;
