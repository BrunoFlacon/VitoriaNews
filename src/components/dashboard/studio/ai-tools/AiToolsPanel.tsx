/**
 * AI Tools Panel — Layout Advisor + Text-to-Image
 *
 * Sidebar panel with two sections:
 * 1. Layout Advisor — analyze composition and apply suggestions
 * 2. AI Image Generator — generate covers/images from prompts
 *    - Engine + key come from Settings → IA & Motores (shared prefs)
 *    - Cover presets for YouTube, Reels, TikTok, etc.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Sparkles, Wand2, ImagePlus, Loader2, ChevronDown, ChevronRight,
  MonitorPlay, RotateCcw,
} from 'lucide-react';
import { useEditor } from '../EditorContext';
import { analyzeLayout, type LayoutSuggestion } from '../ai-layout/layoutAdvisor';
import {
  generateAiImage,
  AI_PROMPT_SUGGESTIONS,
  COVER_PRESETS,
  getAiImagePrefs,
  IMAGE_ENGINES,
  engineHasKey,
  type AiImageRequest,
  type ImageEngineId,
  type StyleId,
} from './aiImageGenerator';
import type { CanvasLayer } from '../CoverCanvasEngine';

export const AiToolsPanel = () => {
  const { layers, addLayer, updateLayer, canvasWidth, canvasHeight, setCanvasSize } = useEditor();
  const [suggestions, setSuggestions] = useState<LayoutSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'advisor' | 'generator' | null>('advisor');

  // ── Shared prefs (synced with Settings → IA & Motores) ────
  const [prefs, setPrefs] = useState(() => getAiImagePrefs());
  useEffect(() => {
    const handler = () => setPrefs(getAiImagePrefs());
    window.addEventListener('ai-image-prefs-updated', handler);
    return () => window.removeEventListener('ai-image-prefs-updated', handler);
  }, []);

  // ── Layout Advisor ────────────────────────────────────────
  const runAnalysis = useCallback(() => {
    setAnalyzing(true);
    setTimeout(() => {
      setSuggestions(analyzeLayout(layers, canvasWidth, canvasHeight));
      setAnalyzing(false);
    }, 300);
  }, [layers, canvasWidth, canvasHeight]);

  const applySuggestion = useCallback((suggestion: LayoutSuggestion) => {
    Object.entries(suggestion.fixes).forEach(([layerId, updates]) => {
      updateLayer(layerId, updates);
    });
  }, [updateLayer]);

  // ── AI Image Generator ────────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StyleId>(prefs.defaultStyle);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'success' | 'placeholder'>('idle');
  const [lastEngine, setLastEngine] = useState<string | null>(null);

  const activeEngineName = IMAGE_ENGINES.find(e => e.id === prefs.defaultEngine)?.name || 'Flux';

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenerationStatus('idle');

    // Resolve target size: preset overrides current canvas
    const preset = COVER_PRESETS.find(p => p.id === selectedPreset);
    const targetW = preset?.width ?? Math.min(canvasWidth, 1280);
    const targetH = preset?.height ?? Math.min(canvasHeight, 1280);

    try {
      const result = await generateAiImage({
        prompt: prompt.trim(),
        width: targetW,
        height: targetH,
        style: selectedStyle,
        engine: prefs.defaultEngine,
        enhance: prefs.enhancePrompts,
      });

      // Resize canvas to match preset when generating a cover
      if (preset) {
        setCanvasSize(preset.width, preset.height);
      }

      const newLayer: CanvasLayer = {
        id: `ai_img_${Date.now()}`,
        name: `IA: ${prompt.substring(0, 24)}`,
        type: 'image',
        x: 0,
        y: 0,
        width: preset ? preset.width : Math.min(canvasWidth, 800),
        height: preset ? preset.height : Math.min(canvasHeight, 600),
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        content: result.dataUrl,
      };
      addLayer(newLayer);
      setLastEngine(result.engine);
      setGenerationStatus(result.engine === 'placeholder' ? 'placeholder' : 'success');
    } catch (err) {
      console.error('AI generation failed:', err);
      setGenerationStatus('placeholder');
    } finally {
      setGenerating(false);
    }
  }, [prompt, selectedStyle, selectedPreset, prefs, canvasWidth, canvasHeight, addLayer, setCanvasSize]);

  const styles: { value: StyleId; label: string }[] = [
    { value: 'none', label: 'Padrão' },
    { value: 'photorealistic', label: 'Fotorrealista' },
    { value: 'cinematic', label: 'Cinematográfico' },
    { value: 'digital-art', label: 'Arte Digital' },
    { value: 'illustration', label: 'Ilustração' },
    { value: '3d-render', label: '3D Render' },
    { value: 'anime', label: 'Anime' },
    { value: 'oil-painting', label: 'Pintura a Óleo' },
    { value: 'watercolor', label: 'Aquarela' },
    { value: 'pixel-art', label: 'Pixel Art' },
  ];

  return (
    <div className="flex flex-col gap-0 text-white">
      {/* Layout Advisor Section */}
      <button
        onClick={() => setExpandedSection(expandedSection === 'advisor' ? null : 'advisor')}
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
      >
        {expandedSection === 'advisor' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Sparkles size={14} className="text-yellow-400" />
        <span className="text-xs font-semibold">Layout Advisor</span>
      </button>

      {expandedSection === 'advisor' && (
        <div className="px-3 pb-3 space-y-2 border-b border-white/10">
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="w-full py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-medium flex items-center justify-center gap-2 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all"
          >
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {analyzing ? 'Analisando...' : 'Analisar Composição'}
          </button>

          {suggestions.length > 0 && (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                {suggestions.length} sugestões
              </p>
              {suggestions.map((s) => (
                <div key={s.id} className="bg-white/5 border border-white/10 p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-white/90">{s.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 uppercase font-bold ${
                        s.severity === 'warning'
                          ? 'bg-red-500/20 text-red-300'
                          : s.severity === 'suggestion'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {s.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">{s.description}</p>
                  {Object.keys(s.fixes).length > 0 && (
                    <button
                      onClick={() => applySuggestion(s)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                    >
                      Aplicar correção
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {suggestions.length === 0 && !analyzing && (
            <p className="text-[10px] text-white/30 text-center py-2">
              Clique em "Analisar" para obter sugestões de layout
            </p>
          )}
        </div>
      )}

      {/* AI Image Generator Section */}
      <button
        onClick={() => setExpandedSection(expandedSection === 'generator' ? null : 'generator')}
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
      >
        {expandedSection === 'generator' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <ImagePlus size={14} className="text-purple-400" />
        <span className="text-xs font-semibold">Gerar Capa / Imagem com IA</span>
      </button>

      {expandedSection === 'generator' && (
        <div className="px-3 pb-3 space-y-3">
          {/* Active engine indicator */}
          <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/25 rounded-lg px-2 py-1.5">
            <span className="text-[10px] text-purple-300 flex items-center gap-1 flex-wrap">
              <Wand2 size={10} /> Motor: <strong>{activeEngineName}</strong>
              {(() => {
                const info = IMAGE_ENGINES.find(e => e.id === prefs.defaultEngine);
                if (!info?.requiresKey || engineHasKey(info.id, prefs)) return null;
                const fallbackOrder: ImageEngineId[] = [
                  'openrouter-seedream', 'openrouter-nanobanana', 'gemini', 'nvidia',
                  'custom', 'huggingface', 'horde', 'openai',
                ];
                const fallbackId = fallbackOrder.find(id => engineHasKey(id, prefs));
                const fallbackName = fallbackId
                  ? IMAGE_ENGINES.find(e => e.id === fallbackId)?.name ?? 'placeholder'
                  : 'AI Horde';
                return <span className="text-yellow-400/90">(sem chave — usa {fallbackName})</span>;
              })()}
            </span>
            <span className="text-[9px] text-white/40">
              {prefs.enhancePrompts ? '✨ prompts melhorados' : ''}
            </span>
          </div>

          {/* Prompt input */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a capa que deseja gerar... ex: thumbnail épica de gameplay com explosão e espaço para título"
            rows={3}
            className="w-full bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-white placeholder-white/30 resize-none focus:outline-none focus:border-purple-500 rounded"
          />

          {/* Suggestions toggle */}
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-[10px] text-purple-400 hover:text-purple-300"
          >
            {showSuggestions ? 'Ocultar sugestões' : 'Ver sugestões de prompts'}
          </button>

          {showSuggestions && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto border border-white/10 bg-white/5 p-2 rounded">
              {AI_PROMPT_SUGGESTIONS.map((cat) => (
                <div key={cat.category}>
                  <p className="text-[9px] text-white/40 uppercase font-bold mb-1">{cat.category}</p>
                  {cat.prompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPrompt(p); setShowSuggestions(false); }}
                      className="w-full text-left text-[10px] text-white/60 hover:text-white hover:bg-white/5 p-1 transition-colors"
                    >
                      {p.substring(0, 64)}...
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Cover presets */}
          <div className="space-y-1">
            <label className="text-[10px] text-white/50 flex items-center gap-1">
              <MonitorPlay size={10} /> Formato da capa (redimensiona o canvas)
            </label>
            <div className="grid grid-cols-2 gap-1">
              {COVER_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPreset(selectedPreset === p.id ? null : p.id)}
                  title={`${p.width}×${p.height}`}
                  className={`px-1.5 py-1 text-[9px] border transition-colors truncate ${
                    selectedPreset === p.id
                      ? 'bg-blue-500/25 border-blue-500 text-blue-200'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                  }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
            {selectedPreset && (
              <button
                onClick={() => setSelectedPreset(null)}
                className="text-[9px] text-white/40 hover:text-white/60 inline-flex items-center gap-1 mt-0.5"
              >
                <RotateCcw size={8} /> Usar tamanho atual do canvas
              </button>
            )}
          </div>

          {/* Style selector */}
          <div className="space-y-1">
            <label className="text-[10px] text-white/50">Estilo</label>
            <div className="flex flex-wrap gap-1">
              {styles.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSelectedStyle(s.value)}
                  className={`px-2 py-1 text-[9px] border transition-colors ${
                    selectedStyle === s.value
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating ? (
              <><Loader2 size={14} className="animate-spin" /> Gerando...</>
            ) : (
              <><Wand2 size={14} /> Gerar Imagem</>
            )}
          </button>

          {/* Generation status */}
          {generationStatus === 'placeholder' && (
            <p className="text-[10px] text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 p-1.5 text-center rounded">
              Motor indisponível — foi gerado um placeholder.
              Vá em Configurações → APIs &amp; Dev → Inteligência Artificial para trocar de motor ou adicionar chave.
            </p>
          )}
          {generationStatus === 'success' && (
            <p className="text-[10px] text-green-400/80 bg-green-500/10 border border-green-500/20 p-1.5 text-center rounded">
              ✅ Imagem gerada via {lastEngine}!
            </p>
          )}
        </div>
      )}
    </div>
  );
};
