import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GeneratedContent {
  post: string;
  hashtags: string;
  cta: string;
  title?: string;
  summary?: string;
  raw: string;
  mode?: string;
  model?: string;
  provider?: string;
}

export interface GenerateOptions {
  topic?: string;
  platforms?: string[];
  tone?: string;
  language?: string;
  mode?: 'post' | 'caption' | 'article' | 'translate' | 'social_adapt' | 'hashtags' | 'report' | 'summary';
  inputText?: string;
  targetLanguage?: string;
  mediaContext?: string;
  mediaUrls?: string[];
  attentionTechniques?: boolean;
  model?: string;
}

export interface GenerateImageOptions {
  prompt: string;
  size?: "256x256" | "512x512" | "1024x1024";
}

export interface GenerateAudioOptions {
  text: string;
  voiceId?: string;
  articleId?: string;
  language?: string;
}

export interface TranscribeOptions {
  mediaId?: string;
  mediaUrl?: string;
  targetLanguage?: string;
  generateArticle?: boolean;
}

export interface TranscribeResult {
  text: string;
  transcription?: any;
  article?: GeneratedContent | null;
}

// Available OpenRouter TTS voices
export const TTS_VOICES = [
  { id: "alloy",   label: "Alloy (neutro)",   lang: "en" },
  { id: "echo",    label: "Echo (masculino)",  lang: "en" },
  { id: "fable",   label: "Fable (britânico)", lang: "en" },
  { id: "onyx",    label: "Onyx (grave)",      lang: "en" },
  { id: "nova",    label: "Nova (feminino)",   lang: "en" },
  { id: "shimmer", label: "Shimmer (suave)",   lang: "en" },
  // Gemini voices
  { id: "Zephyr",  label: "Zephyr (Gemini)",   lang: "en" },
  { id: "Puck",    label: "Puck (Gemini)",     lang: "en" },
  { id: "Charon",  label: "Charon (Gemini)",   lang: "en" },
  { id: "Kore",    label: "Kore (Gemini)",     lang: "en" },
  { id: "Fenrir",  label: "Fenrir (Gemini)",   lang: "en" },
];

