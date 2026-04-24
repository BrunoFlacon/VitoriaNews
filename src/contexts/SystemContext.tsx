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
      // PERFORMANCE: Chamada consolidada e tipada
      const { data: allData, error } = await (supabase as any)
        .from("system_settings")
        .select("*");

      if (error) {
        console.error("Error fetching system settings:", error);
        return;
      }

      const rows = (allData || []) as any[];
      if (rows.length === 0) {
        setLoading(false);
        return;
      }

      // OTIMIZAÇÃO: Processamento em um único loop para evitar múltiplos .filter()
      let generalData: SystemSettings | null = null;
      const navItems: NavSetting[] = [];
      const permsMap: Record<string, string[]> = {};
      const uniqueNavKeys = new Set();

      for (const row of rows) {
        if (row.group === 'general' || row.key === 'platform_name') {
          generalData = row;
        } else if (row.group === 'navigation') {
          if (!uniqueNavKeys.has(row.key)) {
            uniqueNavKeys.add(row.key);
            navItems.push({
              id: row.id,
              key: row.key,
              value: row.value,
              active: row.active !== false,
              order_index: row.order_index || 0,
              allowed_roles: row.allowed_roles || ['admin_master', 'dev_master', 'editor', 'user']
            });
          }
        } else if (row.group === 'permissions') {
          permsMap[row.key] = row.allowed_roles || [];
        }
      }

      if (generalData) {
        setSettings(generalData);
        applyThemeStyles(generalData);
      }
      
      if (navItems.length > 0) {
        setNavSettings(navItems.sort((a, b) => a.order_index - b.order_index));
      }

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
