import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Radio, Video, Clock, Plus, Play, Eye, Heart, MessageCircle, Calendar, Trash2, X, Upload, 
  Loader2, MoreVertical, Edit2, Send, Scissors, Copy, Square, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { socialPlatforms, SocialPlatformId } from "@/components/icons/platform-metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSocialStats } from "@/hooks/useSocialStats";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StoryEditor } from "./StoryEditor";

interface StoryLive {
  id: string;
  user_id: string;
  type: string;
  platform: string;
  title: string;
  content: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  viewers: number;
  likes: number;
  comments: number;
  metadata?: any;
  created_at: string;
}

interface LiveSession {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  stream_key: string | null;
  status: string;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

interface LiveClip {
  id: string;
  live_id: string;
  clip_url: string;
  title: string | null;
  start_time: number;
  end_time: number;
  status: string;
  created_at: string;
}

const storyPlatforms: SocialPlatformId[] = ["instagram", "facebook", "whatsapp", "tiktok", "telegram", "threads", "snapchat"];
const livePlatforms: SocialPlatformId[] = ["youtube", "instagram", "tiktok", "facebook", "linkedin"];

export const StoriesLivesView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected: isPlatformConnected } = useSocialStats();
  const [activeTab, setActiveTab] = useState("stories");
  
  // States for Stories & Lives
  const [items, setItems] = useState<StoryLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<"story" | "live">("story");
  const [formTitle, setFormTitle] = useState("");
  const [formPlatforms, setFormPlatforms] = useState<string[]>([]);
  const [formContent, setFormContent] = useState("");
  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [publishToStories, setPublishToStories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // States for Live Streaming (Manager logic)
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // States for Clips (ClipsView logic)
  const [clips, setClips] = useState<LiveClip[]>([]);
  const [clipsLoading, setClipsLoading] = useState(true);

  // States for Memories & Editing
  const [memories, setMemories] = useState<StoryLive[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [editingStory, setEditingStory] = useState<StoryLive | null>(null);

  const fetchItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("stories_lives")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as unknown as StoryLive[]);
    setLoading(false);
  };

  const fetchSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSessions((data as LiveSession[]) || []);
    setSessionsLoading(false);
  };

  const fetchClips = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("live_clips")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setClips((data as LiveClip[]) || []);
    setClipsLoading(false);
  };

  const fetchMemories = async () => {
    if (!user) return;
    const now = new Date();
    
    // Dates for 6 and 12 months ago (with a 3-day window for better UX)
    const sixMonthsAgoStart = new Date(now);
    sixMonthsAgoStart.setMonth(now.getMonth() - 6);
    sixMonthsAgoStart.setDate(sixMonthsAgoStart.getDate() - 2);
    
    const sixMonthsAgoEnd = new Date(now);
    sixMonthsAgoEnd.setMonth(now.getMonth() - 6);
    sixMonthsAgoEnd.setDate(sixMonthsAgoEnd.getDate() + 2);

    const twelveMonthsAgoStart = new Date(now);
    twelveMonthsAgoStart.setMonth(now.getMonth() - 12);
    twelveMonthsAgoStart.setDate(twelveMonthsAgoStart.getDate() - 2);

    const twelveMonthsAgoEnd = new Date(now);
    twelveMonthsAgoEnd.setMonth(now.getMonth() - 12);
    twelveMonthsAgoEnd.setDate(twelveMonthsAgoEnd.getDate() + 2);

    const { data: memData } = await supabase
      .from("stories_lives")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "published")
      .or(`completed_at.gte.${sixMonthsAgoStart.toISOString()},completed_at.gte.${twelveMonthsAgoStart.toISOString()}`);

    if (memData) {
      const filtered = memData.filter(m => {
        const d = new Date(m.completed_at || m.created_at);
        const isSix = d >= sixMonthsAgoStart && d <= sixMonthsAgoEnd;
        const isTwelve = d >= twelveMonthsAgoStart && d <= twelveMonthsAgoEnd;
        return isSix || isTwelve;
      });
      setMemories(filtered);
    }
  };

  useEffect(() => { 
    fetchItems();
    fetchSessions();
    fetchClips();
    fetchMemories();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const chStories = supabase
      .channel("stories-lives-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories_lives", filter: `user_id=eq.${user.id}` }, () => fetchItems())
      .subscribe();
    
    const chSessions = supabase
      .channel("live-sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions", filter: `user_id=eq.${user.id}` }, () => fetchSessions())
      .subscribe();

    const chClips = supabase
      .channel("live-clips-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_clips", filter: `user_id=eq.${user.id}` }, () => fetchClips())
      .subscribe();

    return () => { 
      supabase.removeChannel(chStories); 
      supabase.removeChannel(chSessions);
      supabase.removeChannel(chClips);
    };
  }, [user]);

  const handleMultipleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;
    
    setUploadingThumb(true);
    const newUrls: string[] = [];
    
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
    }
    
    if (newUrls.length > 0) {
      setThumbnailUrls(prev => [...prev, ...newUrls]);
      // If editing multiple, we might want to open the editor immediately
      if (createType === "story") {
        const tempStoryId = "new-" + Date.now();
        setEditingStory({
           id: tempStoryId,
           user_id: user.id,
           type: "story",
           platform: formPlatforms[0] || "instagram",
           title: formTitle || "Novo Story",
           content: formContent,
           thumbnail_url: newUrls[0],
           media_url: newUrls[0],
           status: "draft",
           scheduled_at: null,
           completed_at: null,
           viewers: 0,
           likes: 0,
           comments: 0,
           created_at: new Date().toISOString()
        } as any);
      }
    }
    setUploadingThumb(false);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingThumb(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}_story.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: '3600' });
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      setThumbnailUrls([urlData.publicUrl]);
    }
    setUploadingThumb(false);
  };

  const togglePlatform = (pid: string) => {
    setFormPlatforms(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    );
  };

  const handleCreate = async () => {
    if (!user || !formTitle.trim() || formPlatforms.length === 0) return;
    setSubmitting(true);

    try {
      if (createType === "live") {
        // Create live session
        const streamKey = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
        const { data: session, error: sessError } = await supabase
          .from("live_sessions")
          .insert({
            user_id: user.id,
            title: formTitle.trim(),
            description: formContent.trim() || null,
            scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
            stream_key: streamKey,
            status: formScheduledAt ? "scheduled" : "draft",
          } as any)
          .select()
          .single();

        if (sessError) throw sessError;

        // If publish to stories is checked, also create story entries
        if (publishToStories) {
          const compatibleStoryPlatforms = formPlatforms.filter(p => storyPlatforms.includes(p as SocialPlatformId));
          if (compatibleStoryPlatforms.length > 0) {
            const storyInserts = compatibleStoryPlatforms.map(platform => ({
              user_id: user.id,
              type: "story",
              platform,
              title: `LIVE: ${formTitle.trim()}`,
              content: formContent.trim() || null,
              thumbnail_url: thumbnailUrls[0] || null,
              status: formScheduledAt ? "scheduled" : "published",
              scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
            }));
            await supabase.from("stories_lives").insert(storyInserts as any);
          }
        }
        toast({ title: "Live agendada!" });
      } else {
        // Create standard story entries
        const inserts = formPlatforms.map(platform => ({
          user_id: user.id,
          type: "story",
          platform,
          title: formTitle.trim(),
          content: formContent.trim() || null,
          thumbnail_url: thumbnailUrls[0] || null,
          status: formScheduledAt ? "scheduled" : "draft",
          scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
        }));
        const { error } = await supabase.from("stories_lives").insert(inserts as any);
        if (error) throw error;
        toast({ title: `${formPlatforms.length} Story(s) criado(s)!` });
      }

      setShowCreateDialog(false);
      setThumbnailUrls([]);
      resetForm();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMetadata = async (id: string, metadata: any) => {
    if (id.startsWith("new-")) {
      // It's a brand new batch from the creator dialog
      setSubmitting(true);
      try {
        // Build one insert per platform per story slide
        const inserts = formPlatforms.flatMap(platform =>
          (metadata.stories as any[]).map((s: any) => ({
            user_id: user?.id,
            type: "story",
            platform,
            title: formTitle.trim() || "Novo Story",
            content: formContent.trim() || null,
            thumbnail_url: s.url || null,
            media_url: s.url || null,
            status: formScheduledAt ? "scheduled" : "published",
            scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
            metadata: metadata.stories, // Store the advanced creative state
            author_id: user?.id,
          }))
        );

        const { error } = await supabase.from("stories_lives").insert(inserts as any);
        if (error) throw error;
        toast({ title: "Stories criados e publicados!" });
        setShowCreateDialog(false);
        resetForm();
      } catch (error: any) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } finally {
        setSubmitting(false);
      }
    } else {
      // Existing story update – only update safe columns that exist in the DB
      const forcePublish = metadata?.forcePublish === true;
      const updates: Record<string, unknown> = {};

      if (forcePublish) {
        updates.status = "published";
      }

      // Update media url if stories array is present
      if (metadata?.stories?.[0]?.url) {
        updates.media_url = metadata.stories[0].url;
        updates.thumbnail_url = metadata.stories[0].url;
        updates.metadata = metadata.stories;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("stories_lives")
          .update(updates as any)
          .eq("id", id);

        if (error) {
          toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
          setEditingStory(null);
          setThumbnailUrls([]);
          fetchItems();
          return;
        }
      }

      toast({ title: forcePublish ? "Publicado com sucesso!" : "Edição salva com sucesso!" });
    }
    setEditingStory(null);
    setThumbnailUrls([]);
    fetchItems();
  };

  const handleDelete = async (id: string, table: string = "stories_lives") => {
    if (table === "stories_lives") {
      await supabase.from("stories_lives").update({ status: 'archived' } as any).eq("id", id);
      toast({ title: "Story arquivado com sucesso" });
      fetchItems();
    } else {
      await supabase.from(table as any).delete().eq("id", id);
      toast({ title: "Removido com sucesso" });
      if (table === "live_sessions") fetchSessions();
      else if (table === "live_clips") fetchClips();
    }
  };

  const copyStreamKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Stream key copiada!" });
  };

  const resetForm = () => {
    setFormTitle(""); setFormPlatforms([]); setFormContent(""); setFormScheduledAt(""); setThumbnailUrls([]); setPublishToStories(false);
  };

  const stories = items.filter(i => i.type === "story");
  const livesLegacy = items.filter(i => i.type === "live"); // Keeping legacy for compatibility

  const openCreate = (type: "story" | "live") => {
    setCreateType(type);
    resetForm();
    setShowCreateDialog(true);
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "published": return "Publicado";
      case "scheduled": return "Agendado";
      case "completed": return "Concluída";
      case "live": return "AO VIVO";
      default: return "Rascunho";
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "published": case "completed": return "bg-green-500/20 text-green-400";
      case "scheduled": return "bg-blue-500/20 text-blue-400";
      case "live": return "bg-red-500/20 text-red-400";
      default: return "bg-yellow-500/20 text-yellow-400";
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const platformOptions = createType === "story" ? storyPlatforms : livePlatforms;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">Conteúdo de Vídeo & Stories</h1>
        <p className="text-muted-foreground">Gerencie seus stories, transmissões ao vivo e cortes em um único lugar</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="stories" className="rounded-lg data-[state=active]:bg-background gap-2">
            <Radio className="w-4 h-4" /> Stories
          </TabsTrigger>
          <TabsTrigger value="lives" className="rounded-lg data-[state=active]:bg-background gap-2">
            <Video className="w-4 h-4" /> Transmissões ao Vivo
          </TabsTrigger>
          <TabsTrigger value="clips" className="rounded-lg data-[state=active]:bg-background gap-2">
            <Scissors className="w-4 h-4" /> Cortes de Vídeo
          </TabsTrigger>
        </TabsList>

        {/* ===== STORIES TAB ===== */}
        <TabsContent value="stories" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl">Stories Recentes</h2>
                <p className="text-sm text-muted-foreground">Conteúdo enviado para Instagram, Facebook e WhatsApp</p>
              </div>
            </div>
            <div className="flex gap-2">
              {memories.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowMemories(!showMemories)}
                  className="border-pink-500/50 text-pink-500 hover:bg-pink-500/10 gap-2 rounded-xl"
                >
                  <Clock className="w-4 h-4" /> {memories.length} Memórias
                </Button>
              )}
              <Button onClick={() => openCreate("story")} className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Novo Story
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showMemories && memories.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-2xl mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-pink-500 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Recordar é Viver! Stories de 6 ou 12 meses atrás
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowMemories(false)} className="h-7 text-pink-500 hover:bg-pink-500/10">Fechar</Button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {memories.map(mem => (
                      <div key={mem.id} className="relative w-32 aspect-[9/16] shrink-0 rounded-xl overflow-hidden group cursor-pointer border border-pink-500/30">
                        {mem.thumbnail_url ? (
                          <img src={mem.thumbnail_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center"><Radio className="w-8 h-8 text-muted-foreground" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2">
                          <p className="text-[10px] text-white font-bold leading-tight line-clamp-2">{mem.title}</p>
                          <span className="text-[8px] text-pink-300">{new Date(mem.completed_at!).toLocaleDateString("pt-BR", { month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Button size="sm" className="h-7 bg-pink-500 hover:bg-pink-600 text-[10px] px-2" onClick={(e) => {
                            e.stopPropagation();
                            setEditingStory(mem);
                          }}>Republicar</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : stories.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl border border-dashed border-border">
              <Radio className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum story criado ainda.</p>
              <Button onClick={() => openCreate("story")} variant="link" className="text-primary mt-2">Criar primeiro story</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {stories.map((story, index) => {
                const platform = socialPlatforms.find(p => p.id === story.platform);
                const Icon = platform?.icon;
                return (
                  <motion.div key={story.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}
                    onClick={() => {
                        if (story.thumbnail_url || story.media_url) {
                            setEditingStory(story);
                        } else {
                            toast({ title: "Sem mídia", description: "Faça o upload de uma mídia para editar." });
                        }
                    }}
                    className="relative aspect-[9/16] rounded-2xl overflow-hidden glass-card border border-border group hover:border-primary/50 transition-all cursor-pointer"
                  >
                    {story.thumbnail_url ? (
                      <img src={story.thumbnail_url} alt={story.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Radio className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    
                    <div className="absolute top-2 left-2">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", platform?.color)}>
                        {Icon && <Icon className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-2 flex gap-1 items-center">
                      <Badge variant="outline" className={cn("text-[10px] py-0 px-1 border-0 h-5", statusColor(story.status))}>
                        {statusLabel(story.status)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button onClick={(e) => e.stopPropagation()} className="p-1 rounded-md bg-black/40 opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all">
                            <MoreVertical className="w-3.5 h-3.5 text-white" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-zinc-900 border-white/10 text-white">
                          <DropdownMenuItem onClick={() => setEditingStory(story)} className="gap-2 focus:bg-white/10 focus:text-white cursor-pointer">
                            <Eye className="w-4 h-4" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingStory(story)} className="gap-2 focus:bg-white/10 focus:text-white cursor-pointer">
                            <Edit2 className="w-4 h-4" /> Editar
                          </DropdownMenuItem>
                          {story.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleUpdateMetadata(story.id, { ...story.metadata, forcePublish: true })} className="gap-2 text-primary focus:bg-primary/10 focus:text-primary cursor-pointer">
                              <Send className="w-4 h-4" /> Publicar agora
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { if(confirm("Deseja excluir?")) handleDelete(story.id); }} className="gap-2 text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer">
                            <Trash2 className="w-4 h-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white text-xs font-medium truncate">{story.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-white/70">{new Date(story.created_at).toLocaleDateString("pt-BR")}</span>
                        <div className="flex items-center gap-1 text-[10px] text-white/70">
                          <Eye className="w-2.5 h-2.5" /> {story.viewers}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== LIVES TAB ===== */}
        <TabsContent value="lives" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-[#FF4500] flex items-center justify-center text-white text-white">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl">Transmissões ao Vivo</h2>
                <p className="text-sm text-muted-foreground">Agendamentos e transmissões multicanal</p>
              </div>
            </div>
            <Button onClick={() => openCreate("live")} className="bg-gradient-to-r from-red-500 to-[#FF4500] hover:opacity-90 text-white gap-2">
              <Plus className="w-4 h-4" /> Agendar Live
            </Button>
          </div>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl border border-dashed border-border">
              <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhuma transmissão ao vivo configurada.</p>
              <Button onClick={() => openCreate("live")} variant="link" className="text-primary mt-2">Agendar primeira live</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session, index) => (
                <motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-2xl border border-border overflow-hidden flex flex-col group"
                >
                  <div className="aspect-video bg-muted relative">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <Button size="icon" className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600">
                        <Play className="w-6 h-6 fill-white" />
                      </Button>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Badge className={cn("border-0", statusColor(session.status))}>
                        {session.status === "live" ? "🔴 AO VIVO" : statusLabel(session.status)}
                      </Badge>
                      <button onClick={() => handleDelete(session.id, "live_sessions")} className="p-1 px-1.5 rounded-lg bg-black/40 hover:bg-destructive/60 transition-colors">
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg mb-1 truncate">{session.title}</h3>
                    {session.description && <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{session.description}</p>}
                    
                    <div className="bg-muted/30 p-2 rounded-lg flex items-center justify-between mb-4">
                      <code className="text-[10px] truncate max-w-[150px]">{session.stream_key || "------"}</code>
                      <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => copyStreamKey(session.stream_key || "")}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{session.scheduled_at ? new Date(session.scheduled_at).toLocaleDateString("pt-BR") : "Imediata"}</span>
                      </div>
                      <div className="flex gap-2">
                         {session.status === "live" ? (
                           <Button variant="destructive" size="sm" className="h-7 text-[10px]">Parar</Button>
                         ) : (
                           <Button variant="default" size="sm" className="h-7 text-[10px]">Entrar</Button>
                         )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== CLIPS TAB ===== */}
        <TabsContent value="clips" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-white">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl">Cortes e Clips</h2>
                <p className="text-sm text-muted-foreground">Melhores momentos extraídos automaticamente</p>
              </div>
            </div>
          </div>

          {clipsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : clips.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl border border-dashed border-border">
              <Scissors className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum corte gerado ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Os cortes aparecerão aqui após suas transmissões.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clips.map((clip, index) => (
                <motion.div key={clip.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-2xl border border-border overflow-hidden"
                >
                  <div className="aspect-video bg-muted relative flex items-center justify-center">
                    {clip.clip_url ? (
                      <video src={clip.clip_url} className="w-full h-full object-cover" />
                    ) : (
                      <Play className="w-8 h-8 text-muted-foreground" />
                    )}
                    <div className="absolute top-2 right-2">
                       <button onClick={() => handleDelete(clip.id, "live_clips")} className="p-1 px-1.5 rounded-lg bg-black/40 hover:bg-destructive/60 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge className="bg-black/60 backdrop-blur-sm text-[10px] h-5 border-0">
                        {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-bold truncate mb-2">{clip.title || "Momento Épico"}</h4>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-[9px] h-4">{clip.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={clip.clip_url} download><Download className="w-3.5 h-3.5 text-primary" /></a>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog — Integrated */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createType === "story" ? <Radio className="w-5 h-5 text-primary" /> : <Video className="w-5 h-5 text-red-500" />}
              {createType === "story" ? "Criar Novo Story" : "Agendar Transmissão"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Título da {createType === "story" ? "Story" : "Live"}</label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Dê um nome impactante..." className="rounded-xl border-muted" />
            </div>
            
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Canais de Destino</label>
              <div className="grid grid-cols-2 gap-2">
                {platformOptions.map(pid => {
                  const p = socialPlatforms.find(sp => sp.id === pid);
                  if (!p) return null;
                  const Icon = p.icon;
                  const selected = formPlatforms.includes(pid);
                  const connected = isPlatformConnected(pid);
                  return (
                    <button key={pid} type="button" onClick={() => togglePlatform(pid)}
                      className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm",
                        selected ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40",
                        !connected && "opacity-70")}
                    >
                      <div className={cn("w-6 h-6 rounded flex items-center justify-center", connected ? p.color : "bg-slate-700/50")}>
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="flex-1 text-left">{p.name}</span>
                      {connected && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Conectado" />}
                      {selected && !connected && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {createType === "live" && (
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold">Postar nos Stories?</span>
                  <span className="text-[10px] text-muted-foreground">Avise seus seguidores quando estiver ao vivo</span>
                </div>
                <Checkbox checked={publishToStories} onCheckedChange={(v) => setPublishToStories(!!v)} />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Descrição / Conteúdo</label>
              <Textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Opcional..." rows={2} className="rounded-xl border-muted resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Data/Hora</label>
                <Input type="datetime-local" value={formScheduledAt} onChange={e => setFormScheduledAt(e.target.value)} className="rounded-xl border-muted text-xs" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Mídias (Vários para múltiplos Stories)</label>
                <div className="flex flex-col gap-2">
                  <input ref={multiFileInputRef} type="file" accept="image/*,video/*,audio/*" multiple onChange={handleMultipleUpload} className="hidden" />
                  <Button variant="outline" className="w-full h-12 border-dashed rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary" onClick={() => multiFileInputRef.current?.click()}>
                    <Plus className="w-4 h-4 mr-2" /> {uploadingThumb ? "Subindo arquivos..." : "Adicionar Fotos / Vídeos / Áudios"}
                  </Button>
                  
                  {thumbnailUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                       {thumbnailUrls.map((url, i) => (
                         <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                            <img src={url} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setThumbnailUrls(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3 text-white" />
                            </button>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting || !formTitle.trim() || formPlatforms.length === 0} 
              className={cn("rounded-xl flex-1", createType === "story" ? "bg-primary" : "bg-red-500 hover:bg-red-600")}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {createType === "story" ? `Postar Story` : `Agendar Transmissão`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story Visual Editor Overlay */}
      <AnimatePresence>
        {editingStory && (
          <StoryEditor 
            initialMediaUrls={thumbnailUrls.length > 0 ? thumbnailUrls : [editingStory.thumbnail_url || editingStory.media_url || ""]}
            platform={editingStory.platform as SocialPlatformId}
            onClose={() => {
              setEditingStory(null);
              setThumbnailUrls([]);
            }}
            onSave={(metadata) => handleUpdateMetadata(editingStory.id, metadata)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
