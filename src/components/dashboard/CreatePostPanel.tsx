import { useState, useRef, useCallback, useEffect, useMemo, startTransition } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { SafeImage } from "@/components/ui/SafeImage";
import { 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Calendar, 
  Send, 
  Sparkles,
  Clock,
  Hash,
  Smartphone,
  Monitor,
  X,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Wand2,
  ChevronLeft,
  ShieldCheck,
  ShieldX,
  Music,
  User,
  Layers,
  Smile,
  PenSquare,
  Newspaper,
  Globe,
  Share2,
  Plus,
  Eye,
  Lock,
  Star,
  Zap

} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { socialPlatforms, SocialPlatformId } from "@/components/icons/platform-metadata";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
import { useMediaUpload, type UploadedMedia } from "@/hooks/useMediaUpload";
import { BulkUploadDialog } from "@/components/dashboard/BulkUploadDialog";
import { GiphySearch } from "@/components/dashboard/GiphySearch";
import { SpotifySearch } from "@/components/dashboard/SpotifySearch";
import { 
  PostPreview, 
  InstagramCard, 
  FacebookCard, 
  XLikeCard, 
  LinkedInCard
} from "@/components/dashboard/PostPreview";
import { getMediaUrl, saveSelectedAccounts } from "@/utils/mediaUtils";
import { PostsFeedView } from "@/components/dashboard/PostsFeedView";
import { ScheduledPost, CreatePostInput } from "@/hooks/useScheduledPosts";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAIContent } from "@/hooks/useAIContent";
import { usePublisher } from "@/hooks/usePublisher";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MediaType = "image" | "video" | "audio" | "document" | "story" | "live";

const mediaTypes: { id: MediaType; icon: typeof ImageIcon; label: string; accept: string }[] = [
  { id: "image", icon: ImageIcon, label: "Imagem", accept: "image/*" },
  { id: "video", icon: Video, label: "Vídeo", accept: "video/*" },
  { id: "audio", icon: Music, label: "Áudio", accept: "audio/*" },
];

// Best posting times per platform (based on general research)
const bestPostingTimes: Partial<Record<SocialPlatformId, { day: string; time: string; engagement: string }[]>> = {
  instagram: [
    { day: "Terça", time: "11:00", engagement: "Alto" },
    { day: "Quarta", time: "11:00", engagement: "Alto" },
    { day: "Sexta", time: "10:00-11:00", engagement: "Muito Alto" },
  ],
  facebook: [
    { day: "Terça", time: "09:00", engagement: "Alto" },
    { day: "Quarta", time: "09:00-13:00", engagement: "Muito Alto" },
    { day: "Quinta", time: "09:00", engagement: "Alto" },
  ],
  twitter: [
    { day: "Terça", time: "09:00", engagement: "Alto" },
    { day: "Quarta", time: "09:00", engagement: "Alto" },
    { day: "Quinta", time: "09:00-11:00", engagement: "Muito Alto" },
  ],
  linkedin: [
    { day: "Terça", time: "10:00-12:00", engagement: "Muito Alto" },
    { day: "Quarta", time: "12:00", engagement: "Alto" },
    { day: "Quinta", time: "09:00-10:00", engagement: "Alto" },
  ],
  youtube: [
    { day: "Quinta", time: "15:00-16:00", engagement: "Alto" },
    { day: "Sexta", time: "15:00-16:00", engagement: "Muito Alto" },
    { day: "Sábado", time: "09:00-11:00", engagement: "Alto" },
  ],
  tiktok: [
    { day: "Terça", time: "09:00", engagement: "Alto" },
    { day: "Quinta", time: "12:00", engagement: "Muito Alto" },
    { day: "Sexta", time: "17:00", engagement: "Alto" },
  ],
  pinterest: [
    { day: "Sexta", time: "15:00", engagement: "Alto" },
    { day: "Sábado", time: "20:00-23:00", engagement: "Muito Alto" },
    { day: "Domingo", time: "20:00-23:00", engagement: "Alto" },
  ],
  whatsapp: [
    { day: "Segunda", time: "09:00-12:00", engagement: "Alto" },
    { day: "Quarta", time: "09:00-12:00", engagement: "Alto" },
    { day: "Sexta", time: "09:00-12:00", engagement: "Muito Alto" },
  ],
  telegram: [
    { day: "Segunda", time: "09:00", engagement: "Alto" },
    { day: "Quarta", time: "12:00", engagement: "Alto" },
    { day: "Sexta", time: "09:00", engagement: "Muito Alto" },
  ],
  snapchat: [
    { day: "Sábado", time: "22:00", engagement: "Muito Alto" },
    { day: "Domingo", time: "20:00", engagement: "Alto" },
  ],
  threads: [
    { day: "Terça", time: "11:00", engagement: "Alto" },
    { day: "Quinta", time: "09:00", engagement: "Alto" },
  ],
  truthsocial: [
    { day: "Segunda", time: "10:00", engagement: "Alto" },
    { day: "Quarta", time: "12:00", engagement: "Alto" },
    { day: "Sexta", time: "15:00", engagement: "Muito Alto" },
  ],
  gettr: [
    { day: "Terça", time: "11:00", engagement: "Alto" },
    { day: "Quinta", time: "13:00", engagement: "Alto" },
  ],
  site: [
    { day: "Terça", time: "10:00", engagement: "Alto" },
    { day: "Quinta", time: "14:00", engagement: "Alto" },
  ],
  kwai: [
    { day: "Segunda", time: "12:00", engagement: "Alto" },
    { day: "Quarta", time: "18:00", engagement: "Muito Alto" },
    { day: "Sábado", time: "20:00", engagement: "Alto" },
  ],
  rumble: [
    { day: "Terça", time: "11:00", engagement: "Alto" },
    { day: "Quinta", time: "13:00", engagement: "Muito Alto" },
    { day: "Domingo", time: "18:00", engagement: "Alto" },
  ],
  medium: [
    { day: "Terça", time: "09:00", engagement: "Muito Alto" },
    { day: "Quarta", time: "10:00", engagement: "Alto" },
    { day: "Sábado", time: "08:00", engagement: "Alto" },
  ],
  substack: [
    { day: "Terça", time: "07:00", engagement: "Muito Alto" },
    { day: "Quinta", time: "08:00", engagement: "Alto" },
    { day: "Domingo", time: "10:00", engagement: "Alto" },
  ],
  resend: [
    { day: "Terça", time: "10:00", engagement: "Muito Alto" },
    { day: "Quarta", time: "10:00", engagement: "Alto" },
    { day: "Quinta", time: "10:00", engagement: "Alto" },
  ],
};

