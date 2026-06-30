import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Play, Video, Clock, Check, Plus, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUtils";

interface VideoItem {
  id: string;
  title: string;
  media_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  created_at: string;
}

interface PostVideoPickerProps {
  onSelect: (url: string) => void;
  selectedUrl?: string;
}

export function PostVideoPicker({ onSelect, selectedUrl }: PostVideoPickerProps) {
  const [stories, setStories] = useState<VideoItem[]>([]);
  const [media, setMedia] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("stories");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) { setLoading(false); return; }

      const [storiesRes, mediaRes] = await Promise.all([
        supabase
          .from('stories_lives')
          .select('id, title, media_url, thumbnail_url, duration, created_at')
          .eq('user_id', user.user.id)
          .in('type', ['video', 'story'])
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('media')
          .select('id, name, file_url, thumbnail_url, duration, created_at')
          .eq('user_id', user.user.id)
          .like('file_type', 'video/%')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (!mounted) return;

      if (storiesRes.data) {
        setStories(storiesRes.data.map(v => ({
          id: v.id,
          title: v.title || 'Vídeo',
          media_url: getMediaUrl(v.media_url) || '',
          thumbnail_url: v.thumbnail_url,
          duration: v.duration,
          created_at: v.created_at,
        })));
      }

      if (mediaRes.data) {
        setMedia(mediaRes.data.map(m => ({
          id: m.id,
          title: m.name || 'Mídia',
          media_url: getMediaUrl(m.file_url) || '',
          thumbnail_url: m.thumbnail_url,
          duration: m.duration,
          created_at: m.created_at,
        })));
      }

      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const items = tab === "stories" ? stories : media;
  const filtered = search
    ? items.filter(v => v.title.toLowerCase().includes(search.toLowerCase()))
    : items;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Video className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vídeos</span>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar vídeos..."
          className="pl-8 h-8 text-xs"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-7">
          <TabsTrigger value="stories" className="text-[10px] px-3">Stories</TabsTrigger>
          <TabsTrigger value="media" className="text-[10px] px-3">Mídias</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-2">
          <ScrollArea className="h-[180px]">
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((video) => {
                const isSelected = selectedUrl === video.media_url;
                return (
                  <button
                    key={video.id}
                    onClick={() => onSelect(video.media_url)}
                    className={cn(
                      "relative aspect-[16/9] rounded-lg overflow-hidden border-2 transition-all group",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    {video.media_url ? (
                      <video
                        src={video.media_url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/30">
                        <Play className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {video.duration && (
                      <div className="absolute bottom-1 left-1 bg-black/70 rounded px-1 py-0.5">
                        <span className="text-[9px] text-white/80 font-medium flex items-center gap-0.5">
                          <Clock className="w-2 h-2" />
                          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1">
                      <Plus className={cn(
                        "w-3 h-3 transition-opacity",
                        isSelected ? "text-primary" : "text-white/0 group-hover:text-white/80"
                      )} />
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
