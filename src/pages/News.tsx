import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Newspaper, Clock, ArrowRight, Search, Sparkles, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import type { Article } from "@/lib/social-sdk/types";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { SubscriberCapture } from "@/components/portal/SubscriberCapture";
import { useSystem } from "@/contexts/SystemContext";
import { cn } from "@/lib/utils";

// Componente principal de Notícias do Portal
const News = () => {
  const { settings } = useSystem();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageTier, setPageTier] = useState<string>('public');

  useEffect(() => {
    const fetchPageSettings = async () => {
      const { data } = await supabase.from('news_pages' as any).select('visibility_tier').eq('slug', '/news').maybeSingle() as any;
      if (data) setPageTier(data.visibility_tier || 'public');
    };
    fetchPageSettings();

    const fetchArticles = async () => {
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("status", "published")
          .order("published_at", { ascending: false });
        
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('not found')) {
            setArticles([]);
          }
        } else if (data) {
          setArticles((data as Article[]) || []);
        }
      } catch (e) {
        // fail silently
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  useEffect(() => {
    if (settings?.platform_name) {
      document.title = `Notícias - ${settings.platform_name}`;
    }
  }, [settings]);

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
  );

  if (settings && settings.public_news_active === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Newspaper className="w-16 h-16 text-muted-foreground/20 mb-6" />
        <h1 className="text-3xl font-display font-bold mb-2">Página em Manutenção</h1>
        <p className="text-muted-foreground max-w-md">Esta seção do portal está temporariamente desativada pelo administrador. Por favor, volte mais tarde.</p>
        <Link to="/" className="mt-8 text-primary font-bold hover:underline">Voltar ao Início</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {settings?.portal_header_visible !== false && (
        <header className="border-b border-white/5 bg-[#0A0F1E]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
            <Link to="/" className="flex items-center gap-4 group shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                {(settings?.portal_logo_url || settings?.logo_url) ? (
                  <img src={settings.portal_logo_url || settings.logo_url} alt="Logo" className="w-7 h-7 object-contain" />
                ) : (
                  <Newspaper className="w-6 h-6 text-white" />
                )}
              </div>
              <h1 className="font-display font-black text-xl text-white tracking-tight hidden sm:block">
                Web Rádio Vitória
              </h1>
            </Link>

            <div className="flex items-center gap-4">
              <div className="relative w-72 hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors" />
                <Input
                  placeholder="Buscar artigos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border-white/10 h-12 pl-12 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary/50 text-white placeholder:text-slate-600"
                />
              </div>

              <SubscriberCapture 
                planType="free"
                showTrigger={true}
                triggerLabel=""
                triggerClassName="p-0 bg-transparent hover:bg-transparent shadow-none border-none scale-100 hover:scale-100"
                showFloating={false}
              >
                <div className="relative group cursor-pointer">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                  >
                    <Bell className="w-6 h-6 text-primary fill-primary/10" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-2 border-[#0A0F1E] flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-pulse">
                      1
                    </span>
                  </motion.div>
                </div>
              </SubscriberCapture>
            </div>
          </div>
        </header>
      )}

      {/* Banner de Área Exclusiva */}
      {pageTier !== 'public' && (
        <div className="relative overflow-hidden bg-[#020617] border-b border-white/5 py-32 px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_70%)]" />
          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-10">
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-yellow-400 text-[10px] font-black uppercase tracking-[0.3em]">
              <Sparkles className="w-3.5 h-3.5" /> Área Exclusiva para Assinantes
            </div>
            <div className="space-y-6">
              <h2 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter leading-[0.9]">
                Conteúdo Exclusivo <span className="text-yellow-400 block sm:inline">VIP</span>
              </h2>
              <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
                Escolha seu plano e tenha acesso ilimitado as análises de notícias, Breaking News, Podcasts, Reportagens Exclusivas.
              </p>
            </div>
            <div className="pt-6">
              <SubscriberCapture 
                planType={pageTier === 'paid_sub' ? 'paid' : 'free'} 
                showTrigger={true}
                triggerLabel="Assine Já!"
                triggerClassName="text-lg px-12 py-5 shadow-[0_0_50px_rgba(250,204,21,0.2)]"
                showFloating={false}
              />
            </div>
          </div>
        </div>
      )}

      <main className={cn("flex-1 max-w-6xl w-full mx-auto px-6 py-8", pageTier !== 'public' && "opacity-50 pointer-events-none blur-[2px]")}>
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando artigos...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum artigo encontrado</h2>
            <p className="text-muted-foreground">Os artigos publicados aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/news/${article.slug}`} className="block group">
                  <div className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
                    {article.cover_image && (
                      <img src={article.cover_image} alt={article.title} className="w-full h-48 object-cover" loading="lazy" />
                    )}
                    <div className="p-5">
                      <Badge variant="secondary" className="mb-2">Notícia</Badge>
                      <h3 className="font-display font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {article.content.replace(/<[^>]+>/g, "").slice(0, 150)}...
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.published_at ? new Date(article.published_at).toLocaleDateString("pt-BR") : ""}
                        </span>
                        <span className="flex items-center gap-1 text-primary group-hover:underline">
                          Ler mais <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <SubscriberCapture 
        planType={pageTier === 'paid_sub' ? 'paid' : 'free'} 
        showFloating={true}
        triggerLabel="Assinar Agora"
        triggerClassName="fixed bottom-12 right-12 z-50 shadow-[0_0_40px_rgba(250,204,21,0.2)]"
      />
      {settings?.portal_footer_visible !== false && <PortalFooter variant={pageTier === 'public' ? 'public' : 'private'} />}
    </div>
  );
};

export default News;
