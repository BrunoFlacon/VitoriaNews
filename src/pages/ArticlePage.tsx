import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/social-sdk/types";
import { SystemFooter } from "@/components/SystemFooter";

const ArticlePage = () => {
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

        <div
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>

      <SystemFooter />
    </div>
  );
};

export default ArticlePage;
