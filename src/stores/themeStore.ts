import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface ThemeColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  border?: string;
  text_primary?: string;
  text_secondary?: string;
}

export interface ThemeTypography {
  font_family?: string;
  h1?: string;
  h2?: string;
  body?: string;
  line_height?: string;
}

export interface ThemeButtons {
  radius?: string;
  padding_y?: string;
  padding_x?: string;
  hover_transition_ms?: string;
}

export interface ThemeShadows {
  depth?: string;
  spread?: string;
  blur?: string;
}

export interface ThemeEffects {
  glass_blur_px?: string;
  glass_opacity?: string;
}

export interface ThemeLayout {
  max_width?: string;
  gap?: string;
  global_spacing?: string;
}

export interface ThemeFeatures {
  secondary_color?: boolean;
  accent_color?: boolean;
  shadows?: boolean;
  glass_effect?: boolean;
}

export interface AdvancedTheme {
  id?: string;
  name: string;
  target?: 'dashboard' | 'portal';
  is_active: boolean;
  is_draft: boolean;
  colors: ThemeColors;
  typography: ThemeTypography;
  buttons: ThemeButtons;
  shadows: ThemeShadows;
  effects: ThemeEffects;
  layout: ThemeLayout;
  features?: ThemeFeatures;
}

interface ThemeStore {
  activeTheme: AdvancedTheme | null;
  draftTheme: AdvancedTheme | null;
  presets: AdvancedTheme[];
  isLoading: boolean;
  currentTarget: 'dashboard' | 'portal';
  setTarget: (target: 'dashboard' | 'portal') => void;
  fetchThemes: (target?: 'dashboard' | 'portal') => Promise<void>;
  updateDraft: (section: keyof Omit<AdvancedTheme, 'id' | 'name' | 'is_active' | 'is_draft' | 'presets' | 'target'>, newValues: any) => void;
  saveDraft: () => Promise<void>;
  applyDraftToActive: () => Promise<void>;
  createDefaultPreset: () => AdvancedTheme;
  loadPreset: (preset: AdvancedTheme) => void;
}

export const THEME_PRESETS: AdvancedTheme[] = [
  {
    name: "Padrão do Sistema",
    target: "dashboard",
    is_active: true,
    is_draft: false,
    colors: {
      primary: "#ff4c30",
      background: "#0f172a",
      surface: "#1e293b",
      border: "#334155",
      text_primary: "#ffffff",
      text_secondary: "#94a3b8"
    },
    typography: { font_family: "Inter", h1: "2.5rem", body: "1rem" },
    buttons: { radius: "8px", padding_y: "12px", padding_x: "24px" },
    shadows: {},
    effects: {},
    layout: { max_width: "1280px" },
    features: { secondary_color: false, accent_color: false, shadows: true, glass_effect: true }
  },
  {
    name: "Midnight Ocean",
    target: "dashboard",
    is_active: false,
    is_draft: false,
    colors: {
      primary: "#3b82f6",
      background: "#020617",
      surface: "#0f172a",
      border: "#1e293b",
      text_primary: "#f8fafc",
      text_secondary: "#94a3b8"
    },
    typography: { font_family: "Outfit", h1: "3rem", body: "1.05rem" },
    buttons: { radius: "12px", padding_y: "14px", padding_x: "28px" },
    shadows: { depth: "10px", blur: "20px" },
    effects: { glass_blur_px: "20px", glass_opacity: "0.4" },
    layout: { max_width: "1400px" },
    features: { secondary_color: true, accent_color: true, shadows: true, glass_effect: true }
  }
];

export const createDefaultPreset = (target: 'dashboard' | 'portal' = 'dashboard'): AdvancedTheme => {
  return {
    ...THEME_PRESETS[0],
    target
  };
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  activeTheme: null,
  draftTheme: null,
  presets: THEME_PRESETS,
  isLoading: true,
  currentTarget: 'dashboard',

  setTarget: (target) => {
    set({ currentTarget: target });
    get().fetchThemes(target);
  },

  fetchThemes: async (target) => {
    const finalTarget = target || get().currentTarget;
    set({ isLoading: true });
    
    try {
      const { data, error } = await supabase
        .from('advanced_themes' as any)
        .select('*') as unknown as { data: AdvancedTheme[] | null, error: any };
        
      if (error) throw error;
      
      const active = data?.find((t: AdvancedTheme) => t.is_active && !t.is_draft) || createDefaultPreset(finalTarget);
      const draftItem = data?.find((t: AdvancedTheme) => t.is_draft);
      const draft = draftItem || { ...active, name: 'Rascunho atual', is_draft: true, is_active: false, id: undefined, target: finalTarget };
      
      set({ activeTheme: active, draftTheme: draft, isLoading: false });
    } catch (err) {
      console.warn("Theme API error - returning defaults:", err);
      const active = createDefaultPreset(finalTarget);
      set({ activeTheme: active, draftTheme: { ...active, name: 'Rascunho atual', is_draft: true, is_active: false }, isLoading: false });
    }
  },

  updateDraft: (section, newValues) => {
    const { draftTheme } = get();
    if (!draftTheme) return;

    set({
      draftTheme: {
        ...draftTheme,
        [section]: {
          ...(draftTheme[section] as any),
          ...newValues
        }
      }
    });
  },

  saveDraft: async () => {
    const { draftTheme, currentTarget } = get();
    if (!draftTheme) return;
    
    try {
      const payload = { ...draftTheme, target: currentTarget };
      delete payload.id;

      if (draftTheme.id) {
        await supabase.from('advanced_themes' as any).update(payload).eq('id', draftTheme.id);
      } else {
        const { data, error } = await supabase.from('advanced_themes' as any).insert([payload]).select().single() as any;
        if (data && !error) {
           set({ draftTheme: data });
        }
      }
    } catch(err) {
      console.error("Failed to save draft:", err);
    }
  },

  applyDraftToActive: async () => {
    const { draftTheme, activeTheme, currentTarget } = get();
    if (!draftTheme) return;

    const newActive = { 
      ...draftTheme, 
      is_draft: false, 
      is_active: true, 
      target: currentTarget,
      name: activeTheme?.name || 'Novo Padrão' 
    };
    delete newActive.id; 
    
    try {
      // Deactivate other themes
      await supabase.from('advanced_themes' as any)
        .update({ is_active: false })
        .eq('is_active', true);
      
      if (activeTheme?.id) {
         await supabase.from('advanced_themes' as any).update(newActive).eq('id', activeTheme.id);
      } else {
         await supabase.from('advanced_themes' as any).insert([newActive]);
      }
      
      await get().fetchThemes(currentTarget);
    } catch (err) {
      console.error("Failed to apply theme", err);
    }
  },

  createDefaultPreset: () => createDefaultPreset('dashboard'),

  loadPreset: (preset: AdvancedTheme) => {
    const { draftTheme, currentTarget } = get();
    set({
      draftTheme: {
        ...draftTheme!,
        ...preset,
        id: draftTheme?.id,
        is_draft: true,
        is_active: false,
        target: currentTarget,
        name: `Rascunho (${preset.name})`
      }
    });
  }
}));
