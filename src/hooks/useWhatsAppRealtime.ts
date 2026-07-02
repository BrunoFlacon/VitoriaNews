/**
 * useWhatsAppRealtime — Subscrição Realtime granular para WhatsApp
 * 
 * Seção 6.5: Substitui as subscriptions genéricas de MessagingView
 * por escopo restrito à tabela whatsapp_conversations + messages por conversa.
 * 
 * Uso:
 *   const { conversations, conversationMessages, loading } = useWhatsAppRealtime(user?.id);
 * 
 *   // Para ver mensagens de uma conversa específica:
 *   const msgs = conversationMessages.get(conversationId) ?? [];
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ──────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────

export interface WhatsAppConversation {
  id: string;
  user_id: string;
  connection_id: string;
  contact_wa_id: string;
  contact_name: string | null;
  avatar_url: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  conversation_id: string | null;
  content: string;
  media_url: string | null;
  status: string;
  delivery_status: string | null;
  delivered_at: string | null;
  read_at: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  platform: string | null;
  sent_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface UseWhatsAppRealtimeReturn {
  /** Lista de conversas, ordenadas por last_message_at DESC */
  conversations: WhatsAppConversation[];
  /** Mapa: conversationId → mensagens (ordenadas por created_at ASC) */
  conversationMessages: Map<string, WhatsAppMessage[]>;
  /** Se está carregando dados iniciais */
  loading: boolean;
  /** Mensagem de erro, se houver */
  error: string | null;
  /** Re-executa fetch inicial manualmente */
  refresh: () => Promise<void>;
}

// ──────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────

export function useWhatsAppRealtime(
  userId: string | undefined,
  options?: { enabled?: boolean }
): UseWhatsAppRealtimeReturn {
  const enabled = options?.enabled ?? true;
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [conversationMessages, setConversationMessages] = useState<Map<string, WhatsAppMessage[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs para evitar resubscriptions desnecessárias
  const activeConvIds = useRef<Set<string>>(new Set());
  const messageChannels = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());

  // ── Fetch inicial ──────────────────────────────────

  const fetchConversations = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const { data: convs, error: convErr } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (convErr) throw new Error(convErr.message);

      const sortedConvs = (convs ?? []) as WhatsAppConversation[];
      setConversations(sortedConvs);

      // Fetch messages for all conversations
      if (sortedConvs.length > 0) {
        const convIds = sortedConvs.map(c => c.id);
        const { data: msgs, error: msgsErr } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true });

        if (msgsErr) throw new Error(msgsErr.message);

        const grouped = new Map<string, WhatsAppMessage[]>();
        for (const msg of (msgs ?? []) as WhatsAppMessage[]) {
          const cid = msg.conversation_id || 'orphan';
          if (!grouped.has(cid)) grouped.set(cid, []);
          grouped.get(cid)!.push(msg);
        }
        setConversationMessages(grouped);
      }
    } catch (err: unknown) {
      console.error('[useWhatsAppRealtime] Error fetching:', err);
      setError(err instanceof Error ? err.message : 'Failed to load WhatsApp conversations');
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  // ── Realtime Subscriptions ──────────────────────────

  useEffect(() => {
    if (!userId || !enabled) return;

    fetchConversations();

    // Canal 1: whatsapp_conversations (mudanças estruturais)
    const convChannel = supabase
      .channel('wa-conversations-rt')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: RealtimePostgresChangesPayload<WhatsAppConversation>) => {
          console.log('[useWhatsAppRealtime] Conversation change:', payload.eventType, payload.new?.id);

          // Atualizar lista de conversas
          const { data: updatedConvs } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .eq('user_id', userId)
            .order('last_message_at', { ascending: false, nullsFirst: false });

          if (updatedConvs) {
            setConversations(updatedConvs as WhatsAppConversation[]);
          }

          // Se uma nova conversa foi criada, buscar suas mensagens
          if (payload.eventType === 'INSERT' && payload.new?.id) {
            const newConvId = payload.new.id;
            const { data: newMsgs } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', newConvId)
              .order('created_at', { ascending: true });

            setConversationMessages(prev => {
              const next = new Map(prev);
              next.set(newConvId, (newMsgs ?? []) as WhatsAppMessage[]);
              return next;
            });
          }
        }
      )
      .subscribe();

    // Canal 2: messages (atualizações em tempo real para conversas conhecidas)
    const msgChannel = supabase
      .channel('wa-messages-rt')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<WhatsAppMessage>) => {
          const msg = payload.new as WhatsAppMessage | null;
          const convId = msg?.conversation_id;

          if (!convId) return; // Ignorar mensagens sem conversa vinculada

          console.log('[useWhatsAppRealtime] Message change:', payload.eventType, msg?.id);

          setConversationMessages(prev => {
            const next = new Map(prev);
            const existing = next.get(convId) ?? [];

            if (payload.eventType === 'INSERT' && msg) {
              next.set(convId, [...existing, msg]);
            } else if (payload.eventType === 'UPDATE' && msg) {
              next.set(
                convId,
                existing.map(m => (m.id === msg.id ? msg : m))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              if (deletedId) {
                next.set(
                  convId,
                  existing.filter(m => m.id !== deletedId)
                );
              }
            }

            return next;
          });

          // Atualizar preview da conversa se for INSERT
          if (payload.eventType === 'INSERT' && msg) {
            setConversations(prev =>
              prev.map(c =>
                c.id === convId
                  ? {
                      ...c,
                      last_message_preview: msg.content?.slice(0, 100) || c.last_message_preview,
                      last_message_at: msg.created_at || c.last_message_at,
                    }
                  : c
              )
            );
          }
        }
      )
      .subscribe();

    // Cleanup
    const msgCh = messageChannels.current;
    const actIds = activeConvIds.current;
    return () => {
      supabase.removeChannel(convChannel);
      supabase.removeChannel(msgChannel);
      msgCh.forEach(ch => supabase.removeChannel(ch));
      msgCh.clear();
      actIds.clear();
    };
  }, [userId, enabled, fetchConversations]);

  return {
    conversations,
    conversationMessages,
    loading,
    error,
    refresh: fetchConversations,
  };
}
