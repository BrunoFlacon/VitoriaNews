import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UploadedMedia {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  thumbnail_url?: string | null;
}

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadMedia = async (file: File): Promise<UploadedMedia | null> => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer upload.",
        variant: "destructive",
      });
      return null;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Use imagens (JPG, PNG, GIF, WebP), vídeos (MP4, WebM) ou PDFs.",
        variant: "destructive",
      });
      return null;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 100MB.",
        variant: "destructive",
      });
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(50);

      // Generate signed URL (bucket is private; valid for 7 days)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('media')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);

      if (signedError) throw signedError;
      const publicUrl = signedData.signedUrl;

      // Get image/video dimensions
      let width: number | undefined;
      let height: number | undefined;
      let duration: number | undefined;

      if (file.type.startsWith('image/')) {
        const dimensions = await getImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;
      } else if (file.type.startsWith('video/')) {
        const videoInfo = await getVideoInfo(file);
        width = videoInfo.width;
        height = videoInfo.height;
        duration = videoInfo.duration;
      }

      setProgress(75);

      // Save to database
      const { data: mediaData, error: dbError } = await supabase
        .from('media')
        .insert({
          user_id: user.id,
          name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          width,
          height,
          duration,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(100);

      toast({
        title: "Upload concluído",
        description: "Arquivo enviado com sucesso.",
      });

      return mediaData;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteMedia = async (mediaId: string, fileUrl: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/media/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage
        await supabase.storage
          .from('media')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi removido com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o arquivo.",
        variant: "destructive",
      });
      return false;
    }
  };

  return { uploadMedia, deleteMedia, uploading, progress };
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = URL.createObjectURL(file);
  });
}

function getVideoInfo(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.round(video.duration),
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      resolve({ width: 0, height: 0, duration: 0 });
    };
    video.src = URL.createObjectURL(file);
  });
}
