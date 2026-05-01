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
  BookOpen,
  FolderOpen,
  Bot,
  Globe,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useSystem } from "@/contexts/SystemContext";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

// Icon mapping for dynamic IDs
const ICON_MAP: Record<string, any> = {
  dashboard: LayoutDashboard,
  create: PenSquare,
  calendar: Calendar,
  analytics: BarChart3,
  stories: Radio,
  messaging: MessageCircle,
  news: Newspaper,
  documents: FolderOpen,
  networks: Share2,
  settings: Settings,
  sys_portal: Globe,
  notifications: Bell,
  manual: BookOpen,
  robot: Bot
};

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  onLogout,
  isCollapsed,
  setIsCollapsed 
}: SidebarProps) => {
  const { settings, navSettings } = useSystem();
  const { profile } = useAuth();
  const userRole = profile?.role || 'user';

  const { topMenu, bottomMenu } = useMemo(() => {
    // Definimos os itens padrão (fallback) que DEVEM sempre existir se não houver configuração contrária
    const defaultTopMenu = [
      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { id: "create", icon: PenSquare, label: "Criar Post" },
      { id: "calendar", icon: Calendar, label: "Calendário" },
      { id: "analytics", icon: BarChart3, label: "Analytics" },
      { id: "stories", icon: Radio, label: "Stories & Lives" },
      { id: "messaging", icon: MessageCircle, label: "Mensagens" },
      { id: "news", icon: Newspaper, label: "Notícias" },
      { id: "documents", icon: FolderOpen, label: "Arquivos & Galeria" },
      { id: "networks", icon: Share2, label: "Redes Sociais" },
      { id: "robot", icon: Bot, label: "Artesão de Bots" },
      { id: "monitoring", icon: Activity, label: "Monitoramento" },
    ];

    const mandatoryBottom = [
      { id: "notifications", icon: Bell, label: "Notificações" },
      { id: "settings", icon: Settings, label: "Config Dashboard" },
      { id: "sys_portal", icon: Globe, label: "Portal & Temas" }
    ];

    // Se não houver configurações no banco, retornamos os padrões
    if (navSettings.length === 0) {
      return { 
        topMenu: defaultTopMenu, 
        bottomMenu: mandatoryBottom 
      };
    }

    // Se houver configurações, mesclamos: o que está no banco sobrescreve o padrão
    const uniqueMap = new Map();
    
    // Primeiro, preenchemos com os padrões
    defaultTopMenu.concat(mandatoryBottom).forEach(item => {
      uniqueMap.set(item.id, { ...item, active: true, order_index: 100 });
    });

    // Depois, sobrepomos com as configurações do banco (navSettings)
    navSettings.forEach(s => {
      const existing = uniqueMap.get(s.key);
      uniqueMap.set(s.key, {
        id: s.key,
        label: s.value,
        icon: ICON_MAP[s.key] || (existing?.icon || LayoutDashboard),
        active: s.active !== false,
        order_index: s.order_index,
        allowed_roles: s.allowed_roles
      });
    });

    const allMerged = Array.from(uniqueMap.values())
      .filter(s => s.active !== false)
      .filter(s => !s.allowed_roles || s.allowed_roles.includes(userRole))
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const bottomKeys = mandatoryBottom.map(m => m.id);
    const topMenu = allMerged.filter(item => !bottomKeys.includes(item.id));
    const bottomMenu = allMerged.filter(item => bottomKeys.includes(item.id));

    return { topMenu, bottomMenu };
  }, [navSettings, userRole]);

  const dynamicMenuItems = topMenu;
  const dynamicBottomItems = bottomMenu;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ type: "spring", stiffness: 280, damping: 32, mass: 0.9 }}
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col items-center",
        isCollapsed ? "py-4 md:py-6" : ""
      )}
    >
      <div className={cn(
        "flex items-center gap-3 px-4 h-16 border-b border-sidebar-border/30 w-full mb-1 shrink-0 overflow-hidden",
        isCollapsed ? "justify-center" : "justify-start"
      )}>
        {settings?.show_logo !== false && (
          settings?.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt="Logo" 
              className="w-9 h-9 object-contain shrink-0 rounded-2xl" 
            />
          ) : (
            /* INÍCIO LOGOMARCA PADRÃO DO SISTEMA (SVG NOVO) */
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4F8AFF] to-[#8B5CF6] border border-white/20 flex items-center justify-center shrink-0 shadow-lg relative group overflow-hidden active:scale-95 transition-transform duration-300">
              <svg viewBox="0 0 64 64" className="w-[98%] h-[98%] text-black fill-current">
                <path d="M45.9,26.4l5.2-5.2c-11.8-11.7-26.4-11.7-38.1,0l5.2,5.2C27.1,17.5,37,17.5,45.9,26.4L45.9,26.4z" />
                <path d="M44.2,38.1L32,26l-12.1,12L7.7,26l-5.2,5.2l17.3,17.2l12.1-12l12.1,12l17.3-17.2L56.3,26L44.2,38.1z" />
              </svg>
            </div>
            /* FIM LOGOMARCA PADRÃO DO SISTEMA */
          )
        )}
        {!isCollapsed && (
          <motion.span 
            key="platform-name"
            initial={{ opacity: 0, x: -8, width: 0 }}
            animate={{ opacity: 1, x: 0, width: "auto" }}
            exit={{ opacity: 0, x: -8, width: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="font-display font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4F8AFF] to-[#8B5CF6] truncate"
          >
            {settings?.platform_name || "Vitória Net"}
          </motion.span>
        )}
      </div>

      <div className={cn(
        "w-full flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden mt-1 px-2 scrollbar-none",
        isCollapsed ? "items-center" : "pr-1"
      )}>
        {dynamicMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 transition-all duration-300 group relative shrink-0",
                isCollapsed ? "w-11 h-11 justify-center rounded-2xl" : "px-4 py-2 rounded-xl",
                activeTab === item.id 
                  ? "sidebar-item-active" 
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-transform duration-300 shrink-0",
                activeTab === item.id ? "scale-110" : "group-hover:scale-110"
              )} />
              {!isCollapsed && (
                <span className="font-bold text-base tracking-tight">{item.label}</span>
              )}
              {!isCollapsed && activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabDot"
                  className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" 
                />
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-[10px] uppercase font-bold tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60] shadow-xl border border-border">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className={cn(
        "w-full mt-auto flex flex-col gap-1 pt-4 border-t border-sidebar-border/30 px-2 pb-6 shrink-0",
        isCollapsed ? "items-center" : ""
      )}>
        {dynamicBottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 transition-all duration-300 group relative",
                isCollapsed ? "w-11 h-11 justify-center rounded-2xl" : "px-4 py-2 rounded-xl",
                activeTab === item.id 
                  ? "sidebar-item-active" 
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-transform duration-300 shrink-0",
                activeTab === item.id ? "scale-110" : "group-hover:scale-110"
              )} />
              {!isCollapsed && (
                <span className="font-bold text-base tracking-tight">{item.label}</span>
              )}
              {!isCollapsed && activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabDot"
                  className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" 
                />
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-[10px] uppercase font-bold tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60] shadow-xl border border-border">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
        {onLogout && (
          <button
            onClick={onLogout}
            className={cn(
              "w-full flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-all font-bold group relative",
              isCollapsed ? "w-11 h-11 justify-center rounded-2xl" : "px-4 py-2 rounded-xl"
            )}
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform shrink-0" />
            {!isCollapsed && <span className="text-base tracking-tight">Sair</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-destructive text-white text-[10px] uppercase font-bold tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60] shadow-xl border border-border">
                Sair
              </div>
            )}
          </button>
        )}
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-[48px] w-[26px] h-[26px] bg-sidebar border border-sidebar-border rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-all shadow-sm z-[100] hover:scale-105 active:scale-95 group"
      >
        <ChevronLeft className={cn(
          "w-4 h-4 text-primary transition-transform duration-300",
          isCollapsed ? "rotate-180" : ""
        )} />
      </button>
    </motion.aside>
  );
};
