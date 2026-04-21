import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const usePermissions = () => {
  const { user, profile } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // DEV_MASTER always bypasses all checks
  const isDevMaster = profile?.role === "dev_master" || profile?.role === "admin_master";

  const fetchPermissions = useCallback(async () => {
    if (!user || !profile?.role) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    if (isDevMaster) {
      setLoading(false);
      return; 
    }

    try {
      // 1. Fetch role-based permissions
      const { data: rolePermsData } = await (supabase as any)
        .from('role_permissions')
        .select(`
          permissions (
            name
          )
        `)
        .eq('role', profile.role);

      // 2. Fetch user-specific (override) permissions
      const { data: userPermsData } = await (supabase as any)
        .from('user_permissions')
        .select(`
          permissions (
            name
          )
        `)
        .eq('user_id', user.id);

      const combinedPerms = new Set<string>();

      rolePermsData?.forEach((rp: any) => {
        if (rp.permissions?.name) combinedPerms.add(rp.permissions.name);
      });

      userPermsData?.forEach((up: any) => {
        if (up.permissions?.name) combinedPerms.add(up.permissions.name);
      });

      setPermissions(Array.from(combinedPerms));
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.role, isDevMaster]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const can = useCallback((action: string) => {
    if (isDevMaster) return true; // master always can
    return permissions.includes(action);
  }, [permissions, isDevMaster]);

  return { can, permissions, loading };
};