// Popular hashtags per platform
const popularHashtags: Partial<Record<SocialPlatformId, string[]>> = {
  instagram: ["#instagood", "#photooftheday", "#instadaily", "#love", "#fashion", "#beautiful", "#happy", "#picoftheday", "#style", "#follow"],
  facebook: ["#facebook", "#viral", "#love", "#instagood", "#followme", "#photooftheday", "#fun", "#smile", "#happy", "#friends"],
  twitter: ["#trending", "#viral", "#breaking", "#news", "#tech", "#business", "#marketing", "#socialmedia", "#motivation", "#success"],
  linkedin: ["#business", "#entrepreneur", "#success", "#motivation", "#leadership", "#marketing", "#innovation", "#startup", "#career", "#networking"],
  youtube: ["#youtube", "#viral", "#subscribe", "#video", "#tutorial", "#vlog", "#entertainment", "#music", "#gaming", "#trending"],
  tiktok: ["#fyp", "#foryou", "#foryoupage", "#viral", "#trending", "#tiktok", "#dance", "#funny", "#comedy", "#duet"],
  pinterest: ["#pinterest", "#diy", "#homedecor", "#fashion", "#recipe", "#inspiration", "#wedding", "#art", "#design", "#travel"],
  whatsapp: ["#whatsapp", "#status", "#love", "#quotes", "#motivation", "#funny", "#viral", "#trending", "#life", "#happy"],
  telegram: ["#telegram", "#channel", "#news", "#viral", "#community", "#group", "#updates", "#trending"],
  snapchat: ["#snapchat", "#snap", "#filters", "#story", "#viral", "#fun", "#friends"],
  threads: ["#threads", "#meta", "#viral", "#trending", "#community", "#conversation"],
  site: ["#website", "#blog", "#content", "#digital", "#online", "#web"],
};

const postTemplates = [
  {
    name: "Notícia Rápida 📰",
    description: "Ideal para furos ou manchetes imediatas",
    content: "🔴 NOTÍCIA DE ÚLTIMA HORA:\n\n[Insira a manchete aqui]\n\n👉 [Detalhes rápidos sobre o ocorrido].\n\nFique por dentro para mais atualizações em instantes.\n\n#VitoriaNews #Noticias #Tupa"
  },
  {
    name: "Alerta ⚠️",
    description: "Alertas de trânsito ou tempo para a comunidade local",
    content: "⚠️ ATENÇÃO MOTORISTAS E MORADORES:\n\n[Descreva a situação/localização aqui]\n\n🌧️ Condições atuais: [Insira tempo/situação].\n\nCompartilhe com quem precisa passar por essa região.\n\n#Alerta #Cidade #VitoriaNews"
  },
  {
    name: "Giro 🎙️",
    description: "Giro de notícias curto da redação",
    content: "🎙️ GIRO DE NOTÍCIAS DA REDAÇÃO:\n\n1️⃣ [Destaque 1]\n2️⃣ [Destaque 2]\n3️⃣ [Destaque 3]\n\nQual dessas pautas você está acompanhando mais de perto? Deixe nos comentários!\n\n#GiroDeNoticias #RadarNews #TupaRegiao"
  }
];

interface CreatePostPanelProps {
  initialDate?: string;
  editingPost?: ScheduledPost | null;
  onPostSaved?: () => void;
  onBackToCalendar?: () => void;
  onEditPost?: (post: ScheduledPost) => void;
  createPost: (input: CreatePostInput) => Promise<ScheduledPost | null>;
  updatePost: (postId: string, updates: Partial<CreatePostInput>) => Promise<boolean>;
  submitForApproval: (postId: string) => Promise<boolean>;
  approvePost?: (postId: string) => Promise<boolean>;
  rejectPost?: (postId: string, reason: string) => Promise<boolean>;
}

const ResolvedVideo = ({ fileUrl, className }: { fileUrl: string; className?: string }) => {
  const resolvedUrl = getMediaUrl(fileUrl);
  if (!resolvedUrl) return <div className={cn("bg-muted animate-pulse rounded-lg", className)} />;
  return <video src={resolvedUrl} controls className={className} />;
};

