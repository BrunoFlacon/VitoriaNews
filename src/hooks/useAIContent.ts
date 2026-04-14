import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeneratedContent {
  post: string;
  hashtags: string;
  cta: string;
  raw: string;
}

interface GenerateOptions {
  topic: string;
  platforms?: string[];
  tone?: string;
}

export function useAIContent() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateContent = async (options: GenerateOptions): Promise<GeneratedContent | null> => {
    if (!options.topic.trim()) {
      toast({
        title: "Tema obrigatório",
        description: "Digite um tema para gerar o conteúdo.",
        variant: "destructive",
      });
      return null;
    }

    setGenerating(true);

    try {
      // Get user session token for auth
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente.",
          variant: "destructive",
        });
        return null;
      }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ghtkdkauseesambzqfrd.supabase.co';
      const response = await fetch(
        `${baseUrl}/functions/v1/generate-post-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            topic: options.topic,
            platforms: options.platforms || [],
            tone: options.tone || "profissional",
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Limite de requisições",
            description: "Aguarde um momento e tente novamente.",
            variant: "destructive",
          });
          return null;
        }
        if (response.status === 402) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos à sua conta para continuar.",
            variant: "destructive",
          });
          return null;
        }
        throw new Error("Failed to generate content");
      }

      const data: GeneratedContent = await response.json();

      toast({
        title: "Conteúdo gerado!",
        description: "O texto foi criado com sucesso.",
      });

      return data;
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Erro ao gerar conteúdo",
        description: "Não foi possível gerar o conteúdo. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generateContent,
    generating,
  };
}
