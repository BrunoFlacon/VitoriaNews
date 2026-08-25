/**
 * Keyframe Animation Engine
 * 
 * Provides keyframe-based animation for canvas layers:
 * - Position (x, y)
 * - Size (width, height)  
 * - Rotation
 * - Opacity
 * - Scale (uniform)
 * 
 * Animation can be exported as:
 * - CSS @keyframes animation
 * - GIF (via canvas frame capture)
 * - APNG (via canvas frame capture)
 * - Sequence of PNGs
 */

import type { CanvasLayer } from '../CoverCanvasEngine';

export interface Keyframe {
  /** Time in milliseconds from animation start */
  time: number;
  /** Layer properties at this keyframe */
  properties: Partial<Pick<CanvasLayer, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity'>>;
  /** Easing function */
  easing: EasingFunction;
}

export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic'
  | 'spring';

export interface LayerAnimation {
  layerId: string;
  keyframes: Keyframe[];
  /** Total duration in ms (derived from last keyframe time) */
  duration: number;
  /** Whether to loop */
  loop: boolean;
}

export interface AnimationProject {
  animations: LayerAnimation[];
  /** Total duration in ms */
  totalDuration: number;
  /** Frames per second for export */
  fps: number;
}

// ── Easing Functions ──────────────────────────────────────────

const easings: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': (t) => t * t * t,
  'ease-out': (t) => 1 - Math.pow(1 - t, 3),
  'ease-in-out': (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
  },
  spring: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ── Interpolation ─────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateProperties(
  from: Partial<CanvasLayer>,
  to: Partial<CanvasLayer>,
  t: number,
): Partial<CanvasLayer> {
  const result: Partial<CanvasLayer> = {};
  const numericProps: (keyof typeof from)[] = ['x', 'y', 'width', 'height', 'rotation', 'opacity'];

  for (const prop of numericProps) {
    const a = from[prop] as number | undefined;
    const b = to[prop] as number | undefined;
    if (a !== undefined && b !== undefined) {
      (result as any)[prop] = lerp(a, b, t);
    }
  }

  return result;
}

/**
 * Compute the layer properties at a given time by interpolating between keyframes.
 */
export function computeFrame(
  keyframes: Keyframe[],
  timeMs: number,
): Partial<CanvasLayer> {
  if (keyframes.length === 0) return {};
  if (keyframes.length === 1) return keyframes[0].properties;

  // Sort by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Before first keyframe: return first keyframe properties
  if (timeMs <= sorted[0].time) return sorted[0].properties;

  // After last keyframe: return last keyframe properties
  if (timeMs >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].properties;

  // Find surrounding keyframes
  let before = sorted[0];
  let after = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (timeMs >= sorted[i].time && timeMs <= sorted[i + 1].time) {
      before = sorted[i];
      after = sorted[i + 1];
      break;
    }
  }

  // Compute normalized time [0, 1] between the two keyframes
  const duration = after.time - before.time;
  const rawT = duration > 0 ? (timeMs - before.time) / duration : 0;

  // Apply easing
  const easingFn = easings[after.easing] || easings.linear;
  const easedT = easingFn(Math.max(0, Math.min(1, rawT)));

  return interpolateProperties(before.properties, after.properties, easedT);
}

// ── Preview Rendering ─────────────────────────────────────────

/**
 * Render a single animation frame onto a canvas.
 * Applies animated properties on top of the base layer state.
 */
export function renderAnimationFrame(
  ctx: CanvasRenderingContext2D,
  layer: CanvasLayer,
  animatedProps: Partial<CanvasLayer>,
): void {
  const merged = { ...layer, ...animatedProps };
  // The caller (CoverCanvasEngine) should use these merged properties
  // for rendering. This function just provides the interpolated values.
}

// ── Export: CSS Keyframes ─────────────────────────────────────

/**
 * Export animation as CSS @keyframes string.
 */
