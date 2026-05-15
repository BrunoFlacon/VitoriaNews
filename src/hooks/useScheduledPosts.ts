import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface ScheduledPost {
  id: string;
  user_id: string;
  content: string;
  media_ids: string[];
  platforms: string[];
  media_type: string;
  orientation: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'pending_approval' | 'rejected';
  rejection_reason?: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePostInput {
  content: string;
  media_ids?: string[];
  platforms: string[];
  media_type: string;
  orientation?: string;
  scheduled_at?: Date;
  status?: ScheduledPost['status'];
  published_at?: string;
}

export function useScheduledPosts(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['scheduled_posts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((post) => ({
        ...post,
        status: post.status as ScheduledPost['status'],
      })) as ScheduledPost[];
    },
    enabled: !!user && (options.enabled !== false),
    staleTime: 30000,
  });

  const createPost = async (input: CreatePostInput): Promise<ScheduledPost | null> => {
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado.", variant: "destructive" });
      return null;
    }

    if (!input.content.trim()) {
      toast({ title: "Conteúdo obrigatório", description: "Digite o texto do seu post.", variant: "destructive" });
      return null;
    }

    try {
      const status = input.scheduled_at ? 'scheduled' : 'draft';
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: user.id,
          content: input.content.trim(),
          media_ids: input.media_ids || [],
          platforms: input.platforms,
          media_type: input.media_type,
          orientation: input.orientation || 'horizontal',
          status,
          scheduled_at: input.scheduled_at?.toISOString() || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['scheduled_posts', user.id] });
      toast({
        title: status === 'scheduled' ? "Post agendado!" : "Rascunho salvo!",
        description: status === 'scheduled' ? "Seu post será publicado no horário programado." : "Seu rascunho foi salvo.",
      });

      return data as ScheduledPost;
    } catch (error) {
      console.error('Error creating post:', error);
      toast({ title: "Erro ao criar post", description: "Não foi possível salvar o post.", variant: "destructive" });
      return null;
    }
  };

  const updatePost = async (postId: string, updates: Partial<CreatePostInput>): Promise<boolean> => {
    if (!user) return false;
    try {
      const updateData: any = {};
      if (updates.content !== undefined) updateData.content = updates.content.trim();
      if (updates.media_ids !== undefined) updateData.media_ids = updates.media_ids;
      if (updates.platforms !== undefined) updateData.platforms = updates.platforms;
      if (updates.media_type !== undefined) updateData.media_type = updates.media_type;
      if (updates.orientation !== undefined) updateData.orientation = updates.orientation;
      if (updates.scheduled_at !== undefined) {
        updateData.scheduled_at = updates.scheduled_at?.toISOString() || null;
        updateData.status = updates.scheduled_at ? 'scheduled' : 'draft';
      }
      if (updates.status !== undefined) updateData.status = updates.status;

      const { error } = await supabase.from('scheduled_posts').update(updateData).eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['scheduled_posts', user.id] });
      toast({ title: "Post atualizado", description: "As alterações foram salvas." });
      return true;
    } catch (error) {
      console.error('Error updating post:', error);
      return false;
    }
  };

  const deletePost = async (postId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('scheduled_posts').delete().eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['scheduled_posts', user.id] });
      toast({ title: "Post excluído", description: "O post foi removido." });
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  };

  const getPostsByDate = (date: Date): ScheduledPost[] => {
    const dateStr = date.toISOString().split('T')[0];
    return posts.filter((post) => post.scheduled_at?.startsWith(dateStr));
  };

  const getUpcomingPosts = (limit = 10): ScheduledPost[] => {
    const now = new Date().toISOString();
    return posts
      .filter((post) => post.status === 'scheduled' && post.scheduled_at && post.scheduled_at > now)
      .sort((a, b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''))
      .slice(0, limit);
  };

  const submitForApproval = async (postId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('scheduled_posts').update({ status: 'pending_approval' }).eq('id', postId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['scheduled_posts', user.id] });
      addNotification({ type: 'info', title: 'Post enviado para aprovação', message: 'Aguardando revisão.' });
      return true;
    } catch (error) { return false; }
  };

  const approvePost = async (postId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('scheduled_posts').update({ status: 'scheduled', error_message: null }).eq('id', postId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['scheduled_posts', user.id] });
      addNotification({ type: 'success', title: 'Post aprovado', message: 'Agendado com sucesso.' });
      return true;
    } catch (error) { return false; }
  };

  const rejectPost = async (postId: string, reason: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('scheduled_posts').update({ status: 'rejected', error_message: reason }).eq('id', postId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['scheduled_posts', user.id] });
      addNotification({ type: 'warning', title: 'Post rejeitado', message: `Motivo: ${reason}` });
      return true;
    } catch (error) { return false; }
  };

  return {
    posts,
    loading: isLoading,
    createPost,
    updatePost,
    deletePost,
    getPostsByDate,
    getUpcomingPosts,
    submitForApproval,
    approvePost,
    rejectPost,
    refetch,
  };
}
