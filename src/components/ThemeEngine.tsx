import { useEffect } from 'react';
import { useThemeStore, AdvancedTheme } from '@/stores/themeStore';

const cssVarSafeName = (key: string) => key.replace(/_/g, '-');

export const ThemeEngine = () => {
  const { activeTheme, draftTheme } = useThemeStore();
  
  // Decide what to render.
  // If we are in the "Theme Builder" view, we might want to prioritize draftTheme.
  // For the entire app, we typically prioritize activeTheme, but if the user is an admin tweaking the draft,
  // we might apply the draft globally to preview it.
  // For now, let's assume we inject draftTheme if it exists (so the admin sees it while testing).
  // Ideally, draftTheme is only injected inside the Theme Builder component iframe, but the prompt asked for "alterações refletidas no preview em tempo real".
  const themeToInject: AdvancedTheme | null = draftTheme || activeTheme;

  useEffect(() => {
    if (!themeToInject) return;
    
    // Build root CSS variables
    let cssString = ':root {\n';
    
    // Inject Colors
    Object.entries(themeToInject.colors).forEach(([key, val]) => {
      let finalVal = val;
      
      // Fallback logic for secondary/accent if features are disabled
      if (key === 'secondary' && !themeToInject.features?.secondary_color) {
        finalVal = themeToInject.colors.primary;
      }
      if (key === 'accent' && !themeToInject.features?.accent_color) {
        finalVal = themeToInject.colors.primary;
      }

      if (finalVal) cssString += `  --${cssVarSafeName(key)}-color: ${finalVal};\n`;
    });
    
    // Inject Typography
    Object.entries(themeToInject.typography).forEach(([key, val]) => {
      if (val) {
        if (key === 'font_family') {
          cssString += `  --font-family-base: ${val};\n`;
        } else if (key.match(/^h[1-6]$/)) {
          cssString += `  --font-size-${key}: ${val};\n`;
        } else {
          cssString += `  --font-${cssVarSafeName(key)}: ${val};\n`;
        }
      }
    });
    
    // Inject Buttons
    Object.entries(themeToInject.buttons).forEach(([key, val]) => {
      if (val) cssString += `  --btn-${cssVarSafeName(key)}: ${val};\n`;
    });
    
    // Inject Shadows
    if (themeToInject.features?.shadows !== false) {
      Object.entries(themeToInject.shadows).forEach(([key, val]) => {
        if (val) cssString += `  --shadow-${cssVarSafeName(key)}: ${val};\n`;
      });
    } else {
      cssString += `  --shadow-depth: 0px;\n`;
      cssString += `  --shadow-blur: 0px;\n`;
    }

    // Inject Effects
    if (themeToInject.features?.glass_effect !== false) {
      Object.entries(themeToInject.effects).forEach(([key, val]) => {
        if (val) cssString += `  --effect-${cssVarSafeName(key)}: ${val};\n`;
      });
    } else {
      cssString += `  --effect-glass-blur-px: 0px;\n`;
      cssString += `  --effect-glass-opacity: 1;\n`;
    }

    // Inject Layout
    Object.entries(themeToInject.layout).forEach(([key, val]) => {
      if (val) cssString += `  --layout-${cssVarSafeName(key)}: ${val};\n`;
    });

    cssString += '}\n';

    // Inject Dynamic Styles into DOM
    let styleEl = document.getElementById('dynamic-theme-vars');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-theme-vars';
      document.head.appendChild(styleEl);
    }
    
    styleEl.innerHTML = cssString;

  }, [themeToInject]);

  // Load themes on mount
  useEffect(() => {
    useThemeStore.getState().fetchThemes();
  }, []);

  return null; // Silent component
};
