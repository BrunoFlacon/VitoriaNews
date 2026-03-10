import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, Plus, Play, Square, Copy, Loader2, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { LiveSession } from "@/lib/social-sdk/types";

export const LiveStreamManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", scheduled_at: "" });
  const [saving, setSaving] = useState(false);

  const fetchSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSessions((data as LiveSession[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, [user]);

  const createSession = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    try {
      const streamKey = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
      await supabase.from("live_sessions").insert({
        user_id: user.id,
        title: form.title,
        description: form.description || null,
        scheduled_at: form.scheduled_at || null,
        stream_key: streamKey,
        status: form.scheduled_at ? "scheduled" : "draft",
      });
      toast({ title: "Live criada!" });
      setShowCreate(false);
      setForm({ title: "", description: "", scheduled_at: "" });
      fetchSessions();
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id: string) => {
    await supabase.from("live_sessions").delete().eq("id", id);
    toast({ title: "Live removida" });
    fetchSessions();
  };

  const copyStreamKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Stream key copiada!" });
  };

  const statusColor: Record<string, string> = {
    draft: "secondary",
    scheduled: "outline",
    live: "destructive",
    ended: "default",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl mb-1">Live Streaming</h1>
          <p className="text-muted-foreground">Gerencie transmissões ao vivo multicanal</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova Live
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <Radio className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma live ainda</h3>
          <p className="text-muted-foreground mb-4">Crie sua primeira transmissão ao vivo</p>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Criar Live</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl border border-border bg-card"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{session.title}</h3>
                  {session.description && (
                    <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                  )}
                </div>
                <Badge variant={statusColor[session.status] as any}>
                  {session.status === "live" ? "🔴 AO VIVO" : session.status}
                </Badge>
              </div>

              {session.stream_key && (
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50">
                  <code className="text-xs flex-1 truncate">{session.stream_key}</code>
                  <Button variant="ghost" size="icon" onClick={() => copyStreamKey(session.stream_key!)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {session.scheduled_at && (
                <p className="text-xs text-muted-foreground mb-3">
                  Agendada: {new Date(session.scheduled_at).toLocaleString("pt-BR")}
                </p>
              )}

              <div className="flex gap-2">
                {session.status === "draft" || session.status === "scheduled" ? (
                  <Button size="sm" variant="default">
                    <Play className="w-3 h-3 mr-1" /> Iniciar
                  </Button>
                ) : session.status === "live" ? (
                  <Button size="sm" variant="destructive">
                    <Square className="w-3 h-3 mr-1" /> Encerrar
                  </Button>
                ) : null}
                {session.recording_url && (
                  <Button size="sm" variant="outline">
                    <Video className="w-3 h-3 mr-1" /> Gravação
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => deleteSession(session.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transmissão ao Vivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Título da live" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            <Button className="w-full" onClick={createSession} disabled={saving || !form.title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Criar Live
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveStreamManager;
