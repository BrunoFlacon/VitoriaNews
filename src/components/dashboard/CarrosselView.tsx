import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutDashboard, Plus, Trash2, ArrowLeft, GripVertical,
  Image as ImageIcon, Send, Loader2, Check, ChevronLeft, ChevronRight,
  Instagram, Clock, Sun, SunMoon, Palette, ZoomIn, Move, Maximize2, Minus,
  Eye, Heart, MessageCircle, Share2, Play, Pause, Calendar, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePublisher } from "@/hooks/usePublisher";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useSocialStats } from "@/hooks/useSocialStats";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog as UIDialog,
  DialogContent as UIDialogContent,
  DialogHeader as UIDialogHeader,
  DialogTitle as UIDialogTitle,
  DialogDescription as UIDialogDescription,
} from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { SafeImage } from "@/components/ui/SafeImage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { useBrands } from "@/hooks/useBrands";
import type { Brand } from "@/hooks/useBrands";
import { getMediaUrl, loadSelectedAccounts } from "@/utils/mediaUtils";

interface SlideTransform {
  scale: number;
  x: number;
  y: number;
  objectFit: "cover" | "contain";
}

interface CarouselSlide {
  id: string;
  file_url: string;
  caption?: string;
}

interface CarouselPost {
  id: string;
  content: string;
  media_ids: string[];
  platforms: string[];
  status: string;
  created_at: string;
  scheduled_at: string | null;
  published_at: string | null;
  error_message: string | null;
  metadata?: Record<string, any> | null;
}

interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  platform: string;
}

const CAROUSEL_PLATFORMS = [
  "instagram", "facebook", "linkedin", "twitter", "threads", "pinterest"
] as const;

function PreviewCarousel({ urls, carouselId, previewIdx, setPreviewIdx, previewTimers, onOpen }: {
  urls: string[];
  carouselId: string;
  previewIdx: Record<string, number>;
  setPreviewIdx: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  previewTimers: React.MutableRefObject<Record<string, ReturnType<typeof setInterval>>>;
  onOpen?: () => void;
}) {
  const [loadedIdx, setLoadedIdx] = useState<number>(-1);
  const [playing, setPlaying] = useState(true);
  const count = urls.length;

  const goTo = useCallback((i: number) => {
    setPreviewIdx(prev => ({ ...prev, [carouselId]: Math.max(0, Math.min(count - 1, i)) }));
  }, [count, carouselId, setPreviewIdx]);

  const goNext = useCallback(() => {
    setPreviewIdx(prev => {
      const cur = prev[carouselId] || 0;
      return { ...prev, [carouselId]: (cur + 1) % count };
    });
  }, [count, carouselId, setPreviewIdx]);

  useEffect(() => {
    if (!count) return;
    if (playing) {
      previewTimers.current[carouselId] = setInterval(goNext, 3000);
    }
    return () => {
      if (previewTimers.current[carouselId]) {
        clearInterval(previewTimers.current[carouselId]);
        delete previewTimers.current[carouselId];
      }
    };
  }, [playing, count, goNext, carouselId, previewTimers]);

  const curIdx = previewIdx[carouselId] ?? 0;

  useEffect(() => {
    if (!count) return;
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, [count, urls]);

  if (!count) {
    return (
      <div className="w-full aspect-[9/13] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
        <ImageIcon className="w-8 h-8 text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[9/13] bg-black overflow-hidden group/carousel cursor-pointer"
      onMouseEnter={() => setPlaying(false)}
      onMouseLeave={() => setPlaying(true)}
      onClick={onOpen}
    >
      <img
        src={urls[curIdx]}
        alt=""
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          loadedIdx === curIdx ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoadedIdx(curIdx)}
        onError={() => setLoadedIdx(curIdx)}
        loading="eager"
        decoding="async"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Play/Pause + counter */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPlaying(p => !p); }}
          className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          {playing ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-white" />}
        </button>
        <span className="text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded font-medium tabular-nums">
          {curIdx + 1}/{count}
        </span>
      </div>

      {/* Dots */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
        {urls.map((_, i) => (
          <button key={i} type="button" onClick={(e) => { e.stopPropagation(); goTo(i); }}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              i === curIdx ? "bg-white w-3" : "bg-white/40 hover:bg-white/60"
            )}
          />
        ))}
      </div>

      {/* Side navigation */}
      {count > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); goTo(curIdx - 1); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); goTo(curIdx + 1); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </>
      )}
    </div>
  );
}

