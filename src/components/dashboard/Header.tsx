import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, ChevronDown, User, Shield, Camera, Key, Settings, LogOut, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/contexts/SystemContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, getProxyUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NetworkHealthIndicator } from "@/components/dashboard/NetworkHealthIndicator";
import { DateTimeWeather } from "@/components/dashboard/DateTimeWeather";
import { OmniSearch } from "@/components/search/OmniSearch";

interface HeaderProps {
  onNotificationsClick?: () => void;
  onNavigate?: (tab: string, subTab?: string) => void;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
}

export const Header = memo(({
  onNotificationsClick,
  onNavigate,
  isSidebarCollapsed,
  setIsSidebarCollapsed
}: HeaderProps) => {
  const { unreadCount } = useNotifications();
  const { user, profile, logout, isOnline, toggleOnline } = useAuth();
  const { settings } = useSystem();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const displayName = profile?.name || user?.email?.split('@')[0] || "Usuário";
  const initials = displayName.charAt(0).toUpperCase();
  const ROLE_LABELS: Record<string, string> = {
    admin_master: 'Admin Master',
    dev_master: 'Dev Master',
    editor: 'Editor',
    user: 'Usuário',
  };
  const rawRole = profile?.role || '';
  const userRole = ROLE_LABELS[rawRole] || rawRole || 'Carregando...';

  return (
    <div className="sticky top-0 z-40 w-full flex flex-col">
      <header
        className="flex items-center justify-between px-4 md:px-8 py-3 border-b border-border bg-background/95 relative z-50"
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Logo and Name for Mobile */}
          <div
            className="flex md:hidden items-center gap-2 cursor-pointer active:scale-95 transition-transform"
            onClick={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
          >
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-9 h-9 object-contain shrink-0 rounded-2xl" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4F8AFF] to-[#8B5CF6] border border-white/20 flex items-center justify-center shrink-0 shadow-lg relative">
                <svg viewBox="0 0 64 64" className="w-[98%] h-[98%] text-black fill-current">
                  <path d="M45.9,26.4l5.2-5.2c-11.8-11.7-26.4-11.7-38.1,0l5.2,5.2C27.1,17.5,37,17.5,45.9,26.4L45.9,26.4z" />
                  <path d="M44.2,38.1L32,26l-12.1,12L7.7,26l-5.2,5.2l17.3,17.2l12.1-12l12.1,12l17.3-17.2L56.3,26L44.2,38.1z" />
                </svg>
              </div>
            )}
            <span className="font-display font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4F8AFF] to-[#8B5CF6] truncate">
              {settings?.platform_name || "Vitória Net"}
            </span>
          </div>

          {/* Collapsible Search */}
          <div className="relative flex-1 md:max-w-md flex justify-end md:justify-start">
            <AnimatePresence>
              {(isSearchExpanded || !window.innerWidth || window.innerWidth > 768) ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className={cn(
                    "relative flex items-center w-full",
                    isSearchExpanded ? "fixed inset-x-0 top-0 h-16 px-4 bg-background z-50 md:relative md:inset-auto md:h-auto md:px-0 md:bg-transparent" : "hidden md:flex"
                  )}
                >
                  <OmniSearch
                    isExpanded={isSearchExpanded}
                    setIsExpanded={setIsSearchExpanded}
                  />
                </motion.div>
              ) : (
                <button
                  onClick={() => setIsSearchExpanded(true)}
                  className="md:hidden p-2 text-muted-foreground transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNotificationsClick}
            className="relative p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 pl-3 border-l border-border cursor-pointer hover:bg-muted/30 p-1 rounded-xl transition-colors">
                <div className="relative">
                  <Avatar className="w-8 h-8 rounded-xl">
                    {profile?.avatar_url && (
                      <AvatarImage src={getProxyUrl(profile.avatar_url)} alt={displayName} className="rounded-xl object-cover" />
                    )}
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm transition-all duration-300",
                      isOnline ? "bg-green-500" : "bg-transparent border border-muted-foreground/40"
                    )}
                  />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium leading-none mb-0.5">{displayName}</p>
                  <p className="text-[9px] text-muted-foreground leading-none">{userRole}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card border-border/50">
              <DropdownMenuLabel>
                Minha Conta
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={toggleOnline} className="cursor-pointer">
                  <div className={cn("w-2 h-2 rounded-full mr-2", isOnline ? "bg-muted-foreground/30" : "bg-green-500")} />
                  <span>Ficar {isOnline ? "Offline" : "Online"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate?.('settings', 'profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Editar Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate?.('settings', 'profile_photo')}>
                  <Camera className="mr-2 h-4 w-4" />
                  <span>Trocar foto do perfil</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate?.('settings', 'profile')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-500 focus:bg-red-500/10 focus:text-red-600" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair do sistema</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Status Bar / Weather Row */}
      <div className="px-4 md:px-8 py-0 bg-background/95 border-b border-border/50">
        <DateTimeWeather />
      </div>
    </div>
  );
});

Header.displayName = "Header";
