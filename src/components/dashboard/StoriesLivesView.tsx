import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Radio, Video, Clock, Plus, Play, Eye, Heart, MessageCircle, Calendar, Trash2, X, Upload, 
  Loader2, MoreVertical, Edit2, Send, Scissors, Copy, Square, Download, User, Image, Mic,
  CheckCircle2, Globe
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
import { useSocialConnections } from "@/hooks/useSocialConnections";

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
import { SafeImage } from "@/components/ui/SafeImage";
import { CarrosselView } from "./CarrosselView";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  stream_key?: string | null;
  status: string;
  recording_url?: string | null;
  created_at: string;
  updated_at?: string;
  started_at?: string | null;
  ended_at?: string | null;
  thumbnail_url?: string | null;
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
  const { connections } = useSocialConnections();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("subtab") === "carrosseis" ? "carrosseis" : "stories");

  useEffect(() => {
    const subtab = searchParams.get("subtab");
    if (subtab) {
      setActiveTab(subtab);
    }
  }, [searchParams]);

  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);
  
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTable, setDeleteConfirmTable] = useState<string>("stories_lives");

  const platformOptions = createType === "story" ? storyPlatforms : livePlatforms;

  const platformConnectionData = useMemo(() => {
    return socialPlatforms
      .filter(p => platformOptions.includes(p.id))
      .map(platform => {
        const platformConnections = connections.filter(c => c.platform === platform.id && c.is_connected);
        const hasConnections = platformConnections.length > 0;
        
        const selectedInPlatform = platformConnections.filter(c => formPlatforms.includes(`${platform.id}|${c.id}`));
        const isGenericSelected = formPlatforms.includes(platform.id);
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
  }, [socialPlatforms, connections, formPlatforms, platformOptions]);

  const fetchItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("stories_lives")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setItems(data as unknown as StoryLive[]);
    setLoading(false);
  };

  const fetchSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setSessions((data as unknown as LiveSession[]) || []);
    setSessionsLoading(false);
  };

  const fetchClips = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("live_clips")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
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
      .or(`and(completed_at.gte.${sixMonthsAgoStart.toISOString()},completed_at.lte.${sixMonthsAgoEnd.toISOString()}),and(completed_at.gte.${twelveMonthsAgoStart.toISOString()},completed_at.lte.${twelveMonthsAgoEnd.toISOString()})`);

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
    // Load all data in parallel for faster initial render
    Promise.all([fetchItems(), fetchSessions(), fetchClips(), fetchMemories()]);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;
    const debouncedFetchItems = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fetchItems(), 1000);
    };

    const chStories = supabase
      .channel("stories-lives-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories_lives", filter: `user_id=eq.${user.id}` }, () => debouncedFetchItems())
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
      supabase.removeChannel(chStories).catch(() => {}); 
      supabase.removeChannel(chSessions).catch(() => {});
      supabase.removeChannel(chClips).catch(() => {});
      clearTimeout(timeoutId);
    };
  }, [user]);

  const handleMultipleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;
    
    setUploadingThumb(true);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const path = `${user.id}/${fileName}`;
        
        // Use a longer timeout for large video/audio files
        const { data, error } = await supabase.storage.from("media").upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

        if (error) throw error;
        
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        
        // Detect media type
        let type = "story";
        if (file.type.startsWith("video/")) type = "video";
        if (file.type.startsWith("audio/")) type = "audio";
        if (file.type.startsWith("image/")) type = "image";
        
        return { url: urlData.publicUrl, type };
      });

      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.url);
      const firstType = results[0]?.type || "story";
      
      setThumbnailUrls(prev => [...prev, ...newUrls]);
      
      if (createType === "story") {
        const tempStoryId = "new-" + Date.now();
        setEditingStory({
           id: tempStoryId,
           user_id: user.id,
           type: firstType,
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
    } catch (error: any) {
      toast({ 
        title: "Erro no upload", 
        description: error.message || "Falha ao processar arquivos grandes.", 
        variant: "destructive" 
      });
    } finally {
      setUploadingThumb(false);
    }
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

  const handleCreate = async (targetStatus: string = "draft") => {
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
            status: targetStatus,
          } as any)
          .select()
          .single();

        if (sessError) throw sessError;
        
        await fetchSessions();
        if (publishToStories) await fetchItems();

        toast({ title: "Live agendada!" });
        if (publishToStories) {
          const compatibleStoryPlatforms = formPlatforms.filter(p => storyPlatforms.includes(p as SocialPlatformId));
          if (compatibleStoryPlatforms.length > 0) {
            const storyInserts = compatibleStoryPlatforms.map(platform => ({
              user_id: user.id,
              type: "live_promotion",
              platform,
              title: `LIVE: ${formTitle.trim()}`,
              content: formContent.trim() || null,
              thumbnail_url: thumbnailUrls[0] || null,
              media_url: thumbnailUrls[0] || null,
              status: targetStatus,
              scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
              metadata: { source: 'live_promotion' }
            }));
            await supabase.from("stories_lives").insert(storyInserts as any);
          }
        }
        toast({ title: "Live agendada!" });
      } else {
        // Create standard story entries
        const inserts = formPlatforms.map(platform => ({
          user_id: user.id,
          author_id: user.id,
          type: "story",
          platform,
          title: formTitle.trim(),
          content: formContent.trim() || null,
          thumbnail_url: thumbnailUrls[0] || null,
          media_url: thumbnailUrls[0] || null,
          status: targetStatus,
          scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
          metadata: []
        }));
        const { error } = await supabase.from("stories_lives").insert(inserts as any);
        if (error) throw error;
        
        await fetchItems();
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
          (metadata.stories as any[]).map((s: any) => {
            // Detect type from URL extension or metadata
            let mediaType = s.type || "story";
            if (!s.type && s.url) {
              const ext = s.url.split(".").pop()?.toLowerCase();
              if (["mp4", "webm", "mov"].includes(ext || "")) mediaType = "video";
              if (["mp3", "wav", "ogg"].includes(ext || "")) mediaType = "audio";
              if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) mediaType = "image";
            }

            return {
              user_id: user?.id,
              author_id: user?.id,
              type: mediaType,
              platform,
              title: formTitle.trim() || "Novo Story",
              content: formContent.trim() || null,
              thumbnail_url: s.url || null,
              media_url: s.url || null,
              status: metadata.forcePublish ? (formScheduledAt ? "scheduled" : "published") : "draft",
              scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
              metadata: metadata.stories, // Store the advanced creative state
            };
          })
        );

        // Try inserting with metadata first, fallback if column missing
        let { error } = await supabase.from("stories_lives").insert(inserts as any);
        
        if (error?.message?.includes("metadata") || error?.code === "PGRST204") {
          console.warn("Metadata column missing, falling back to basic insert");
          const fallbackInserts = inserts.map(ins => {
            const { metadata, ...rest } = ins as any;
            return rest; // Remove metadata field and try again
          });
          const { error: fallbackError } = await supabase.from("stories_lives").insert(fallbackInserts as any);
          error = fallbackError;
        }

        if (error) throw error;
        
        await fetchItems();
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
        let { error } = await supabase
          .from("stories_lives")
          .update(updates as any)
          .eq("id", id);

        if (error?.message?.includes("metadata") || error?.code === "PGRST204" || error?.message?.includes("400")) {
           console.warn("Metadata update failed, falling back to content field as string");
           const { metadata: metaField, ...rest } = updates as any;
           
           // Stringify metadata to save it in the content field if metadata column is missing
           const finalUpdates = {
             ...rest,
             content: JSON.stringify(metaField)
           };

           const { error: fallbackError } = await supabase
             .from("stories_lives")
             .update(finalUpdates as any)
             .eq("id", id);
           error = fallbackError;
        }

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
    // Use a small delay before refetching to let the DB update settle
    setTimeout(fetchItems, 300);
  };

  const handleDelete = async (id: string, table: string = "stories_lives") => {
    try {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) {
        // Fallback to soft-delete if DELETE fails (e.g., RLS policy)
        if (table === "stories_lives") {
          await supabase.from("stories_lives").update({ status: 'archived' } as any).eq("id", id);
        }
        console.warn("Hard delete failed, used soft delete:", error.message);
      }
      toast({ title: "Removido com sucesso!" });
      if (table === "stories_lives") fetchItems();
      else if (table === "live_sessions") fetchSessions();
      else if (table === "live_clips") fetchClips();
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const copyStreamKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Stream key copiada!" });
  };

  const resetForm = () => {
    setFormTitle(""); setFormPlatforms([]); setFormContent(""); setFormScheduledAt(""); setThumbnailUrls([]); setPublishToStories(false);
  };

  const stories = useMemo(() => items.filter(i => ["story", "video", "image", "audio", "live_promotion"].includes(i.type)), [items]);
  const livesLegacy = useMemo(() => items.filter(i => i.type === "live"), [items]);

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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">Conteúdo de Vídeo & Stories</h1>
        <p className="text-muted-foreground">Gerencie seus stories, transmissões ao vivo e cortes em um único lugar</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TooltipProvider>
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="stories" className="rounded-lg data-[state=active]:bg-background gap-2">
                  <Radio className="w-4 h-4" /> <span className="hidden sm:inline">Stories</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>Stories</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="lives" className="rounded-lg data-[state=active]:bg-background gap-2">
                  <Video className="w-4 h-4" /> <span className="hidden sm:inline">Transmissões ao Vivo</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>Transmissões ao Vivo</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="clips" className="rounded-lg data-[state=active]:bg-background gap-2">
                  <Scissors className="w-4 h-4" /> <span className="hidden sm:inline">Cortes de Vídeo</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>Cortes de Vídeo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="published" className="rounded-lg data-[state=active]:bg-background gap-2">
                  <CheckCircle2 className="w-4 h-4" /> <span className="hidden sm:inline">Publicados</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>Publicados</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="carrosseis" className="rounded-lg data-[state=active]:bg-background gap-2">
                  <Copy className="w-4 h-4" /> <span className="hidden sm:inline">Carrosséis</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>Carrosséis</TooltipContent>
            </Tooltip>
          </TabsList>
        </TooltipProvider>

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
                          <SafeImage src={mem.thumbnail_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
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
                const platformId = story.platform?.split('|')[0];
                const platform = socialPlatforms.find(p => p.id === platformId);
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
                    className="relative aspect-[9/16] rounded-2xl overflow-hidden glass-card border border-border group hover:border-primary/50 transition-all cursor-pointer will-change-transform"
                    style={{ containIntrinsicSize: '200px 355px' }}
                  >
                    {story.thumbnail_url || story.media_url ? (
                      <div className="w-full h-full relative">
                        {story.type === 'video' || (story.media_url && story.media_url.match(/\.(mp4|webm|mov|m4v)/i)) ? (
                          <video 
                            key={story.id}
                            src={story.media_url || story.thumbnail_url || ""} 
                            className="w-full h-full object-cover bg-zinc-950"
                            preload="metadata"
                            muted
                            loop
                            onMouseOver={e => (e.target as HTMLVideoElement).play()}
                            onMouseOut={e => (e.target as HTMLVideoElement).pause()}
                            playsInline
                          />
                        ) : (
                          <SafeImage 
                            src={story.thumbnail_url || story.media_url || ""} 
                            alt={story.title} 
                            className="w-full h-full !object-contain bg-zinc-950" 
                          />
                        )}
                        
                        {/* Overlay Metadata (Stickers/Texts) Preview */}
                        {(() => {
                          const items = Array.isArray(story.metadata) ? story.metadata : [];
                          const firstStory = items[0];
                          if (!firstStory) return null;

                          return (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden scale-[0.3] origin-center flex items-center justify-center">
                               {/* Render a tiny version of stickers and text for preview */}
                               {firstStory.text && (
                                 <div 
                                   className="px-4 py-2 rounded-lg text-center font-bold"
                                   style={{ 
                                     backgroundColor: firstStory.textConfig?.bgColor,
                                     color: firstStory.textConfig?.color,
                                     fontSize: '40px'
                                   }}
                                 >
                                   {firstStory.text}
                                 </div>
                               )}
                               {firstStory.stickers?.map((s: any) => (
                                 <div key={s.id} className="absolute bg-white/20 backdrop-blur-md px-2 py-1 rounded text-white text-[20px]">
                                   {s.label}
                                 </div>
                               ))}
                            </div>
                          );
                        })()}
                      </div>
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
                    
                    <div className="absolute top-2 right-2 flex gap-1 items-center z-50" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className={cn("text-[10px] py-0 px-1 border-0 h-5", statusColor(story.status))}>
                        {statusLabel(story.status)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button onClick={(e) => e.stopPropagation()} className="p-2.5 rounded-full bg-black/60 hover:bg-white/20 transition-all border border-white/10 shadow-lg active:scale-90">
                            <MoreVertical className="w-5 h-5 text-white" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end" 
                          className="w-48 bg-zinc-900 border-white/10 text-white rounded-xl p-1 shadow-2xl z-[100]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); setEditingStory(story); }} 
                            className="gap-3 p-3 focus:bg-white/10 focus:text-white cursor-pointer rounded-lg"
                          >
                            <Eye className="w-4 h-4 text-white/70" /> 
                            <div className="flex flex-col"><span className="text-sm font-bold">Visualizar</span><span className="text-[10px] text-white/40">Ver detalhes da mídia</span></div>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); setEditingStory(story); }} 
                            className="gap-3 p-3 focus:bg-white/10 focus:text-white cursor-pointer rounded-lg"
                          >
                            <Edit2 className="w-4 h-4 text-white/70" /> 
                            <div className="flex flex-col"><span className="text-sm font-bold">Editar</span><span className="text-[10px] text-white/40">Alterar stickers e texto</span></div>
                          </DropdownMenuItem>
                          {story.status === 'draft' && (
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); handleUpdateMetadata(story.id, { forcePublish: true }); }} 
                              className="gap-3 p-3 text-primary focus:bg-primary/10 focus:text-primary cursor-pointer rounded-lg"
                            >
                              <Send className="w-4 h-4" /> 
                              <div className="flex flex-col"><span className="text-sm font-bold">Publicar Agora</span><span className="text-[10px] text-primary/60">Enviar para as redes</span></div>
                            </DropdownMenuItem>
                          )}
                          <div className="h-px bg-white/5 my-1" />
                          <DropdownMenuItem 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              setDeleteConfirmId(story.id); 
                              setDeleteConfirmTable("stories_lives"); 
                            }} 
                            className="gap-3 p-3 text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" /> 
                            <div className="flex flex-col"><span className="text-sm font-bold">Excluir</span><span className="text-[10px] text-red-500/60">Remover permanentemente</span></div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-white text-xs font-bold line-clamp-2 mb-1 leading-snug drop-shadow-md">{story.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white/60 font-medium">{new Date(story.created_at).toLocaleDateString("pt-BR")}</span>
                        <div className="flex items-center gap-1 text-[9px] text-white/60">
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
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDelete(session.id, "live_sessions"); 
                        }} 
                        className="p-1 px-1.5 rounded-lg bg-black/40 hover:bg-destructive/60 transition-colors"
                      >
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
                       <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDelete(clip.id, "live_clips"); 
                        }} 
                        className="p-1 px-1.5 rounded-lg bg-black/40 hover:bg-destructive/60 transition-colors"
                      >
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

        {/* ===== PUBLISHED TAB ===== */}
        <TabsContent value="published" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl">Stories Publicados</h2>
                <p className="text-sm text-muted-foreground">Conteúdo publicado no WhatsApp, Telegram, Instagram e outras redes</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : stories.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl border border-dashed border-border">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum story publicado ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Publique stories para vê-los aqui.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {storyPlatforms.map(platformId => {
                const published = stories.filter(s => s.platform === platformId);
                if (published.length === 0) return null;
                const platform = socialPlatforms.find(p => p.id === platformId);
                const Icon = platform?.icon || Globe;
                return (
                  <div key={platformId}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", platform?.color || "bg-muted")}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-bold text-base">{platform?.name || platformId}</h3>
                      <span className="text-sm text-muted-foreground">({published.length})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {published.map((story) => (
                        <motion.div key={story.id}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-border/50 group cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                        >
                          {story.thumbnail_url ? (
                            <img src={story.thumbnail_url} alt={story.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Icon className="w-6 h-6 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white text-[11px] font-bold truncate leading-tight">{story.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Eye className="w-2.5 h-2.5 text-white/60" />
                              <span className="text-[9px] text-white/60">{story.viewers}</span>
                              <span className="text-[9px] text-white/40 ml-auto">{new Date(story.created_at).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>
                          <div className={cn("absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center", platform?.color)}>
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== CARROSSÉIS TAB ===== */}
        <TabsContent value="carrosseis" className="space-y-6">
          <CarrosselView />
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
            
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                <Send className="w-3 h-3" /> Onde publicar?
              </label>
              <div className="flex flex-wrap gap-2">
                {platformConnectionData.map(({ platform, connections: platformConnections, hasConnections, isSelected, selectedInPlatform, primaryAccount }) => {
                  const Icon = platform.icon;
                  
                  return (
                    <DropdownMenu key={`platform-container-${platform.id}`}>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => {
                            if (!hasConnections) {
                              togglePlatform(platform.id);
                              e.preventDefault();
                            } else if (platformConnections.length === 1) {
                              togglePlatform(`${platform.id}|${platformConnections[0].id}`);
                              e.preventDefault();
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm shrink-0",
                            isSelected
                              ? "border-primary/40 bg-primary/10 text-foreground shadow-sm shadow-primary/20"
                              : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40",
                            !hasConnections && "opacity-70"
                          )}
                        >
                          <div className={cn("relative shrink-0 w-6 h-6 rounded flex items-center justify-center", hasConnections ? platform.color : "bg-slate-700/50")}>
                            <Icon className="w-3 h-3 text-white" />
                            {hasConnections && (
                              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background bg-green-500" />
                            )}
                          </div>
                          
                          <span className="text-sm font-semibold truncate">
                            {isSelected && primaryAccount ? (
                              <span className="flex flex-col items-start leading-tight text-left">
                                <span className="text-[9px] opacity-70 uppercase font-bold tracking-tighter">{platform.name}</span>
                                <span className="truncate max-w-[100px] text-[11px] font-black">{primaryAccount.page_name || primaryAccount.username}</span>
                              </span>
                            ) : (
                              <span className="font-bold">{platform.name}</span>
                            )}
                          </span>
                          
                          {isSelected && (
                            <X 
                              className="w-3.5 h-3.5 shrink-0 opacity-70 hover:opacity-100 transition-opacity ml-1" 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!hasConnections) togglePlatform(platform.id);
                                else selectedInPlatform.forEach(c => togglePlatform(`${platform.id}|${c.id}`));
                              }} 
                            />
                          )}
                        </button>
                      </DropdownMenuTrigger>

                      {hasConnections && platformConnections.length > 1 && (
                        <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur-md rounded-xl p-1 z-[100]">
                          <div className="p-2 border-b border-border/50 mb-1 flex items-center gap-2">
                            <Icon className={cn("w-4 h-4", platform.textColor)} />
                            <p className="text-xs font-bold text-foreground capitalize">Contas do {platform.name}</p>
                          </div>
                          {platformConnections.map(conn => {
                            const connKey = `${platform.id}|${conn.id}`;
                            const isConnSelected = formPlatforms.includes(connKey);
                            return (
                              <DropdownMenuItem
                                key={conn.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  togglePlatform(connKey);
                                }}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                                  isConnSelected 
                                    ? "bg-primary/10 text-primary hover:bg-primary/20" 
                                    : "text-foreground hover:bg-muted"
                                )}
                              >
                                {conn.profile_image_url ? (
                                  <div className="w-6 h-6 rounded-md overflow-hidden border border-border/50 shrink-0">
                                    <SafeImage src={conn.profile_image_url} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", platform.color)}>
                                    <User className="w-3 h-3 text-white" />
                                  </div>
                                )}
                                <span className="truncate flex-1 font-medium">{conn.page_name || `Conta de ${platform.name}`}</span>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>

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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full h-12 border-dashed rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary flex items-center justify-center">
                        <Plus className="w-5 h-5 mr-2 animate-pulse" /> 
                        <span className="font-bold">{uploadingThumb ? "Subindo arquivos..." : "Adicionar Mídias"}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56 bg-zinc-900 border-white/10 text-white rounded-xl p-2 z-[150]">
                       <div className="p-2 mb-1 border-b border-white/5">
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Selecione o tipo</p>
                       </div>
                       <DropdownMenuItem onClick={() => {
                          const input = multiFileInputRef.current;
                          if (input) { input.accept = "image/*"; input.click(); }
                       }} className="gap-3 p-3 focus:bg-white/10 rounded-lg cursor-pointer transition-all">
                         <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center"><Image className="w-4 h-4 text-blue-400" /></div>
                         <div className="flex flex-col"><span className="font-bold">Fotos / Imagens</span><span className="text-[9px] text-white/50">PNG, JPG, WebP</span></div>
                       </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => {
                          const input = multiFileInputRef.current;
                          if (input) { input.accept = "video/*"; input.click(); }
                       }} className="gap-3 p-3 focus:bg-white/10 rounded-lg cursor-pointer transition-all">
                         <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center"><Video className="w-4 h-4 text-purple-400" /></div>
                         <div className="flex flex-col"><span className="font-bold">Vídeos / Reels</span><span className="text-[9px] text-white/50">MP4, MOV, WebM</span></div>
                       </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => {
                          const input = multiFileInputRef.current;
                          if (input) { input.accept = "audio/*"; input.click(); }
                       }} className="gap-3 p-3 focus:bg-white/10 rounded-lg cursor-pointer transition-all">
                         <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center"><Mic className="w-4 h-4 text-green-400" /></div>
                         <div className="flex flex-col"><span className="font-bold">Áudios / Narrações</span><span className="text-[9px] text-white/50">MP3, WAV</span></div>
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
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
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" className="rounded-xl w-full sm:w-auto order-1 sm:order-none" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            {createType === "story" ? (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  className="rounded-xl flex-1 border-primary/30 text-primary hover:bg-primary/5" 
                  disabled={submitting || !formTitle.trim() || formPlatforms.length === 0} 
                  onClick={() => handleCreate("draft")}
                >
                  Salvar Rascunho
                </Button>
                <Button 
                  className="rounded-xl flex-1 bg-primary text-white hover:bg-primary/90 font-bold" 
                  disabled={submitting || !formTitle.trim() || formPlatforms.length === 0} 
                  onClick={() => handleCreate(formScheduledAt ? "scheduled" : "published")}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {formScheduledAt ? "Agendar Story" : "Postar Agora"}
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full sm:w-auto rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold" 
                disabled={submitting || !formTitle.trim() || formPlatforms.length === 0} 
                onClick={() => handleCreate(formScheduledAt ? "scheduled" : "published")}
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {formScheduledAt ? "Agendar Live" : "Iniciar Live"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" /> Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Deseja realmente excluir este item? Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => { if (deleteConfirmId) { await handleDelete(deleteConfirmId, deleteConfirmTable); setDeleteConfirmId(null); } }}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story Visual Editor Overlay */}
      <AnimatePresence>
        {editingStory && (
           <StoryEditor 
            initialMediaUrls={
              (() => {
                // Try to parse metadata from content field if metadata is empty
                let items: any[] = [];
                if (editingStory.metadata && Array.isArray(editingStory.metadata)) {
                  items = editingStory.metadata;
                } else if (editingStory.content && (editingStory.content.trim().startsWith('[') || editingStory.content.trim().startsWith('{'))) {
                  try {
                    const parsed = JSON.parse(editingStory.content);
                    items = Array.isArray(parsed) ? parsed : [];
                  } catch (e) {
                    // Silent fail if not a valid JSON string
                  }
                }
                
                return items.length > 0 
                  ? items.map(s => s.url) 
                  : [editingStory.thumbnail_url || editingStory.media_url || ""];
              })()
            }
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
