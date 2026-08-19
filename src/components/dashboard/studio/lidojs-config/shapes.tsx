// Shape definitions adapted from lidojs/canva-clone
// Types use string identifiers instead of @lidojs/design-core for independence

export type ShapeType =
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'triangleUpsideDown'
  | 'rhombus'
  | 'arrowRight'
  | 'arrowLeft'
  | 'arrowTop'
  | 'arrowBottom'
  | 'arrowPentagon'
  | 'chevron'
  | 'cross'
  | 'parallelogram'
  | 'parallelogramUpsideDown'
  | 'trapezoid'
  | 'trapezoidUpsideDown'
  | 'pentagon'
  | 'hexagonVertical'
  | 'hexagonHorizontal'
  | 'octagon';

export interface ShapeDefinition {
  type: ShapeType;
  width: number;
  height: number;
  label: string;
  svgPath: string; // SVG path for the shape icon
}

// SVG paths for each shape (simplified for UI display)
export const SHAPE_DEFINITIONS: ShapeDefinition[] = [
  { type: 'rectangle', width: 64, height: 64, label: 'Retangulo', svgPath: 'M2,2 L62,2 L62,62 L2,62 Z' },
  { type: 'circle', width: 64, height: 64, label: 'Circulo', svgPath: 'M32,2 A30,30 0 1,1 31.99,2 Z' },
  { type: 'triangle', width: 64, height: 56, label: 'Triangulo', svgPath: 'M32,2 L62,54 L2,54 Z' },
  { type: 'triangleUpsideDown', width: 64, height: 56, label: 'Triangulo Invertido', svgPath: 'M2,2 L62,2 L32,54 Z' },
  { type: 'rhombus', width: 64, height: 64, label: 'Losango', svgPath: 'M32,2 L62,32 L32,62 L2,32 Z' },
  { type: 'arrowRight', width: 64, height: 64, label: 'Seta Direita', svgPath: 'M2,22 L40,22 L40,2 L62,32 L40,62 L40,42 L2,42 Z' },
  { type: 'arrowLeft', width: 64, height: 64, label: 'Seta Esquerda', svgPath: 'M62,22 L24,22 L24,2 L2,32 L24,62 L24,42 L62,42 Z' },
  { type: 'arrowTop', width: 64, height: 64, label: 'Seta Cima', svgPath: 'M22,62 L22,24 L2,24 L32,2 L62,24 L42,24 L42,62 Z' },
  { type: 'arrowBottom', width: 64, height: 64, label: 'Seta Baixo', svgPath: 'M22,2 L22,40 L2,40 L32,62 L62,40 L42,40 L42,2 Z' },
  { type: 'arrowPentagon', width: 64, height: 32, label: 'Seta Pentagon', svgPath: 'M2,2 L48,2 L62,16 L48,30 L2,30 Z' },
  { type: 'chevron', width: 64, height: 32, label: 'Chevron', svgPath: 'M2,2 L32,16 L2,30 L12,16 Z M52,2 L62,16 L52,30 L42,16 Z' },
  { type: 'cross', width: 64, height: 64, label: 'Cruz', svgPath: 'M22,2 L42,2 L42,22 L62,22 L62,42 L42,42 L42,62 L22,62 L22,42 L2,42 L2,22 L22,22 Z' },
  { type: 'parallelogram', width: 64, height: 48, label: 'Paralelogramo', svgPath: 'M16,2 L62,2 L48,46 L2,46 Z' },
  { type: 'parallelogramUpsideDown', width: 64, height: 48, label: 'Paralelogramo Inv.', svgPath: 'M2,2 L46,2 L62,46 L16,46 Z' },
  { type: 'trapezoid', width: 64, height: 48, label: 'Trapezio', svgPath: 'M16,2 L48,2 L62,46 L2,46 Z' },
  { type: 'trapezoidUpsideDown', width: 64, height: 48, label: 'Trapezio Inv.', svgPath: 'M2,2 L62,2 L48,46 L16,46 Z' },
  { type: 'pentagon', width: 64, height: 64, label: 'Pentagono', svgPath: 'M32,2 L60,24 L50,60 L14,60 L4,24 Z' },
  { type: 'hexagonVertical', width: 55, height: 64, label: 'Hexagono V', svgPath: 'M27,2 L53,16 L53,48 L27,62 L1,48 L1,16 Z' },
  { type: 'hexagonHorizontal', width: 64, height: 55, label: 'Hexagono H', svgPath: 'M32,2 L62,14 L62,40 L32,52 L2,40 L2,14 Z' },
  { type: 'octagon', width: 64, height: 64, label: 'Octogono', svgPath: 'M20,2 L44,2 L62,20 L62,44 L44,62 L20,62 L2,44 L2,20 Z' },
];

// Line/Arrow definitions adapted from lidojs/canva-clone
export type LineStyle = 'solid' | 'shortDashes' | 'dots';
export type ArrowEndpoint = 'none' | 'arrow' | 'bar' | 'triangle' | 'circle' | 'square';

export interface LineDefinition {
  id: string;
  style: LineStyle;
  arrowStart: ArrowEndpoint;
  arrowEnd: ArrowEndpoint;
  label: string;
  dashArray?: string;
}

