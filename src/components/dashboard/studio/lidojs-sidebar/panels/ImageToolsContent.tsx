import { useState, useCallback } from 'react';
import { Wand2, Scissors, Loader2, AlertCircle, ImageOff, Crop, Eraser, PaintBucket, Sparkles, Layers, Eye, Target } from 'lucide-react';
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
    eraserMode, setEraserMode,
    eraserSize, setEraserSize,
    eraserSoftness, setEraserSoftness,
    eraserTolerance, setEraserTolerance,
    eraserType, setEraserType,
    smartSelectionMode, setSmartSelectionMode,
  } = useEditor();

  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bg' | 'eraser' | 'smart'>('bg');

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
    setEraserMode(false);
    setSmartSelectionMode(false);
    setCutoutMode(!cutoutMode);
  }, [isImageLayer, cutoutMode, setCutoutMode, setEraserMode, setSmartSelectionMode]);

  const handleToggleEraser = useCallback(() => {
    if (!isImageLayer) return;
    setCutoutMode(false);
    setSmartSelectionMode(false);
    setEraserMode(!eraserMode);
  }, [isImageLayer, eraserMode, setEraserMode, setCutoutMode, setSmartSelectionMode]);

  const handleToggleSmart = useCallback(() => {
    if (!isImageLayer) return;
    setCutoutMode(false);
    setEraserMode(false);
    setSmartSelectionMode(!smartSelectionMode);
  }, [isImageLayer, smartSelectionMode, setSmartSelectionMode, setCutoutMode, setEraserMode]);

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PanelHeader title="Ferramentas de Imagem" onClose={onClose} />

      {/* Tab bar */}
      <div className="flex border-b border-white/10 shrink-0">
        {[
          { id: 'bg' as const, label: 'Fundo', icon: <Wand2 size={12} /> },
          { id: 'eraser' as const, label: 'Borracha', icon: <Eraser size={12} /> },
          { id: 'smart' as const, label: 'Mágica', icon: <Sparkles size={12} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Selection warning */}
        {!isImageLayer && (
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20">
            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              Selecione uma camada de imagem no canvas para usar estas ferramentas.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20">
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

        {/* ════ TAB: BACKGROUND ════ */}
        {activeTab === 'bg' && (
          <>
            {/* Remove Background */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 size={12} /> Remoção de Fundo
              </h3>
              <p className="text-[11px] text-white/60">
                Remove o fundo da imagem automaticamente usando inteligência artificial.
                Funciona 100% no navegador — sua imagem não sai do computador.
              </p>
              <button
                onClick={handleRemoveBackground}
                disabled={!isImageLayer || removeBgProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3
                  bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm
                  hover:from-violet-500 hover:to-purple-500 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {removeBgProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{progress || 'Processando...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={18} />
                    <span>Remover Fundo (IA)</span>
                  </>
                )}
              </button>
              {removeBgProcessing && progress && (
                <div className="w-full bg-black/40 h-1.5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 animate-pulse w-3/4" />
                </div>
              )}
            </div>

            <div className="h-px bg-white/10" />

            {/* Foreground Extract */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={12} /> Separar Plano de Fundo
              </h3>
              <p className="text-[11px] text-white/60">
                Separa a imagem em primeiro plano e fundo com base na cor amostrada no canto superior esquerdo.
              </p>
              <button
                onClick={async () => {
                  if (!isImageLayer || !selectedLayer) return;
                  setError(null);
                  setRemoveBgProcessing(true);
                  setProgress('Separando planos...');
                  try {
                    const { extractForeground } = await import('../../image-tools/eraserTool');
                    const result = await extractForeground(
                      selectedLayer.content, selectedLayer.width, selectedLayer.height, 0, 0, 30,
                    );
                    // Replace current layer with foreground
                    updateLayer(selectedLayer.id, { content: result.foreground });
                    setProgress('');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Falha ao separar');
                    setProgress('');
                  } finally {
                    setRemoveBgProcessing(false);
                  }
                }}
                disabled={!isImageLayer || removeBgProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3
                  bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm
                  hover:from-emerald-500 hover:to-teal-500 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Layers size={18} />
                <span>Separar Primeiro Plano</span>
              </button>
            </div>

            <div className="h-px bg-white/10" />

            {/* Object Cutout */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Scissors size={12} /> Recorte de Objeto
              </h3>
              <p className="text-[11px] text-white/60">
                Desenhe um polígono ao redor do objeto que deseja manter.
              </p>
              <button
                onClick={handleToggleCutout}
                disabled={!isImageLayer}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-all
                  ${cutoutMode
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500'
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {cutoutMode ? <ImageOff size={18} /> : <Scissors size={18} />}
                <span>{cutoutMode ? 'Cancelar Recorte' : 'Recortar Objeto (Polígono)'}</span>
              </button>
              {cutoutMode && (
                <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20">
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
          </>
        )}

        {/* ════ TAB: ERASER ════ */}
        {activeTab === 'eraser' && (
          <>
            {/* Eraser Mode Toggle */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Eraser size={12} /> Modo Borracha
              </h3>
              <p className="text-[11px] text-white/60">
                Ative o modo borracha para apagar pixels da imagem arrastando o mouse sobre ela.
              </p>
              <button
                onClick={handleToggleEraser}
                disabled={!isImageLayer}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-all
                  ${eraserMode
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-500 hover:to-red-500'
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Eraser size={18} />
                <span>{eraserMode ? 'Desativar Borracha' : 'Ativar Borracha'}</span>
              </button>
            </div>

            {eraserMode && (
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20">
                <Eraser size={16} className="text-orange-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-orange-300 space-y-1">
                  <p><strong>Borracha ativa!</strong></p>
                  <p>Clique e arraste sobre a imagem para apagar. A alteração é aplicada ao soltar o mouse.</p>
                </div>
              </div>
            )}

            <div className="h-px bg-white/10" />

            {/* Eraser Type */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Tipo de Borracha</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'basic' as const, label: 'Básica', desc: 'Borda suave', icon: <Eraser size={14} /> },
                  { id: 'pixel' as const, label: 'Pixels', desc: 'Borda dura', icon: <Target size={14} /> },
                  { id: 'magic' as const, label: 'Mágica', desc: 'Cor similar', icon: <PaintBucket size={14} /> },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEraserType(t.id)}
                    className={`flex flex-col items-center gap-1 p-2 text-[10px] border transition-colors ${
                      eraserType === t.id
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {t.icon}
                    <span className="font-semibold">{t.label}</span>
                    <span className="text-white/30 text-[9px]">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brush Size */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 flex items-center gap-1">
                <Eraser size={10} /> Tamanho ({eraserSize}px)
              </label>
              <input
                type="range" min="2" max="200" step="2"
                value={eraserSize}
                onChange={e => setEraserSize(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex gap-1">
                {[5, 10, 20, 40, 80].map((s) => (
                  <button
                    key={s}
                    onClick={() => setEraserSize(s)}
                    className={`flex-1 text-[9px] py-0.5 border transition-colors ${
                      eraserSize === s ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Softness (basic eraser only) */}
            {eraserType === 'basic' && (
              <div className="space-y-1">
                <label className="text-[10px] text-white/50">
                  Suavidade ({eraserSoftness}%)
                </label>
                <input
                  type="range" min="0" max="100" step="5"
                  value={eraserSoftness}
                  onChange={e => setEraserSoftness(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-[9px] text-white/30">
                  <span>Dura</span>
                  <span>Suave</span>
                </div>
              </div>
            )}

            {/* Tolerance (magic eraser only) */}
            {eraserType === 'magic' && (
              <div className="space-y-1">
                <label className="text-[10px] text-white/50">
                  Tolerância ({eraserTolerance}%)
                </label>
                <input
                  type="range" min="1" max="100" step="1"
                  value={eraserTolerance}
                  onChange={e => setEraserTolerance(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-[9px] text-white/30">
                  <span>Precisa</span>
                  <span>Ampla</span>
                </div>
                <p className="text-[10px] text-white/40">
                  A borracha mágica apaga pixels de cor similar ao ponto clicado. A tolerância controla quão "similar" deve ser.
                </p>
              </div>
            )}
          </>
        )}

        {/* ════ TAB: SMART / MAGIC ════ */}
        {activeTab === 'smart' && (
          <>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} /> Extração Inteligente
              </h3>
              <p className="text-[11px] text-white/60">
                Separe automaticamente os elementos da imagem em regiões de cores distintas.
                Cada região é extraída como uma máscara separada que pode ser usada para criar novas camadas.
              </p>

              <button
                onClick={async () => {
                  if (!isImageLayer || !selectedLayer) return;
                  setError(null);
                  setRemoveBgProcessing(true);
                  setProgress('Analisando regiões de cor...');
                  try {
                    const { extractColorRegions } = await import('../../image-tools/eraserTool');
                    const regions = await extractColorRegions(
                      selectedLayer.content, selectedLayer.width, selectedLayer.height, 5,
                    );
                    // Create a visual composite showing the regions
                    const canvas = document.createElement('canvas');
                    canvas.width = selectedLayer.width;
                    canvas.height = selectedLayer.height;
                    const ctx = canvas.getContext('2d')!;

                    // Draw each region with its dominant color
                    for (const region of regions) {
                      const maskImg = new Image();
                      await new Promise<void>((resolve) => {
                        maskImg.onload = () => {
                          // Create colored overlay
                          ctx.globalAlpha = 0.6;
                          ctx.fillStyle = region.dominantColor;
                          ctx.beginPath();
                          // Use the mask as clip
                          ctx.drawImage(maskImg, 0, 0);
                          ctx.globalCompositeOperation = 'source-in';
                          ctx.fill();
                          ctx.globalCompositeOperation = 'source-over';
                          ctx.globalAlpha = 1;
                          resolve();
                        };
                        maskImg.src = region.mask;
                      });
                    }

                    // Add region labels
                    ctx.globalAlpha = 1;
                    for (const region of regions) {
                      if (region.bounds.width > 50 && region.bounds.height > 20) {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 3;
                        ctx.font = 'bold 12px Inter, sans-serif';
                        ctx.textAlign = 'center';
                        const cx = region.bounds.x + region.bounds.width / 2;
                        const cy = region.bounds.y + region.bounds.height / 2;
                        ctx.strokeText(region.label, cx, cy);
                        ctx.fillText(region.label, cx, cy);
                      }
                    }

                    updateLayer(selectedLayer.id, { content: canvas.toDataURL('image/png') });
                    setProgress('');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Falha na extração');
                    setProgress('');
                  } finally {
                    setRemoveBgProcessing(false);
                  }
                }}
                disabled={!isImageLayer || removeBgProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3
                  bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-sm
                  hover:from-cyan-500 hover:to-blue-500 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {removeBgProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{progress || 'Processando...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Separar por Cores</span>
                  </>
                )}
              </button>
            </div>

            <div className="h-px bg-white/10" />

            {/* Edge Detection */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={12} /> Detecção de Bordas
              </h3>
              <p className="text-[11px] text-white/60">
                Detecta as bordas da imagem e cria uma máscara de seleção baseada nos contornos encontrados.
              </p>
              <button
                onClick={async () => {
                  if (!isImageLayer || !selectedLayer) return;
                  setError(null);
                  setRemoveBgProcessing(true);
                  setProgress('Detectando bordas...');
                  try {
                    const { smartEdgeDetect } = await import('../../image-tools/eraserTool');
                    const maskUri = await smartEdgeDetect(
                      selectedLayer.content, selectedLayer.width, selectedLayer.height, 60,
                    );
                    // Apply edge mask as overlay on the image
                    const canvas = document.createElement('canvas');
                    canvas.width = selectedLayer.width;
                    canvas.height = selectedLayer.height;
                    const ctx = canvas.getContext('2d')!;
                    const img = new Image();
                    await new Promise<void>((resolve) => {
                      img.onload = () => {
                        ctx.drawImage(img, 0, 0);
                        resolve();
                      };
                      img.src = selectedLayer.content;
                    });
                    const maskImg = new Image();
                    await new Promise<void>((resolve) => {
                      maskImg.onload = () => {
                        ctx.globalCompositeOperation = 'destination-out';
                        ctx.drawImage(maskImg, 0, 0);
                        ctx.globalCompositeOperation = 'source-over';
                        resolve();
                      };
                      maskImg.src = maskUri;
                    });
                    updateLayer(selectedLayer.id, { content: canvas.toDataURL('image/png') });
                    setProgress('');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Falha na detecção');
                    setProgress('');
                  } finally {
                    setRemoveBgProcessing(false);
                  }
                }}
                disabled={!isImageLayer || removeBgProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3
                  bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium text-sm
                  hover:from-pink-500 hover:to-rose-500 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Eye size={18} />
                <span>Detectar e Remover Bordas</span>
              </button>
            </div>

            <div className="h-px bg-white/10" />

            {/* Tips */}
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Dicas de Extração
              </h3>
              <ul className="text-[11px] text-white/60 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-px">•</span>
                  <span><strong>Separar por Cores:</strong> Analisa a imagem e cria regiões baseadas nas cores dominantes encontradas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-400 mt-px">•</span>
                  <span><strong>Detecção de Bordas:</strong> Usa o filtro Sobel para encontrar contornos e depois remove as bordas detectadas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-px">•</span>
                  <span><strong>Separar Primeiro Plano:</strong> Separa a imagem em primeiro plano vs. fundo baseado na cor do canto.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-px">•</span>
                  <span><strong>Remoção de Fundo (IA):</strong> Usa modelo de IA local para detectar e remover o fundo automaticamente.</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