export function exportAsCssKeyframes(
  animation: LayerAnimation,
  layerName: string,
): string {
  const sorted = [...animation.keyframes].sort((a, b) => a.time - a.time);
  if (sorted.length < 2) return '';

  const durationMs = animation.duration || sorted[sorted.length - 1].time;
  const animName = `anim-${layerName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

  let css = `@keyframes ${animName} {\n`;
  sorted.forEach((kf) => {
    const percent = Math.round((kf.time / durationMs) * 100);
    const props = kf.properties;
    const parts: string[] = [];
    if (props.x !== undefined || props.y !== undefined) {
      parts.push(`transform: translate(${props.x ?? 0}px, ${props.y ?? 0}px) rotate(${props.rotation ?? 0}deg)`);
    }
    if (props.opacity !== undefined) {
      parts.push(`opacity: ${props.opacity}`);
    }
    css += `  ${percent}% { ${parts.join('; ')} }\n`;
  });
  css += `}\n`;
  css += `.layer-${layerName} { animation: ${animName} ${durationMs}ms ${animation.loop ? 'infinite' : 'forwards'}; }\n`;

  return css;
}

// ── Export: Frame Capture for GIF/APNG ────────────────────────

/**
 * Generate animation frames as ImageData[] for GIF/APNG export.
 * Returns an array of canvas image data at each frame.
 */
export function generateFrames(
  drawFrame: (timeMs: number) => HTMLCanvasElement,
  durationMs: number,
  fps: number,
): string[] {
  const frameInterval = 1000 / fps;
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  const dataUrls: string[] = [];

  for (let i = 0; i <= totalFrames; i++) {
    const timeMs = i * frameInterval;
    if (timeMs > durationMs) break;
    const canvas = drawFrame(timeMs);
    dataUrls.push(canvas.toDataURL('image/png'));
  }

  return dataUrls;
}

// ── Keyframe Helpers ──────────────────────────────────────────

export function createKeyframe(
  time: number,
  properties: Partial<CanvasLayer>,
  easing: EasingFunction = 'ease-in-out',
): Keyframe {
  return { time, properties, easing };
}

export function addKeyframe(
  animation: LayerAnimation,
  keyframe: Keyframe,
): LayerAnimation {
  const keyframes = [...animation.keyframes, keyframe]
    .sort((a, b) => a.time - b.time);
  return {
    ...animation,
    keyframes,
    duration: Math.max(animation.duration, keyframe.time),
  };
}

export function removeKeyframe(
  animation: LayerAnimation,
  index: number,
): LayerAnimation {
  const keyframes = animation.keyframes.filter((_, i) => i !== index);
  return {
    ...animation,
    keyframes,
    duration: keyframes.length > 0
      ? Math.max(...keyframes.map((k) => k.time))
      : animation.duration,
  };
}

/** Preset animations */
export const ANIMATION_PRESETS: { name: string; keyframes: Keyframe[] }[] = [
  {
    name: 'Fade In',
    keyframes: [
      createKeyframe(0, { opacity: 0 }),
      createKeyframe(500, { opacity: 1 }, 'ease-out'),
    ],
  },
  {
    name: 'Fade In + Slide Up',
    keyframes: [
      createKeyframe(0, { opacity: 0, y: 50 }),
      createKeyframe(600, { opacity: 1, y: 0 }, 'ease-out'),
    ],
  },
  {
    name: 'Pop',
    keyframes: [
      createKeyframe(0, { opacity: 0, width: 0, height: 0 }),
      createKeyframe(400, { opacity: 1, width: 100, height: 100 }, 'bounce'),
    ],
  },
  {
    name: 'Spin In',
    keyframes: [
      createKeyframe(0, { opacity: 0, rotation: -180 }),
      createKeyframe(800, { opacity: 1, rotation: 0 }, 'ease-out'),
    ],
  },
  {
    name: 'Pulse',
    keyframes: [
      createKeyframe(0, { opacity: 1 }),
      createKeyframe(500, { opacity: 0.5 }),
      createKeyframe(1000, { opacity: 1 }),
    ],
  },
  {
    name: 'Shake',
    keyframes: [
      createKeyframe(0, { x: 0 }),
      createKeyframe(100, { x: -10 }),
      createKeyframe(200, { x: 10 }),
      createKeyframe(300, { x: -5 }),
      createKeyframe(400, { x: 5 }),
      createKeyframe(500, { x: 0 }),
    ],
  },
];
