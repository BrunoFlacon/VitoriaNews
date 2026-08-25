/**
 * Animation Timeline Panel
 * 
 * Provides a timeline UI for keyframe animation:
 * - Visual timeline with keyframe diamonds
 * - Play/pause/stop controls
 * - Preset animations
 * - Duration and FPS controls
 * - Export as GIF/CSS
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, Square, Plus, Trash2, RotateCcw, Download, Film } from 'lucide-react';
import { useEditor } from '../EditorContext';
import {
  type LayerAnimation,
  type Keyframe,
  type EasingFunction,
  createKeyframe,
  addKeyframe,
  computeFrame,
  ANIMATION_PRESETS,
} from './keyframeEngine';

export const AnimationTimelinePanel = () => {
  const { layers, selectedLayerId, updateLayer } = useEditor();
  const [animations, setAnimations] = useState<Map<string, LayerAnimation>>(new Map());
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(2000); // 2 seconds
  const [fps, setFps] = useState(30);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [selectedKeyframeIdx, setSelectedKeyframeIdx] = useState<number | null>(null);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const currentAnimation = selectedLayerId ? animations.get(selectedLayerId) : undefined;

  // ── Playback ──────────────────────────────────────────────
  const play = useCallback(() => {
    if (!currentAnimation || currentAnimation.keyframes.length < 2) return;
    setPlaying(true);
    startTimeRef.current = performance.now() - currentTime;
    const totalDur = currentAnimation.duration || totalDuration;

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const time = currentAnimation.loop ? elapsed % totalDur : Math.min(elapsed, totalDur);

      setCurrentTime(time);

      // Apply interpolated properties to the layer
      if (selectedLayerId) {
        const props = computeFrame(currentAnimation.keyframes, time);
        updateLayer(selectedLayerId, props);
      }

      if (currentAnimation.loop || elapsed < totalDur) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [currentAnimation, currentTime, selectedLayerId, updateLayer, totalDuration]);

  const pause = useCallback(() => {
    setPlaying(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setCurrentTime(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ── Keyframe Operations ───────────────────────────────────
  const addKeyframeAtCurrentTime = useCallback(() => {
    if (!selectedLayerId || !selectedLayer) return;
    const layer = selectedLayer;
    const kf = createKeyframe(currentTime, {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation,
      opacity: layer.opacity,
    });

    const existing = animations.get(selectedLayerId) || {
      layerId: selectedLayerId,
      keyframes: [],
      duration: totalDuration,
      loop: false,
    };

    const updated = addKeyframe(existing, kf);
    setAnimations((prev) => new Map(prev).set(selectedLayerId, updated));
  }, [selectedLayerId, selectedLayer, currentTime, animations, totalDuration]);

  const applyPreset = useCallback((presetName: string) => {
    if (!selectedLayerId || !selectedLayer) return;
    const preset = ANIMATION_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;

    // Scale keyframe times to match total duration
    const maxPresetTime = Math.max(...preset.keyframes.map((k) => k.time));
    const scaledKeyframes = preset.keyframes.map((kf) => ({
      ...kf,
      time: maxPresetTime > 0 ? (kf.time / maxPresetTime) * totalDuration : kf.time,
    }));

    const animation: LayerAnimation = {
      layerId: selectedLayerId,
      keyframes: scaledKeyframes,
      duration: totalDuration,
      loop: false,
    };

    setAnimations((prev) => new Map(prev).set(selectedLayerId, animation));
  }, [selectedLayerId, selectedLayer, totalDuration]);

  // ── Timeline display ──────────────────────────────────────
  const timelineWidth = 400; // px
  const timeToX = (ms: number) => (ms / totalDuration) * timelineWidth;
  const xToTime = (x: number) => Math.max(0, Math.min(totalDuration, (x / timelineWidth) * totalDuration));

  return (
    <div className="flex flex-col gap-2 text-white p-3">
      <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
        <Film size={12} /> Timeline de Animação
      </h3>

      {!selectedLayer ? (
        <p className="text-[10px] text-white/30 text-center py-4">
          Selecione uma camada para animar
        </p>
      ) : (
        <>
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={playing ? pause : play}
              className="p-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-colors"
              title={playing ? 'Pausar' : 'Reproduzir'}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={stop}
              className="p-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Parar"
            >
              <Square size={14} />
            </button>
            <div className="flex-1 mx-2">
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={10}
                value={currentTime}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  setCurrentTime(t);
                  if (selectedLayerId) {
                    const anim = animations.get(selectedLayerId);
                    if (anim) {
                      const props = computeFrame(anim.keyframes, t);
                      updateLayer(selectedLayerId, props);
                    }
                  }
                }}
                className="w-full accent-blue-500"
              />
            </div>
            <span className="text-[10px] font-mono text-white/50 w-12 text-right">
              {(currentTime / 1000).toFixed(1)}s
            </span>
          </div>

          {/* Duration & Loop */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <label className="text-[9px] text-white/40">Duração:</label>
              <input
                type="number"
                min={100}
                max={30000}
                step={100}
                value={totalDuration}
                onChange={(e) => setTotalDuration(Number(e.target.value))}
                className="w-14 h-6 bg-white/5 border border-white/10 text-[10px] text-white font-mono text-center"
              />
              <span className="text-[9px] text-white/30">ms</span>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[9px] text-white/40">FPS:</label>
              <input
                type="number"
                min={10}
                max={60}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-10 h-6 bg-white/5 border border-white/10 text-[10px] text-white font-mono text-center"
              />
            </div>
          </div>

          {/* Timeline Visual */}
          <div className="relative bg-white/5 border border-white/10 h-12 overflow-hidden">
            {/* Time markers */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <div
                key={pct}
                className="absolute top-0 h-full border-l border-white/10"
                style={{ left: `${pct * 100}%` }}
              >
                <span className="text-[7px] text-white/30 ml-0.5">
                  {(pct * totalDuration / 1000).toFixed(1)}s
                </span>
              </div>
            ))}

            {/* Keyframe diamonds */}
            {currentAnimation?.keyframes.map((kf, i) => (
              <div
                key={i}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 cursor-pointer border transition-colors ${
                  selectedKeyframeIdx === i
                    ? 'bg-yellow-400 border-yellow-300'
                    : 'bg-blue-500 border-blue-400 hover:bg-blue-400'
                }`}
                style={{ left: `${timeToX(kf.time)}px` }}
                onClick={() => setSelectedKeyframeIdx(i)}
                title={`Keyframe @ ${(kf.time / 1000).toFixed(2)}s — ${kf.easing}`}
              />
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 h-full w-0.5 bg-red-500"
              style={{ left: `${timeToX(currentTime)}px` }}
            >
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-red-500 -translate-x-[7px]" />
            </div>
          </div>

          {/* Keyframe Actions */}
          <div className="flex gap-1">
            <button
              onClick={addKeyframeAtCurrentTime}
              className="flex-1 py-1.5 bg-white/5 border border-white/10 text-[10px] text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center gap-1 transition-colors"
            >
              <Plus size={10} /> Keyframe
            </button>
            {selectedKeyframeIdx !== null && currentAnimation && (
              <button
                onClick={() => {
                  const updated = {
                    ...currentAnimation,
                    keyframes: currentAnimation.keyframes.filter((_, i) => i !== selectedKeyframeIdx),
                  };
                  setAnimations((prev) => new Map(prev).set(selectedLayerId!, updated));
                  setSelectedKeyframeIdx(null);
                }}
                className="py-1.5 px-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>

          {/* Easing selector for selected keyframe */}
          {selectedKeyframeIdx !== null && currentAnimation?.keyframes[selectedKeyframeIdx] && (
            <div className="space-y-1">
              <label className="text-[9px] text-white/40">Easing</label>
              <div className="flex flex-wrap gap-1">
                {(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bounce', 'elastic', 'spring'] as EasingFunction[]).map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      const updated = { ...currentAnimation };
                      updated.keyframes = [...updated.keyframes];
                      updated.keyframes[selectedKeyframeIdx] = {
                        ...updated.keyframes[selectedKeyframeIdx],
                        easing: e,
                      };
                      setAnimations((prev) => new Map(prev).set(selectedLayerId!, updated));
                    }}
                    className={`px-1.5 py-0.5 text-[8px] border transition-colors ${
                      currentAnimation.keyframes[selectedKeyframeIdx].easing === e
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preset Animations */}
          <div className="space-y-1">
            <label className="text-[9px] text-white/40 uppercase tracking-wider">Predefinições</label>
            <div className="flex flex-wrap gap-1">
              {ANIMATION_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.name)}
                  className="px-2 py-1 text-[9px] bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Export Animation */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                // Generate CSS keyframes
                if (!currentAnimation || !selectedLayer) return;
                const sorted = [...currentAnimation.keyframes].sort((a, b) => a.time - b.time);
                const dur = currentAnimation.duration || totalDuration;
                let css = `@keyframes anim-${selectedLayer.name.replace(/[^a-zA-Z0-9]/g, '-')} {\n`;
                sorted.forEach((kf) => {
                  const pct = Math.round((kf.time / dur) * 100);
                  const props: string[] = [];
                  const p = kf.properties;
                  if (p.x !== undefined || p.y !== undefined || p.rotation !== undefined) {
                    const tx = p.x ?? 0;
                    const ty = p.y ?? 0;
                    const rot = p.rotation ?? 0;
                    props.push(`transform: translate(${tx}px, ${ty}px) rotate(${rot}deg)`);
                  }
                  if (p.opacity !== undefined) props.push(`opacity: ${p.opacity}`);
                  if (p.width !== undefined) props.push(`width: ${p.width}px`);
                  if (p.height !== undefined) props.push(`height: ${p.height}px`);
                  css += `  ${pct}% { ${props.join('; ')} }\n`;
                });
                css += '}\n';

                // Copy to clipboard
                navigator.clipboard?.writeText(css);
              }}
              className="flex-1 py-1.5 bg-white/5 border border-white/10 text-[10px] text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center gap-1 transition-colors"
              title="Copiar CSS @keyframes"
            >
              <Download size={10} /> CSS
            </button>
          </div>
        </>
      )}
    </div>
  );
};
