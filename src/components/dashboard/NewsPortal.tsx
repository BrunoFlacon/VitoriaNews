import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Newspaper, Plus, Edit, Trash2, Eye, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Article } from "@/lib/social-sdk/types";

export const NewsPortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState({ title: "", content: "", cover_image: "" });
  const [saving, setSaving] = useState(false);

  const fetchArticles = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          console.warn("Articles table not found. News feature may need setup.");
          setArticles([]);
        }
      } else if (data) {
        setArticles((data as Article[]) || []);
      }
    } catch (e) {
      console.error("Error fetching articles:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchArticles();
    } else {
      // If we've been waiting for too long without a user, stop loading animation
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async (publish = false) => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    try {
      const slug = generateSlug(form.title);
      const payload = {
        user_id: user.id,
        title: form.title,
        slug: editing ? editing.slug : slug,
        content: form.content,
        cover_image: form.cover_image || null,
        status: publish ? "published" : "draft",
        published_at: publish ? new Date().toISOString() : null,
      };

      if (editing) {
        await supabase.from("articles").update(payload).eq("id", editing.id);
        toast({ title: "Artigo atualizado" });
      } else {
        await supabase.from("articles").insert(payload);
        toast({ title: publish ? "Artigo publicado!" : "Rascunho salvo" });
      }
      setShowEditor(false);
      setEditing(null);
      setForm({ title: "", content: "", cover_image: "" });
      fetchArticles();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("articles").delete().eq("id", id);
    toast({ title: "Artigo excluído" });
    fetchArticles();
  };

  const openEdit = (article: Article) => {
    setEditing(article);
    setForm({ title: article.title, content: article.content, cover_image: article.cover_image || "" });
    setShowEditor(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl mb-1">Portal de Notícias</h1>
          <p className="text-muted-foreground">Crie e gerencie artigos para publicação</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ title: "", content: "", cover_image: "" }); setShowEditor(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Artigo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum artigo ainda</h3>
          <p className="text-muted-foreground mb-4">Comece criando seu primeiro artigo</p>
          <Button onClick={() => setShowEditor(true)}><Plus className="w-4 h-4 mr-2" /> Criar Artigo</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{article.title}</h3>
                  <Badge variant={article.status === "published" ? "default" : "secondary"}>
                    {article.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(article.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {article.status === "published" && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/news/${article.slug}`} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => openEdit(article)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(article.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Título do artigo"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              placeholder="URL da imagem de capa (opcional)"
              value={form.cover_image}
              onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
            />
            <Textarea
              placeholder="Conteúdo do artigo (suporta HTML)"
              rows={12}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                Salvar Rascunho
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Publicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsPortal;
