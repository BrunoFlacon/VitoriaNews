// Shared color palette and gradient utilities
// Adapted from lidojs/canva-clone shared/theme/palette.ts

export const rgba = (hex: string, alpha: number) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Google Fonts commonly used for covers
export const STUDIO_FONTS = [
  'Inter',
  'Montserrat',
  'Oswald',
  'Bebas Neue',
  'Playfair Display',
  'Roboto',
  'Impact',
  'Poppins',
  'Raleway',
  'Lato',
  'Open Sans',
  'Nunito',
  'Source Sans Pro',
  'Ubuntu',
  'Fira Sans',
  'Merriweather',
  'Crimson Text',
  'Barlow',
  'DM Sans',
  'Space Grotesk',
] as const;

export type StudioFont = (typeof STUDIO_FONTS)[number];

// Google Fonts CSS URL generator
export const getGoogleFontsUrl = (fonts: readonly string[]): string => {
  const families = fonts
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
};
