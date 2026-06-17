import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Newspaper, Clock, ArrowRight, Search, TrendingUp, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import type { Article } from "@/lib/social-sdk/types";
import { SystemFooter } from "@/components/SystemFooter";
import { useSystem } from "@/hooks/useSystem";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { SubscriberCapture } from "@/components/portal/SubscriberCapture";
import { cn } from "@/lib/utils";


const News = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { settings } = useSystem();

  const platformName = settings?.platform_name || "SocialHub";
  const logoUrl = settings?.logo_url;

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("status", "published")
          .order("published_at", { ascending: false });

        if (error) {
          if (error.code === "PGRST116" || error.message?.includes("not found")) {
            console.warn("Articles table not found.");
            setArticles([]);
          }
        } else if (data) {
          setArticles((data as Article[]) || []);
        }
      } catch (e) {
        // Silent fail
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

  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      setSearch(e.detail);
    };
    window.addEventListener('system-search', handleGlobalSearch);
    return () => window.removeEventListener('system-search', handleGlobalSearch);
  }, []);


  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
  );

  const hero = filtered[0];
  const rest = filtered.slice(1);
  const trending = articles.slice(0, 6);

  const categories = [...new Set(articles.map((a) => "Artigo"))]; // Placeholder

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/news" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={platformName} className="h-9 w-auto object-contain" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <div>
                <h1 className="font-serif font-bold text-lg leading-tight text-foreground">
                  {platformName} News
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Notícias • Informação • Conteúdo
                </p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar artigos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="md:hidden bg-card border-b border-border px-4 py-3"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </motion.div>
        )}
      </header>

      <main className="flex-1">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando artigos...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum artigo encontrado</h2>
            <p className="text-muted-foreground">Os artigos publicados aparecerão aqui.</p>
          </div>
        ) : (
          <>
            {/* Hero Article */}
            {hero && (
              <section className="max-w-7xl mx-auto px-4 py-6">
                <Link to={`/news/${hero.slug}`} className="group block">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-xl overflow-hidden aspect-[21/9] md:aspect-[3/1]"
                  >
                    {hero.cover_image ? (
                      <img
                        src={hero.cover_image}
                        alt={hero.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                      <Badge className="mb-3 bg-primary text-primary-foreground">Destaque</Badge>
                      <h2 className="font-serif font-bold text-2xl md:text-4xl leading-tight text-white max-w-3xl">
                        {hero.title}
                      </h2>
                      <p className="text-white/80 mt-2 max-w-2xl text-sm md:text-base line-clamp-2">
                        {hero.content.replace(/<[^>]+>/g, "").slice(0, 200)}
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-xs text-white/60">
                        <Clock size={14} />
                        <span>
                          {hero.published_at
                            ? new Date(hero.published_at).toLocaleDateString("pt-BR")
                            : ""}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </section>
            )}

            {/* Content Grid + Sidebar */}
            <section className="max-w-7xl mx-auto px-4 pb-12">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Articles Grid */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    <h2 className="font-serif font-bold text-xl">Últimas Notícias</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {rest.map((article, i) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link to={`/news/${article.slug}`} className="block group">
                          <article className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
                            {article.cover_image && (
                              <div className="aspect-video overflow-hidden">
                                <img
                                  src={article.cover_image}
                                  alt={article.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                            )}
                            <div className="p-4">
                              <Badge variant="secondary" className="mb-2 text-xs">
                                Artigo
                              </Badge>
                              <h3 className="font-serif font-bold text-foreground mt-1 mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                {article.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {article.content.replace(/<[^>]+>/g, "").slice(0, 150)}
                              </p>
                              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {article.published_at
                                    ? new Date(article.published_at).toLocaleDateString("pt-BR")
                                    : ""}
                                </span>
                                <span className="flex items-center gap-1 text-primary group-hover:underline">
                                  Ler mais <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </article>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Sidebar */}
                <aside className="lg:w-72 shrink-0 space-y-6">
                  {/* Trending */}
                  {trending.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-5">
                      <h3 className="font-serif font-bold text-lg mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Em Alta
                      </h3>
                      <ul className="space-y-3">
                        {trending.map((a, i) => (
                          <li key={a.id} className="flex items-start gap-3">
                            <span className="text-primary font-bold text-lg leading-none mt-0.5">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <Link
                                to={`/news/${a.slug}`}
                                className="text-sm text-foreground hover:text-primary transition-colors font-medium leading-snug block line-clamp-2"
                              >
                                {a.title}
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                {a.published_at
                                  ? new Date(a.published_at).toLocaleDateString("pt-BR")
                                  : ""}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recent */}
                  <div className="bg-card rounded-xl border border-border p-5">
                    <h3 className="font-serif font-bold text-lg mb-3 flex items-center gap-2">
                      <div className="w-1 h-5 bg-primary rounded-full" />
                      Recentes
                    </h3>
                    <ul className="space-y-3">
                      {articles.slice(0, 4).map((a) => (
                        <li key={a.id}>
                          <Link
                            to={`/news/${a.slug}`}
                            className="text-sm text-foreground hover:text-primary transition-colors font-medium leading-snug block line-clamp-2"
                          >
                            {a.title}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {a.published_at
                              ? new Date(a.published_at).toLocaleDateString("pt-BR")
                              : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            </section>
          </>
        )}
      </main>

      <SystemFooter />
    </div>
  );
};

export default News;
