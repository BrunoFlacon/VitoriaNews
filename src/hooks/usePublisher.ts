import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

interface PublishResponse {
  results: PublishResult[];
  summary: {
    status: string;
    published_at?: string;
    error_message?: string;
  };
}

export function usePublisher() {
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();
  const { addNotification } = useNotifications();

  const resolvePrimaryPages = async (platforms: string[]): Promise<string[]> => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return platforms;

    const { data: connections } = await (supabase as any)
      .from('social_connections')
      .select('platform, platform_user_id')
      .eq('user_id', session.session.user.id)
      .eq('is_primary', true)
      .in('platform', platforms);

    if (!connections || connections.length === 0) return platforms;

    return platforms.map(p => {
      const primary = connections.find(c => c.platform === p);
      if (primary?.platform_user_id) {
        return `${p}|${primary.platform_user_id}`;
      }
      return p;
    });
  };

  const publishPost = async (
    postId: string,
    platforms: string[],
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResponse | null> => {
    if (!postId || !platforms.length || !content) {
      toast({
        title: "Dados incompletos",
        description: "Verifique o conteúdo e as plataformas selecionadas.",
        variant: "destructive",
      });
      return null;
    }

    setPublishing(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Sessão inválida");
      }

      const resolvedPlatforms = await resolvePrimaryPages(platforms);

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${baseUrl}/functions/v1/publish-post`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            postId,
            platforms: resolvedPlatforms,
            content,
            mediaUrls,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao publicar");
      }

      const data: PublishResponse = await response.json();

      // Process results
      const successful = data.results.filter(r => r.success);
      const failed = data.results.filter(r => !r.success);

      if (successful.length > 0) {
        toast({
          title: "Publicação concluída!",
          description: `Publicado em ${successful.length} plataforma(s).`,
        });

        addNotification({
          type: 'success',
          title: 'Post publicado',
          message: `Sucesso em: ${successful.map(r => r.platform).join(', ')}`,
          platform: successful[0].platform,
        });
      }

      if (failed.length > 0) {
        failed.forEach(result => {
          addNotification({
            type: 'error',
            title: `Falha em ${result.platform}`,
            message: result.error || 'Erro desconhecido',
            platform: result.platform,
          });
        });
      }

      return data;
    } catch (error) {
      toast({
        title: "Erro ao publicar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return null;
    } finally {
      setPublishing(false);
    }
  };

  const getMediaType = (url: string): string => {
    if (/\.(mp4|webm|ogg|mov)$/i.test(url)) return 'video';
    if (/\.(mp3|wav|ogg|aac)$/i.test(url)) return 'audio';
    return 'image';
  };

  const publishNow = async (
    content: string,
    platforms: string[],
    mediaUrls: string[] = []
  ): Promise<string | null> => {
    // First create the post, then publish immediately
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error("Não autenticado");
      }

      // Create post first
      const { data: post, error } = await (supabase as any)
        .from('scheduled_posts')
        .insert({
          user_id: session.session.user.id,
          content,
          platforms,
          media_ids: [],
          media_type: mediaUrls.length > 0 ? getMediaType(mediaUrls[0]) : 'image',
          status: 'scheduled',
          scheduled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Then publish
      await publishPost(post.id, platforms, content, mediaUrls);

      return post.id;
    } catch (error) {
      toast({
        title: "Erro ao publicar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    publishPost,
    publishNow,
    publishing,
  };
}
