import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  PenSquare, 
  Calendar, 
  BarChart3, 
  Settings, 
  Share2,
  Radio,
  FileText,
  Bell,
  LogOut,
  ChevronLeft,
  MessageCircle,
  Newspaper,
  Video,
  Scissors,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const menuItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "create", icon: PenSquare, label: "Criar Post" },
  { id: "calendar", icon: Calendar, label: "Calendário" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "stories", icon: Radio, label: "Stories & Lives" },
  { id: "messaging", icon: MessageCircle, label: "Mensagens" },
  { id: "news", icon: Newspaper, label: "Notícias" },
  { id: "documents", icon: FileText, label: "Documentos" },
  { id: "networks", icon: Share2, label: "Redes Sociais" },
];

const bottomItems = [
  { id: "notifications", icon: Bell, label: "Notificações" },
  { id: "settings", icon: Settings, label: "Configurações" },
];

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  onLogout,
  isCollapsed,
  setIsCollapsed 
}: SidebarProps) => {

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64",
        "hidden md:block" // Hide on mobile by default, show as drawer later if needed
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Share2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl gradient-text">
                SocialHub
              </span>
            </motion.div>
          )}
          {isCollapsed && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
              <Share2 className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "p-2 rounded-lg hover:bg-sidebar-accent transition-colors",
              isCollapsed && "absolute right-2 top-6"
            )}
          >
            <ChevronLeft className={cn(
              "w-4 h-4 transition-transform",
              isCollapsed && "rotate-180"
            )} />
          </button>
        </div>

        {/* Main Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group",
                activeTab === item.id
                  ? "bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/20"
                  : "hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0",
                activeTab === item.id && "text-primary"
              )} />
              {!isCollapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
              {activeTab === item.id && !isCollapsed && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}
            </motion.button>
          ))}
        </nav>

        {/* Bottom Menu */}
        <div className="p-4 border-t border-sidebar-border space-y-1">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                activeTab === item.id
                  ? "bg-sidebar-accent text-foreground"
                  : "hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium text-sm">Sair</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
