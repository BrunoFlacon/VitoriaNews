import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Upload, Download, Eye, Trash2, File, FileImage, FileVideo, FileType, Loader2, X, User, Share2, Scissors, List, Search, Filter, Grid, Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentItem {
  id: string;
  user_id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  downloads: number;
  created_at: string;
  author_id?: string;
  profiles?: {
    name: string;
    avatar_url: string;
  };
  metadata?: {
    duration?: number;
    dimensions?: string;
    bitrate?: string;
  };
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf": return FileType;
    case "video": return FileVideo;
    case "image": return FileImage;
    case "excel": return FileType;
    case "clip": return Scissors;
    default: return File;
  }
};

const getFileColor = (type: string) => {
  switch (type) {
    case "pdf": return "bg-red-500/10 text-red-500";
    case "video": return "bg-purple-500/10 text-purple-500";
    case "image": return "bg-green-500/10 text-green-500";
    case "excel": return "bg-emerald-500/10 text-emerald-500";
    default: return "bg-blue-500/10 text-blue-500";
  }
};

const detectFileType = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  return "other";
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentsView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "size" | "duration">("date");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setDocs(data as DocumentItem[] || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar arquivos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [user]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from("documents")
          .insert({
            user_id: user.id,
            name: file.name,
            file_url: publicUrl,
            file_type: detectFileType(file.name),
            file_size: file.size,
            author_id: user.id
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Upload concluído",
        description: `${files.length} arquivo(s) enviado(s) com sucesso.`
      });
      fetchDocs();
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setDocs(prev => prev.filter(doc => doc.id !== id));
      toast({
        title: "Arquivo removido",
        description: "O documento foi excluído permanentemente."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePreview = (doc: DocumentItem) => {
    setSelectedDoc(doc);
  };

  const handleDownload = (doc: DocumentItem) => {
    window.open(doc.file_url, "_blank");
  };

  const filteredDocs = docs.filter(doc => {
    const matchesFilter = activeFilter === "all" || doc.file_type === activeFilter;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === "size") return b.file_size - a.file_size;
    if (sortBy === "duration") return (b.metadata?.duration || 0) - (a.metadata?.duration || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const renderGridItem = (doc: DocumentItem) => {
    const Icon = getFileIcon(detectFileType(doc.name));
    const type = detectFileType(doc.name);
    
    return (
      <motion.div
        key={doc.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="group relative aspect-square rounded-2xl overflow-hidden bg-card/40 border border-border hover:border-primary/50 transition-all cursor-pointer shadow-sm active:scale-95"
        onClick={() => handlePreview(doc)}
      >
        {type === "image" ? (
          <img 
            src={doc.file_url} 
            alt={doc.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110", getFileColor(type))}>
              <Icon className="w-8 h-8" />
            </div>
          </div>
        )}
        
        {type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/5 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10">
              <Play className="w-6 h-6 text-white fill-white/20" />
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate mb-0.5">{doc.name}</p>
              <p className="text-[9px] text-white/60 font-medium uppercase tracking-wider">
                {formatSize(doc.file_size)}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 text-white" onClick={(e) => { e.stopPropagation(); handleDownload(doc) }}>
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderListItem = (doc: DocumentItem) => {
    const Icon = getFileIcon(detectFileType(doc.name));
    const type = detectFileType(doc.name);
    
    return (
      <motion.div
        key={doc.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4 p-4 rounded-2xl bg-card/40 border border-border hover:border-primary/30 transition-all group cursor-pointer"
        onClick={() => handlePreview(doc)}
      >
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", getFileColor(type))}>
          <Icon className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base text-white group-hover:text-primary transition-colors truncate">{doc.name}</h4>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {doc.profiles?.name || 'Bruno Flacon'}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{formatSize(doc.file_size)}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/5" onClick={(e) => { e.stopPropagation(); handlePreview(doc) }}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/5" onClick={(e) => { e.stopPropagation(); handleDownload(doc) }}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-500/10 text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id) }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-1">
             Arquivos & Galeria
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredDocs.length} arquivos • Gerencie sua biblioteca de mídia centralizada
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-card border border-border p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "grid" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "list" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <input type="file" multiple ref={fileInputRef} onChange={handleUpload} className="hidden" />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl px-5 h-10 bg-primary hover:bg-primary/90 text-white font-bold"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Novo Upload
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar arquivos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-card border border-border rounded-xl pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(["all", "image", "video", "pdf"] as const).map(f => (
            <button 
              key={f} 
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap",
                activeFilter === f ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:text-white"
              )}
            >
              {f === "all" ? "Todos" : f === "image" ? "Imagens" : f === "video" ? "Vídeos" : "PDFs"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Sincronizando...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-20 bg-card/20 border border-dashed border-border rounded-2xl">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-10" />
          <h3 className="text-xl font-bold mb-1">Biblioteca Vazia</h3>
          <p className="text-sm text-muted-foreground">Nem um arquivo encontrado aqui.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
          {filteredDocs.map(renderGridItem)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
           {filteredDocs.map(renderListItem)}
        </div>
      )}

      {/* Preview Modal (Normalized) */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedDoc(null)}
                className="absolute top-4 right-4 z-[110] p-2 rounded-lg bg-black/60 text-white hover:bg-white hover:text-black transition-all border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col">
                <div className="flex items-center justify-center min-h-[300px] md:min-h-[450px] bg-black/20 p-6 md:p-8">
                  {detectFileType(selectedDoc.name) === "image" ? (
                    <img
                      src={selectedDoc.file_url}
                      alt={selectedDoc.name}
                      className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg"
                    />
                  ) : detectFileType(selectedDoc.name) === "video" ? (
                    <video
                      src={selectedDoc.file_url}
                      controls
                      autoPlay
                      className="max-w-full max-h-[60vh] rounded-xl shadow-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-6 py-10">
                      <div className={cn("w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg", getFileColor(detectFileType(selectedDoc.name)))}>
                        {getFileIcon(detectFileType(selectedDoc.name))({ className: "w-12 h-12" })}
                      </div>
                      <div className="text-center space-y-4">
                        <h3 className="text-xl font-bold text-white px-6 truncate max-w-sm">{selectedDoc.name}</h3>
                        <Button onClick={() => handleDownload(selectedDoc)} className="rounded-xl h-12 px-8 font-bold">
                          <Download className="w-4 h-4 mr-2" /> Abrir Arquivo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-6 md:p-8 bg-muted/30 border-t border-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white truncate mb-1">{selectedDoc.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {selectedDoc.profiles?.name || 'Bruno Flacon'}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{formatSize(selectedDoc.file_size)}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{new Date(selectedDoc.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <Button 
                        onClick={() => handleDownload(selectedDoc)}
                        variant="secondary"
                        className="rounded-xl h-11 px-6 font-bold gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Baixar
                      </Button>
                      <Button 
                        onClick={() => { handleDelete(selectedDoc.id); setSelectedDoc(null); }}
                        variant="destructive"
                        className="rounded-xl h-11 w-11 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DocumentsView;
