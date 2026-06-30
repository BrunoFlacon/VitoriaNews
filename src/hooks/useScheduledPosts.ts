import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface PlatformMetricDetail {
  platform: string;
  social_account_id?: string | null;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  impressions: number;
  ad_revenue: number;
  earnings: number;
  performance_score: number;
  breakdown?: Record<string, any> | null;
}

export interface ScheduledPost {
  id: string;
  user_id: string;
  content: string;
  media_ids: string[];
  media_urls?: (string | null)[];
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
  metrics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    reach: number;
  } | null;
  platform_metrics?: PlatformMetricDetail[] | null;
  thumbnail_url?: string | null;
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

export function useScheduledPosts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const queryKey = ['scheduled-posts', user?.id];

  const fetchPosts = async () => {
    if (!user) return [];

    // Fetch posts (limited to 50 for faster initial dashboard load)
    const { data: postsData, error: postsError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (postsError) throw postsError;
    
    // Fetch metrics for these posts
    const postIds = (postsData || []).map(p => p.id);
    const summedMetricsMap: Record<string, { likes: number; comments: number; shares: number; views: number; reach: number }> = {};
    const platformMetricsMap: Record<string, Record<string, PlatformMetricDetail>> = {};
    
    if (postIds.length > 0) {
      // Fetch post_metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('post_metrics')
        .select('*')
        .in('post_id', postIds)
        .order('collected_at', { ascending: false });

      // Fetch post_metrics_details
      const { data: detailsData } = await supabase
        .from('post_metrics_details')
        .select('*')
        .in('post_id', postIds)
        .order('collected_at', { ascending: false });

      // Map details breakdown by post_id and platform
      const detailsMap: Record<string, Record<string, any>> = {};
      if (detailsData) {
        detailsData.forEach(d => {
          if (d.post_id && d.platform) {
            const key = `${d.post_id}|${d.platform}`;
            if (!detailsMap[key]) {
              detailsMap[key] = (d.breakdown as Record<string, any>) || {};
            }
          }
        });
      }

      if (!metricsError && metricsData) {
        metricsData.forEach(m => {
          if (m.post_id) {
            const platformKey = `${m.platform}|${m.social_account_id || ''}`;
            if (!platformMetricsMap[m.post_id]) {
              platformMetricsMap[m.post_id] = {};
            }
            // First encountered is the latest collected snapshot (due to order collected_at DESC)
            if (!platformMetricsMap[m.post_id][platformKey]) {
              const detailKey = `${m.post_id}|${m.platform}`;
              const breakdown = detailsMap[detailKey] || null;

              platformMetricsMap[m.post_id][platformKey] = {
                platform: m.platform,
                social_account_id: m.social_account_id,
                likes: m.likes || 0,
                comments: m.comments || 0,
                shares: m.shares || 0,
                views: m.views || m.impressions || 0,
                reach: m.reach || 0,
                impressions: m.impressions || 0,
                ad_revenue: m.ad_revenue || 0,
                earnings: m.earnings || 0,
                performance_score: m.performance_score || 0,
                breakdown: breakdown
              };

              // Add to sum
              if (!summedMetricsMap[m.post_id]) {
                summedMetricsMap[m.post_id] = { likes: 0, comments: 0, shares: 0, views: 0, reach: 0 };
              }
              summedMetricsMap[m.post_id].likes += m.likes || 0;
              summedMetricsMap[m.post_id].comments += m.comments || 0;
              summedMetricsMap[m.post_id].shares += m.shares || 0;
              summedMetricsMap[m.post_id].views += m.views || m.impressions || 0;
              summedMetricsMap[m.post_id].reach += m.reach || 0;
            }
          }
        });
      }
    }

    // Resolve media_ids UUIDs → signed URLs
    const allMediaIds = [...new Set((postsData || []).flatMap(p => p.media_ids || []))];
    let mediaUrlMap: Record<string, string | null> = {};

    if (allMediaIds.length > 0) {
      const { data: mediaRecords } = await supabase
        .from('media')
        .select('id, file_url')
        .in('id', allMediaIds);

      if (mediaRecords) {
        mediaRecords.forEach((m) => {
          let path = m.file_url;
          if (path.includes('supabase.co/storage/')) {
            const signMarker = '/object/sign/media/';
            const publicMarker = '/object/public/media/';
            if (path.includes(signMarker)) {
              path = decodeURIComponent(path.split(signMarker)[1]?.split('?')[0] ?? '');
            } else if (path.includes(publicMarker)) {
              path = decodeURIComponent(path.split(publicMarker)[1]?.split('?')[0] ?? '');
            }
            if (path.startsWith('/')) path = path.substring(1);
          }
          const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
          mediaUrlMap[m.id] = pub.publicUrl;
        });
      }
    }

    return (postsData || []).map((post: any) => {
      const metrics = summedMetricsMap[post.id] || null;
      const platformMetrics = platformMetricsMap[post.id]
        ? Object.values(platformMetricsMap[post.id])
        : [];
      return {
        ...post,
        status: post.status as ScheduledPost['status'],
        media_urls: (post.media_ids || []).map(id => mediaUrlMap[id] ?? null),
        metrics: metrics,
        platform_metrics: platformMetrics
      };
    });
  };

  const { data: posts = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: fetchPosts,
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const createPost = async (input: CreatePostInput): Promise<ScheduledPost | null> => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado.",
        variant: "destructive",
      });
      return null;
    }

    // Validate content
    if (!input.content.trim()) {
      toast({
        title: "Conteúdo obrigatório",
        description: "Digite o texto do seu post.",
        variant: "destructive",
      });
      return null;
    }

    if (input.content.length > 5000) {
      toast({
        title: "Conteúdo muito longo",
        description: "O texto deve ter no máximo 5000 caracteres.",
        variant: "destructive",
      });
      return null;
    }

    if (input.platforms.length === 0) {
      toast({
        title: "Selecione plataformas",
        description: "Escolha pelo menos uma rede social.",
        variant: "destructive",
      });
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

      const typedPost: ScheduledPost = {
        ...data,
        status: data.status as ScheduledPost['status'],
      };

      await queryClient.invalidateQueries({ queryKey });

      toast({
        title: status === 'scheduled' ? "Post agendado!" : "Rascunho salvo!",
        description: status === 'scheduled' 
          ? "Seu post será publicado no horário programado."
          : "Seu rascunho foi salvo.",
      });

      return typedPost;
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Erro ao criar post",
        description: "Não foi possível salvar o post. Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePost = async (postId: string, updates: Partial<CreatePostInput>): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.content !== undefined) {
        if (updates.content.length > 5000) {
          toast({
            title: "Conteúdo muito longo",
            description: "O texto deve ter no máximo 5000 caracteres.",
            variant: "destructive",
          });
          return false;
        }
        updateData.content = updates.content.trim();
      }
      if (updates.media_ids !== undefined) updateData.media_ids = updates.media_ids;
      if (updates.platforms !== undefined) updateData.platforms = updates.platforms;
      if (updates.media_type !== undefined) updateData.media_type = updates.media_type;
      if (updates.orientation !== undefined) updateData.orientation = updates.orientation;
      if (updates.scheduled_at !== undefined) {
        updateData.scheduled_at = updates.scheduled_at?.toISOString() || null;
        updateData.status = updates.scheduled_at ? 'scheduled' : 'draft';
      }
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.published_at !== undefined) updateData.published_at = updates.published_at;

      const { error } = await supabase
        .from('scheduled_posts')
        .update(updateData)
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey });

      toast({
        title: "Post atualizado",
        description: "As alterações foram salvas.",
      });

      return true;
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deletePost = async (postId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey });

      toast({
        title: "Post excluído",
        description: "O post foi removido.",
      });

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o post.",
        variant: "destructive",
      });
      return false;
    }
  };

  const getPostsByDate = (date: Date): ScheduledPost[] => {
    const dateStr = date.toISOString().split('T')[0];
    return posts.filter((post) => {
      if (!post.scheduled_at) return false;
      return post.scheduled_at.startsWith(dateStr);
    });
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
      const { error } = await supabase
        .from('scheduled_posts')
        .update({ status: 'pending_approval' })
        .eq('id', postId)
        .eq('user_id', user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: "Enviado para aprovação", description: "O post aguarda revisão do editor." });
      addNotification({ type: 'info', title: 'Post enviado para aprovação', message: 'Seu post foi enviado e aguarda revisão de um editor.' });
      return true;
    } catch (error) {
      console.error('Error submitting for approval:', error);
      toast({ title: "Erro", description: "Não foi possível enviar para aprovação.", variant: "destructive" });
      return false;
    }
  };

  const approvePost = async (postId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({ status: 'scheduled', error_message: null })
        .eq('id', postId)
        .eq('user_id', user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: "Post aprovado!", description: "O post foi aprovado e está agendado." });
      addNotification({ type: 'success', title: 'Post aprovado', message: 'Seu post foi aprovado por um editor e está agendado para publicação.' });
      return true;
    } catch (error) {
      console.error('Error approving post:', error);
      toast({ title: "Erro", description: "Não foi possível aprovar o post.", variant: "destructive" });
      return false;
    }
  };

  const rejectPost = async (postId: string, reason: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({ status: 'rejected', error_message: reason })
        .eq('id', postId)
        .eq('user_id', user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: "Post rejeitado", description: "O post foi devolvido para revisão." });
      addNotification({ type: 'warning', title: 'Post rejeitado', message: `Seu post foi rejeitado. Motivo: ${reason}` });
      return true;
    } catch (error) {
      console.error('Error rejecting post:', error);
      toast({ title: "Erro", description: "Não foi possível rejeitar o post.", variant: "destructive" });
      return false;
    }
  };

  return {
    posts,
    loading,
    createPost,
    updatePost,
    deletePost,
    getPostsByDate,
    getUpcomingPosts,
    submitForApproval,
    approvePost,
    rejectPost,
    refetch: fetchPosts,
  };
}
