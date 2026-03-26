import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Upload, Download, Eye, Trash2, File, FileImage, FileVideo, FileType, Loader2, X, User, Share2, Scissors
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
  platform?: string;
  status?: string;
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
    case "audio": return FileType; // Should be Volume2 or similar
    case "story": return FileImage;
    case "live": return FileVideo;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*, profiles(name, avatar_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setDocs(data as unknown as DocumentItem[]);
      }
    } catch (e) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const sortedDocs = [...docs].sort((a, b) => {
    if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "size") return b.file_size - a.file_size;
    if (sortBy === "duration") return (b.metadata?.duration || 0) - (a.metadata?.duration || 0);
    return 0;
  });

  const filteredDocs = sortedDocs.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || doc.file_type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  useEffect(() => { fetchDocs(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("documents-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents", filter: `user_id=eq.${user.id}` }, () => fetchDocs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `documents/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
      if (uploadError) {
        toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      await supabase.from("documents").insert({
        user_id: user.id,
        author_id: user.id,
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: detectFileType(file.name),
        file_size: file.size,
        status: 'available'
      } as any);
    }

    toast({ title: "Upload concluído!" });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (doc: DocumentItem) => {
    // Increment downloads
    await supabase.from("documents").update({ downloads: doc.downloads + 1 } as any).eq("id", doc.id);
    window.open(doc.file_url, "_blank");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("documents").delete().eq("id", id);
    toast({ title: "Documento removido" });
  };

  const handlePreview = (doc: DocumentItem) => {
    window.open(doc.file_url, "_blank");
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!user) return;
    const files = e.dataTransfer.files;
    if (!files.length) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const path = `documents/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
      if (uploadError) continue;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      await supabase.from("documents").insert({
        user_id: user.id,
        author_id: user.id,
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: detectFileType(file.name),
        file_size: file.size,
        status: 'available'
      } as any);
    }
    toast({ title: "Upload concluído!" });
    setUploading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">Documentos</h1>
        <p className="text-muted-foreground">Gerencie arquivos e documentos para suas publicações</p>
      </div>

      <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl border-2 border-dashed border-border p-8 mb-8 hover:border-primary/50 transition-colors cursor-pointer group"
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
          <p className="font-medium mb-1">
            {uploading ? "Enviando..." : "Arraste arquivos ou clique para fazer upload"}
          </p>
          <p className="text-sm text-muted-foreground">Suporta PDF, DOCX, XLSX, imagens, vídeos e mais</p>
          {!uploading && (
            <Button className="mt-4" variant="outline">Selecionar Arquivos</Button>
          )}
        </div>
      </motion.div>

      {/* Documents List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl border border-border overflow-hidden"
      >
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl">Arquivos ({filteredDocs.length})</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <FileType className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Buscar arquivos..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                />
              </div>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="date">Data</option>
                <option value="size">Tamanho</option>
                <option value="duration">Duração</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {["all", "image", "video", "story", "live", "clip", "pdf"].map(f => (
              <button 
                key={f} 
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize whitespace-nowrap",
                  activeFilter === f ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                {f === "all" ? "Todos" : f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
            <p className="font-medium">Nenhum documento encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? "Tente uma busca diferente" : "Faça upload dos seus primeiros arquivos"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredDocs.map((doc, index) => {
              const Icon = getFileIcon(doc.file_type);
              const colorClass = getFileColor(doc.file_type);
              return (
                <motion.div key={doc.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * index }}
                  className="p-4 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorClass)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {doc.profiles?.name || 'Sistema'}</span>
                        <span className="flex items-center gap-1 capitalize"><FileType className="w-3 h-3" /> {doc.file_type}</span>
                        {doc.metadata?.duration && <span className="flex items-center gap-1 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground"><FileVideo className="w-3 h-3" /> {Math.floor(doc.metadata.duration / 60)}:{(doc.metadata.duration % 60).toString().padStart(2, '0')}</span>}
                        <span>{formatSize(doc.file_size)}</span>
                        <span>{new Date(doc.created_at).toLocaleString("pt-BR")}</span>
                        {doc.platform && <span className="flex items-center gap-1 text-primary"><Share2 className="w-3 h-3" /> {doc.platform}</span>}
                        <span className="flex items-center gap-1"><Download className="w-3 h-3" />{doc.downloads}</span>
                        <Badge variant="outline" className="text-[9px] h-4 py-0 uppercase">{doc.status || 'Disponível'}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handlePreview(doc)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDownload(doc)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(doc.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
