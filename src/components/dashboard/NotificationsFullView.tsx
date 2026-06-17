import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";

type FilterType = 'all' | 'unread' | 'read';

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

export const NotificationsFullView = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display font-bold text-3xl mb-2">
          Notificações
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground">
          {unreadCount > 0 ? `Você tem ${unreadCount} notificação(ões) não lida(s)` : 'Você está em dia!'}
        </motion.p>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          {([['all', 'Todas'], ['unread', 'Não lidas'], ['read', 'Lidas']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                filter === key
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas como lidas
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Limpar tudo
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="font-medium text-lg">Sem notificações</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'unread' ? 'Nenhuma notificação não lida' : filter === 'read' ? 'Nenhuma notificação lida' : 'Você não tem notificações'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((notification, index) => {
              const TypeIcon = getNotificationIcon(notification.type);
              const platform = notification.platform ? socialPlatforms.find(p => p.id === notification.platform) : null;
              const PlatformIcon = platform?.icon;

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "p-5 hover:bg-muted/30 transition-colors cursor-pointer relative group",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  {!notification.read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  )}
                  <div className="flex gap-4 pl-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", getNotificationColor(notification.type))}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("font-medium text-sm", !notification.read && "font-semibold")}>{notification.title}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(notification.timestamp)}</span>
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
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
