import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Music
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
import { ScheduledPost, CreatePostInput } from "@/hooks/useScheduledPosts";
import { useNotifications } from "@/contexts/NotificationContext";
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

type MediaType = "image" | "video" | "document" | "story" | "live";

const mediaTypes: { id: MediaType; icon: typeof ImageIcon; label: string; accept: string }[] = [
  { id: "image", icon: ImageIcon, label: "Imagem", accept: "image/*" },
  { id: "video", icon: Video, label: "Vídeo", accept: "video/*" },
  { id: "document", icon: FileText, label: "Documento", accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" },
  { id: "story", icon: Smartphone, label: "Story", accept: "image/*,video/*" },
  { id: "live", icon: Monitor, label: "Live", accept: "video/*" },
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
  site: [
    { day: "Terça", time: "10:00", engagement: "Alto" },
    { day: "Quinta", time: "14:00", engagement: "Alto" },
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

interface CreatePostPanelProps {
  initialDate?: string;
  editingPost?: ScheduledPost | null;
  onPostSaved?: () => void;
  onBackToCalendar?: () => void;
  createPost: (input: CreatePostInput) => Promise<ScheduledPost | null>;
  updatePost: (postId: string, updates: Partial<CreatePostInput>) => Promise<boolean>;
  submitForApproval: (postId: string) => Promise<boolean>;
  approvePost?: (postId: string) => Promise<boolean>;
  rejectPost?: (postId: string, reason: string) => Promise<boolean>;
}

export const CreatePostPanel = ({ initialDate, editingPost, onPostSaved, onBackToCalendar, createPost, updatePost, submitForApproval, approvePost, rejectPost }: CreatePostPanelProps) => {
  const [content, setContent] = useState(editingPost?.content || "");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatformId[]>(
    (editingPost?.platforms as SocialPlatformId[]) || []
  );
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
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMedia, uploading, progress: uploadProgress } = useMediaUpload();
  
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const { generateContent, generating } = useAIContent();
  const { publishNow, publishing } = usePublisher();
  const { connections } = useSocialConnections();
  const { isEditor } = useUserRole();

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
      setUploadedFiles([]);
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const media = await uploadMedia(file);
    
    if (media) {
      setUploadedFiles(prev => [...prev, media]);
      toast({
        title: "Arquivo enviado!",
        description: `${file.name} foi carregado com sucesso.`,
      });
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

    const file = files[0];
    const media = await uploadMedia(file);
    
    if (media) {
      setUploadedFiles(prev => [...prev, media]);
      toast({
        title: "Arquivo enviado!",
        description: `${file.name} foi carregado com sucesso.`,
      });
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
            title: "Post atualizado",
            message: "As alterações foram salvas com sucesso.",
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
          addNotification({
            type: "success",
            title: asDraft ? "Rascunho salvo" : scheduledAt ? "Post agendado" : "Post criado",
            message: asDraft
              ? "Seu rascunho foi salvo com sucesso."
              : scheduledAt
                ? `Seu post será publicado em ${scheduledAt.toLocaleDateString('pt-BR')} às ${scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : "Seu post foi criado com sucesso.",
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

  const characterCount = content.length;
  const maxCharacters = 5000;

  const selectedHashtags: string[] = selectedPlatforms.length > 0
    ? Array.from(new Set(selectedPlatforms.flatMap(p => popularHashtags[p]?.slice(0, 5) || [])))
    : [];

  const selectedBestTimes = selectedPlatforms.map(p => ({
    platform: socialPlatforms.find(sp => sp.id === p),
    times: bestPostingTimes[p] || [],
  })).filter(item => item.times.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl border border-border overflow-hidden"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedTypes()}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToCalendar && (
              <button
                onClick={onBackToCalendar}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl">
                {isEditing ? "Editar Publicação" : "Criar Publicação"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEditing
                  ? "Edite o conteúdo e republique ou reagende"
                  : "Publique em múltiplas redes simultaneamente"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
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
      </div>

      <div className="p-6 space-y-6">
        {/* Platform Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">
            Selecionar Redes Sociais
          </label>
          <div className="flex flex-wrap gap-3">
            {socialPlatforms.filter(p => p.type === 'social').map((platform) => {
              const platformConnections = connections.filter(c => c.platform === platform.id && c.is_connected);
              const hasConnections = platformConnections.length > 0;
              const Icon = platform.icon;
              
              const selectedInPlatform = platformConnections.filter(c => selectedPlatforms.includes(`${platform.id}|${c.id}` as SocialPlatformId));
              const isGenericSelected = selectedPlatforms.includes(platform.id as SocialPlatformId);
              const isSelected = selectedInPlatform.length > 0 || isGenericSelected;

              return (
                <div 
                  key={platform.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredPlatform(platform.id)}
                  onMouseLeave={() => setHoveredPlatform(null)}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (!hasConnections) {
                        togglePlatform(platform.id as SocialPlatformId);
                      } else if (platformConnections.length === 1) {
                        togglePlatform(`${platform.id}|${platformConnections[0].id}` as SocialPlatformId);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all relative outline-none",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border hover:border-primary/50 text-muted-foreground bg-background",
                      !hasConnections && "opacity-60"
                    )}
                  >
                    <div className="relative shrink-0">
                      <PlatformIconBadge
                        platform={platform}
                        size="xs"
                        muted={!hasConnections}
                      />
                      {hasConnections && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background bg-green-500" />
                      )}
                      {!hasConnections && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background bg-muted-foreground" />
                      )}
                    </div>
                    
                    <span className="text-sm font-semibold max-w-[150px] truncate" title={platform.name}>
                      {selectedInPlatform.length > 0 
                        ? selectedInPlatform.length === 1 
                          ? (selectedInPlatform[0].page_name || platform.name)
                          : `${selectedInPlatform.length} Contas Selecionadas`
                        : platformConnections.length === 1 
                          ? (platformConnections[0].page_name || platform.name)
                          : platform.name}
                    </span>
                    
                    {isSelected && (
                      <X 
                        className="w-3.5 h-3.5 shrink-0 opacity-70 hover:opacity-100 transition-opacity ml-1" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!hasConnections) togglePlatform(platform.id as SocialPlatformId);
                          else selectedInPlatform.forEach(c => togglePlatform(`${platform.id}|${c.id}` as SocialPlatformId));
                        }} 
                      />
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {hoveredPlatform === platform.id && hasConnections && platformConnections.length > 1 && (
                      <motion.div
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

        {/* Upload Area */}
        <AnimatePresence mode="wait">
          {selectedMedia && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
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
                      Suporta: JPG, PNG, GIF, MP4, PDF, DOCX
                    </p>
                  </>
                )}
              </div>

              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file) => (
                    <div 
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl"
                    >
                      {file.file_type.startsWith("image/") ? (
                        <img 
                          src={file.file_url} 
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : "Tamanho desconhecido"}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Textarea */}
        <div>
          <label className="text-sm font-medium mb-3 block">
            Conteúdo da Publicação
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva sua mensagem aqui... Use #hashtags para maior alcance"
            className="min-h-[150px] bg-muted/50 border-border focus:border-primary resize-none"
          />
          <div className="flex items-center gap-2 mt-3">
            <Popover open={showHashtags} onOpenChange={setShowHashtags}>
              <PopoverTrigger asChild>
                <button 
                  disabled={selectedPlatforms.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Hash className="w-4 h-4" />
                  Hashtags
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
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  GIPHY
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0 border-none bg-transparent shadow-none" align="start">
                <GiphySearch 
                  onSelect={(url) => {
                    const newMedia: UploadedMedia = {
                      id: `giphy-${Date.now()}`,
                      file_url: url,
                      file_type: "image/gif",
                      name: "GIPHY GIF",
                      file_size: 0
                    };
                    setUploadedFiles(prev => [...prev, newMedia]);
                    if (!selectedMedia) setSelectedMedia("image");
                    toast({
                      title: "GIF Adicionado!",
                      description: "GIF selecionado do Giphy.",
                    });
                  }}
                  onClose={() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))}
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-sm text-foreground transition-colors border border-[#1DB954]/20"
                >
                  <Music className="w-4 h-4 text-[#1DB954]" />
                  Spotify
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 text-sm text-foreground transition-colors"
            >
              <Wand2 className="w-4 h-4 text-primary" />
              Gerar com IA
            </button>
          </div>
        </div>

        {/* AI Generation Dialog */}
        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Gerar Conteúdo com IA
              </DialogTitle>
              <DialogDescription>
                Descreva o tema do seu post e a IA irá criar o conteúdo para você
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tema do Post</label>
                <Textarea
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ex: Lançamento de novo produto de skincare para pele oleosa..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tom da Mensagem</label>
                <div className="flex flex-wrap gap-2">
                  {["profissional", "descontraído", "inspiracional", "informativo", "promocional"].map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setAiTone(tone)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition-colors capitalize",
                        aiTone === tone
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPlatforms.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Otimizado para: {selectedPlatforms.map(p => 
                    socialPlatforms.find(sp => sp.id === p)?.name
                  ).join(", ")}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAIDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  const result = await generateContent({
                    topic: aiTopic,
                    platforms: selectedPlatforms,
                    tone: aiTone,
                  });
                  
                  if (result) {
                    setContent(result.post + "\n\n" + result.hashtags);
                    setShowAIDialog(false);
                    setAiTopic("");
                  }
                }}
                disabled={generating || !aiTopic.trim()}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Gerar Conteúdo
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
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full bg-muted/50 border border-border rounded-xl px-10 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Popover open={showBestTimes} onOpenChange={setShowBestTimes}>
              <PopoverTrigger asChild>
                <button 
                  disabled={selectedPlatforms.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="w-4 h-4" />
                  Melhor Horário
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
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {selectedPlatforms.length} redes selecionadas
              {uploadedFiles.length > 0 && ` • ${uploadedFiles.length} arquivo(s)`}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkUpload(true)}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar CSV
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              className="border-border"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || publishing || !content.trim()}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Rascunho
            </Button>
            {/* Submit for approval - for drafts or when editing */}
            <Button
              variant="outline"
              className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
              disabled={isSubmitting || publishing || !content.trim() || selectedPlatforms.length === 0}
              onClick={async () => {
                // If editing, update first then submit for approval
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
                  // Create as draft first, then submit
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
              <Send className="w-4 h-4 mr-1" />
              Enviar para Aprovação
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
                className="gap-2"
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Publicar Agora (API)
              </Button>
            )}
            
            {/* Aprovar / Rejeitar buttons for Editors when editing a pending_approval post */}
            {isEditing && editingPost?.status === 'pending_approval' && isEditor && (
              <>
                <Button 
                  disabled={isSubmitting || publishing}
                  onClick={async () => {
                    const success = approvePost && await approvePost(editingPost.id);
                    if (success) onPostSaved?.();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Aprovar
                </Button>
                <Button 
                  variant="destructive"
                  disabled={isSubmitting || publishing}
                  onClick={async () => {
                    // For simplicity, we just reject with a default reason, 
                    // or ideally show the same dialog. Since dialog is in CalendarView, we do a basic prompt.
                    const reason = window.prompt("Motivo da rejeição:");
                    if (reason && reason.trim()) {
                      const success = rejectPost && await rejectPost(editingPost.id, reason.trim());
                      if (success) onPostSaved?.();
                    }
                  }}
                  className="gap-2"
                >
                  <ShieldX className="w-4 h-4" />
                  Rejeitar
                </Button>
              </>
            )}

            <Button 
              disabled={isSubmitting || publishing || !content.trim() || selectedPlatforms.length === 0}
              onClick={() => handleSubmit(false)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isEditing ? "Atualizar Post" : scheduledDate ? "Agendar" : "Salvar Post"}
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Upload Dialog */}
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
