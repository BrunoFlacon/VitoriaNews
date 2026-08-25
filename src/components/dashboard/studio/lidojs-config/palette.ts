// Shared color palette, gradient utilities, and font library
// Adapted from lidojs/canva-clone shared/theme/palette.ts

export const rgba = (hex: string, alpha: number) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ── Font System ─────────────────────────────────────────────────────
export interface FontEntry {
  name: string;
  family: string;
  category: 'display' | 'serif' | 'sans-serif' | 'mono' | 'handwriting';
  tags: string[];
  weights: number[];
}

export const STUDIO_FONTS: FontEntry[] = [
  // ═══ DISPLAY / HEADLINE (newspaper/magazine covers) ═══
  { name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", category: 'display', tags: ['headline', 'condensed', 'magazine', 'poster'], weights: [400] },
  { name: 'Oswald', family: "'Oswald', sans-serif", category: 'display', tags: ['headline', 'condensed', 'news', 'modern'], weights: [300, 400, 500, 600, 700] },
  { name: 'Anton', family: "'Anton', sans-serif", category: 'display', tags: ['headline', 'bold', 'impact', 'poster'], weights: [400] },
  { name: 'Abril Fatface', family: "'Abril Fatface', serif", category: 'display', tags: ['headline', 'editorial', 'magazine', 'elegant'], weights: [400] },
  { name: 'Playfair Display', family: "'Playfair Display', serif", category: 'display', tags: ['headline', 'editorial', 'magazine', 'elegant', 'serif'], weights: [400, 500, 600, 700, 800, 900] },
  { name: 'Righteous', family: "'Righteous', cursive", category: 'display', tags: ['headline', 'retro', 'fun', 'poster'], weights: [400] },
  { name: 'Archivo Black', family: "'Archivo Black', sans-serif", category: 'display', tags: ['headline', 'bold', 'impact', 'newspaper'], weights: [400] },
  { name: 'Passion One', family: "'Passion One', sans-serif", category: 'display', tags: ['headline', 'bold', 'condensed', 'sports'], weights: [400, 700, 900] },
  { name: 'Teko', family: "'Teko', sans-serif", category: 'display', tags: ['headline', 'condensed', 'modern', 'sports'], weights: [300, 400, 500, 600, 700] },
  { name: 'Fjalla One', family: "'Fjalla One', sans-serif", category: 'display', tags: ['headline', 'condensed', 'news', 'editorial'], weights: [400] },
  { name: 'Barlow Condensed', family: "'Barlow Condensed', sans-serif", category: 'display', tags: ['headline', 'condensed', 'modern', 'clean'], weights: [100, 200, 300, 400, 500, 600, 700] },
  { name: 'Bungee', family: "'Bungee', sans-serif", category: 'display', tags: ['headline', 'bold', 'fun', 'retro', 'poster'], weights: [400] },
  { name: 'Alfa Slab One', family: "'Alfa Slab One', serif", category: 'display', tags: ['headline', 'bold', 'slab', 'newspaper', 'poster'], weights: [400] },
  { name: 'Black Ops One', family: "'Black Ops One', sans-serif", category: 'display', tags: ['headline', 'bold', 'military', 'impact'], weights: [400] },
  { name: 'Russo One', family: "'Russo One', sans-serif", category: 'display', tags: ['headline', 'bold', 'tech', 'gaming'], weights: [400] },
  { name: 'Ultra', family: "'Ultra', serif", category: 'display', tags: ['headline', 'bold', 'serif', 'classic'], weights: [400] },
  { name: 'Staatliches', family: "'Staatliches', sans-serif", category: 'display', tags: ['headline', 'condensed', 'poster', 'event'], weights: [400] },
  { name: 'Permanent Marker', family: "'Permanent Marker', cursive", category: 'handwriting', tags: ['headline', 'handwritten', 'marker', 'casual'], weights: [400] },
  { name: 'Press Start 2P', family: "'Press Start 2P', cursive", category: 'display', tags: ['headline', 'pixel', 'retro', 'gaming'], weights: [400] },

  // ═══ SERIF (editorial, magazines) ═══
  { name: 'Merriweather', family: "'Merriweather', serif", category: 'serif', tags: ['editorial', 'body', 'readable', 'classic'], weights: [300, 400, 700, 900] },
  { name: 'Lora', family: "'Lora', serif", category: 'serif', tags: ['editorial', 'body', 'elegant', 'classic'], weights: [400, 500, 600, 700] },
  { name: 'Crimson Text', family: "'Crimson Text', serif", category: 'serif', tags: ['editorial', 'body', 'classic', 'book'], weights: [400, 600, 700] },
  { name: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'serif', tags: ['editorial', 'elegant', 'fashion', 'luxury'], weights: [300, 400, 500, 600, 700] },
  { name: 'EB Garamond', family: "'EB Garamond', serif", category: 'serif', tags: ['editorial', 'classic', 'book', 'elegant'], weights: [400, 500, 600, 700, 800] },
  { name: 'Libre Baskerville', family: "'Libre Baskerville', serif", category: 'serif', tags: ['editorial', 'classic', 'newspaper', 'body'], weights: [400, 700] },
  { name: 'Bitter', family: "'Bitter', serif", category: 'serif', tags: ['editorial', 'body', 'modern', 'readable'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'DM Serif Display', family: "'DM Serif Display', serif", category: 'serif', tags: ['headline', 'editorial', 'magazine', 'elegant'], weights: [400] },
  { name: 'DM Serif Text', family: "'DM Serif Text', serif", category: 'serif', tags: ['editorial', 'body', 'magazine'], weights: [400] },
  { name: 'Noto Serif', family: "'Noto Serif', serif", category: 'serif', tags: ['editorial', 'body', 'multilingual', 'universal'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Cardo', family: "'Cardo', serif", category: 'serif', tags: ['editorial', 'classic', 'book'], weights: [400, 700] },
  { name: 'Spectral', family: "'Spectral', serif", category: 'serif', tags: ['editorial', 'body', 'modern'], weights: [200, 300, 400, 500, 600, 700, 800] },

  // ═══ SANS-SERIF (versatile, modern) ═══
  { name: 'Inter', family: "'Inter', sans-serif", category: 'sans-serif', tags: ['ui', 'body', 'modern', 'clean', 'versatile'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'sans-serif', tags: ['headline', 'body', 'modern', 'versatile'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Poppins', family: "'Poppins', sans-serif", category: 'sans-serif', tags: ['body', 'modern', 'friendly', 'clean'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Raleway', family: "'Raleway', sans-serif", category: 'sans-serif', tags: ['headline', 'elegant', 'fashion', 'clean'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Lato', family: "'Lato', sans-serif", category: 'sans-serif', tags: ['body', 'clean', 'professional', 'readable'], weights: [100, 300, 400, 700, 900] },
  { name: 'Open Sans', family: "'Open Sans', sans-serif", category: 'sans-serif', tags: ['body', 'clean', 'readable', 'google'], weights: [300, 400, 500, 600, 700, 800] },
  { name: 'Nunito', family: "'Nunito', sans-serif", category: 'sans-serif', tags: ['body', 'rounded', 'friendly', 'modern'], weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Source Sans Pro', family: "'Source Sans Pro', sans-serif", category: 'sans-serif', tags: ['body', 'clean', 'professional', 'adobe'], weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Ubuntu', family: "'Ubuntu', sans-serif", category: 'sans-serif', tags: ['body', 'modern', 'tech', 'friendly'], weights: [300, 400, 500, 700] },
  { name: 'Fira Sans', family: "'Fira Sans', sans-serif", category: 'sans-serif', tags: ['body', 'tech', 'modern', 'mozilla'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Barlow', family: "'Barlow', sans-serif", category: 'sans-serif', tags: ['body', 'modern', 'clean', 'versatile'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'DM Sans', family: "'DM Sans', sans-serif", category: 'sans-serif', tags: ['body', 'modern', 'clean', 'geometric'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", category: 'sans-serif', tags: ['body', 'modern', 'tech', 'geometric'], weights: [300, 400, 500, 600, 700] },
  { name: 'Manrope', family: "'Manrope', sans-serif", category: 'sans-serif', tags: ['body', 'modern', 'clean', 'geometric'], weights: [200, 300, 400, 500, 600, 700, 800] },
  { name: 'Work Sans', family: "'Work Sans', sans-serif", category: 'sans-serif', tags: ['body', 'modern', 'clean', 'optimized'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Outfit', family: "'Outfit', sans-serif", category: 'sans-serif', tags: ['body', 'modern', 'clean', 'geometric'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Lexend', family: "'Lexend', sans-serif", category: 'sans-serif', tags: ['body', 'readable', 'accessible', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'sans-serif', tags: ['body', 'modern', 'clean', 'indonesian'], weights: [200, 300, 400, 500, 600, 700, 800] },

  // ═══ MONO ═══
  { name: 'Source Code Pro', family: "'Source Code Pro', monospace", category: 'mono', tags: ['code', 'monospace', 'technical'], weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", category: 'mono', tags: ['code', 'monospace', 'technical', 'programming'], weights: [100, 200, 300, 400, 500, 600, 700, 800] },
  { name: 'Fira Code', family: "'Fira Code', monospace", category: 'mono', tags: ['code', 'monospace', 'ligatures'], weights: [300, 400, 500, 600, 700] },

  // ═══ HANDWRITING ═══
  { name: 'Dancing Script', family: "'Dancing Script', cursive", category: 'handwriting', tags: ['script', 'elegant', 'wedding', 'festive'], weights: [400, 500, 600, 700] },
  { name: 'Pacifico', family: "'Pacifico', cursive", category: 'handwriting', tags: ['script', 'retro', 'surf', 'casual'], weights: [400] },
  { name: 'Caveat', family: "'Caveat', cursive", category: 'handwriting', tags: ['handwritten', 'casual', 'notes', 'natural'], weights: [400, 500, 600, 700] },
  { name: 'Satisfy', family: "'Satisfy', cursive", category: 'handwriting', tags: ['script', 'elegant', 'classic', 'retro'], weights: [400] },
] as const;

export type StudioFont = (typeof STUDIO_FONTS)[number]['name'];

// Font category labels
export const FONT_CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'display', label: 'Títulos' },
  { id: 'serif', label: 'Serifadas' },
  { id: 'sans-serif', label: 'Sans-Serif' },
  { id: 'mono', label: 'Monoespaço' },
  { id: 'handwriting', label: 'Manuscrita' },
] as const;

// Google Fonts CSS URL generator — batches requests to stay under URL limits
export const getGoogleFontsUrl = (fonts: readonly string[]): string => {
  const families = fonts
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
};

// Load fonts dynamically via <link> tags (batches of 10)
const loadedLinks = new Set<string>();

export function loadFontBatch(fontNames: string[]) {
  const toLoad = fontNames.filter((f) => !loadedLinks.has(f));
  if (toLoad.length === 0) return;

  // Batch into groups of 10
  const batches: string[][] = [];
  for (let i = 0; i < toLoad.length; i += 10) {
    batches.push(toLoad.slice(i, i + 10));
  }

  batches.forEach((batch) => {
    const url = getGoogleFontsUrl(batch);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    batch.forEach((f) => loadedLinks.add(f));
  });
}

// Load all fonts on startup (lazy)
let allLoaded = false;
export function loadAllStudioFonts() {
  if (allLoaded) return;
  allLoaded = true;
  const names = STUDIO_FONTS.map((f) => f.name);
  loadFontBatch(names);
}
