import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onViewAll?: () => void;
}

export const NotificationsPanel = ({ isOpen, onClose, onViewAll }: NotificationsPanelProps) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAll 
  } = useNotifications();

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'text-green-500 bg-green-500/20';
      case 'error': return 'text-red-500 bg-red-500/20';
      case 'warning': return 'text-amber-500 bg-amber-500/20';
      default: return 'text-blue-500 bg-blue-500/20';
    }
  };

  const getPlatformIcon = (platformId?: string) => {
    if (!platformId) return null;
    const platform = socialPlatforms.find(p => p.id === platformId);
    return platform?.icon;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="fixed right-4 top-20 w-96 max-h-[calc(100vh-6rem)] z-50 glass-card rounded-2xl border border-border shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <h3 className="font-display font-bold">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
                <button onClick={markAllAsRead} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas como lidas
                </button>
                <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar tudo
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="font-medium">Sem notificações</p>
                  <p className="text-sm text-muted-foreground">Você está em dia!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.slice(0, 10).map((notification) => {
                    const TypeIcon = getNotificationIcon(notification.type);
                    const PlatformIcon = getPlatformIcon(notification.platform);
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-4 hover:bg-muted/30 transition-colors cursor-pointer relative group",
                          !notification.read && "bg-primary/5"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        {!notification.read && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                        )}
                        
                        <div className="flex gap-3 pl-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", getNotificationColor(notification.type))}>
                            <TypeIcon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatTime(notification.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                            {PlatformIcon && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <PlatformIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground capitalize">{notification.platform}</span>
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}
                            className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-border bg-muted/30">
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => {
                    onViewAll?.();
                    onClose();
                  }}
                >
                  Ver todas as notificações
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
