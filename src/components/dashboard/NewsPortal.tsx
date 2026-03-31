import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Newspaper, Plus, Edit, Trash2, Globe, RefreshCw, TrendingUp, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTrends, TrendItem } from "@/hooks/useTrends";
import type { Article } from "@/lib/social-sdk/types";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { TrendDetailDrawer } from "./TrendDetailDrawer";

export const NewsPortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState({ title: "", content: "", cover_image: "" });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab ] = useState("my-articles");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState("googlenews");
  const { trends, syncTrends, isSyncing } = useTrends();

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

  const handleProduceFromTrend = (trend: TrendItem) => {
    setEditing(null);
    const sourceLink = trend.url ? `<p><small>Fonte original: <a href="${trend.url}" target="_blank">${trend.source}</a></small></p>` : "";
    setForm({ 
      title: trend.keyword, 
      content: `<p>Baseado na tendência do <strong>${trend.source}</strong>: ${trend.keyword}</p>${sourceLink}<p>Escreva seu conteúdo aqui...</p>`, 
      cover_image: "" 
    });
    setActiveTab("my-articles");
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="my-articles" className="font-bold">Meus Artigos</TabsTrigger>
          <TabsTrigger value="discovery" className="font-bold">Descoberta & Radar</TabsTrigger>
        </TabsList>

        <TabsContent value="my-articles">
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
                      <Button variant="ghost" size="icon" asChild title="Ver no ar">
                        <a href={`/news/${article.slug}`} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(article)} title="Editar">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(article.id)} title="Excluir">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="discovery">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/10 backdrop-blur-xl shadow-lg gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-2xl tracking-tight text-white uppercase">Radar de Inteligência</h3>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Monitoramento em Tempo Real
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Pesquisar tendências..." 
                    className="pl-10 bg-white/5 border-white/10 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="default" 
                  onClick={syncTrends} 
                  disabled={isSyncing}
                  className="rounded-xl px-4 bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold transition-all whitespace-nowrap"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {isSyncing ? "Buscando..." : "Sincronizar"}
                </Button>
              </div>
            </div>

            <Tabs value={activePlatform} onValueChange={setActivePlatform} className="w-full">
              <div className="overflow-x-auto mb-6 -mx-1 px-1 flex [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <TabsList className="bg-transparent h-auto p-0 gap-2 flex flex-nowrap w-max min-w-full">
                  {Object.entries(
                    trends.reduce((acc: any, trend) => {
                      const id = (trend.source || "Other").toLowerCase().replace(/\s+/g, '');
                      if (!acc[id]) acc[id] = { name: trend.source || "Other" };
                      return acc;
                    }, {
                      'googlenews': { name: 'Google News' }
                    })
                  ).map(([id, info]: [string, any]) => {
                    const platformMeta = socialPlatforms.find(p => p.id === id || p.name.toLowerCase() === info.name.toLowerCase());
                    return (
                      <TabsTrigger 
                        key={id} 
                        value={id}
                        className={cn(
                          "relative h-10 px-4 rounded-xl border border-white/5 bg-white/[0.02] text-xs font-bold uppercase tracking-wider transition-all",
                          "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20",
                          "hover:bg-white/5 text-muted-foreground hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {platformMeta && <platformMeta.icon className="w-4 h-4" />}
                          {info.name}
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {Object.entries(
                trends.reduce((acc: any, trend) => {
                  const id = (trend.source || "Other").toLowerCase().replace(/\s+/g, '');
                  if (!acc[id]) acc[id] = [];
                  acc[id].push(trend);
                  return acc;
                }, { 'googlenews': [] })
              ).map(([id, platformTrends]: [string, any]) => {
                const searchLower = searchTerm.toLowerCase();
                const filteredPlatformTrends = (platformTrends as TrendItem[]).filter(t => 
                  !searchTerm || t.keyword.toLowerCase().includes(searchLower) || (t.description && t.description.toLowerCase().includes(searchLower))
                );

                return (
                <TabsContent key={id} value={id} className="mt-0 focus-visible:outline-none">
                  <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
                    <div className="divide-y divide-white/5">
                      {filteredPlatformTrends.length > 0 ? (
                        filteredPlatformTrends
                          .sort((a, b) => (b.score || 0) - (a.score || 0))
                          .slice(0, 15)
                          .map((trend) => (
                          <div
                            key={trend.id}
                            onClick={() => {
                              setSelectedTrend(trend);
                              setIsDrawerOpen(true);
                            }}
                            className="group relative flex items-center justify-between p-4 px-5 hover:bg-white/[0.04] transition-all cursor-pointer"
                          >
                            <div className="relative z-10 flex items-start gap-4 flex-1 pr-4">
                              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 bg-white/5">
                                <img 
                                  src={trend.thumbnail_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='100%25' height='100%25' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' font-weight='bold' fill='%234a4a4a'%3ECapa%3C/text%3E%3C/svg%3E`} 
                                  alt="" 
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.dataset.fallback) {
                                       target.dataset.fallback = 'true';
                                       target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='100%25' height='100%25' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' font-weight='bold' fill='%234a4a4a'%3ECapa%3C/text%3E%3C/svg%3E`;
                                    }
                                  }}
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              
                              <div className="min-w-0">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5">
                                  {(trend.category || 'Trending')} · {trend.metadata?.published_at ? `${new Date(trend.metadata.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${new Date(trend.metadata.published_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : `${new Date(trend.detected_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (Captação)`}
                                </span>
                                <h4 className="font-bold text-base leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                  {trend.keyword}
                                </h4>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <TrendingUp className="w-3 h-3 text-primary" />
                                    <span className="text-[10px] font-black text-primary tracking-tighter">{Math.floor(trend.score)}% de Engajamento</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20 hover:text-primary border border-transparent hover:border-primary/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProduceFromTrend(trend);
                              }}
                            >
                              <Plus className="w-5 h-5" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="py-20 text-center">
                          <Globe className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3 animate-pulse" />
                          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest text-balance">Nenhum resultado de {id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              );})}
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>

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
      
      <TrendDetailDrawer 
        trend={selectedTrend}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onProduce={(trend) => {
          setIsDrawerOpen(false);
          handleProduceFromTrend(trend);
        }}
      />
    </div>
  );
};

export default NewsPortal;
