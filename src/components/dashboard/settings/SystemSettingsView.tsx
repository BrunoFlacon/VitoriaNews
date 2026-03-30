import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdentityTab } from "./IdentityTab";
import { UsersTab } from "./UsersTab";
import { NavigationTab } from "./NavigationTab";
import { PermissionsTab } from "./PermissionsTab";
import { motion } from "framer-motion";
import { useSystem } from "@/contexts/SystemContext";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Users, Laptop, GripVertical, Lock } from "lucide-react";

export const SystemSettingsView = () => {
  const [activeTab, setActiveTab] = useState("identity");
  const { canAccessSection } = useSystem();
  const { profile } = useAuth();
  const userRole = profile?.role || 'user';

  const sections = [
    { id: "identity", label: "Identidade", icon: Laptop, key: "sec_identity" },
    { id: "users", label: "Usuários", icon: Users, key: "sec_users" },
    { id: "navigation", label: "Navegação", icon: GripVertical, key: "sec_navigation" },
    { id: "permissions", label: "Permissões Internas", icon: Lock, key: "sec_internal_rbac" },
  ].filter(s => canAccessSection(s.key, userRole));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/20">
        <div>
          <h2 className="font-display font-bold text-2xl text-primary">Infraestrutura Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">Identidade interna, acessos de usuários e estrutura de menus</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          {sections.map(s => (
            <TabsTrigger key={s.id} value={s.id} className="rounded-lg data-[state=active]:bg-background py-2 px-4 shadow-sm transition-all">
              <s.icon className="w-4 h-4 mr-2" />
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {canAccessSection('sec_identity', userRole) && (
          <TabsContent value="identity">
            <IdentityTab />
          </TabsContent>
        )}

        {canAccessSection('sec_users', userRole) && (
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        )}

        {canAccessSection('sec_navigation', userRole) && (
          <TabsContent value="navigation">
            <NavigationTab />
          </TabsContent>
        )}

        {canAccessSection('sec_internal_rbac', userRole) && (
          <TabsContent value="permissions">
            <PermissionsTab />
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
};
