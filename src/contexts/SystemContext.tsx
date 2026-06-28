import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SystemSettings {
  [key: string]: any;
}

interface NavSetting {
  id?: string;
  key: string;
  value: string;
  label?: string;
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

export const SystemContext = createContext<SystemContextType | undefined>(undefined);

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

  const CACHE_KEY = 'sc_system_settings';
  const CACHE_NAV_KEY = 'sc_system_nav';
  const CACHE_PERMS_KEY = 'sc_system_perms';

  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setSettings(parsed);
        applyThemeStyles(parsed);
      }
      const navCached = localStorage.getItem(CACHE_NAV_KEY);
      if (navCached) setNavSettings(JSON.parse(navCached));
      const permsCached = localStorage.getItem(CACHE_PERMS_KEY);
      if (permsCached) setSectionPermissions(JSON.parse(permsCached));
    } catch {}
  }, [applyThemeStyles]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data: allData, error } = await (supabase as any)
        .from("system_settings")
        .select("*");

      if (error) {
        throw error;
      }

      const rows = (allData || []) as any[];
      const uniqueNavKeys = new Set();
      const navItems: NavSetting[] = [];
      const permsMap: Record<string, string[]> = {};
      let generalData: any = null;

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
              label: row.value,
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
        localStorage.setItem(CACHE_KEY, JSON.stringify(generalData));
      }
      if (navItems.length > 0) {
        setNavSettings(navItems.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        localStorage.setItem(CACHE_NAV_KEY, JSON.stringify(navItems));
      }
      setSectionPermissions(permsMap);
      localStorage.setItem(CACHE_PERMS_KEY, JSON.stringify(permsMap));

    } catch (e) {
      if (import.meta.env.DEV) console.warn("SystemContext fetch error - usando cache local");
      loadFromCache();
    } finally {
      setLoading(false);
    }
  }, [applyThemeStyles, loadFromCache]);

  useEffect(() => { loadFromCache(); fetchSettings(); }, [fetchSettings, loadFromCache]);

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
