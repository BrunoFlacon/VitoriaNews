import { motion } from "framer-motion";
import { useState, useMemo, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  Filter,
  BarChart3,
  Send,
  XCircle,
  ShieldCheck,
  MessageCircle,
  Radio,
  Video,
  Scissors,
  Search,
  Calendar as CalendarIcon,
  ShieldX
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
import { ScheduledPost } from "@/hooks/useScheduledPosts";
import { useNotifications } from "@/contexts/NotificationContext";
import { usePublisher } from "@/hooks/usePublisher";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const statusConfig = {
  published: {
    icon: CheckCircle2,
    label: "Publicado",
    color: "text-green-500",
    bg: "bg-green-500/10",
    dot: "bg-green-500"
  },
  scheduled: {
    icon: Clock,
    label: "Agendado",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    dot: "bg-blue-500"
  },
  draft: {
    icon: Edit,
    label: "Rascunho",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    dot: "bg-yellow-500"
  },
  pending_approval: {
    icon: Loader2,
    label: "Aguardando Aprovação",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    dot: "bg-orange-500"
  },
  rejected: {
    icon: XCircle,
    label: "Rejeitado",
    color: "text-red-700",
    bg: "bg-red-700/10",
    dot: "bg-red-700"
  },
  failed: {
    icon: AlertCircle,
    label: "Falhou",
    color: "text-red-500",
    bg: "bg-red-500/10",
    dot: "bg-red-500"
  }
};

type StatusKey = keyof typeof statusConfig;

interface CalendarViewProps {
  posts: ScheduledPost[];
  loading: boolean;
  deletePost: (postId: string) => Promise<boolean>;
  submitForApproval: (postId: string) => Promise<boolean>;
  approvePost: (postId: string) => Promise<boolean>;
  rejectPost: (postId: string, reason: string) => Promise<boolean>;
  refetch: () => Promise<void>;
  onCreatePost?: (preSelectedDate?: Date) => void;
  onEditPost?: (post: ScheduledPost) => void;
}

export const CalendarView = ({ posts, loading, deletePost, submitForApproval, approvePost, rejectPost, refetch, onCreatePost, onEditPost }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [showPostDetails, setShowPostDetails] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<StatusKey>>(new Set(["published", "scheduled", "draft", "failed", "pending_approval", "rejected"]));

  // Extra calendar items: messages + stories/lives
  const { user } = useAuth();
  const [calendarMessages, setCalendarMessages] = useState<any[]>([]);
  const [calendarStories, setCalendarStories] = useState<any[]>([]);
  const [calendarMemories, setCalendarMemories] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchExtra = async () => {
      const [msgRes, storyRes, memRes] = await Promise.all([
        supabase.from("messages").select("*").eq("user_id", user.id).not("scheduled_at", "is", null),
        supabase.from("stories_lives").select("*").eq("user_id", user.id),
        supabase.from("stories_lives")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "published")
          .not("completed_at", "is", null),
      ]);
      if (msgRes.data) setCalendarMessages(msgRes.data);
      if (storyRes.data) setCalendarStories(storyRes.data);
      if (memRes.data) setCalendarMemories(memRes.data);
    };
    fetchExtra();
  }, [user, posts]);

  const { addNotification } = useNotifications();
  const { publishNow, publishing } = usePublisher();
  const { isEditor } = useUserRole();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Notify about failed posts
  const notifiedFailuresRef = useRef(new Set<string>());
  useEffect(() => {
    const failedPosts = posts.filter(p => p.status === 'failed');
    failedPosts.forEach(post => {
      if (post.error_message && !notifiedFailuresRef.current.has(post.id)) {
        notifiedFailuresRef.current.add(post.id);
        addNotification({
          type: 'error',
          title: 'Falha na publicação',
          message: `Post "${post.content.substring(0, 50)}..." falhou. ${getSuggestion(post.error_message)}`,
          platform: post.platforms[0],
        });
      }
    });
  }, [posts]);

  const getSuggestion = (error: string): string => {
    if (error.toLowerCase().includes('token')) return 'Sugestão: Reconecte sua conta na aba Configurações.';
    if (error.toLowerCase().includes('rate limit')) return 'Sugestão: Aguarde alguns minutos e tente novamente.';
    if (error.toLowerCase().includes('image') || error.toLowerCase().includes('media')) return 'Sugestão: Verifique se a mídia está no formato correto.';
    if (error.toLowerCase().includes('size')) return 'Sugestão: Reduza o tamanho do arquivo ou texto.';
    return 'Sugestão: Verifique as configurações e tente novamente.';
  };

  const toggleFilter = (status: StatusKey) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        if (next.size > 1) next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const filteredPosts = useMemo(() => 
    posts.filter(p => activeFilters.has(p.status as StatusKey)),
    [posts, activeFilters]
  );

  const monthlySummary = useMemo(() => {
    const monthPosts = posts.filter(post => {
      const postDate = post.scheduled_at ? new Date(post.scheduled_at) : post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      return postDate.getMonth() === month && postDate.getFullYear() === year;
    });
    return {
      total: monthPosts.length,
      published: monthPosts.filter(p => p.status === 'published').length,
      scheduled: monthPosts.filter(p => p.status === 'scheduled').length,
      draft: monthPosts.filter(p => p.status === 'draft').length,
      pending_approval: monthPosts.filter(p => p.status === 'pending_approval').length,
      rejected: monthPosts.filter(p => p.status === 'rejected').length,
      failed: monthPosts.filter(p => p.status === 'failed').length,
    };
  }, [posts, month, year]);

  const postsByDay = useMemo(() => {
    const grouped: Record<number, ScheduledPost[]> = {};
    filteredPosts.forEach(post => {
      const postDate = post.scheduled_at ? new Date(post.scheduled_at) : post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      if (postDate.getMonth() === month && postDate.getFullYear() === year) {
        const day = postDate.getDate();
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(post);
      }
    });
    return grouped;
  }, [filteredPosts, month, year]);

  // Extra items (messages and stories) grouped by day for calendar indicators
  const extraItemsByDay = useMemo(() => {
    const grouped: Record<number, { type: string; title: string; status: string; platform?: string; scheduled_at?: string }[]> = {};
    calendarMessages.forEach(msg => {
      if (!msg.scheduled_at) return;
      const d = new Date(msg.scheduled_at);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push({ type: "message", title: msg.content?.substring(0, 40) || "Mensagem", status: msg.status, platform: msg.platform, scheduled_at: msg.scheduled_at });
      }
    });
    calendarStories.forEach(item => {
      const d = item.scheduled_at ? new Date(item.scheduled_at) : new Date(item.created_at);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push({ type: item.type, title: item.title, status: item.status, platform: item.platform, scheduled_at: item.scheduled_at });
      }
    });
    return grouped;
  }, [calendarMessages, calendarStories, month, year]);

  const memoriesByDay = useMemo(() => {
    const grouped: Record<number, any[]> = {};
    calendarMemories.forEach(mem => {
      const d = new Date(mem.completed_at || mem.created_at);
      const isSixMonths = d.getMonth() === month && (year - d.getFullYear()) === 0 && d.getMonth() === (new Date().getMonth() - 6); // Simplified logic
      // Better: Check if d is exactly 6 or 12 months before the CALENDAR month/year shown
      
      const mDate = new Date(d);
      const viewDate = new Date(year, month, d.getDate());
      
      // Check 6 months difference
      const diffMonths = (year * 12 + month) - (d.getFullYear() * 12 + d.getMonth());
      if (diffMonths === 6 || diffMonths === 12) {
        const day = d.getDate();
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(mem);
      }
    });
    return grouped;
  }, [calendarMemories, month, year]);

  const goToPrevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const goToNextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const selectedDayPosts = selectedDay ? postsByDay[selectedDay] || [] : [];

  const handleDeletePost = async (postId: string) => {
    const success = await deletePost(postId);
    if (success) {
      addNotification({ type: 'success', title: 'Post excluído', message: 'O post foi removido com sucesso.' });
    }
  };

  const handlePublishNow = async (post: ScheduledPost) => {
    const mediaUrls: string[] = [];
    const result = await publishNow(post.content, post.platforms, mediaUrls);
    if (result) {
      addNotification({ type: 'success', title: 'Publicado!', message: 'O post foi publicado com sucesso.', platform: post.platforms[0] });
      refetch();
    }
  };

  const handleSubmitForApproval = async (postId: string) => {
    const success = await submitForApproval(postId);
    if (success) {
      addNotification({ type: 'success', title: 'Enviado para aprovação', message: 'O post aguarda revisão.' });
    }
  };

  const handleApprovePost = async (postId: string) => {
    const success = await approvePost(postId);
    if (success) {
      addNotification({ type: 'success', title: 'Post aprovado!', message: 'O post foi aprovado e agendado.' });
    }
  };

  const handleOpenRejectDialog = (postId: string) => {
    setRejectingPostId(postId);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingPostId || !rejectReason.trim()) return;
    const success = await rejectPost(rejectingPostId, rejectReason.trim());
    if (success) {
      addNotification({ type: 'warning', title: 'Post rejeitado', message: 'O post foi devolvido para revisão.' });
    }
    setShowRejectDialog(false);
    setRejectingPostId(null);
    setRejectReason("");
  };

  const viewPostDetails = (post: ScheduledPost) => { setSelectedPost(post); setShowPostDetails(true); };

  const formatPostTime = (post: ScheduledPost): string => {
    const date = post.scheduled_at ? new Date(post.scheduled_at) : post.published_at ? new Date(post.published_at) : new Date(post.created_at);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleAddPost = () => {
    if (onCreatePost && selectedDay) {
      const preSelectedDate = new Date(year, month, selectedDay, 12, 0);
      onCreatePost(preSelectedDate);
    } else if (onCreatePost) {
      onCreatePost();
    }
  };

  // Render rich status icons for day cells
  const renderDayIndicators = (dayPosts: ScheduledPost[], dayExtraItems?: typeof extraItemsByDay[number]) => {
    const totalExtra = dayExtraItems?.length || 0;
    if (dayPosts.length === 0 && totalExtra === 0) return null;

    const maxIcons = 4;
    const showPosts = dayPosts.slice(0, dayPosts.length > maxIcons ? maxIcons - 1 : maxIcons);
    const remaining = dayPosts.length - showPosts.length + totalExtra;

    return (
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-0.5 flex-wrap">
        {showPosts.map((post, i) => {
          const config = statusConfig[post.status as StatusKey];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <Icon key={i} className={cn("w-3 h-3", config.color)} />
          );
        })}
        {totalExtra > 0 && showPosts.length < maxIcons && (
          <>
            {dayExtraItems!.slice(0, maxIcons - showPosts.length).map((item, i) => {
              if (item.type === "message") return <MessageCircle key={`m${i}`} className="w-3 h-3 text-primary" />;
              if (item.type === "story") return <Radio key={`s${i}`} className="w-3 h-3 text-pink-500" />;
              if (item.type === "live") return <Video key={`l${i}`} className="w-3 h-3 text-red-500" />;
              return null;
            })}
          </>
        )}
        {remaining > (totalExtra > 0 && showPosts.length < maxIcons ? Math.min(totalExtra, maxIcons - showPosts.length) : 0) && (
          <span className="text-[8px] font-bold text-muted-foreground">+{remaining}</span>
        )}
      </div>
    );
  };

  const renderMemoryIndicator = (day: number) => {
    const mems = memoriesByDay[day];
    if (!mems || mems.length === 0) return null;
    return (
      <HoverCard openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div className="absolute top-1 right-1 cursor-help">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-64 p-3 bg-background/95 backdrop-blur border-pink-500/20 rounded-2xl shadow-xl">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-pink-500 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" /> Memórias do dia
            </p>
            <div className="grid grid-cols-3 gap-2">
              {mems.slice(0, 3).map(mem => (
                <div key={mem.id} className="aspect-[9/16] rounded-lg overflow-hidden border border-border/50">
                  <img src={mem.thumbnail_url || mem.media_url} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {mems.length > 3 && <p className="text-[9px] text-muted-foreground text-center">+{mems.length - 3} outras memórias</p>}
            <p className="text-[10px] text-center text-muted-foreground italic">Clique no dia para ver e republicar</p>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl mb-2">Calendário Editorial</h1>
        <p className="text-muted-foreground">Visualize e gerencie suas publicações agendadas</p>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: "Total", value: monthlySummary.total, icon: BarChart3, colorClass: "text-foreground" },
          { label: "Publicados", value: monthlySummary.published, icon: CheckCircle2, colorClass: "text-green-500" },
          { label: "Agendados", value: monthlySummary.scheduled, icon: Clock, colorClass: "text-blue-500" },
          { label: "Rascunhos", value: monthlySummary.draft, icon: Edit, colorClass: "text-yellow-500" },
          { label: "Aprovação", value: monthlySummary.pending_approval, icon: Loader2, colorClass: "text-orange-500" },
          { label: "Rejeitados", value: monthlySummary.rejected, icon: XCircle, colorClass: "text-red-700" },
          { label: "Falhas", value: monthlySummary.failed, icon: AlertCircle, colorClass: "text-red-500" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-xl border border-border p-3 flex items-center gap-2"
            >
              <Icon className={cn("w-4 h-4", item.colorClass)} />
              <div>
                <p className="text-xl font-bold">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(Object.entries(statusConfig) as [StatusKey, typeof statusConfig[StatusKey]][]).map(([key, config]) => {
          const isActive = activeFilters.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                isActive ? cn(config.bg, config.color, "border-current") : "bg-muted/30 text-muted-foreground border-transparent opacity-50"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", isActive ? config.dot : "bg-muted-foreground")} />
              {config.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-2xl border border-border p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-xl">{months[month]} {year}</h2>
            <div className="flex items-center gap-2">
              <button onClick={goToPrevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayPosts = day ? postsByDay[day] : undefined;
                const dayExtra = day ? extraItemsByDay[day] : undefined;
                const isSelected = day === selectedDay;
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                return (
                  <motion.div
                    key={index}
                    whileHover={day ? { scale: 1.05 } : {}}
                    className={cn(
                      "aspect-square rounded-xl p-2 transition-all cursor-pointer relative",
                      day ? "hover:bg-muted/50" : "",
                      isSelected && "bg-primary/20 border border-primary/50",
                      isToday && !isSelected && "bg-accent/20 border border-accent/50"
                    )}
                    onClick={() => day && setSelectedDay(day)}
                  >
                    {day && (
                      <>
                        <span className={cn("text-sm font-medium", isToday && "text-accent", isSelected && "text-primary")}>{day}</span>
                        {(dayPosts || dayExtra) && renderDayIndicators(dayPosts || [], dayExtra)}
                        {renderMemoryIndicator(day)}
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Day Details */}
        <div className="glass-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg">
              {selectedDay ? `${selectedDay} de ${months[month]}` : "Selecione um dia"}
            </h3>
            <button
              onClick={handleAddPost}
              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {selectedDay ? (
            <>
              {selectedDayPosts.length > 0 && (
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {selectedDayPosts.map((post, index) => {
                    const config = statusConfig[post.status as StatusKey];
                    const StatusIcon = config?.icon || Clock;
                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex -space-x-1.5 shrink-0">
                            {post.platforms.slice(0, 3).map((platformId) => {
                              const platform = socialPlatforms.find(p => p.id === platformId);
                              if (!platform) return null;
                              return (
                                <PlatformIconBadge
                                  key={platformId}
                                  platform={platform}
                                  size="xs"
                                  className="border-2 border-card -mr-1.5"
                                />
                              );
                            })}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2 mb-2">{post.content}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", config?.bg, config?.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {config?.label}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatPostTime(post)}
                              </span>
                            </div>
                            {post.status === 'failed' && post.error_message && (
                              <div className="mt-2 p-2 bg-red-500/10 rounded-lg">
                                <p className="text-xs text-red-500">{post.error_message}</p>
                              </div>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => viewPostDetails(post)}>
                                <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                              </DropdownMenuItem>
                              {onEditPost && (
                                <DropdownMenuItem onClick={() => onEditPost(post)}>
                                  <Edit className="w-4 h-4 mr-2" /> Editar conteúdo
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {post.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleSubmitForApproval(post.id)}>
                                  <Send className="w-4 h-4 mr-2" /> Enviar para aprovação
                                </DropdownMenuItem>
                              )}
                              {post.status === 'pending_approval' && isEditor && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApprovePost(post.id)}>
                                    <ShieldCheck className="w-4 h-4 mr-2 text-green-500" /> Aprovar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenRejectDialog(post.id)}>
                                    <ShieldX className="w-4 h-4 mr-2 text-red-500" /> Rejeitar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(post.status === 'draft' || post.status === 'scheduled') && (
                                <DropdownMenuItem onClick={() => handlePublishNow(post)} disabled={publishing}>
                                  <Send className="w-4 h-4 mr-2" /> Publicar agora
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Extra items: messages and stories/lives */}
              {extraItemsByDay[selectedDay] && extraItemsByDay[selectedDay].length > 0 && (
                <div className={cn("space-y-2", selectedDayPosts.length > 0 && "mt-4 pt-4 border-t border-border")}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Mensagens & Stories</p>
                  {extraItemsByDay[selectedDay].map((item, i) => {
                    const platform = socialPlatforms.find(p => p.id === item.platform);
                    const PIcon = platform?.icon;
                    return (
                      <div key={i} className="p-3 rounded-lg bg-muted/20 flex items-center gap-3">
                        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", 
                          item.type === "message" ? "bg-primary/20" : item.type === "story" ? "bg-pink-500/20" : "bg-red-500/20")}>
                          {item.type === "message" ? <MessageCircle className="w-3.5 h-3.5 text-primary" /> 
                           : item.type === "story" ? <Radio className="w-3.5 h-3.5 text-pink-500" /> 
                           : <Video className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                        {PIcon && (
                          <div className={cn("w-5 h-5 rounded flex items-center justify-center", platform?.color)}>
                            <PIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs line-clamp-1">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{item.type === "message" ? "Mensagem" : item.type === "story" ? "Story" : "Live"} • {item.status}</p>
                        </div>
                        {item.scheduled_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedDayPosts.length === 0 && (!extraItemsByDay[selectedDay] || extraItemsByDay[selectedDay].length === 0) && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">Nenhuma publicação neste dia</p>
                  <button onClick={handleAddPost} className="text-primary text-sm hover:underline">+ Agendar publicação</button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Clique em um dia para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* Post Details Dialog */}
      <Dialog open={showPostDetails} onOpenChange={setShowPostDetails}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Detalhes do Post</DialogTitle>
            <DialogDescription>Informações completas sobre a publicação</DialogDescription>
          </DialogHeader>
          {selectedPost && (() => {
            const config = statusConfig[selectedPost.status as StatusKey];
            return (
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium", config?.bg, config?.color)}>
                    {config && <config.icon className="w-3 h-3" />}
                    {config?.label}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">Plataformas:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.platforms.map((platformId) => {
                      const platform = socialPlatforms.find(p => p.id === platformId);
                      if (!platform) return null;
                      return (
                        <div key={platformId} className="flex items-center gap-1.5">
                          <PlatformIconBadge platform={platform} size="xs" />
                          <span className="text-xs font-medium">{platform.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">Conteúdo:</span>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedPost.content}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">Criado em:</span>
                    <span className="text-sm">{new Date(selectedPost.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  {selectedPost.scheduled_at && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-1">Agendado para:</span>
                      <span className="text-sm">{new Date(selectedPost.scheduled_at).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                  {selectedPost.published_at && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-1">Publicado em:</span>
                      <span className="text-sm">{new Date(selectedPost.published_at).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>
                {selectedPost.status === 'failed' && selectedPost.error_message && (
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <span className="text-sm font-medium text-red-500 block mb-1">Erro:</span>
                    <p className="text-sm text-red-500">{selectedPost.error_message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{getSuggestion(selectedPost.error_message)}</p>
                  </div>
                )}
                {selectedPost.status === 'rejected' && selectedPost.error_message && (
                  <div className="p-3 bg-red-700/10 rounded-lg">
                    <span className="text-sm font-medium text-red-700 block mb-1">Motivo da rejeição:</span>
                    <p className="text-sm text-red-700">{selectedPost.error_message}</p>
                  </div>
                )}
                {/* Contextual action buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowPostDetails(false)}>Fechar</Button>
                  {onEditPost && (
                    <Button variant="secondary" onClick={() => { onEditPost(selectedPost); setShowPostDetails(false); }}>
                      <Edit className="w-4 h-4 mr-2" /> Editar
                    </Button>
                  )}
                  {/* Draft: submit for approval */}
                  {selectedPost.status === 'draft' && (
                    <Button variant="outline" onClick={() => { handleSubmitForApproval(selectedPost.id); setShowPostDetails(false); }}>
                      <Send className="w-4 h-4 mr-2" /> Enviar para Aprovação
                    </Button>
                  )}
                  {/* Pending approval: approve / reject */}
                  {selectedPost.status === 'pending_approval' && isEditor && (
                    <>
                      <Button onClick={() => { handleApprovePost(selectedPost.id); setShowPostDetails(false); }} className="bg-green-600 hover:bg-green-700 text-white">
                        <ShieldCheck className="w-4 h-4 mr-2" /> Aprovar
                      </Button>
                      <Button variant="destructive" onClick={() => { handleOpenRejectDialog(selectedPost.id); setShowPostDetails(false); }}>
                        <ShieldX className="w-4 h-4 mr-2" /> Rejeitar
                      </Button>
                    </>
                  )}
                  {/* Rejected: edit and resubmit */}
                  {selectedPost.status === 'rejected' && onEditPost && (
                    <Button variant="secondary" onClick={() => { onEditPost(selectedPost); setShowPostDetails(false); }}>
                      <Edit className="w-4 h-4 mr-2" /> Editar e Reenviar
                    </Button>
                  )}
                  {(selectedPost.status === 'draft' || selectedPost.status === 'scheduled') && (
                    <Button onClick={() => { handlePublishNow(selectedPost); setShowPostDetails(false); }} disabled={publishing}>
                      <Send className="w-4 h-4 mr-2" /> Publicar
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => { handleDeletePost(selectedPost.id); setShowPostDetails(false); }}>
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldX className="w-5 h-5 text-red-500" />
              Rejeitar Post
            </DialogTitle>
            <DialogDescription>Informe o motivo da rejeição para que o autor possa corrigir.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmReject} disabled={!rejectReason.trim()}>
              <ShieldX className="w-4 h-4 mr-2" /> Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
