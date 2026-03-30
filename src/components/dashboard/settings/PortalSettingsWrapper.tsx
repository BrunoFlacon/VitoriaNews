import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeTab } from "./ThemeTab";
import { FooterTab } from "./FooterTab";
import { PortalSettingsView } from "./PortalSettingsView";
import { motion } from "framer-motion";
import { Palette, Layout, Footprints } from "lucide-react";
import { useSystem } from "@/contexts/SystemContext";
import { useAuth } from "@/contexts/AuthContext";

export const PortalSettingsWrapper = () => {
  const [activeTab, setActiveTab] = useState("theme");
  const { canAccessSection } = useSystem();
  const { profile } = useAuth();
  const userRole = profile?.role || 'user';

  const sections = [
    { id: "theme", label: "Estúdio de Temas", icon: Palette, key: "sec_theme" },
    { id: "cms", label: "Páginas & Blocos", icon: Layout, key: "sec_cms" },
    { id: "footer", label: "Rodapé", icon: Footprints, key: "sec_footer" },
  ].filter(s => canAccessSection(s.key, userRole));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/20">
        <div>
          <h2 className="font-display font-bold text-2xl text-primary">Portal & CMS Público</h2>
          <p className="text-muted-foreground text-sm mt-1">Personalização visual, conteúdo e rodapé do portal externo</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl flex flex-wrap w-full h-auto justify-start">
          {sections.map(s => (
            <TabsTrigger key={s.id} value={s.id} className="flex-1 rounded-lg data-[state=active]:bg-background py-2 flex items-center gap-2 min-w-[120px] transition-all">
              <s.icon className="w-4 h-4" /> {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {canAccessSection('sec_theme', userRole) && (
          <TabsContent value="theme"><ThemeTab /></TabsContent>
        )}
        
        {canAccessSection('sec_cms', userRole) && (
          <TabsContent value="cms"><PortalSettingsView /></TabsContent>
        )}
        
        {canAccessSection('sec_footer', userRole) && (
          <TabsContent value="footer"><FooterTab /></TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
};
