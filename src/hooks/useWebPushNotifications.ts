import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

export function useWebPushNotifications() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const permissionRef = useRef<NotificationPermission>('default');

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    }

    return false;
  }, []);

  const sendPushNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permissionRef.current !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
      });
    } catch (err) {
      console.error('Push notification error:', err);
    }
  }, []);

  // Subscribe to realtime changes on scheduled_posts
  useEffect(() => {
    if (!user) return;

    // Request permission on mount
    requestPermission();

    const channel = supabase
      .channel('post-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scheduled_posts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;
          const content = (payload.new?.content as string)?.substring(0, 50) || '';

          if (newStatus === oldStatus) return;

          if (newStatus === 'published') {
            sendPushNotification(
              '✅ Post publicado!',
              `"${content}..." foi publicado com sucesso.`
            );
            addNotification({
              type: 'success',
              title: 'Post publicado',
              message: `"${content}..." foi publicado com sucesso.`,
              platform: (payload.new?.platforms as string[])?.[0],
            });
          } else if (newStatus === 'failed') {
            const errorMsg = (payload.new?.error_message as string) || 'Erro desconhecido';
            sendPushNotification(
              '❌ Falha na publicação',
              `"${content}..." falhou: ${errorMsg}`
            );
            addNotification({
              type: 'error',
              title: 'Falha na publicação',
              message: `"${content}..." - ${errorMsg}`,
              platform: (payload.new?.platforms as string[])?.[0],
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (err || status === 'CHANNEL_ERROR') {
          // Silenced: console.warn('Realtime subscription delayed/failed...');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, addNotification, sendPushNotification, requestPermission]);

  return {
    requestPermission,
    sendPushNotification,
    isSupported: 'Notification' in window,
    permission: permissionRef.current,
  };
}
