import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface FloatingWhatsAppProps {
  onOpenMessaging: () => void;
}

export const FloatingWhatsApp = ({ onOpenMessaging }: FloatingWhatsAppProps) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;

    // 1. Check if floating button is enabled in settings
    const checkSettings = async () => {
      const { data } = await (supabase as any)
        .from('bot_settings')
        .select('floating_button_enabled')
        .eq('user_id', user.id)
        .eq('platform', 'whatsapp')
        .maybeSingle();
      
      if (data) {
        setIsEnabled(data.floating_button_enabled ?? true);
      }
    };

    // 2. Count unread messages
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('platform', 'whatsapp')
        .eq('status', 'received');
      
      if (!error) {
        setUnreadCount(count || 0);
        setIsVisible((count || 0) > 0);
      }
    };

    checkSettings();
    fetchUnreadCount();

    // 3. Listen for changes
    const channel = supabase
      .channel('floating-whatsapp-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bot_settings', filter: `user_id=eq.${user.id}` },
        () => {
          checkSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!isEnabled || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: 20 }}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
      >
        {unreadCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-zinc-900 border border-border shadow-2xl rounded-2xl p-3 mb-2 flex items-center gap-3 max-w-[200px]"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-xs font-bold leading-tight">
              Você tem {unreadCount} {unreadCount === 1 ? 'mensagem pendente' : 'mensagens pendentes'} no WhatsApp
            </p>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        <button
          onClick={onOpenMessaging}
          className="group relative flex items-center justify-center w-16 h-16 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 group-hover:opacity-40" />
          <MessageCircle className="w-8 h-8 fill-current" />
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-lg">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
