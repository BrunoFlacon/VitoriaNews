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
    
    const root = document.documentElement;
    
    // Inject Colors
    Object.entries(themeToInject.colors).forEach(([key, val]) => {
      let finalVal = val;
      if (key === 'secondary' && !themeToInject.features?.secondary_color) {
        finalVal = themeToInject.colors.primary;
      }
      if (key === 'accent' && !themeToInject.features?.accent_color) {
        finalVal = themeToInject.colors.primary;
      }
      if (finalVal) root.style.setProperty(`--${cssVarSafeName(key)}-color`, finalVal);
    });
    
    // Inject Typography
    Object.entries(themeToInject.typography).forEach(([key, val]) => {
      if (val) {
        if (key === 'font_family') {
          root.style.setProperty('--font-family-base', val);
        } else if (key.match(/^h[1-6]$/)) {
          root.style.setProperty(`--font-size-${key}`, val);
        } else {
          root.style.setProperty(`--font-${cssVarSafeName(key)}`, val);
        }
      }
    });
    
    // Inject Buttons
    Object.entries(themeToInject.buttons).forEach(([key, val]) => {
      if (val) root.style.setProperty(`--btn-${cssVarSafeName(key)}`, val);
    });
    
    // Inject Shadows
    if (themeToInject.features?.shadows !== false) {
      Object.entries(themeToInject.shadows).forEach(([key, val]) => {
        if (val) root.style.setProperty(`--shadow-${cssVarSafeName(key)}`, val);
      });
    } else {
      root.style.setProperty('--shadow-depth', '0px');
      root.style.setProperty('--shadow-blur', '0px');
    }

    // Inject Effects
    if (themeToInject.features?.glass_effect !== false) {
      Object.entries(themeToInject.effects).forEach(([key, val]) => {
        if (val) root.style.setProperty(`--effect-${cssVarSafeName(key)}`, val);
      });
    } else {
      root.style.setProperty('--effect-glass-blur-px', '0px');
      root.style.setProperty('--effect-glass-opacity', '1');
    }

    // Inject Layout
    Object.entries(themeToInject.layout).forEach(([key, val]) => {
      if (val) root.style.setProperty(`--layout-${cssVarSafeName(key)}`, val);
    });
  }, [themeToInject]);

  // Load themes on mount, deferred to avoid blocking paint
  useEffect(() => {
    const id = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(() => useThemeStore.getState().fetchThemes(), { timeout: 3000 })
      : setTimeout(() => useThemeStore.getState().fetchThemes(), 1500);
    return () => {
      if (typeof id === 'number') clearTimeout(id);
      else if (id) cancelIdleCallback(id);
    };
  }, []);

  return null; // Silent component
};
