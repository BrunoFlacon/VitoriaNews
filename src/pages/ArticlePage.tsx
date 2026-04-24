import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/social-sdk/types";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { useSystem } from "@/contexts/SystemContext";
import { Newspaper, Sparkles, Bell } from "lucide-react";
import { SubscriberCapture } from "@/components/portal/SubscriberCapture";

const ArticlePage = () => {
  const { settings } = useSystem();
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!slug) return;
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("slug", slug)
          .single();
        
        if (!error && data) {
          setArticle(data as Article | null);
          const { data: audio } = await supabase
            .from("audio_articles")
            .select("audio_url")
            .eq("article_id", data.id)
            .maybeSingle();
          if (audio) setAudioUrl(audio.audio_url);
        }
      } catch (e) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [slug]);

  useEffect(() => {
    if (article && settings?.platform_name) {
      document.title = `${article.title} - ${settings.platform_name}`;
    }
  }, [article, settings]);

  const handleListenArticle = async () => {
    if (!article || audioUrl) return;
    setGeneratingAudio(true);
    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { articleId: article.id, text: article.content },
      });
      if (!error && data?.audioUrl) setAudioUrl(data.audioUrl);
    } catch {
      console.error("Error generating audio");
    } finally {
      setGeneratingAudio(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Artigo não encontrado</h1>
        <Link to="/news">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
        </Link>
      </div>
    );
  }

  if (settings && settings.public_articles_active === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Newspaper className="w-16 h-16 text-muted-foreground/20 mb-6" />
        <h1 className="text-3xl font-display font-bold mb-2">Artigos Indisponíveis</h1>
        <p className="text-muted-foreground max-w-md">O acesso a artigos individuais está temporariamente desativado.</p>
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

      {/* Visibility Badge based on tiers */}
      {(article as any).visibility_tier && (article as any).visibility_tier !== 'public' && (
        <div className="bg-primary/10 border-b border-primary/20 py-2 px-6 flex items-center justify-center gap-2 animate-pulse">
           <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
             ✨ Conteúdo {(article as any).visibility_tier === 'paid_sub' ? 'VIP' : 'para Assinantes'}
           </span>
        </div>
      )}

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <Link to="/news" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar para notícias
        </Link>

        {article.cover_image && (
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-64 object-cover rounded-2xl mb-6"
          />
        )}

        <h1 className="font-display font-bold text-3xl md:text-4xl mb-4">{article.title}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {article.published_at
              ? new Date(article.published_at).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Rascunho"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleListenArticle}
            disabled={generatingAudio}
          >
            {generatingAudio ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando áudio...</>
            ) : audioUrl ? (
              <><Volume2 className="w-4 h-4 mr-2" /> Ouvir artigo</>
            ) : (
              <><Volume2 className="w-4 h-4 mr-2" /> Ouvir artigo</>
            )}
          </Button>
        </div>

        {audioUrl && (
          <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border">
            <audio controls className="w-full" src={audioUrl}>
              Seu navegador não suporta áudio.
            </audio>
          </div>
        )}

        {(article as any).visibility_tier === 'public' ? (
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10" />
            <div
              className="prose prose-lg dark:prose-invert max-w-none opacity-20 blur-[4px] select-none pointer-events-none"
              dangerouslySetInnerHTML={{ __html: article.content.substring(0, 300) + "..." }}
            />
            <div className="relative z-20 -mt-20 py-24 px-8 text-center bg-[#020617] border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05),transparent_70%)]" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-yellow-400 text-[9px] font-black uppercase tracking-[0.2em] mb-6">
                  <Sparkles className="w-3.5 h-3.5" /> Área VIP
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tighter mb-4 leading-none">
                  Conteúdo Exclusivo <br/><span className="text-yellow-400">para Assinantes</span>
                </h2>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto font-medium text-sm leading-relaxed">
                  Este artigo completo é reservado para nossa comunidade VIP. Assine agora para liberar o acesso imediato.
                </p>
                <div className="max-w-xs mx-auto">
                  <SubscriberCapture 
                    planType={(article as any).visibility_tier === 'paid_sub' ? 'paid' : 'free'} 
                    showTrigger={true}
                    triggerLabel="Assine Já!"
                    triggerClassName="w-full text-base py-4 shadow-[0_0_40px_rgba(250,204,21,0.2)]"
                    showFloating={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {settings?.portal_footer_visible !== false && (
        <PortalFooter variant={(article as any)?.visibility_tier === 'public' ? 'public' : 'private'} />
      )}

      <SubscriberCapture 
        planType={(article as any).visibility_tier === 'paid_sub' ? 'paid' : 'free'} 
        showFloating={true}
        triggerLabel="Assinar Agora"
        triggerClassName="fixed bottom-12 right-12 z-50 shadow-[0_0_40px_rgba(250,204,21,0.2)]"
      />
    </div>
  );
};

export default ArticlePage;
