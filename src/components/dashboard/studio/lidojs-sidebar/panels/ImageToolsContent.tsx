import { useState, useCallback } from 'react';
import { Wand2, Scissors, Loader2, AlertCircle, ImageOff, Crop } from 'lucide-react';
import { useEditor } from '../../EditorContext';
import { PanelHeader } from '../PanelHeader';
import { removeImageBackground } from '../../image-tools/removeBackground';

interface ImageToolsContentProps {
  onClose: () => void;
}

export const ImageToolsContent = ({ onClose }: ImageToolsContentProps) => {
  const {
    layers, selectedLayerId, updateLayer,
    cutoutMode, setCutoutMode,
    removeBgProcessing, setRemoveBgProcessing,
  } = useEditor();

  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const isImageLayer = selectedLayer && (selectedLayer.type === 'image' || selectedLayer.type === 'logo');

  const handleRemoveBackground = useCallback(async () => {
    if (!isImageLayer || !selectedLayer) return;

    setError(null);
    setRemoveBgProcessing(true);
    setProgress('Carregando modelo de IA...');

    try {
      const cleanUrl = selectedLayer.content;
      const newDataUri = await removeImageBackground(cleanUrl, {
        onProgress: (stage) => {
          if (stage.includes('decode')) setProgress('Decodificando imagem...');
          else if (stage.includes('inference')) setProgress('Analisando imagem com IA...');
          else if (stage.includes('mask')) setProgress('Aplicando máscara...');
          else if (stage.includes('encode')) setProgress('Codificando resultado...');
          else setProgress('Processando...');
        },
      });

      updateLayer(selectedLayer.id, { content: newDataUri });
      setProgress('');
    } catch (err) {
      console.error('Background removal failed:', err);
      setError(err instanceof Error ? err.message : 'Falha ao remover fundo');
      setProgress('');
    } finally {
      setRemoveBgProcessing(false);
    }
  }, [isImageLayer, selectedLayer, updateLayer, setRemoveBgProcessing]);

  const handleToggleCutout = useCallback(() => {
    if (!isImageLayer) return;
    setCutoutMode(!cutoutMode);
  }, [isImageLayer, cutoutMode, setCutoutMode]);

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PanelHeader title="Ferramentas de Imagem" onClose={onClose} />

      <div className="p-4 space-y-4">
        {/* Selection warning */}
        {!isImageLayer && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              Selecione uma camada de imagem no canvas para usar estas ferramentas.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-red-300">{error}</p>
              <button
                className="text-[10px] text-red-400 underline mt-1 hover:text-red-300"
                onClick={() => setError(null)}
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {/* Remove Background */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Remoção de Fundo
          </h3>
          <p className="text-[11px] text-gray-400">
            Remove o fundo da imagem automaticamente usando inteligência artificial.
            Funciona 100% no navegador — sua imagem não sai do computador.
          </p>
          <button
            onClick={handleRemoveBackground}
            disabled={!isImageLayer || removeBgProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm
              hover:from-violet-500 hover:to-purple-500 transition-all
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-violet-600 disabled:hover:to-purple-600"
          >
            {removeBgProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{progress || 'Processando...'}</span>
              </>
            ) : (
              <>
                <Wand2 size={18} />
                <span>Remover Fundo</span>
              </>
            )}
          </button>
          {removeBgProcessing && progress && (
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full animate-pulse w-3/4" />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200" />

        {/* Object Cutout */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recorte de Objeto
          </h3>
          <p className="text-[11px] text-gray-400">
            Desenhe um polígono ao redor do objeto que deseja manter.
            Tudo fora do polígono será removido. Clique para adicionar pontos e
            duplo-clique para finalizar.
          </p>
          <button
            onClick={handleToggleCutout}
            disabled={!isImageLayer}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all
              ${cutoutMode
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500'
              }
              disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {cutoutMode ? (
              <>
                <ImageOff size={18} />
                <span>Cancelar Recorte</span>
              </>
            ) : (
              <>
                <Scissors size={18} />
                <span>Recortar Objeto</span>
              </>
            )}
          </button>

          {cutoutMode && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Crop size={16} className="text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-emerald-300 space-y-1">
                <p><strong>Modo recorte ativo!</strong></p>
                <ul className="list-disc list-inside space-y-0.5 text-emerald-400/80">
                  <li>Clique para adicionar pontos ao polígono</li>
                  <li>Clique no primeiro ponto para fechar</li>
                  <li>Duplo-clique para recortar</li>
                  <li>Escape para cancelar</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="h-px bg-gray-200" />
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Dicas
          </h3>
          <ul className="text-[11px] text-gray-400 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-px">•</span>
              <span>A remoção de fundo funciona melhor com imagens que têm um objeto claro em primeiro plano.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-px">•</span>
              <span>Para recortes precisos, adicione muitos pontos ao redor do objeto.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-px">•</span>
              <span>Ambas as ferramentas criam uma nova imagem com fundo transparente (PNG).</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