export const CreatePostPanel = ({ initialDate, editingPost, onPostSaved, onBackToCalendar, onEditPost, createPost, updatePost, submitForApproval, approvePost, rejectPost }: CreatePostPanelProps) => {
  const [content, setContent] = useState(editingPost?.content || "");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(() => {
    if (editingPost?.platforms) return editingPost.platforms as string[];
    
    // Pre-select based on dashboard choices
    try {
      const saved = localStorage.getItem('dashboard_selected_accounts');
      if (saved) {
        const selected = JSON.parse(saved) as Record<string, string>;
        // Filter out platforms that don't have a valid account ID saved
        return Object.entries(selected)
          .filter(([_, accountId]) => accountId && accountId !== 'all')
          .map(([platform, accountId]) => 
            `${platform}|${accountId}`
          );
      }
    } catch (e) {
      console.warn("Error parsing saved accounts", e);
    }
    return [];
  });

  const [selectedMedia, setSelectedMedia] = useState<MediaType | null>(
    (editingPost?.media_type as MediaType) || null
  );
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    (editingPost?.orientation as "horizontal" | "vertical") || "horizontal"
  );
  const [scheduledDate, setScheduledDate] = useState<string>(
    editingPost?.scheduled_at
      ? new Date(editingPost.scheduled_at).toISOString().slice(0, 16)
      : initialDate || ""
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [showBestTimes, setShowBestTimes] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("profissional");
  const [imagePrompt, setImagePrompt] = useState("");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"criar" | "visualizar" | "preview">("criar");
  const [videoTitle, setVideoTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailAspect, setThumbnailAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private" | "subscribers">("public");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  
  // AI Generation States
  const [aiMode, setAiMode] = useState<'post' | 'caption' | 'article' | 'translate' | 'social_adapt'>('post');
  const [aiModel, setAiModel] = useState('google/gemini-2.0-flash-001');
  const [aiLanguage, setAiLanguage] = useState('pt-BR');
  const [aiInputText, setAiInputText] = useState("");
  const [aiTargetLanguage, setAiTargetLanguage] = useState('en-US');
  const [includeAttentionHooks, setIncludeAttentionHooks] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMedia, uploading, progress: uploadProgress } = useMediaUpload();
  
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const { 
    generateContent, generateImage, generateAudio, transcribeMedia,
    generating, transcribing, OPENROUTER_MODELS, TRANSLATE_LANGUAGES, TTS_VOICES 
  } = useAIContent();
  const { publishNow, publishing } = usePublisher();
  const { connections } = useSocialConnections();
  const { isEditor } = useUserRole();

  const [debouncedContent, setDebouncedContent] = useState(content);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(content);
    }, 300);
    return () => clearTimeout(timer);
  }, [content]);

  const isPlatformConnected = (platformId: string) =>
    connections.some(c => c.platform === platformId && c.is_connected);

  const isEditing = !!editingPost;

  // Sync state when editingPost or initialDate changes
  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.content || "");
      setSelectedPlatforms((editingPost.platforms as SocialPlatformId[]) || []);
      setSelectedMedia((editingPost.media_type as MediaType) || null);
      setOrientation((editingPost.orientation as "horizontal" | "vertical") || "horizontal");
      setScheduledDate(
        editingPost.scheduled_at
          ? new Date(editingPost.scheduled_at).toISOString().slice(0, 16)
          : ""
      );
      if (editingPost.media_ids && editingPost.media_ids.length > 0) {
        (supabase as any)
          .from("media")
          .select("id, file_url, name, file_type, file_size")
          .in("id", editingPost.media_ids)
          .then(({ data }: any) => {
            if (data) {
              setUploadedFiles(data.map((m: any) => ({
                id: m.id,
                file_url: m.file_url,
                name: m.name,
                file_type: m.file_type,
                file_size: m.file_size
              })));
            }
          });
      } else {
        setUploadedFiles([]);
      }
      setActiveTab("criar");
    } else {
      setContent("");
      setSelectedPlatforms([]);
      setSelectedMedia(null);
      setOrientation("horizontal");
      setScheduledDate(initialDate || "");
      setUploadedFiles([]);
    }
  }, [editingPost, initialDate]);

  const togglePlatform = (id: SocialPlatformId) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    saveSelectedAccounts(selectedPlatforms);
  }, [selectedPlatforms]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Upload all selected files in order
    const fileArray = Array.from(files);
    const results = await Promise.all(fileArray.map(f => uploadMedia(f)));
    const uploaded = results.filter(Boolean) as UploadedMedia[];

    if (uploaded.length > 0) {
      setUploadedFiles(prev => [...prev, ...uploaded]);
      if (uploaded.length === 1) {
        toast({ title: "Arquivo enviado!", description: `${fileArray[0].name} carregado com sucesso.` });
      } else {
        toast({ title: `${uploaded.length} arquivos enviados!`, description: "Os arquivos serão exibidos como carrossel na prévia." });
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadMedia, toast]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const results = await Promise.all(fileArray.map(f => uploadMedia(f)));
    const uploaded = results.filter(Boolean) as UploadedMedia[];

    if (uploaded.length > 0) {
      setUploadedFiles(prev => [...prev, ...uploaded]);
      if (uploaded.length === 1) {
        toast({ title: "Arquivo enviado!", description: `${fileArray[0].name} carregado com sucesso.` });
      } else {
        toast({ title: `${uploaded.length} arquivos enviados!`, description: "Os arquivos serão exibidos como carrossel na prévia." });
      }
    }
  }, [uploadMedia, toast]);

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getAcceptedTypes = () => {
    if (!selectedMedia) return "*/*";
    return mediaTypes.find(t => t.id === selectedMedia)?.accept || "*/*";
  };

  const insertHashtags = (hashtags: string[]) => {
    const hashtagString = hashtags.join(" ");
    setContent(prev => prev + (prev ? "\n\n" : "") + hashtagString);
    setShowHashtags(false);
  };

  const applyBestTime = (day: string, time: string) => {
    // Calculate next occurrence of the day
    const dayMap: Record<string, number> = {
      "Domingo": 0, "Segunda": 1, "Terça": 2, "Quarta": 3,
      "Quinta": 4, "Sexta": 5, "Sábado": 6
    };
    
    const today = new Date();
    const targetDay = dayMap[day];
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    
    // Parse time (handle ranges like "10:00-12:00")
    const timePart = time.split("-")[0].trim();
    const [hours, minutes] = timePart.split(":").map(Number);
    targetDate.setHours(hours, minutes, 0, 0);
    
    // Format for datetime-local input
    const formatted = targetDate.toISOString().slice(0, 16);
    setScheduledDate(formatted);
    setShowBestTimes(false);
    
    addNotification({
      type: 'success',
      title: 'Horário sugerido aplicado',
      message: `Agendado para ${day} às ${timePart}`,
    });
    
    toast({
      title: "Horário aplicado!",
      description: `Agendado para ${day} às ${timePart}`,
    });
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const result = await generateImage({ prompt: imagePrompt });
      if (result) {
        setUploadedFiles(prev => [...prev, {
          id: result.mediaId,
          file_url: result.imageUrl,
          name: `IA: ${imagePrompt.slice(0, 20)}`,
          file_type: "image/png",
          file_size: 0
        }]);
        setShowImageDialog(false);
        setImagePrompt("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!content.trim()) return;
    setIsGeneratingAudio(true);
    try {
      const result = await generateAudio({ text: content });
      if (result) {
        setUploadedFiles(prev => [...prev, {
          id: `audio-${Date.now()}`,
          file_url: result.audioUrl,
          name: "IA Áudio",
          file_type: "audio/mpeg",
          file_size: 0
        }]);
        setShowAudioDialog(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleSubmit = async (asDraft = false) => {
    if (!content.trim()) {
      toast({ title: "Conteúdo obrigatório", description: "Digite o texto do seu post.", variant: "destructive" });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: "Selecione plataformas", description: "Escolha pelo menos uma rede social.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const scheduledAt = scheduledDate && !asDraft ? new Date(scheduledDate) : undefined;
      
      if (scheduledAt && scheduledAt <= new Date()) {
        toast({ title: "Data inválida", description: "A data de agendamento deve ser no futuro.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      if (isEditing && editingPost) {
        // Update existing post
        const success = await updatePost(editingPost.id, {
          content: content.trim(),
          media_ids: uploadedFiles.map(f => f.id),
          platforms: selectedPlatforms,
          media_type: selectedMedia || "image",
          orientation,
          scheduled_at: scheduledAt,
        });

        if (success) {
          addNotification({
            type: "success",
            title: "🌟 Excelente trabalho!",
            message: "Sua publicação foi atualizada e as melhorias foram salvas com sucesso.",
            platform: selectedPlatforms[0],
          });
          onPostSaved?.();
        }
      } else {
        // Create new post
        const post = await createPost({
          content: content.trim(),
          media_ids: uploadedFiles.map(f => f.id),
          platforms: selectedPlatforms,
          media_type: selectedMedia || "image",
          orientation,
          scheduled_at: scheduledAt,
        });

        if (post) {
          const successTitle = asDraft ? "📝 Rascunho salvo!" : scheduledAt ? "🚀 Agendado com sucesso!" : "✅ Publicado com sucesso!";
          const successMsg = asDraft
            ? "Seu rascunho foi guardado. Ótimo começo!"
            : scheduledAt
              ? `Parabéns pelo trabalho! Sua publicação será postada em ${scheduledAt.toLocaleDateString('pt-BR')} às ${scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
              : "Parabéns! Sua publicação já está no ar e brilhando nas redes.";

          addNotification({
            type: "success",
            title: successTitle,
            message: successMsg,
            platform: selectedPlatforms[0],
          });

          setContent("");
          setSelectedPlatforms([]);
          setSelectedMedia(null);
          setScheduledDate("");
          setUploadedFiles([]);
          onPostSaved?.();
        }
      }
    } catch (error) {
      toast({
        title: "Erro ao criar rascunho",
        description: "Não foi possível salvar sua imagem.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateHashtags = async () => {
    const result = await generateContent({
      inputText: content,
      platforms: selectedPlatforms,
      mode: "hashtags",
      model: aiModel
    });
    if (result && result.hashtags) {
      setContent(prev => {
        const text = prev.trim();
        return text ? `${text}\n\n${result.hashtags}` : result.hashtags;
      });
      setShowHashtags(false);
    }
  };

  const handleTranscribeAndSummarize = async (file: UploadedMedia, mode: "summary" | "report") => {
    // 1. Transcribe the audio/video
    const transcribeResult = await transcribeMedia({
      mediaUrl: getMediaUrl(file.file_url)
    });
    
    if (transcribeResult?.text) {
      // 2. Send transcription to AI to generate content
      const result = await generateContent({
        inputText: transcribeResult.text,
        platforms: selectedPlatforms,
        mode: mode,
        model: aiModel
      });
      
      if (result) {
        let finalContent = result.post;
        if (result.title) finalContent = `**${result.title}**\n\n${finalContent}`;
        if (result.hashtags) finalContent += `\n\n${result.hashtags}`;
        if (result.cta) finalContent += `\n\n${result.cta}`;
        
        setContent(finalContent);
      }
    }
  };

  const characterCount = content.length;
  const maxCharacters = 5000;

  // Extract unique platform IDs from 'platformId|accountId' format
  const selectedPlatformIds = Array.from(new Set(
    selectedPlatforms.map(p => p.split('|')[0])
  )) as SocialPlatformId[];

  const selectedHashtags: string[] = selectedPlatformIds.length > 0
    ? Array.from(new Set(selectedPlatformIds.flatMap(p => popularHashtags[p]?.slice(0, 5) || [])))
    : [];

  const selectedBestTimes = selectedPlatformIds.map(p => ({
    platform: socialPlatforms.find(sp => sp.id === p),
    times: bestPostingTimes[p] || [],
  })).filter(item => item.times.length > 0);

  const platformConnectionData = useMemo(() => {
    return socialPlatforms
      .filter(p => p.type === 'social')
      .map(platform => {
        const platformConnections = connections.filter(c => c.platform === platform.id && c.is_connected);
        const hasConnections = platformConnections.length > 0;
        
        const selectedInPlatform = platformConnections.filter(c => selectedPlatforms.includes(`${platform.id}|${c.id}`));
        const isGenericSelected = selectedPlatforms.includes(platform.id);
        const isSelected = selectedInPlatform.length > 0 || isGenericSelected;
        
        const sortedConnections = [...platformConnections].sort((a, b) => {
          const aId = Number(a.platform_user_id) || 0;
          const bId = Number(b.platform_user_id) || 0;
          if (aId > 0 && bId <= 0) return -1;
          if (aId <= 0 && bId > 0) return 1;
          return 0;
        });
        
        const primaryAccount = selectedInPlatform[0] || (sortedConnections.length === 1 ? sortedConnections[0] : null);

        return {
          platform,
          connections: sortedConnections,
          hasConnections,
          isSelected,
          selectedInPlatform,
          primaryAccount
        };
      });
  }, [socialPlatforms, connections, selectedPlatforms]);

  const previewData = useMemo(() => {
    const firstSelected = platformConnectionData.find(p => p.isSelected);
    return {
      authorName: firstSelected?.primaryAccount?.page_name || firstSelected?.primaryAccount?.username || "Vitória News",
      authorAvatar: firstSelected?.primaryAccount?.profile_picture || firstSelected?.primaryAccount?.profile_image_url || undefined,
    };
  }, [platformConnectionData]);


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl border border-border overflow-hidden"
    >
      {/* Hidden file input - multiple files allowed */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedTypes()}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBackToCalendar && (
              <button
                onClick={onBackToCalendar}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-lg md:text-xl truncate">
                {isEditing ? "Editar Publicação" : "Criar Publicação"}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                {isEditing
                  ? "Edite o conteúdo e republique ou reagende"
                  : "Publique em múltiplas redes simultaneamente"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditing && (
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium hidden md:inline">
                Editando pauta
              </span>
            )}
            <span className={cn(
              "text-sm font-medium",
              characterCount > maxCharacters ? "text-destructive" : "text-muted-foreground"
            )}>
              {characterCount}/{maxCharacters}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <TooltipProvider>
          <div className="flex gap-1 mt-4 bg-muted/50 rounded-xl p-1">
            {(["criar", "preview", "visualizar"] as const).map(tab => (
              <Tooltip key={tab}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => startTransition(() => setActiveTab(tab))}
                    className={cn(
                      "flex-1 py-2.5 px-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                      activeTab === tab
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === "criar" && <PenSquare className="w-4 h-4" />}
                    {tab === "preview" && <Smartphone className="w-4 h-4" />}
                    {tab === "visualizar" && <Eye className="w-4 h-4" />}
                    <span className="hidden md:inline">{tab === "criar" ? "Criar" : tab === "preview" ? "Preview" : "Posts"}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {tab === "criar" ? "Criar Post" : tab === "preview" ? "Preview do Post" : "Gerenciar Posts"}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {activeTab === "visualizar" ? (
        <div className="p-4 md:p-6">
          <PostsFeedView
            onEditPost={(post) => {
              // Para carrosseis, não altera a aba — o Dashboard redireciona para o editor de carrossel
              if (post.media_type !== "carousel") {
                setActiveTab("criar");
              }
              if (onEditPost) onEditPost(post);
            }}
          />
        </div>
      ) : activeTab === "preview" ? (
        <div className="p-4 md:p-6">
          <PostPreview
            content={debouncedContent}
            selectedPlatforms={selectedPlatforms}
            uploadedFiles={uploadedFiles}
            videoTitle={videoTitle}
            thumbnailUrl={thumbnailUrl || undefined}
            mediaType={selectedMedia}
            authorName={previewData.authorName}
            authorAvatar={previewData.authorAvatar}
            platformId={selectedPlatforms[0]?.split('|')[0]}
            realMetrics={platformConnectionData.find(p => p.isSelected)?.primaryAccount}
            visibility={visibility}
          />
        </div>
      ) : (
      <div className="p-4 md:p-6 space-y-6">

        {/* Platform Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">
            Selecionar Redes Sociais
          </label>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {platformConnectionData.map(({ platform, connections: platformConnections, hasConnections, isSelected, selectedInPlatform, primaryAccount }) => {

              const Icon = platform.icon;
              

              return (
                <div 
                  key={`platform-container-${platform.id}`}
                  className="relative group"
                  onMouseEnter={() => { if (window.innerWidth >= 768) setHoveredPlatform(platform.id); }}
                  onMouseLeave={() => { if (window.innerWidth >= 768) setHoveredPlatform(null); }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      // On mobile, first click shows the menu if there are connections
                      if (window.innerWidth < 768 && hasConnections) {
                        setHoveredPlatform(prev => prev === platform.id ? null : platform.id);
                        return;
                      }

                      if (!hasConnections) {
                        togglePlatform(platform.id as SocialPlatformId);
                      } else if (platformConnections.length === 1) {
                        togglePlatform(`${platform.id}|${platformConnections[0].id}`);
                      } else {
                        // On desktop, if it has many connections, maybe toggle the first or just let hover work
                        setHoveredPlatform(hoveredPlatform === platform.id ? null : platform.id);

                      }
                    }}
                    className={cn(
                      "flex items-center justify-center md:justify-start gap-2.5 p-2 md:px-3.5 md:py-2.5 rounded-xl md:rounded-xl border transition-all relative outline-none w-12 h-12 md:w-auto md:h-auto shrink-0",
                      isSelected
                        ? "border-primary border-[1.5px] bg-primary/10 text-primary shadow-sm shadow-primary/20"
                        : "border-border hover:border-primary/50 text-muted-foreground bg-background",
                      !hasConnections && "opacity-60"
                    )}
                  >
                    <div className="relative shrink-0 flex items-center justify-center">
                      <PlatformIconBadge
                        platform={platform}
                        size="sm"
                        muted={!hasConnections}
                      />
                      {hasConnections && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background bg-green-500" />
                      )}
                      {!hasConnections && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background bg-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Label shown only on hover/touch or on desktop */}
                    <AnimatePresence>
                      {hoveredPlatform === platform.id && (
                        <motion.span 
                          key={`label-${platform.id}`}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] font-bold rounded shadow-lg z-[60] whitespace-nowrap pointer-events-none md:static md:opacity-100 md:ml-0 md:bg-transparent md:p-0 md:text-sm md:shadow-none md:flex-1 md:truncate"
                        >
                          {platform.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className="hidden md:inline text-sm font-semibold truncate ml-1">
                      {isSelected && primaryAccount ? (
                        <span className="flex flex-col items-start leading-tight">
                          <span className="text-[10px] opacity-70 uppercase font-bold tracking-tighter">{platform.name}</span>
                          <span className="truncate max-w-[120px] text-xs font-black">{primaryAccount.page_name || primaryAccount.username}</span>
                        </span>
                      ) : (
                        <span className="font-bold">{platform.name}</span>
                      )}
                    </span>
                    
                    {isSelected && (
                      <X 
                        className="hidden md:block w-3.5 h-3.5 shrink-0 opacity-70 hover:opacity-100 transition-opacity ml-1" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!hasConnections) togglePlatform(platform.id as SocialPlatformId);
                          else selectedInPlatform.forEach(c => togglePlatform(`${platform.id}|${c.id}` as SocialPlatformId));
                        }} 
                      />
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {hoveredPlatform === platform.id && hasConnections && (
                      <motion.div
                        key={`menu-${platform.id}`}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-0 mt-2 min-w-[240px] bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-xl z-50 flex flex-col overflow-hidden"
                      >
                        <div className="p-3 border-b border-border/50 bg-muted/40 flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", platform.textColor)} />
                          <p className="text-xs font-bold text-foreground capitalize">Contas do {platform.name}</p>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-1.5 flex flex-col gap-1 custom-scrollbar">
                          {platformConnections.map(conn => {
                            const connKey = `${platform.id}|${conn.id}` as SocialPlatformId;
                            const isConnSelected = selectedPlatforms.includes(connKey);
                            return (
                              <button
                                key={conn.id}
                                onClick={() => togglePlatform(connKey)}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left w-full relative overflow-hidden group/btn",
                                  isConnSelected 
                                    ? "bg-primary/10 text-primary hover:bg-primary/20" 
                                    : "text-foreground hover:bg-muted"
                                )}
                              >
                                <div className={cn("w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors z-10", 
                                  isConnSelected 
                                    ? "bg-primary border-primary text-primary-foreground" 
                                    : "border-muted-foreground/30 group-hover/btn:border-muted-foreground/50 bg-background"
                                )}>
                                  {isConnSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </div>
                                <span className="truncate flex-1 font-medium z-10">{conn.page_name || `Conta de ${platform.name}`}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Media Type Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">
            Tipo de Mídia
          </label>
          <div className="flex flex-wrap gap-2">
            {mediaTypes.map((type) => (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedMedia(selectedMedia === type.id ? null : type.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                  selectedMedia === type.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-accent/50 text-muted-foreground"
                )}
              >
                <type.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{type.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Orientation (for video/story) */}
        <AnimatePresence mode="wait">
          {(selectedMedia === "video" || selectedMedia === "story") && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="text-sm font-medium mb-3 block">
                Orientação do Vídeo
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrientation("horizontal")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                    orientation === "horizontal"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground"
                  )}
                >
                  <div className="w-6 h-4 border-2 border-current rounded" />
                  <span className="text-sm font-medium">Horizontal</span>
                </button>
                <button
                  onClick={() => setOrientation("vertical")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                    orientation === "vertical"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground"
                  )}
                >
                  <div className="w-4 h-6 border-2 border-current rounded" />
                  <span className="text-sm font-medium">Vertical</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Title + Thumbnail — shown only for video */}
        <AnimatePresence mode="wait">
          {selectedMedia === "video" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Título do Vídeo <span className="text-muted-foreground text-xs">(YouTube, Reels, TikTok)</span>
                </label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Ex: Confira as notícias de hoje em Tupã..."
                  className="bg-muted/50 border-border focus:border-primary"
                  maxLength={100}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{videoTitle.length}/100</p>
              </div>

              {/* Thumbnail / Capa */}
              <div>
                <label className="text-sm font-medium mb-2 block">Capa do Vídeo (Thumbnail)</label>
                {/* Aspect ratio selector */}
                <div className="flex gap-2 mb-3">
                  {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setThumbnailAspect(ratio)}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                        thumbnailAspect === ratio
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <div
                        className="border-2 border-current rounded"
                        style={{
                          width: ratio === "9:16" ? "12px" : ratio === "1:1" ? "16px" : "24px",
                          height: ratio === "16:9" ? "14px" : ratio === "1:1" ? "16px" : "22px",
                        }}
                      />
                      {ratio}
                    </button>
                  ))}
                  <p className="self-center text-[10px] text-muted-foreground ml-1">
                    {thumbnailAspect === "16:9" ? "Horizontal • Feed YouTube" : thumbnailAspect === "9:16" ? "Vertical • Reels/Shorts" : "Quadrado • Instagram"}
                  </p>
                </div>

                {/* Thumbnail upload */}
                {thumbnailUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-border bg-black/5">
                    <img
                      src={thumbnailUrl}
                      alt="capa"
                      className={cn("w-full object-contain", thumbnailAspect === "9:16" ? "aspect-[9/16] max-h-48 object-center" : thumbnailAspect === "1:1" ? "aspect-square max-h-48" : "aspect-video max-h-36")}
                    />
                    <button
                      onClick={() => setThumbnailUrl(null)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors group">
                    <Upload className="w-7 h-7 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                    <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Clique para adicionar capa</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WebP</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setThumbnailUrl(url);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Area */}
        <AnimatePresence mode="wait">
          {selectedMedia && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {(uploadedFiles.length === 0 || uploading) && (
                <div 
                  className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={handleUploadClick}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                      <p className="font-medium">Enviando arquivo...</p>
                      <div className="w-48 mx-auto bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="font-medium mb-1">
                        Arraste e solte ou clique para fazer upload
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMedia === "video" ? "Suporta: MP4, MOV, AVI" : selectedMedia === "audio" ? "Suporta: MP3, WAV, OGG, FLAC" : "Suporta: JPG, PNG, GIF, WebP"}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file) => (
                    <div 
                      key={file.id}
                      className="flex flex-col gap-3 p-4 bg-muted/30 rounded-xl relative"
                    >
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-destructive/80 rounded-full transition-colors z-10"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>

                      {file.file_type.startsWith("image/") ? (
                        <SafeImage 
                          src={getMediaUrl(file.file_url)} 

                          alt={file.name}
                          className="w-full max-h-[300px] object-contain rounded-lg bg-black/5"
                        />
                      ) : file.file_type.startsWith("video/") ? (
                        <ResolvedVideo
                          fileUrl={file.file_url}
                          className="w-full max-h-[300px] object-contain rounded-lg bg-black/5"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center self-center">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : "Tamanho desconhecido"}
                        </p>
                        {(file.file_type.startsWith("video/") || file.file_type.startsWith("audio/")) && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] md:text-xs"
                              disabled={transcribing}
                              onClick={() => handleTranscribeAndSummarize(file, "report")}
                            >
                              <Sparkles className="w-3 h-3 mr-1" /> Criar Reportagem
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] md:text-xs"
                              disabled={transcribing}
                              onClick={() => handleTranscribeAndSummarize(file, "summary")}
                            >
                              <Wand2 className="w-3 h-3 mr-1" /> Resumo Viral
                            </Button>
                          </div>
                        )}
                        {file.file_type.startsWith("image/") && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] md:text-xs"
                              disabled={generating}
                              onClick={async () => {
                                const result = await generateContent({
                                  inputText: "Analise esta imagem e crie uma legenda atraente.",
                                  platforms: selectedPlatforms,
                                  mode: "caption",
                                  model: aiModel,
                                  mediaUrls: [getMediaUrl(file.file_url)]
                                });
                                if (result?.post) {
                                  setContent(prev => prev.trim() ? `${prev}\n\n${result.post}` : result.post);
                                }
                              }}
                            >
                              <Sparkles className="w-3 h-3 mr-1" /> Criar Legenda (Visão)
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-center pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleUploadClick}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar mais mídias
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Textarea */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <label className="text-sm font-medium">
              Conteúdo da Publicação
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 mr-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                Modelos Rápidos:
              </span>
              {postTemplates.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (content.trim() && !confirm("Deseja substituir o conteúdo atual pelo modelo?")) return;
                    setContent(t.content);
                  }}
                  className="px-2 py-1 text-[10px] font-bold bg-muted hover:bg-primary/20 hover:text-primary border border-border rounded-lg transition-all"
                  title={t.description}
                >
                  {t.name}
                </button>
              ))}
              {/* Melhor Horário Automático */}
              {selectedPlatforms.length > 0 && (() => {
                const firstPlatformId = selectedPlatforms[0]?.split('|')[0] as SocialPlatformId;
                const times = firstPlatformId ? bestPostingTimes[firstPlatformId] : undefined;
                const nextTime = times?.[0];
                return nextTime ? (
                  <button
                    type="button"
                    onClick={() => applyBestTime(nextTime.day, nextTime.time)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-all"
                    title={`Aplicar melhor horário: ${nextTime.day} ${nextTime.time}`}
                  >
                    <Clock className="w-3 h-3" />
                    {nextTime.day} {nextTime.time.split('-')[0]}
                  </button>
                ) : null;
              })()}
              {/* Botão Limpar */}
              {content.trim().length > 10 && (
                <button
                  type="button"
                  onClick={() => setContent("")}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 rounded-lg transition-all"
                  title="Limpar conteúdo"
                >
                  <X className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva sua mensagem aqui... Use #hashtags para maior alcance"
            className="min-h-[150px] md:min-h-[200px] bg-muted/50 border-border focus:border-primary resize-none text-base md:text-xl font-medium p-4"
          />
          <div className="flex items-center gap-2 mt-3">
            <Popover open={showHashtags} onOpenChange={setShowHashtags}>
              <PopoverTrigger asChild>
                <button 
                  disabled={selectedPlatforms.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-[10px] md:text-sm font-bold text-muted-foreground hover:text-foreground transition-all active:scale-95 shrink-0"
                  title="Hashtags"
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Hashtags</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Hashtags Populares</h4>
                  <p className="text-xs text-muted-foreground">
                    Baseado nas redes selecionadas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHashtags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setContent(prev => prev + " " + tag)}
                        className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => insertHashtags((selectedHashtags as string[]).slice(0, 5))}
                    className="w-full mt-2"
                  >
                    Inserir Top 5 Hashtags
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateHashtags}
                    disabled={generating || content.length < 10}
                    className="w-full border-primary/20 text-primary hover:bg-primary/10"
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                    )}
                    Gerar Hashtags Inteligentes
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-[10px] md:text-sm font-bold text-muted-foreground hover:text-foreground transition-all active:scale-95 shrink-0"
                  title="GIF"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">GIF</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0 border-none bg-transparent shadow-none" align="start">
                <GiphySearch 
                  onSelect={(url) => {
                    const newMedia: UploadedMedia = {
                      id: `giphy-${Date.now()}`,
                      file_url: url,
                      file_type: "image/gif",
                      name: "giphy.gif",
                      file_size: 0,
                    };
                    setUploadedFiles(prev => [...prev, newMedia]);
                    if (!selectedMedia) setSelectedMedia("image");
                    toast({
                      title: "GIF Adicionado!",
                      description: "GIF selecionado do Giphy.",
                    });
                  }}
                  onClose={() => {}}
                />
              </PopoverContent>
            </Popover>

              <button
                onClick={async () => {
                  if (!content.trim()) {
                    toast({ title: "Digite um tema", description: "Escreva algo no campo de conteúdo para usar como base do carrossel." });
                    return;
                  }
                  const result = await generateContent({
                    inputText: `Transforme a seguinte ideia/texto em um roteiro detalhado para um CARROSSEL (sequência de imagens) nas redes sociais. Especifique o que deve ter na imagem de cada slide (Slide 1, Slide 2...) e o texto que vai na legenda final do post. Seja criativo, persuasivo e use gatilhos de curiosidade para fazer o usuário arrastar para o lado. Texto base: ${content}`,
                    platforms: selectedPlatforms,
                    mode: "caption",
                    model: aiModel
                  });
                  if (result?.post) {
                    setContent(result.post);
                  }
                }}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] md:text-sm font-bold transition-all active:scale-95 shrink-0 ml-auto"
                title="Criar Carrossel (IA)"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">Criar Carrossel (IA)</span>
              </button>
            
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[10px] md:text-sm font-bold text-foreground transition-all active:scale-95 border border-[#1DB954]/20 shrink-0"
                  title="Spotify"
                >
                  {/* Official Spotify SVG Logo */}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" fill="#1DB954"/>
                  </svg>
                  <span className="hidden md:inline">Spotify</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0 border-none bg-transparent shadow-none" align="start">
                <SpotifySearch 
                  onSelect={(track) => {
                    setContent(prev => prev + (prev ? "\n\n" : "") + `🎵 Ouça agora: ${track.name} - ${track.artist}\n${track.url}`);
                    toast({
                      title: "Música Adicionada!",
                      description: `${track.name} inserida no seu post.`,
                    });
                  }}
                  onClose={() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))}
                />
              </PopoverContent>
            </Popover>

            <button 
              onClick={() => setShowAIDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 text-[10px] md:text-sm font-bold text-foreground transition-all active:scale-95 shrink-0"
              title="IA"
            >
              <Wand2 className="w-3.5 h-3.5 text-primary" />
              <span className="hidden md:inline">IA</span>
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-[10px] md:text-sm font-bold text-muted-foreground hover:text-foreground transition-all active:scale-95 shrink-0"
                  title="Emoji"
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Emoji</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <div className="grid grid-cols-8 gap-1">
                  {["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🤲", "👐", "🙌", "👏", "🤝", "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐", "🖖", "👋", "🤙", "💪", "🦾", "🖕", "✍️", "🙏", "👣", "👄", "🦷", "👅", "👂", "🦻", "👃", "🧠", "👤", "👥", "🗣"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setContent(prev => prev + emoji)}
                      className="text-xl p-1 hover:bg-muted rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* AI Generation Dialog */}
        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Assistente de Conteúdo IA
              </DialogTitle>
              <DialogDescription>
                Use modelos avançados via OpenRouter para criar, traduzir ou adaptar conteúdo.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Mode Selection */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { id: 'post', label: 'Novo Post', icon: PenSquare },
                  { id: 'article', label: 'Matéria de Vídeo', icon: Newspaper },
                  { id: 'caption', label: 'Legenda Vídeo', icon: Video },
                  { id: 'translate', label: 'Tradução', icon: Globe },
                  { id: 'social_adapt', label: 'Adaptar P/ Redes', icon: Share2 },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setAiMode(mode.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                      aiMode === mode.id 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-border hover:border-primary/30 text-muted-foreground"
                    )}
                  >
                    <mode.icon className="w-5 h-5" />
                    <span className="text-xs font-bold">{mode.label}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Inputs based on Mode */}
              <div className="space-y-4">
                {aiMode === 'post' ? (
                  <div>
                    <label className="text-sm font-bold mb-2 block">Tema ou Assunto</label>
                    <Textarea
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="Sobre o que você quer falar?"
                      className="min-h-[80px] rounded-xl"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-bold mb-2 block">Conteúdo Base</label>
                    <Textarea
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      placeholder="Cole o texto, transcrição ou link para processar..."
                      className="min-h-[120px] rounded-xl"
                    />
                    {uploadedFiles.length > 0 && aiMode !== 'translate' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-xs h-7"
                        onClick={async () => {
                          const file = uploadedFiles[0];
                          if (file.file_type.includes('video') || file.file_type.includes('audio')) {
                            const result = await transcribeMedia({ mediaUrl: file.file_url });
                            if (result?.text) setAiInputText(result.text);
                          }
                        }}
                        disabled={transcribing}
                      >
                        {transcribing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Video className="w-3 h-3 mr-2" />}
                        Extrair Texto da Mídia Selecionada
                      </Button>
                    )}
                  </div>
                )}

                {aiMode === 'translate' && (
                  <div>
                    <label className="text-sm font-bold mb-2 block">Idioma de Destino</label>
                    <select 
                      value={aiTargetLanguage}
                      onChange={(e) => setAiTargetLanguage(e.target.value)}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {TRANSLATE_LANGUAGES.map(lang => (
                        <option key={lang.id} value={lang.id}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold mb-2 block">Modelo IA</label>
                    <select 
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {OPENROUTER_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold mb-2 block">Tom de Voz</label>
                    <select 
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {["profissional", "informativo", "descontraído", "inspiracional", "promocional", "político", "jornalístico"].map(t => (
                        <option key={t} value={t} className="capitalize">{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="hooks" 
                    checked={includeAttentionHooks}
                    onChange={(e) => setIncludeAttentionHooks(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="hooks" className="text-sm font-medium cursor-pointer">
                    Usar técnicas de atenção (Hooks & CTA)
                  </label>
                </div>
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowAIDialog(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  const result = await generateContent({
                    topic: aiTopic,
                    inputText: aiInputText,
                    mode: aiMode,
                    platforms: selectedPlatforms,
                    tone: aiTone,
                    targetLanguage: aiTargetLanguage,
                    attentionTechniques: includeAttentionHooks,
                    model: aiModel, // Pass the selected model
                  });
                  
                  if (result) {
                    let finalContent = result.post;
                    if (result.title) finalContent = `**${result.title}**\n\n${finalContent}`;
                    if (result.hashtags) finalContent += `\n\n${result.hashtags}`;
                    if (result.cta) finalContent += `\n\n${result.cta}`;
                    
                    setContent(finalContent);
                    setShowAIDialog(false);
                    setAiTopic("");
                    setAiInputText("");
                  }
                }}
                disabled={generating || transcribing || (!aiTopic.trim() && !aiInputText.trim())}
                className="bg-gradient-to-r from-primary to-accent rounded-xl px-8"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Gerar Agora
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule */}
        <div>
          <label className="text-sm font-medium mb-3 block">
            Agendamento
          </label>
          <div className="flex gap-2 md:gap-3">
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none hidden md:block" />
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 md:px-10 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:[color-scheme:dark] relative z-0"
              />
            </div>
            <Popover open={showBestTimes} onOpenChange={setShowBestTimes}>
              <PopoverTrigger asChild>
                <button 
                  disabled={selectedPlatforms.length === 0}
                  className="flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 rounded-xl border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden md:inline">Melhor Horário</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-4" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm">Melhores Horários para Publicação</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em um horário para aplicar
                    </p>
                  </div>
                  
                  {selectedBestTimes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Selecione pelo menos uma rede social
                    </p>
                  ) : (
                    <div className="space-y-4 max-h-64 overflow-y-auto">
                      {selectedBestTimes.map(({ platform, times }) => (
                        platform && (
                          <div key={platform.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-5 h-5 rounded flex items-center justify-center",
                                platform.color
                              )}>
                                <platform.icon className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-sm font-medium">{platform.name}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 pl-7">
                              {times.map((time, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => applyBestTime(time.day, time.time)}
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">{time.day}</span>
                                    <span className="text-xs text-muted-foreground">{time.time}</span>
                                  </div>
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    time.engagement === "Muito Alto" 
                                      ? "bg-green-500/10 text-green-500"
                                      : "bg-blue-500/10 text-blue-500"
                                  )}>
                                    {time.engagement}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {scheduledDate && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Agendado para: {new Date(scheduledDate).toLocaleString('pt-BR')}
            </p>
          )}
        </div>

        {/* Visibility Selector */}
        <div className="pt-4 border-t border-border">
          <label className="text-sm font-medium mb-3 block">Visibilidade do Post</label>
          <TooltipProvider>
            <div className="flex gap-2">
              {(["public", "private", "subscribers"] as const).map((v) => (
                <Tooltip key={v}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setVisibility(v)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all",
                        visibility === v
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {v === "public" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Globe className="w-4 h-4" />
                          <span className="hidden md:inline">Público</span>
                        </div>
                      ) : v === "private" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Lock className="w-4 h-4" />
                          <span className="hidden md:inline">Privado</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <Star className="w-4 h-4" />
                          <span className="hidden md:inline">Assinantes</span>
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {v === "public" ? "Público para todos" : v === "private" ? "Somente eu" : "Apenas assinantes"}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </div>
      )}

      {/* Actions - only in criar tab */}
      {activeTab === "criar" && (
      <div className="p-4 md:p-6 border-t border-border bg-muted/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex w-full md:w-auto items-center justify-between gap-3">
            <p className="text-[10px] md:text-sm text-muted-foreground font-bold uppercase tracking-wider">
              {selectedPlatforms.length} redes selecionadas
              {uploadedFiles.length > 0 && <span className="hidden md:inline">{` • ${uploadedFiles.length} arquivo(s)`}</span>}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkUpload(true)}
              className="gap-1.5 rounded-xl h-9 text-[10px] font-black uppercase"
            >
              <Upload className="w-3 h-3" />
              CSV
            </Button>
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              className="border-border rounded-xl text-[10px] md:text-sm h-12 md:h-auto font-black uppercase"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || publishing || !content.trim()}
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin md:mr-2" /> : null}
              Rascunho
            </Button>
            
            <Button
              variant="outline"
              className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10 rounded-xl text-[10px] md:text-sm h-12 md:h-auto font-black uppercase"
              disabled={isSubmitting || publishing || !content.trim() || selectedPlatforms.length === 0}
              onClick={async () => {
                if (isEditing && editingPost) {
                  const success = await updatePost(editingPost.id, {
                    content: content.trim(),
                    media_ids: uploadedFiles.map(f => f.id),
                    platforms: selectedPlatforms,
                    media_type: selectedMedia || "image",
                    orientation,
                    scheduled_at: scheduledDate ? new Date(scheduledDate) : undefined,
                  });
                  if (success) {
                    await submitForApproval(editingPost.id);
                    onPostSaved?.();
                  }
                } else {
                  const post = await createPost({
                    content: content.trim(),
                    media_ids: uploadedFiles.map(f => f.id),
                    platforms: selectedPlatforms,
                    media_type: selectedMedia || "image",
                    orientation,
                  });
                  if (post) {
                    await submitForApproval(post.id);
                    setContent("");
                    setSelectedPlatforms([]);
                    setSelectedMedia(null);
                    setScheduledDate("");
                    setUploadedFiles([]);
                    onPostSaved?.();
                  }
                }
              }}
            >
              Aprovação
            </Button>

            {!scheduledDate && (
              <Button 
                variant="secondary"
                disabled={isSubmitting || publishing || !content.trim() || selectedPlatforms.length === 0}
                onClick={async () => {
                  if (!content.trim() || selectedPlatforms.length === 0) return;
                  const mediaUrls = uploadedFiles.map(f => f.file_url);
                  const result = await publishNow(content.trim(), selectedPlatforms, mediaUrls);
                  if (result) {
                    setContent("");
                    setSelectedPlatforms([]);
                    setSelectedMedia(null);
                    setScheduledDate("");
                    setUploadedFiles([]);
                  }
                }}
                className="rounded-xl text-[10px] md:text-sm h-12 md:h-auto font-black uppercase col-span-1"
              >
                {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Publicar"}
              </Button>
            )}
            
            <Button 
              disabled={isSubmitting || publishing || !content.trim() || selectedPlatforms.length === 0}
              onClick={() => handleSubmit(false)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground gap-1.5 md:gap-2 rounded-xl text-[10px] md:text-sm h-12 md:h-auto col-span-1 font-black uppercase shadow-lg shadow-primary/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              {isEditing ? "Atualizar" : scheduledDate ? "Agendar" : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Bulk Upload Dialog */}
      {/* Image Generation Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-cyan-400" />
              Gerar Imagem com IA
            </DialogTitle>
            <DialogDescription>
              Descreva a imagem que deseja criar para seu post
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Prompt da Imagem</label>
              <Textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Ex: Uma paisagem futurista com robôs e cores vibrantes, estilo digital art..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !imagePrompt.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
            >
              {isGeneratingImage ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar Imagem</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audio Generation Dialog */}
      <Dialog open={showAudioDialog} onOpenChange={setShowAudioDialog}>
        <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-amber-400" />
              Converter Texto em Áudio
            </DialogTitle>
            <DialogDescription>
              A IA irá narrar o conteúdo do seu post
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-xl border border-border">
              {content || "Escreva algo no post primeiro para converter em áudio."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAudioDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio || !content.trim()}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              {isGeneratingAudio ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar Áudio</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkUploadDialog
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onComplete={() => {
          toast({
            title: "Importação concluída",
            description: "Verifique o calendário para ver os posts importados.",
          });
        }}
      />
    </motion.div>
  );
};