export const CarrosselView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { publishPost, publishing } = usePublisher();
  const { uploadMedia, uploading } = useMediaUpload();
  const { isConnected: isPlatformConnected } = useSocialStats();
  const { brands, defaultBrand } = useBrands();
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const editIdFromUrl = searchParams.get("edit");

  const [carousels, setCarousels] = useState<CarouselPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [metricsMap, setMetricsMap] = useState<Record<string, PostMetrics[]>>({});
  const [mediaUrlsMap, setMediaUrlsMap] = useState<Record<string, string[]>>({});
  const [previewIdx, setPreviewIdx] = useState<Record<string, number>>({});
  const previewTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const platformOptions = CAROUSEL_PLATFORMS.filter(pid => socialPlatforms.find(p => p.id === pid));

  const togglePlatform = (pid: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    );
  };

  const [caption, setCaption] = useState("");
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(() => {
    const saved = loadSelectedAccounts();
    return saved.length > 0 ? saved : ["instagram"];
  });
  const [saving, setSaving] = useState(false);
  const [slideTransforms, setSlideTransforms] = useState<Record<string, SlideTransform>>({});
  const [showSchedulePicker, setShowSchedulePicker] = useState<CarouselPost | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const dragRAFRef = useRef<number | null>(null);

  const fetchCarousels = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("scheduled_posts")
        .select("*")
        .eq("user_id", user.id)
        .eq("media_type", "carousel")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const posts = data || [];
      setCarousels(posts);

      // Parallelize media URLs and metrics fetching
      const allMediaIds = [...new Set(posts.flatMap((p: any) => p.media_ids || []))];
      const publishedIds = posts.filter((p: any) => p.status === 'published').map((p: any) => p.id);

      await Promise.all([
        (async () => {
          if (allMediaIds.length === 0) return;
          const { data: mediaItems } = await (supabase as any)
            .from("media")
            .select("id, file_url")
            .in("id", allMediaIds);
          if (mediaItems) {
            const mediaMap: Record<string, string> = {};
            mediaItems.forEach((m: any) => {
              mediaMap[m.id] = m.file_url;
            });
            const urlsMap: Record<string, string[]> = {};
            posts.forEach((p: any) => {
              urlsMap[p.id] = (p.media_ids || []).map((id: string) => getMediaUrl(mediaMap[id])).filter(Boolean);
            });
            setMediaUrlsMap(urlsMap);
          }
        })(),
        (async () => {
          if (publishedIds.length === 0) return;
          const { data: metrics } = await (supabase as any)
            .from("post_metrics")
            .select("*")
            .in("post_id", publishedIds);
          if (metrics) {
            const grouped: Record<string, PostMetrics[]> = {};
            metrics.forEach((m: any) => {
              if (!grouped[m.post_id]) grouped[m.post_id] = [];
              grouped[m.post_id].push(m);
            });
            setMetricsMap(grouped);
          }
        })(),
      ]);
    } catch {
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => { fetchCarousels(); }, [user]);

  useEffect(() => {
    if (editIdFromUrl && carousels.length > 0) {
      const carouselToEdit = carousels.find(c => c.id === editIdFromUrl);
      if (carouselToEdit) {
        handleViewCarousel(carouselToEdit);
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete("edit");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [editIdFromUrl, carousels, setSearchParams]);

  const getTransform = useCallback((slideId: string): SlideTransform => {
    return slideTransforms[slideId] || { scale: 1, x: 0, y: 0, objectFit: "cover" };
  }, [slideTransforms]);

  const setTransform = (slideId: string, partial: Partial<SlideTransform>) => {
    setSlideTransforms(prev => ({
      ...prev,
      [slideId]: { ...getTransform(slideId), ...partial }
    }));
  };

  const resetTransform = (slideId: string) => {
    setSlideTransforms(prev => {
      const next = { ...prev };
      delete next[slideId];
      return next;
    });
  };

  const onDragStart = (e: React.MouseEvent) => {
    const slide = slides[currentSlideIdx];
    if (!slide) return;
    const t = getTransform(slide.id);
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origX: t.x, origY: t.y };
  };

  const onDragMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    e.preventDefault();
    if (dragRAFRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    dragRAFRef.current = requestAnimationFrame(() => {
      dragRAFRef.current = null;
      const slide = slides[currentSlideIdx];
      if (!slide) return;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      setSlideTransforms(prev => ({
        ...prev,
        [slide.id]: { ...getTransform(slide.id), x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }
      }));
    });
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
    if (dragRAFRef.current) {
      cancelAnimationFrame(dragRAFRef.current);
      dragRAFRef.current = null;
    }
  };

  const resetEditor = () => {
    setCaption("");
    setSlides([]);
    setCurrentSlideIdx(0);
    setSelectedPlatforms(["instagram"]);
    setEditingId(null);
    setSlideTransforms({});
    setShowEditor(false);
  };

  const startNewCarousel = () => {
    resetEditor();
    setShowEditor(true);
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      try {
        const media = await uploadMedia(file);
        if (media) {
          setSlides(prev => [...prev, { id: media.id, file_url: media.file_url }]);
        }
      } catch (err: any) {
        toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSlide = (idx: number) => {
    setSlides(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (currentSlideIdx >= next.length && next.length > 0) {
        setCurrentSlideIdx(next.length - 1);
      }
      return next;
    });
  };

  const moveSlide = (from: number, direction: -1 | 1) => {
    const to = from + direction;
    if (to < 0 || to >= slides.length) return;
    setSlides(prev => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setCurrentSlideIdx(to);
  };

  const handleSave = async () => {
    if (!user || slides.length < 2) {
      toast({ title: "Mínimo de 2 slides", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const transforms = slides.reduce((acc, s) => {
        const t = slideTransforms[s.id];
        if (t && (t.scale !== 1 || t.x !== 0 || t.y !== 0 || t.objectFit !== "cover")) {
          acc[s.id] = t;
        }
        return acc;
      }, {} as Record<string, SlideTransform>);

      const payload: any = {
        user_id: user.id,
        content: caption,
        platforms: selectedPlatforms,
        media_ids: slides.map(s => s.id),
        media_type: "carousel",
        status: "draft",
        metadata: { carousel_slide_transforms: transforms },
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from("scheduled_posts")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Carrossel Atualizado!" });
      } else {
        const { error } = await (supabase as any)
          .from("scheduled_posts")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Carrossel Salvo!" });
      }

      resetEditor();
      fetchCarousels();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resolveMediaUrl = (fileUrl: string) => getMediaUrl(fileUrl);

  const handlePublish = async (carousel: CarouselPost) => {
    const { data: mediaItems } = await (supabase as any)
      .from("media")
      .select("file_url")
      .in("id", carousel.media_ids)
      .order("created_at", { ascending: true });

    const mediaUrls = (mediaItems || []).map((m: any) => resolveMediaUrl(m.file_url));
    if (!mediaUrls.length) {
      toast({ title: "Nenhuma mídia encontrada", variant: "destructive" });
      return;
    }

    // Ensure slide transforms are persisted before publishing
    if (carousel.metadata?.carousel_slide_transforms) {
      await (supabase as any)
        .from("scheduled_posts")
        .update({ metadata: carousel.metadata })
        .eq("id", carousel.id);
    }

    await publishPost(carousel.id, carousel.platforms, carousel.content, mediaUrls);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("scheduled_posts").delete().eq("id", id);
      if (error) throw error;
      setCarousels(prev => prev.filter(c => c.id !== id));
      toast({ title: "Carrossel Removido" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const handleDraft = async (carousel: CarouselPost) => {
    try {
      await (supabase as any)
        .from("scheduled_posts")
        .update({ status: "draft", scheduled_at: null })
        .eq("id", carousel.id);
      setCarousels(prev => prev.map(c => c.id === carousel.id ? { ...c, status: "draft", scheduled_at: null } : c));
      toast({ title: "Movido para Rascunho", description: "Disponível no Kanban (Calendário → Projetos)." });
      window.dispatchEvent(new CustomEvent("navigate-to-kanban"));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleSchedule = async () => {
    if (!showSchedulePicker || !scheduleDate) return;
    try {
      const scheduledAt = new Date(scheduleDate).toISOString();
      await (supabase as any)
        .from("scheduled_posts")
        .update({ status: "scheduled", scheduled_at: scheduledAt })
        .eq("id", showSchedulePicker.id);
      setCarousels(prev => prev.map(c => c.id === showSchedulePicker.id ? { ...c, status: "scheduled", scheduled_at: scheduledAt } : c));
      toast({ title: "Agendado!", description: `Publicação programada para ${format(new Date(scheduleDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}.` });
      setShowSchedulePicker(null);
      setScheduleDate("");
    } catch (err: any) {
      toast({ title: "Erro ao agendar", description: err.message, variant: "destructive" });
    }
  };

  const handleViewCarousel = async (carousel: CarouselPost) => {
    const { data: mediaItems } = await (supabase as any)
      .from("media")
      .select("id, file_url")
      .in("id", carousel.media_ids);

    setCaption(carousel.content);
    setSlides((mediaItems || []).map((m: any) => ({ id: m.id, file_url: resolveMediaUrl(m.file_url) })));
    setCurrentSlideIdx(0);
    setSelectedPlatforms(carousel.platforms);
    setEditingId(carousel.id);
    setSlideTransforms(carousel.metadata?.carousel_slide_transforms || {});
    setShowEditor(true);
  };

  if (showEditor) {
    const activeBrand = selectedBrand || defaultBrand;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={resetEditor}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-display font-bold">
                {editingId ? "Editar Carrossel" : "Novo Carrossel"}
              </h2>
              <p className="text-sm text-muted-foreground">Crie posts com múltiplas imagens para Instagram.</p>
            </div>
          </div>
        </div>

        {/* Brand Identity Bar */}
        {brands.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/20 flex-wrap">
            <Palette className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-medium">Identidade Visual:</span>
            <div className="flex gap-1.5 flex-wrap">
              {brands.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBrand(b)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all",
                    activeBrand?.id === b.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 hover:border-primary/40"
                  )}
                >
                  <div className="flex gap-0.5">
                    <span className="w-3 h-3 rounded-full border border-white/20" style={{ background: b.primary_color }} />
                    <span className="w-3 h-3 rounded-full border border-white/20" style={{ background: b.secondary_color }} />
                  </div>
                  {b.name}
                  {b.is_default && <span className="text-[9px] opacity-60">padrão</span>}
                </button>
              ))}
            </div>
            {activeBrand && (
              <div className="ml-auto flex items-center gap-2">
                <div className="flex gap-1 rounded overflow-hidden h-4 w-20">
                  {[activeBrand.primary_color, activeBrand.secondary_color, activeBrand.highlight_color, activeBrand.background_color].filter(Boolean).map((c, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: c! }} />
                  ))}
                </div>
                {activeBrand.font_primary && (
                  <span className="text-[10px] text-muted-foreground">{activeBrand.font_primary}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Pré-visualização</h3>
              <Badge variant="outline">{slides.length} slides</Badge>
            </div>
            <div className="aspect-[9/16] max-w-[350px] mx-auto bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl overflow-hidden border border-border/40 shadow-2xl relative select-none"
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onMouseLeave={onDragEnd}
            >
              {slides.length > 0 ? (
                <>
                  <div className="w-full h-full" style={{
                    transform: `translate(${getTransform(slides[currentSlideIdx]?.id).x}px, ${getTransform(slides[currentSlideIdx]?.id).y}px) scale(${getTransform(slides[currentSlideIdx]?.id).scale})`,
                    transition: dragRef.current.active ? 'none' : 'transform 0.15s ease-out'
                  }}>
                    <SafeImage
                      src={slides[currentSlideIdx]?.file_url}
                      className={cn(
                        "w-full h-full",
                        getTransform(slides[currentSlideIdx]?.id).objectFit === "cover" ? "object-cover" : "object-contain"
                      )}
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                    <p className="text-white text-xs line-clamp-2">
                      {slides[currentSlideIdx]?.caption || caption || "Legenda do carrossel..."}
                    </p>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-1">
                    {slides.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all",
                          i === currentSlideIdx ? "bg-white w-3" : "bg-white/40"
                        )}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-x-0 bottom-16 flex justify-center gap-2">
                    {slides.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-black/30 hover:bg-black/50 text-white rounded-full"
                          onClick={() => setCurrentSlideIdx(prev => Math.max(0, prev - 1))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-black/30 hover:bg-black/50 text-white rounded-full"
                          onClick={() => setCurrentSlideIdx(prev => Math.min(slides.length - 1, prev + 1))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Adicione imagens para预览
                </div>
              )}
            </div>

            {/* Image repositioning controls */}
            {slides[currentSlideIdx] && (
              <div className="space-y-3 p-3 rounded-xl bg-muted/30 border border-border/20 max-w-[350px] mx-auto w-full">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Move className="w-3 h-3" /> Ajuste de Imagem
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-muted-foreground"
                    onClick={() => resetTransform(slides[currentSlideIdx].id)}
                  >
                    Redefinir
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomIn className="w-3 h-3 text-muted-foreground shrink-0" />
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={Math.round(getTransform(slides[currentSlideIdx].id).scale * 100)}
                    onChange={e => setTransform(slides[currentSlideIdx].id, { scale: Number(e.target.value) / 100 })}
                    className="flex-1 h-1 accent-primary"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                    {Math.round(getTransform(slides[currentSlideIdx].id).scale * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-7 text-[10px] flex-1", getTransform(slides[currentSlideIdx].id).objectFit === "cover" && "border-primary text-primary")}
                    onClick={() => setTransform(slides[currentSlideIdx].id, { objectFit: "cover" })}
                  >
                    <Maximize2 className="w-3 h-3 mr-1" /> Cortar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-7 text-[10px] flex-1", getTransform(slides[currentSlideIdx].id).objectFit === "contain" && "border-primary text-primary")}
                    onClick={() => setTransform(slides[currentSlideIdx].id, { objectFit: "contain" })}
                  >
                    <Minus className="w-3 h-3 mr-1" /> Ajustar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Legenda do Carrossel</label>
              <Textarea
                placeholder="Escreva a legenda que aparecerá em todas as imagens..."
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Slides</label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleAddImages}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    Adicionar Imagens
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {slides.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm border-2 border-dashed border-border/40 rounded-xl">
                    Nenhuma imagem. Adicione pelo menos 2 imagens.
                  </div>
                ) : (
                  slides.map((slide, idx) => (
                    <div
                      key={slide.id + idx}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-xl border transition-all",
                        idx === currentSlideIdx
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/40 bg-card/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveSlide(idx, -1)} disabled={idx === 0}>
                          <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <span className="text-[10px] text-center text-muted-foreground">{idx + 1}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveSlide(idx, 1)} disabled={idx === slides.length - 1}>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                      <div
                        className={cn(
                          "w-16 h-16 rounded-lg overflow-hidden shrink-0 cursor-pointer ring-2 transition-all",
                          idx === currentSlideIdx ? "ring-primary" : "ring-transparent"
                        )}
                        onClick={() => setCurrentSlideIdx(idx)}
                      >
                        <SafeImage src={slide.file_url} className="w-full h-full object-cover" />
                      </div>
                      <Input
                        placeholder="Legenda do slide (opcional)"
                        className="h-8 text-xs flex-1 min-w-0"
                        value={slide.caption || ""}
                        onChange={e => {
                          const next = [...slides];
                          next[idx] = { ...next[idx], caption: e.target.value };
                          setSlides(next);
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeSlide(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border/20">
              <div>
                <label className="text-sm font-medium mb-2 block">Redes Sociais</label>
                <div className="grid grid-cols-2 gap-2">
                  {platformOptions.map(pid => {
                    const p = socialPlatforms.find(sp => sp.id === pid);
                    if (!p) return null;
                    const Icon = p.icon;
                    const selected = selectedPlatforms.includes(pid);
                    const connected = isPlatformConnected(pid);
                    return (
                      <button key={pid} type="button" onClick={() => togglePlatform(pid)}
                        className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs",
                          selected ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40",
                          !connected && "opacity-70")}
                      >
                        <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", connected ? p.color : "bg-slate-700/50")}>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  <span className="text-sm text-muted-foreground">Carrossel</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetEditor}>Cancelar</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || slides.length < 2}>
                    {saving ? <Loader2 className="animate-spin mr-1" /> : <Check className="mr-1" />}
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Carrossel de Imagens</h2>
          <p className="text-muted-foreground">Crie e publique carrosseis de imagens para Instagram.</p>
        </div>
        <Button onClick={startNewCarousel} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />Novo Carrossel
        </Button>
      </div>

      {initialLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass-card border-border/40 overflow-hidden">
              <div className="w-full aspect-[9/13] bg-zinc-800/50 animate-pulse" />
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-zinc-700/50 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="h-3 w-32 bg-zinc-700/50 rounded animate-pulse" />
                <div className="h-3 w-20 bg-zinc-700/50 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : carousels.length === 0 ? (
        <div className="py-20 text-center glass-card rounded-2xl border-dashed">
          <LayoutDashboard className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground">Nenhum carrossel criado ainda.</p>
          <Button variant="outline" className="mt-4" onClick={startNewCarousel}>
            <Plus className="w-4 h-4 mr-2" />Criar Primeiro Carrossel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {carousels.map((carousel) => (
            <div key={carousel.id}>
              <Card className="glass-card hover:shadow-xl hover:shadow-primary/5 transition-all group border-border/40 overflow-hidden">
                {/* Mini carousel preview */}
                <PreviewCarousel
                  urls={mediaUrlsMap[carousel.id] || []}
                  carouselId={carousel.id}
                  previewIdx={previewIdx}
                  setPreviewIdx={setPreviewIdx}
                  previewTimers={previewTimers}
                  onOpen={() => handleViewCarousel(carousel)}
                />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div>
                        <CardTitle className="text-sm font-medium">Carrossel</CardTitle>
                        <Badge variant="outline" className="text-[10px] mt-1">
                          {carousel.media_ids?.length || 0} slides
                        </Badge>
                      </div>
                    </div>
                    <Badge className={cn(
                      "text-[10px]",
                      carousel.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                      carousel.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    )}>
                      {carousel.status === 'published' ? 'Publicado' :
                       carousel.status === 'scheduled' ? 'Agendado' : 'Rascunho'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{carousel.content || "Sem legenda"}</p>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(carousel.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>

                  {carousel.platforms && carousel.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {carousel.platforms.map(pid => {
                        const meta = socialPlatforms.find(p => p.id === pid);
                        return (
                          <span key={pid} className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
                            {meta ? <meta.icon className="w-2.5 h-2.5" /> : null}
                            {meta?.name || pid}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {carousel.status === 'published' && metricsMap[carousel.id] && metricsMap[carousel.id].length > 0 && (() => {
                    const totals = metricsMap[carousel.id].reduce((acc, m) => ({
                      impressions: acc.impressions + (m.impressions || 0),
                      reach: acc.reach + (m.reach || 0),
                      likes: acc.likes + (m.likes || 0),
                      comments: acc.comments + (m.comments || 0),
                      shares: acc.shares + (m.shares || 0),
                    }), { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0 });
                    return (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {totals.impressions > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Eye className="w-3 h-3" /> {totals.impressions.toLocaleString('pt-BR')}
                          </span>
                        )}
                        {totals.reach > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Send className="w-3 h-3" /> {totals.reach.toLocaleString('pt-BR')}
                          </span>
                        )}
                        {totals.likes > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Heart className="w-3 h-3" /> {totals.likes.toLocaleString('pt-BR')}
                          </span>
                        )}
                        {totals.comments > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3" /> {totals.comments.toLocaleString('pt-BR')}
                          </span>
                        )}
                        {totals.shares > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Share2 className="w-3 h-3" /> {totals.shares.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
                <div className="flex border-t border-border/20">
                  <Button variant="ghost" size="sm" className="flex-1 rounded-none rounded-bl-xl text-xs h-9" onClick={() => handleViewCarousel(carousel)}>
                    Editar
                  </Button>
                  <div className="w-px bg-border/20" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 rounded-none text-xs h-9 text-emerald-400"
                        disabled={publishing}
                      >
                        {publishing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                        Publicar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-44">
                      <DropdownMenuItem onClick={() => handleDraft(carousel)} className="gap-2">
                        <FileText className="w-4 h-4" /> Rascunho
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setShowSchedulePicker(carousel); setScheduleDate(""); }} className="gap-2">
                        <Calendar className="w-4 h-4" /> Agendar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handlePublish(carousel)} className="gap-2 text-emerald-400">
                        <Send className="w-4 h-4" /> Publicar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="w-px bg-border/20" />
                  <Button variant="ghost" size="sm" className="flex-1 rounded-none rounded-br-xl text-xs h-9 text-destructive" onClick={() => handleDelete(carousel.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />Excluir
                  </Button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Schedule picker dialog */}
      <UIDialog open={!!showSchedulePicker} onOpenChange={(v) => { if (!v) setShowSchedulePicker(null); }}>
        <UIDialogContent className="sm:max-w-sm">
          <UIDialogHeader>
            <UIDialogTitle>Agendar Publicação</UIDialogTitle>
            <UIDialogDescription>Escolha a data e horário para publicar o carrossel.</UIDialogDescription>
          </UIDialogHeader>
          <div className="space-y-4">
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSchedulePicker(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSchedule} disabled={!scheduleDate}>
                <Calendar className="w-4 h-4 mr-1" /> Agendar
              </Button>
            </div>
          </div>
        </UIDialogContent>
      </UIDialog>
    </div>
  );
};
