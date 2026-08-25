/**
 * Symbols / Components System
 * 
 * Allows users to:
 * 1. Save a group of layers as a reusable "Symbol"
 * 2. Place instances of symbols on the canvas
 * 3. Edit the symbol definition and all instances update
 * 4. Save/load symbols from Supabase
 */

import type { CanvasLayer } from '../CoverCanvasEngine';

export interface SymbolDefinition {
  id: string;
  name: string;
  /** The layers that make up this symbol (relative positions) */
  layers: CanvasLayer[];
  /** Bounding box of the symbol */
  width: number;
  height: number;
  /** Thumbnail as data URL */
  thumbnail?: string;
  /** When the symbol was created */
  createdAt: string;
  /** Tags for organization */
  tags: string[];
}

export interface SymbolInstance {
  /** ID of the symbol definition this instance references */
  symbolId: string;
  /** Unique ID for this instance on the canvas */
  instanceId: string;
  /** Position of the instance on canvas */
  x: number;
  y: number;
  /** Scale factor (1 = original size) */
  scaleX: number;
  scaleY: number;
  /** Rotation in degrees */
  rotation: number;
  /** Opacity override */
  opacity: number;
}

// ── Local Storage Manager ─────────────────────────────────────

const STORAGE_KEY = 'studio-symbols';

export function saveSymbolsToStorage(symbols: SymbolDefinition[]): void {
  try {
    // Don't store thumbnails (too large) — regenerate on load
    const clean = symbols.map((s) => ({ ...s, thumbnail: undefined }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save symbols:', e);
  }
}

export function loadSymbolsFromStorage(): SymbolDefinition[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SymbolDefinition[];
  } catch {
    return [];
  }
}

// ── Symbol Operations ─────────────────────────────────────────

/**
 * Create a symbol from a selection of layers.
 * Normalizes positions so the symbol's origin is (0, 0).
 */
export function createSymbolFromLayers(
  layers: CanvasLayer[],
  name: string,
  tags: string[] = [],
): SymbolDefinition {
  if (layers.length === 0) throw new Error('Cannot create symbol from empty selection');

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  layers.forEach((l) => {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x + l.width);
    maxY = Math.max(maxY, l.y + l.height);
  });

  const width = maxX - minX;
  const height = maxY - minY;

  // Normalize layer positions relative to the bounding box origin
  const normalizedLayers = layers.map((l) => ({
    ...l,
    x: l.x - minX,
    y: l.y - minY,
    // Keep original width, height, rotation, etc.
  }));

  return {
    id: `sym_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    layers: normalizedLayers,
    width,
    height,
    createdAt: new Date().toISOString(),
    tags,
  };
}

/**
 * Expand a symbol instance into actual canvas layers.
 * Returns new layer objects positioned on the canvas.
 */
export function expandSymbolInstance(
  symbol: SymbolDefinition,
  instance: SymbolInstance,
): CanvasLayer[] {
  return symbol.layers.map((layer, i) => ({
    ...layer,
    id: `${instance.instanceId}_${i}`,
    name: `${symbol.name}/${layer.name}`,
    x: layer.x * instance.scaleX + instance.x,
    y: layer.y * instance.scaleY + instance.y,
    width: layer.width * instance.scaleX,
    height: layer.height * instance.scaleY,
    rotation: (layer.rotation || 0) + instance.rotation,
    opacity: (layer.opacity ?? 1) * instance.opacity,
  }));
}

/**
 * Generate a thumbnail for a symbol definition.
 */
export function generateSymbolThumbnail(
  symbol: SymbolDefinition,
  maxWidth = 120,
  maxHeight = 80,
): string {
  const canvas = document.createElement('canvas');
  const scale = Math.min(maxWidth / symbol.width, maxHeight / symbol.height);
  canvas.width = Math.round(symbol.width * scale);
  canvas.height = Math.round(symbol.height * scale);
  const ctx = canvas.getContext('2d')!;

  // Draw a simplified preview
  ctx.scale(scale, scale);
  symbol.layers.forEach((layer) => {
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;

    if (layer.type === 'text') {
      ctx.fillStyle = layer.color || '#FFFFFF';
      ctx.font = `bold ${Math.min(layer.fontSize || 16, 16)}px ${layer.fontFamily || 'Inter, sans-serif'}`;
      ctx.textBaseline = 'top';
      ctx.fillText(layer.content || '', layer.x, layer.y, layer.width);
    } else if (layer.type === 'shape') {
      ctx.fillStyle = layer.color || '#3B82F6';
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
    } else if (layer.type === 'badge') {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.roundRect(layer.x, layer.y, layer.width, layer.height, 6);
      ctx.fill();
    } else {
      // Generic rect for images
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
    }

    ctx.restore();
  });

  return canvas.toDataURL('image/png');
}

// ── Built-in Symbol Templates ─────────────────────────────────

export const BUILTIN_SYMBOLS: SymbolDefinition[] = [
  {
    id: 'sym_header_v1',
    name: 'Cabeçalho Padrão',
    layers: [
      {
        id: '_bg', name: 'Fundo', type: 'shape', x: 0, y: 0, width: 600, height: 80,
        rotation: 0, opacity: 0.9, visible: true, locked: false, content: '',
        shapeType: 'rectangle', color: '#1E293B',
      },
      {
        id: '_title', name: 'Título', type: 'text', x: 20, y: 15, width: 560, height: 50,
        rotation: 0, opacity: 1, visible: true, locked: false, content: 'TÍTULO',
        fontSize: 36, fontFamily: "'Bebas Neue', sans-serif", fontWeight: 'bold',
        color: '#FFFFFF', textAlign: 'left',
      },
    ],
    width: 600,
    height: 80,
    createdAt: '2026-01-01T00:00:00Z',
    tags: ['cabeçalho', 'título'],
  },
  {
    id: 'sym_footer_v1',
    name: 'Rodapé Social',
    layers: [
      {
        id: '_bg', name: 'Fundo', type: 'shape', x: 0, y: 0, width: 600, height: 60,
        rotation: 0, opacity: 0.8, visible: true, locked: false, content: '',
        shapeType: 'rectangle', color: '#0F172A',
      },
      {
        id: '_social', name: 'Redes', type: 'text', x: 20, y: 18, width: 560, height: 24,
        rotation: 0, opacity: 0.7, visible: true, locked: false, content: '@seuperfil  •  Link na bio',
        fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 'normal',
        color: '#94A3B8', textAlign: 'center',
      },
    ],
    width: 600,
    height: 60,
    createdAt: '2026-01-01T00:00:00Z',
    tags: ['rodapé', 'redes sociais'],
  },
  {
    id: 'sym_cta_v1',
    name: 'Call-to-Action Badge',
    layers: [
      {
        id: '_bg', name: 'Fundo', type: 'shape', x: 0, y: 0, width: 240, height: 50,
        rotation: 0, opacity: 1, visible: true, locked: false, content: '',
        shapeType: 'rectangle', color: '#EF4444',
      },
      {
        id: '_text', name: 'Texto', type: 'text', x: 20, y: 10, width: 200, height: 30,
        rotation: 0, opacity: 1, visible: true, locked: false, content: 'ASSISTA AGORA',
        fontSize: 18, fontFamily: "'Inter', sans-serif", fontWeight: 'bold',
        color: '#FFFFFF', textAlign: 'center',
      },
    ],
    width: 240,
    height: 50,
    createdAt: '2026-01-01T00:00:00Z',
    tags: ['cta', 'botão', 'ação'],
  },
];
