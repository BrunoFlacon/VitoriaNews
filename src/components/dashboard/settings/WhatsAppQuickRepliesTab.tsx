import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Plus, Pencil, Trash2, Copy, Loader2, Hash, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickReply {
  id: string;
  user_id: string;
  connection_id: string | null;
  title: string;
  shortcut: string | null;
  content: string;
  category: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "general", label: "Geral", color: "bg-slate-500" },
  { value: "sales", label: "Vendas", color: "bg-green-500" },
  { value: "support", label: "Suporte", color: "bg-blue-500" },
  { value: "greeting", label: "Saudação", color: "bg-purple-500" },
  { value: "closing", label: "Encerramento", color: "bg-orange-500" },
  { value: "custom", label: "Personalizado", color: "bg-pink-500" },
];

export const WhatsAppQuickRepliesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", shortcut: "", content: "", category: "general" });
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  const fetchReplies = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("quick_replies")
        .select("*")
        .eq("user_id", user.id)
        .order("usage_count", { ascending: false });

      if (error) throw error;
      setReplies((data ?? []) as QuickReply[]);
    } catch (err: unknown) {
      toast({ title: "Erro ao carregar respostas", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => { fetchReplies(); }, [fetchReplies]);

  const openNew = () => {
    setForm({ title: "", shortcut: "", content: "", category: "general" });
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (reply: QuickReply) => {
    setForm({
      title: reply.title,
      shortcut: reply.shortcut || "",
      content: reply.content,
      category: reply.category,
    });
    setEditing(reply);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id || !form.title.trim() || !form.content.trim()) {
      toast({ title: "Campos obrigatórios", description: "Título e conteúdo são obrigatórios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        title: form.title.trim(),
        shortcut: form.shortcut.trim() || null,
        content: form.content.trim(),
        category: form.category,
      };

      if (editing) {
        const { error } = await supabase.from("quick_replies").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Resposta atualizada" });
      } else {
        const { error } = await supabase.from("quick_replies").insert(payload);
        if (error) throw error;
        toast({ title: "Resposta criada" });
      }
      setDialogOpen(false);
      fetchReplies();
    } catch (err: unknown) {
      toast({ title: "Erro ao salvar", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("quick_replies").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Resposta excluída" });
      setDeleteId(null);
      fetchReplies();
    } catch (err: unknown) {
      toast({ title: "Erro ao excluir", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copiado!", description: "Conteúdo copiado para área de transferência." });

    supabase.rpc("increment_quick_reply_usage", { row_id: null }).catch(() => {});
  };

  const filteredReplies = replies.filter(r => {
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q) || (r.shortcut || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-950/30 to-indigo-950/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Respostas Rápidas
            </CardTitle>
            <CardDescription>
              Snippets de resposta pré-definidos para agilizar o atendimento
            </CardDescription>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Resposta
          </Button>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar respostas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{search || filterCategory !== "all" ? "Nenhuma resposta encontrada" : "Nenhuma resposta rápida criada"}</p>
              <p className="text-sm">Clique em "Nova Resposta" para criar a primeira</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReplies.map((reply) => {
                const cat = CATEGORIES.find(c => c.value === reply.category);
                return (
                  <div
                    key={reply.id}
                    className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{reply.title}</span>
                        <Badge variant="outline" className={cn("text-[9px] uppercase tracking-wider", cat?.color)}>
                          {cat?.label || reply.category}
                        </Badge>
                        {reply.shortcut && (
                          <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                            <Hash className="w-3 h-3" />
                            {reply.shortcut}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{reply.content}</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-1">
                        Usada {reply.usage_count} vez{reply.usage_count !== 1 ? "es" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(reply.content)} title="Copiar">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(reply)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(reply.id)} title="Excluir" className="text-red-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} Resposta Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Título *</label>
              <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Agendar reunião" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Atalho</label>
              <Input value={form.shortcut} onChange={(e) => setForm(p => ({ ...p, shortcut: e.target.value }))} placeholder="/agendar" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria</label>
              <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Conteúdo *</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Digite o texto da resposta..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Resposta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