export const LINE_DEFINITIONS: LineDefinition[] = [
  { id: 'line-solid', style: 'solid', arrowStart: 'none', arrowEnd: 'none', label: 'Linha Solida' },
  { id: 'line-dashes', style: 'shortDashes', arrowStart: 'none', arrowEnd: 'none', label: 'Linha Tracejada', dashArray: '3,1' },
  { id: 'line-dots', style: 'dots', arrowStart: 'none', arrowEnd: 'none', label: 'Linha Pontilhada', dashArray: '1,1' },
  { id: 'line-arrow-end', style: 'solid', arrowStart: 'none', arrowEnd: 'arrow', label: 'Seta Simples' },
  { id: 'line-arrow-both', style: 'solid', arrowStart: 'arrow', arrowEnd: 'arrow', label: 'Seta Dupla' },
  { id: 'line-bar-both', style: 'solid', arrowStart: 'bar', arrowEnd: 'bar', label: 'Barra Dupla' },
  { id: 'line-triangle-both', style: 'solid', arrowStart: 'triangle', arrowEnd: 'triangle', label: 'Triangulo Duplo' },
  { id: 'line-circle-both', style: 'solid', arrowStart: 'circle', arrowEnd: 'circle', label: 'Circulo Duplo' },
  { id: 'line-square-both', style: 'solid', arrowStart: 'square', arrowEnd: 'square', label: 'Quadrado Duplo' },
  { id: 'line-diamond-both', style: 'solid', arrowStart: 'outlineDiamond', arrowEnd: 'outlineDiamond', label: 'Diamante Duplo' },
  { id: 'line-dots-arrow', style: 'dots', arrowStart: 'none', arrowEnd: 'arrow', label: 'Pontilhado + Seta' },
  { id: 'line-dashes-arrow', style: 'shortDashes', arrowStart: 'none', arrowEnd: 'arrow', label: 'Tracejado + Seta' },
];

// Badge definitions for professional covers
export interface BadgeDefinition {
  id: string;
  label: string;
  text: string;
  bgColor: string;
  textColor: string;
  icon: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'badge-live', label: 'AO VIVO', text: 'AO VIVO', bgColor: '#EF4444', textColor: '#FFFFFF', icon: '🔴' },
  { id: 'badge-podcast', label: 'PODCAST', text: 'PODCAST', bgColor: '#8B5CF6', textColor: '#FFFFFF', icon: '🎙️' },
  { id: 'badge-exclusive', label: 'EXCLUSIVO', text: 'EXCLUSIVO', bgColor: '#F59E0B', textColor: '#000000', icon: '⭐' },
  { id: 'badge-news', label: 'NOTICIA', text: 'NOTICIA', bgColor: '#3B82F6', textColor: '#FFFFFF', icon: '📰' },
  { id: 'badge-episode', label: 'EPISODIO', text: 'EPISODIO', bgColor: '#10B981', textColor: '#FFFFFF', icon: '🎬' },
  { id: 'badge-breaking', label: 'ULTIMA HORA', text: 'ULTIMA HORA', bgColor: '#DC2626', textColor: '#FFFFFF', icon: '⚡' },
  { id: 'badge-premiere', label: 'PREMIERE', text: 'PREMIERE', bgColor: '#7C3AED', textColor: '#FFFFFF', icon: '🎬' },
  { id: 'badge-new', label: 'NOVO', text: 'NOVO', bgColor: '#059669', textColor: '#FFFFFF', icon: '✨' },
];

// Background gradient presets
export interface GradientPreset {
  id: string;
  name: string;
  css: string;
  colors: string[];
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'grad-sunset', name: 'Sunset', css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', colors: ['#f093fb', '#f5576c'] },
  { id: 'grad-ocean', name: 'Oceano', css: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', colors: ['#4facfe', '#00f2fe'] },
  { id: 'grad-forest', name: 'Floresta', css: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', colors: ['#43e97b', '#38f9d7'] },
  { id: 'grad-fire', name: 'Fogo', css: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', colors: ['#fa709a', '#fee140'] },
  { id: 'grad-night', name: 'Noite', css: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)', colors: ['#0c3483', '#a2b6df'] },
  { id: 'grad-purple', name: 'Roxo', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', colors: ['#667eea', '#764ba2'] },
  { id: 'grad-warm', name: 'Quente', css: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', colors: ['#f77062', '#fe5196'] },
  { id: 'grad-cool', name: 'Frio', css: 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)', colors: ['#48c6ef', '#6f86d6'] },
  { id: 'grad-dark', name: 'Dark', css: 'linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 50%, #16213e 100%)', colors: ['#0A0A0A', '#1a1a2e', '#16213e'] },
  { id: 'grad-dark2', name: 'Dark Blue', css: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', colors: ['#0f0c29', '#302b63', '#24243e'] },
  { id: 'grad-gold', name: 'Dourado', css: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)', colors: ['#f2994a', '#f2c94c'] },
  { id: 'grad-coral', name: 'Coral', css: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', colors: ['#ff9a9e', '#fecfef'] },
  { id: 'grad-midnight', name: 'Meia-Noite', css: 'linear-gradient(135deg, #232526 0%, #414345 100%)', colors: ['#232526', '#414345'] },
  { id: 'grad-neon', name: 'Neon', css: 'linear-gradient(135deg, #ff00cc 0%, #333399 100%)', colors: ['#ff00cc', '#333399'] },
  { id: 'grad-earth', name: 'Terra', css: 'linear-gradient(135deg, #3e2723 0%, #795548 50%, #a1887f 100%)', colors: ['#3e2723', '#795548', '#a1887f'] },
  { id: 'grad-ice', name: 'Gelo', css: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', colors: ['#e0eafc', '#cfdef3'] },
];

// Solid color presets for backgrounds
export const SOLID_COLOR_PRESETS = [
  '#000000', '#1a1a2e', '#16213e', '#0f3460', '#1F2937',
  '#FFFFFF', '#F8F9FA', '#E9ECEF', '#DEE2E6', '#ADB5BD',
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#A855F7',
  '#0F172A', '#1E293B', '#334155', '#475569', '#64748B',
];
