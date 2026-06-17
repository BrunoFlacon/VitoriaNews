import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, X, Loader2, Image as ImageIcon, Sticker, Sparkles, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GiphySearchProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export const GiphySearch = ({ onSelect, onClose }: GiphySearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"gifs" | "stickers">("gifs");
  const [trending, setTrending] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Busca a chave Giphy das credenciais do usuário (configurada em APIs Sociais & Dev)
  useEffect(() => {
    if (!user) return;
    supabase
      .from('api_credentials' as any)
      .select('credentials')
      .eq('user_id', user.id)
      .eq('platform', 'giphy')
      .maybeSingle()
      .then(({ data }) => {
        const key = (data as any)?.credentials?.api_key;
        if (key) setApiKey(key);
      });
  }, [user]);

  const fetchGiphy = async (type: "search" | "trending", query?: string) => {
    if (!apiKey) {
      toast({ title: "Chave Giphy ausente", description: "Configure sua Giphy API Key em Configurações > APIs Sociais & Dev.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const endpoint = type === "search" 
        ? `https://api.giphy.com/v1/${activeTab}/search?q=${encodeURIComponent(query || "")}&api_key=${apiKey}&limit=24&rating=g`
        : `https://api.giphy.com/v1/${activeTab}/trending?api_key=${apiKey}&limit=24&rating=g`;
      
      const res = await fetch(endpoint);
      const data = await res.json();
      
      if (type === "search") {
        setResults(data.data || []);
      } else {
        setTrending(data.data || []);
      }
    } catch (error) {
      toast({
        title: "Erro Giphy",
        description: "Não foi possível carregar os GIFs.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiphy("trending");
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      fetchGiphy("search", searchTerm);
    } else {
      fetchGiphy("trending");
    }
  };

  return (
    <div className="flex flex-col h-[550px] w-full bg-background/95 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg tracking-tight">Giphy Express</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">Encontre o GIF perfeito</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-muted/80">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-5 space-y-5 flex-1 flex flex-col min-h-0 bg-gradient-to-b from-transparent to-muted/5">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all duration-500" />
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Pesquisar ${activeTab === 'gifs' ? 'GIFs' : 'Stickers'} incríveis...`}
              className="pl-12 h-14 bg-background/50 border-border/50 rounded-2xl text-base shadow-inner focus-visible:ring-primary/30"
            />
          </div>
        </form>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/30 rounded-2xl border border-border/50">
            <TabsTrigger value="gifs" className="rounded-xl flex items-center gap-2 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:shadow-md">
              <ImageIcon className="w-4 h-4" />
              <span className="font-bold text-sm tracking-tight">GIFs</span>
            </TabsTrigger>
            <TabsTrigger value="stickers" className="rounded-xl flex items-center gap-2 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:shadow-md">
              <Sticker className="w-4 h-4" />
              <span className="font-bold text-sm tracking-tight">Stickers</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Grid Area */}
        <ScrollArea className="flex-1 -mr-2 pr-4">
          <div className="pb-4">
            {!searchTerm ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="text-sm font-black uppercase tracking-tighter text-foreground/80">Tendências do Momento</span>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 animate-pulse">Live Now</Badge>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {trending.map((item, i) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => onSelect(item.images.fixed_height.url)}
                      className="cursor-pointer group relative aspect-square bg-muted/30 rounded-2xl overflow-hidden hover:ring-4 hover:ring-primary/30 transition-all duration-300 shadow-sm"
                    >
                      <img 
                        src={item.images.fixed_height.url} 
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3">
                        <p className="text-[9px] text-white font-bold truncate w-full">{item.title || "Selecionar GIF"}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-500">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-black uppercase tracking-tighter text-foreground/80">Resultados da Busca</span>
                </div>
                
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative">
                      <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                      <Loader2 className="w-12 h-12 animate-spin text-primary absolute top-0 left-0" style={{ animationDuration: '0.8s' }} />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Explorando o multiverso do Giphy...</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {results.map((item, i) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => onSelect(item.images.fixed_height.url)}
                        className="cursor-pointer group relative aspect-square bg-muted/30 rounded-2xl overflow-hidden hover:ring-4 hover:ring-primary/30 transition-all duration-300 shadow-sm"
                      >
                        <img 
                          src={item.images.fixed_height.url} 
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                      <X className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-lg font-bold text-muted-foreground">Vazio Cósmico</p>
                    <p className="text-sm text-muted-foreground/60 max-w-[200px] mx-auto mt-1">Nenhum GIF encontrou o caminho para essa busca.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
