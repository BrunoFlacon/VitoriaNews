import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SystemSettings {
  [key: string]: any;
}

interface NavSetting {
  id?: string;
  key: string;
  value: string;
  active: boolean;
  order_index: number;
  allowed_roles?: string[];
}

interface SectionPermission {
  section_key: string;
  allowed_roles: string[];
}

interface SystemContextType {
  settings: SystemSettings | null;
  navSettings: NavSetting[];
  sectionPermissions: Record<string, string[]>;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettingsOptimistic: (newSettings: Partial<SystemSettings>) => void;
  canAccessSection: (sectionKey: string, userRole: string) => boolean;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [navSettings, setNavSettings] = useState<NavSetting[]>([]);
  const [sectionPermissions, setSectionPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const applyThemeStyles = useCallback((data: SystemSettings) => {
    if (data.platform_name) {
      document.title = data.platform_name;
    }
    if (data.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = data.favicon_url;
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      // PERFORMANCE: Consolidando em uma única chamada ao banco
      // select("*") é resiliente pois traz o que existir, sem dar erro 400 por colunas específicas
      const { data: allData, error } = await (supabase as any)
        .from("system_settings")
        .select("*");

      if (error) {
        console.error("Error fetching system settings:", error);
        // Mesmo com erro, mantemos o loading false para mostrar fallbacks locais
      }

      const rows = (allData || []) as any[];

      // Separar dados em memória com segurança (usando group se existir)
      const generalRow = rows.find(r => r.group === 'general' || r.key === 'platform_name'); // Fallback para r.key se group não existir
      const navigationRows = rows.filter(r => r.group === 'navigation');
      const permissionRows = rows.filter(r => r.group === 'permissions');

      if (generalRow) {
        setSettings(generalRow as SystemSettings);
        applyThemeStyles(generalRow as SystemSettings);
      }
      
      if (navigationRows.length > 0) {
        // DEDUPLICATION: Garantir chaves únicas
        const uniqueNav = new Map();
        navigationRows.forEach(n => {
          if (!uniqueNav.has(n.key)) {
            uniqueNav.set(n.key, n);
          }
        });

        setNavSettings(Array.from(uniqueNav.values())
          .sort((a, b) => ((a as any).order_index || 0) - ((b as any).order_index || 0))
          .map(n => ({
            id: (n as any).id,
            key: (n as any).key,
            value: (n as any).value,
            active: (n as any).active !== false,
            order_index: (n as any).order_index || 0,
            allowed_roles: (n as any).allowed_roles || ['admin_master', 'dev_master', 'editor', 'user']
          })));
      }

      const permsMap: Record<string, string[]> = {};
      permissionRows.forEach(p => {
        permsMap[(p as any).key] = (p as any).allowed_roles || [];
      });
      setSectionPermissions(permsMap);

    } catch (e) {
      console.error("SystemContext Critical Error:", e);
    } finally {
      setLoading(false);
    }
  }, [applyThemeStyles]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refreshSettings = async () => {
    await fetchSettings();
  };

  const updateSettingsOptimistic = (updatedSettings: Partial<SystemSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updatedSettings };
      applyThemeStyles(next as SystemSettings);
      return next;
    });
  };

  const canAccessSection = (sectionKey: string, userRole: string) => {
    const allowed = sectionPermissions[sectionKey];
    if (!allowed) return true; // Default to public if not configured
    return allowed.includes(userRole);
  };

  return (
    <SystemContext.Provider value={{ 
      settings, 
      navSettings, 
      sectionPermissions,
      loading, 
      refreshSettings, 
      updateSettingsOptimistic,
      canAccessSection
    }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error("useSystem must be used within a SystemProvider");
  }
  return context;
};
