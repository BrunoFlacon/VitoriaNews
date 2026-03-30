import { motion } from "framer-motion";
import { Bell, Search, ChevronDown, User, Shield, Camera, Key, Settings, LogOut } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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

interface HeaderProps {
  onNotificationsClick?: () => void;
  onNavigate?: (tab: string, subTab?: string) => void;
}

export const Header = ({ onNotificationsClick, onNavigate }: HeaderProps) => {
  const { unreadCount } = useNotifications();
  const { user, profile, logout, isOnline, toggleOnline } = useAuth();

  const displayName = profile?.name || user?.email?.split('@')[0] || "Usuário";
  const initials = displayName.charAt(0).toUpperCase();
  const userRole = (profile as any)?.role || "Administrador"; // Fallback para Admin

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-8 py-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40"
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar publicações, redes, analytics..."
            className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onNotificationsClick}
          className="relative p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 pl-3 border-l border-border cursor-pointer hover:bg-muted/30 p-1.5 rounded-xl transition-colors">
              <div className="relative">
                <Avatar className="w-10 h-10 rounded-xl">
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt={displayName} className="rounded-xl object-cover" />
                  )}
                  <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span 
                  className={cn(
                    "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm transition-all duration-300", 
                    isOnline ? "bg-green-500 shadow-green-500/50" : "bg-transparent border border-muted-foreground/40"
                  )} 
                  title={isOnline ? "Online" : "Offline"}
                />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-none mb-1">{displayName}</p>
                <p className="text-[10px] text-muted-foreground leading-none">{userRole}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
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
    </motion.header>
  );
};