// Available AI models on OpenRouter (curated for content)
export const OPENROUTER_MODELS = [
  { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash (rápido)" },
  { id: "google/gemini-2.0-flash-001",     label: "Gemini 2.0 Flash" },
  { id: "anthropic/claude-sonnet-4",       label: "Claude Sonnet 4" },
  { id: "anthropic/claude-haiku-4-5",      label: "Claude Haiku 4.5 (rápido)" },
  { id: "openai/gpt-4o-mini",              label: "GPT-4o Mini" },
  { id: "openai/gpt-4.1",                  label: "GPT-4.1" },
  { id: "meta-llama/llama-4-maverick",     label: "Llama 4 Maverick (Meta)" },
  { id: "deepseek/deepseek-chat-v3-0324",  label: "DeepSeek Chat V3" },
];

// Available target languages for translation
export const TRANSLATE_LANGUAGES = [
  { id: "pt-BR", label: "Português (BR)" },
  { id: "en-US", label: "Inglês (EUA)" },
  { id: "es-ES", label: "Espanhol (ES)" },
  { id: "fr-FR", label: "Francês" },
  { id: "de-DE", label: "Alemão" },
  { id: "it-IT", label: "Italiano" },
  { id: "ja-JP", label: "Japonês" },
  { id: "zh-CN", label: "Chinês Simplificado" },
  { id: "ar-SA", label: "Árabe" },
  { id: "ru-RU", label: "Russo" },
];

export function useAIContent() {
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const { toast } = useToast();

  const getSession = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
      return null;
    }
    return session.session.access_token;
  }

  const generateContent = async (options: GenerateOptions): Promise<GeneratedContent | null> => {
    if (!options.topic?.trim() && !options.inputText?.trim() && options.mode !== 'hashtags') {
      toast({ title: "Campo obrigatório", description: "Digite um tema ou conteúdo para gerar.", variant: "destructive" });
      return null;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-post-content', {
        body: {
          topic: options.topic || options.inputText,
          platforms: options.platforms || [],
          tone: options.tone || "profissional",
          language: options.language || "pt-BR",
          mode: options.mode || "post",
          inputText: options.inputText,
          model: (options as any).model, // Pass selected model
          targetLanguage: options.targetLanguage,
          mediaContext: options.mediaContext,
          mediaUrls: options.mediaUrls || [],
          attentionTechniques: options.attentionTechniques ?? true,

        }
      });

      if (error) {
        let errMsg = "Não foi possível gerar o conteúdo. Tente novamente.";
        if (error.context && typeof error.context.json === 'function') {
          try { const b = await error.context.json(); if (b?.error) errMsg = b.error; } catch (e) {}
        }
        throw new Error(errMsg);
      }

      const modeLabels: Record<string, string> = {
        post: "Post gerado!", caption: "Legenda gerada!", article: "Matéria criada!",
        translate: "Tradução concluída!", social_adapt: "Conteúdo adaptado!",
      };
      toast({ title: modeLabels[options.mode || "post"] || "Conteúdo gerado!", description: `Gerado com ${data?.model || 'IA'}` });
      return data;
    } catch (error: any) {
      console.error("Error generating content:", error);
      toast({ title: "Erro ao gerar conteúdo", description: error.message || "Tente novamente.", variant: "destructive" });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  // Shorthand for generating a caption from video/audio transcription
  const generateCaption = (inputText: string, platforms?: string[]) =>
    generateContent({ mode: "caption", inputText, platforms, attentionTechniques: true });

  // Shorthand for generating a news article from transcription
  const generateArticleFromMedia = (inputText: string, platforms?: string[]) =>
    generateContent({ mode: "article", inputText, platforms, tone: "informativo e envolvente", attentionTechniques: true });

  // Translate content to another language
  const translateContent = (inputText: string, targetLanguage: string) =>
    generateContent({ mode: "translate", inputText, targetLanguage });

  // Adapt one piece of content to multiple platforms
  const adaptForPlatforms = (inputText: string, platforms: string[]) =>
    generateContent({ mode: "social_adapt", inputText, platforms });

  const generateImage = async (options: GenerateImageOptions): Promise<{ imageUrl: string; mediaId: string } | null> => {
    if (!options.prompt.trim()) {
      toast({ title: "Prompt obrigatório", description: "Descreva a imagem que deseja gerar.", variant: "destructive" });
      return null;
    }
    setGeneratingImage(true);
    try {
      const token = await getSession();
      if (!token) return null;
      const { data, error } = await supabase.functions.invoke('generate-image', { body: options });
      if (error) throw error;
      toast({ title: "Imagem gerada!", description: "Salva na galeria." });
      return data;
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Erro ao gerar imagem", description: "Verifique suas credenciais de IA.", variant: "destructive" });
      return null;
    } finally {
      setGeneratingImage(false);
    }
  };

  const generateAudio = async (options: GenerateAudioOptions): Promise<{ audioUrl: string; provider?: string } | null> => {
    if (!options.text.trim()) return null;
    setGeneratingAudio(true);
    try {
      const token = await getSession();
      if (!token) return null;
      const { data, error } = await supabase.functions.invoke('text-to-speech', { body: options });
      if (error) throw error;
      toast({ title: "Áudio gerado!", description: `Voz criada com sucesso${data?.provider ? ` via ${data.provider}` : ""}.` });
      return data;
    } catch (error: any) {
      console.error("Error generating audio:", error);
      toast({ title: "Erro ao gerar áudio", description: error.message || "Não foi possível converter o texto em áudio.", variant: "destructive" });
      return null;
    } finally {
      setGeneratingAudio(false);
    }
  };

  const transcribeMedia = async (options: TranscribeOptions): Promise<TranscribeResult | null> => {
    if (!options.mediaId && !options.mediaUrl) {
      toast({ title: "Mídia obrigatória", description: "Selecione um áudio ou vídeo para transcrever.", variant: "destructive" });
      return null;
    }
    setTranscribing(true);
    try {
      const token = await getSession();
      if (!token) return null;
      const { data, error } = await supabase.functions.invoke('transcribe-media', { 
        body: { ...options, fileUrl: options.mediaUrl } 
      });
      
      if (error) {
        let errMsg = "Não foi possível transcrever a mídia.";
        if (error.context && typeof error.context.json === 'function') {
          try { const b = await error.context.json(); if (b?.error) errMsg = b.error; } catch (e) {}
        }
        throw new Error(errMsg);
      }

      toast({ title: "Transcrição concluída!", description: options.generateArticle ? "Matéria gerada automaticamente." : "Texto extraído com sucesso." });
      return data;
    } catch (error: any) {
      console.error("Error transcribing media:", error);
      toast({ title: "Erro na transcrição", description: error.message || "Não foi possível transcrever a mídia.", variant: "destructive" });
      return null;
    } finally {
      setTranscribing(false);
    }
  };

  return {
    // State
    generating,
    generatingImage,
    generatingAudio,
    transcribing,
    // Core actions
    generateContent,
    generateImage,
    generateAudio,
    transcribeMedia,
    // Shorthand helpers
    generateCaption,
    generateArticleFromMedia,
    translateContent,
    adaptForPlatforms,
    // Metadata
    TTS_VOICES,
    OPENROUTER_MODELS,
    TRANSLATE_LANGUAGES,
  };
}
