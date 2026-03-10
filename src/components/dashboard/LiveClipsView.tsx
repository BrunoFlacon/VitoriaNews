import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scissors, Loader2, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export const LiveClipsView = () => {
  const { user } = useAuth();
  const [clips, setClips] = useState<LiveClip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("live_clips")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setClips((data as LiveClip[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl mb-1">Cortes de Lives</h1>
        <p className="text-muted-foreground">Clips gerados automaticamente das suas transmissões</p>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : clips.length === 0 ? (
        <div className="text-center py-16">
          <Scissors className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum corte ainda</h3>
          <p className="text-muted-foreground">Os cortes das lives aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((clip, i) => (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="aspect-video bg-muted flex items-center justify-center">
                {clip.clip_url ? (
                  <video src={clip.clip_url} className="w-full h-full object-cover" />
                ) : (
                  <Play className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-1">{clip.title || "Clip sem título"}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{formatTime(clip.start_time)} - {formatTime(clip.end_time)}</span>
                  <Badge variant={clip.status === "ready" ? "default" : "secondary"}>{clip.status}</Badge>
                </div>
                {clip.clip_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={clip.clip_url} download><Download className="w-3 h-3 mr-1" /> Download</a>
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveClipsView;
