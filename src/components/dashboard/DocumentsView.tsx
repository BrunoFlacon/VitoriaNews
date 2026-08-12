import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Upload, Download, Eye, Trash2, File, FileImage, FileVideo, FileAudio, FileType, 
  Loader2, X, User, Share2, Search, Filter, Grid, List, Play, Pause, Music, Film, 
  Image as ImageIcon, Copy, Check, Calendar, HardDrive, ExternalLink, Sparkles, Database, 
  ArrowUpDown, FileSpreadsheet, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getMediaUrl } from "@/utils/mediaUtils";
import { logNetworkError } from "@/utils/errorHandling";

export type FileCategory = "all" | "image" | "video" | "audio" | "pdf" | "document";

export interface UnifiedFileItem {
  id: string;
  originalId: string;
  sourceTable: "documents" | "media";
  name: string;
  file_url: string;
  public_url: string;
  file_type: string;
  category: FileCategory;
  file_size: number;
  created_at: string;
  user_id: string;
  downloads?: number;
  author_name?: string;
  metadata?: {
    duration?: number;
    dimensions?: string;
    bitrate?: string;
  };
}

const detectCategory = (fileType?: string, name?: string): FileCategory => {
  const mime = (fileType || "").toLowerCase();
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "webm", "mkv", "flv", "m4v"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"].includes(ext)) {
    return "audio";
  }
  if (mime.includes("pdf") || ext === "pdf") {
    return "pdf";
  }
  return "document";
};

const getCategoryBadge = (category: FileCategory) => {
  switch (category) {
    case "image":
      return { label: "Foto / Imagem", icon: ImageIcon, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "video":
      return { label: "Vídeo", icon: Film, color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
    case "audio":
      return { label: "Áudio / Som", icon: Music, color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    case "pdf":
      return { label: "Documento PDF", icon: FileType, color: "bg-red-500/10 text-red-400 border-red-500/30" };
    default:
      return { label: "Documento", icon: FileText, color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
  }
};

const formatSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "Desconhecido";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getFileIcon = (fileType: string) => {
  const mime = fileType.toLowerCase();
  if (mime.includes("pdf")) return FileType;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  if (mime.startsWith("image")) return ImageIcon;
  if (mime.startsWith("video")) return Film;
  if (mime.startsWith("audio")) return Music;
  return FileText;
};

const SmartGridImage = ({ file, badge, Icon }: { file: UnifiedFileItem; badge: any; Icon: any }) => {
  const [currentUrl, setCurrentUrl] = useState<string>(file.public_url);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setCurrentUrl(file.public_url);
    setHasError(false);
    setIsRetrying(false);
  }, [file.public_url]);

  const handleError = async () => {
    if (isRetrying || hasError) return;
    setIsRetrying(true);

    try {
      let cleanPath = file.file_url || "";
      if (cleanPath.includes("/object/")) {
        const m = cleanPath.match(/\/object\/(?:public|sign)\/[^/]+\/(.+?)(?:\?|$)/);
        if (m) cleanPath = m[1];
      }
      cleanPath = cleanPath.split('?')[0].replace(/^(media|documents)\//, '');
      const bucket = file.sourceTable === "documents" ? "documents" : "media";

      if (cleanPath && !cleanPath.startsWith("http")) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(decodeURIComponent(cleanPath), 3600);

        if (!error && data?.signedUrl) {
          setCurrentUrl(data.signedUrl);
          setIsRetrying(false);
          return;
        }
      }
    } catch { /* ignore */ }

    setHasError(true);
    setIsRetrying(false);
  };

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-zinc-950/80 text-center">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-1 border", badge.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold text-zinc-300 truncate max-w-full px-1">
          {file.name}
        </span>
      </div>
    );
  }

  return (
    <img
      src={currentUrl}
      alt={file.name}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
      decoding="async"
      onError={handleError}
    />
  );
};

export const DocumentsView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<UnifiedFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FileCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "size_desc" | "name">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFile, setSelectedFile] = useState<UnifiedFileItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch all files from both 'documents' and 'media' database tables
  const fetchAllFiles = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch from 'documents' table
      const { data: docsData, error: docsError } = await supabase
        .from("documents")
        .select("id, name, file_url, file_type, file_size, created_at, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (docsError && docsError.code !== "PGRST116") {
        logNetworkError("DocumentsView documents", docsError, true);
      }

      // 2. Fetch from 'media' table
      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .select("id, name, file_url, file_type, file_size, created_at, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (mediaError && mediaError.code !== "PGRST116") {
        logNetworkError("DocumentsView media", mediaError, true);
      }

      const combined: UnifiedFileItem[] = [];
      const seenPaths = new Set<string>();

      const normalizePath = (urlStr: string, fileName: string) => {
        if (!urlStr) return "";
        let clean = urlStr.trim();
        if (clean.includes("/object/")) {
          const match = clean.match(/\/object\/(?:public|sign)\/[^/]+\/(.+?)(?:\?|$)/);
          if (match) clean = match[1];
        }
        clean = clean.split('?')[0].replace(/^(media|documents)\//, '');
        return clean.toLowerCase() || fileName.toLowerCase();
      };

      // Process 'documents' items
      if (docsData && docsData.length > 0) {
        docsData.forEach((doc: any) => {
          const rawUrl = (doc.file_url || "").trim();
          if (!rawUrl || rawUrl === "null" || rawUrl === "undefined") return;

          const norm = normalizePath(rawUrl, doc.name);
          if (norm && seenPaths.has(norm)) return;
          if (norm) seenPaths.add(norm);

          const cat = detectCategory(doc.file_type, doc.name);
          const resolvedUrl = getMediaUrl(rawUrl, "documents") || rawUrl;

          combined.push({
            id: `doc-${doc.id}`,
            originalId: doc.id,
            sourceTable: "documents",
            name: doc.name || "Documento sem nome",
            file_url: rawUrl,
            public_url: resolvedUrl,
            file_type: doc.file_type || "application/octet-stream",
            category: cat,
            file_size: Number(doc.file_size) || 0,
            created_at: doc.created_at || new Date().toISOString(),
            user_id: doc.user_id,
            downloads: doc.downloads || 0,
            author_name: doc.profiles?.name || "Usuário",
            metadata: doc.metadata
          });
        });
      }

      // Process 'media' items
      if (mediaData && mediaData.length > 0) {
        mediaData.forEach((m: any) => {
          const rawUrl = (m.file_url || "").trim();
          if (!rawUrl || rawUrl === "null" || rawUrl === "undefined") return;

          const norm = normalizePath(rawUrl, m.name);
          if (norm && seenPaths.has(norm)) return;
          if (norm) seenPaths.add(norm);

          const cat = detectCategory(m.file_type, m.name);
          const resolvedUrl = getMediaUrl(rawUrl, "media") || rawUrl;

          combined.push({
            id: `media-${m.id}`,
            originalId: m.id,
            sourceTable: "media",
            name: m.name || "Arquivo de mídia",
            file_url: rawUrl,
            public_url: resolvedUrl,
            file_type: m.file_type || "media/file",
            category: cat,
            file_size: Number(m.file_size) || 0,
            created_at: m.created_at || new Date().toISOString(),
            user_id: m.user_id,
            downloads: 0,
            author_name: "Usuário"
          });
        });
      }

      // 3. Helper to list physical files directly from Supabase Storage buckets
      const listStorageBucketFiles = async (bucketName: string) => {
        const items: { name: string; file_url: string; file_size: number; created_at: string; mime_type?: string }[] = [];
        try {
          // User folder
          const { data: userData } = await supabase.storage
            .from(bucketName)
            .list(user.id, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

          if (userData && Array.isArray(userData)) {
            userData.forEach(file => {
              if (file.name && file.id) {
                items.push({
                  name: file.name,
                  file_url: `${user.id}/${file.name}`,
                  file_size: file.metadata?.size || 0,
                  created_at: file.created_at || new Date().toISOString(),
                  mime_type: file.metadata?.mimetype
                });
              }
            });
          }

          // Root folder
          const { data: rootData } = await supabase.storage
            .from(bucketName)
            .list("", { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

          if (rootData && Array.isArray(rootData)) {
            rootData.forEach(file => {
              if (file.name && file.id && file.name !== user.id) {
                items.push({
                  name: file.name,
                  file_url: file.name,
                  file_size: file.metadata?.size || 0,
                  created_at: file.created_at || new Date().toISOString(),
                  mime_type: file.metadata?.mimetype
                });
              }
            });
          }
        } catch (e) {
          console.warn(`[Storage List] Bucket ${bucketName}:`, e);
        }
        return items;
      };

      // Query physical files directly from both buckets
      const [storageDocs, storageMedia] = await Promise.all([
        listStorageBucketFiles("documents"),
        listStorageBucketFiles("media")
      ]);

      // Process physical files from 'documents' bucket
      storageDocs.forEach((sDoc, idx) => {
        const norm = normalizePath(sDoc.file_url, sDoc.name);
        if (norm && seenPaths.has(norm)) return;
        if (norm) seenPaths.add(norm);

        const cat = detectCategory(sDoc.mime_type, sDoc.name);
        const resolvedUrl = getMediaUrl(sDoc.file_url, "documents") || sDoc.file_url;

        combined.push({
          id: `storage-doc-${idx}-${Date.now()}`,
          originalId: sDoc.file_url,
          sourceTable: "documents",
          name: sDoc.name,
          file_url: sDoc.file_url,
          public_url: resolvedUrl,
          file_type: sDoc.mime_type || detectCategory(undefined, sDoc.name),
          category: cat,
          file_size: sDoc.file_size,
          created_at: sDoc.created_at,
          user_id: user.id,
          downloads: 0,
          author_name: "Servidor Storage"
        });
      });

      // Process physical files from 'media' bucket
      storageMedia.forEach((sMedia, idx) => {
        const norm = normalizePath(sMedia.file_url, sMedia.name);
        if (norm && seenPaths.has(norm)) return;
        if (norm) seenPaths.add(norm);

        const cat = detectCategory(sMedia.mime_type, sMedia.name);
        const resolvedUrl = getMediaUrl(sMedia.file_url, "media") || sMedia.file_url;

        combined.push({
          id: `storage-media-${idx}-${Date.now()}`,
          originalId: sMedia.file_url,
          sourceTable: "media",
          name: sMedia.name,
          file_url: sMedia.file_url,
          public_url: resolvedUrl,
          file_type: sMedia.mime_type || detectCategory(undefined, sMedia.name),
          category: cat,
          file_size: sMedia.file_size,
          created_at: sMedia.created_at,
          user_id: user.id,
          downloads: 0,
          author_name: "Servidor Storage"
        });
      });

      setFiles(combined);
    } catch (error: any) {
      toast({
        title: "Erro ao buscar arquivos do banco de dados",
        description: error.message || "Não foi possível carregar a lista completa de arquivos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAllFiles();
  }, [fetchAllFiles]);

  // System search integration
  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      const query = e.detail?.query || "";
      setSearchQuery(query);
    };
    window.addEventListener("system-search", handleGlobalSearch);
    return () => window.removeEventListener("system-search", handleGlobalSearch);
  }, []);

  // Upload handler for new files
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFilesList = event.target.files;
    if (!uploadedFilesList || uploadedFilesList.length === 0 || !user) return;

    setUploading(true);
    try {
      let count = 0;
      for (const file of Array.from(uploadedFilesList)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) {
          console.warn("Upload de storage falhou, tentando salvar registro direto:", uploadError.message);
        }

        // Save to 'documents' table
        const { error: dbError } = await supabase
          .from("documents")
          .insert({
            user_id: user.id,
            name: file.name,
            file_url: filePath,
            file_type: file.type || detectCategory(undefined, file.name),
            file_size: file.size,
            author_id: user.id
          });

        if (dbError) throw dbError;
        count++;
      }

      toast({
        title: "Upload concluído!",
        description: `${count} arquivo(s) registrado(s) no banco de dados com sucesso.`
      });
      fetchAllFiles();
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao enviar arquivo para o banco de dados.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete file handler - Removes from storage server & purges database tables
  const handleDelete = async (fileItem: UnifiedFileItem) => {
    if (!confirm(`Deseja realmente excluir permanentemente o arquivo "${fileItem.name}" do servidor e banco de dados?`)) return;

    try {
      // 1. Extrair o caminho limpo do arquivo no storage
      let rawPath = fileItem.file_url || "";
      if (rawPath.includes("/object/")) {
        const match = rawPath.match(/\/object\/(?:public|sign)\/[^/]+\/(.+?)(?:\?|$)/);
        if (match) rawPath = match[1];
      }
      rawPath = rawPath.split('?')[0];
      if (rawPath.startsWith("media/")) rawPath = rawPath.slice(6);
      if (rawPath.startsWith("documents/")) rawPath = rawPath.slice(10);
      const cleanStoragePath = decodeURIComponent(rawPath);

      // 2. Remover o arquivo físico dos buckets do Supabase Storage
      if (cleanStoragePath && !cleanStoragePath.startsWith("http://") && !cleanStoragePath.startsWith("https://")) {
        await Promise.allSettled([
          supabase.storage.from("documents").remove([cleanStoragePath]),
          supabase.storage.from("media").remove([cleanStoragePath])
        ]);
      }

      // 3. Remover registros de AMBAS as tabelas (documents e media) para evitar duplicatas órfãs
      const fileUrlQ = fileItem.file_url.replace(/"/g, '\\"');
      const nameQ = fileItem.name.replace(/"/g, '\\"');
      const origIdQ = fileItem.originalId.replace(/"/g, '\\"');
      const orFilter = `id.eq."${origIdQ}",file_url.eq."${fileUrlQ}",name.eq."${nameQ}"`;
      await Promise.allSettled([
        supabase.from("documents").delete().eq("user_id", user.id).or(orFilter),
        supabase.from("media").delete().eq("user_id", user.id).or(orFilter)
      ]);

      // 4. Remover do estado React
      setFiles(prev => prev.filter(f => f.id !== fileItem.id && f.file_url !== fileItem.file_url && f.name !== fileItem.name));
      if (selectedFile?.id === fileItem.id) setSelectedFile(null);

      toast({
        variant: "success" as any,
        title: "Arquivo excluído",
        description: `O arquivo "${fileItem.name}" foi removido do servidor e banco de dados.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message || "Não foi possível remover o arquivo.",
        variant: "destructive"
      });
    }
  };

  // Copy Direct Link
  const handleCopyLink = (fileItem: UnifiedFileItem) => {
    navigator.clipboard.writeText(fileItem.public_url);
    setCopiedId(fileItem.id);
    toast({
      title: "Link Copiado!",
      description: "URL direta do arquivo copiada para a área de transferência."
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download Handler
  const handleDownload = (fileItem: UnifiedFileItem) => {
    const link = document.createElement("a");
    link.href = fileItem.public_url;
    link.download = fileItem.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Iniciando Download",
      description: `Baixando ${fileItem.name}...`
    });
  };

  // Toggle Inline Audio Play
  const handleToggleAudio = (fileItem: UnifiedFileItem) => {
    if (playingAudioId === fileItem.id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(fileItem.public_url);
      audioRef.current.play();
      setPlayingAudioId(fileItem.id);
      audioRef.current.onended = () => setPlayingAudioId(null);
    }
  };

  // Computed metrics
  const stats = useMemo(() => {
    const totalCount = files.length;
    const imagesCount = files.filter(f => f.category === "image").length;
    const videosCount = files.filter(f => f.category === "video").length;
    const audiosCount = files.filter(f => f.category === "audio").length;
    const pdfsCount = files.filter(f => f.category === "pdf" || f.category === "document").length;
    const totalBytes = files.reduce((acc, f) => acc + (f.file_size || 0), 0);

    return { totalCount, imagesCount, videosCount, audiosCount, pdfsCount, totalBytes };
  }, [files]);

  // Filtered and Sorted Files
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesCategory = activeCategory === "all" || file.category === activeCategory;
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            file.file_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "size_desc") return b.file_size - a.file_size;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [files, activeCategory, searchQuery, sortBy]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 space-y-6 md:space-y-8 font-sans">
      {/* Header & Stats Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card/60 border border-border/80 p-6 rounded-2xl backdrop-blur-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Arquivos & Documentos do Banco de Dados
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Gerenciador unificado de áudios, fotos, vídeos, PDFs e documentos cadastrados no sistema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl px-5 h-11 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload para o Banco
          </Button>
        </div>
      </div>

      {/* Database Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-card/40 border border-border/70 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Arquivos</span>
            <span className="text-lg font-black text-white">{stats.totalCount} ({formatSize(stats.totalBytes)})</span>
          </div>
        </div>

        <div className="bg-card/40 border border-border/70 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Fotos / Imagens</span>
            <span className="text-lg font-black text-emerald-400">{stats.imagesCount}</span>
          </div>
        </div>

        <div className="bg-card/40 border border-border/70 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Vídeos</span>
            <span className="text-lg font-black text-purple-400">{stats.videosCount}</span>
          </div>
        </div>

        <div className="bg-card/40 border border-border/70 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Áudios / Sons</span>
            <span className="text-lg font-black text-amber-400">{stats.audiosCount}</span>
          </div>
        </div>

        <div className="bg-card/40 border border-border/70 p-4 rounded-xl flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
            <FileType className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">PDFs & Docs</span>
            <span className="text-lg font-black text-red-400">{stats.pdfsCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {([
            { id: "all", label: `Todos (${stats.totalCount})`, icon: Database },
            { id: "image", label: `Fotos (${stats.imagesCount})`, icon: ImageIcon },
            { id: "video", label: `Vídeos (${stats.videosCount})`, icon: Film },
            { id: "audio", label: `Áudios (${stats.audiosCount})`, icon: Music },
            { id: "pdf", label: `PDFs (${stats.pdfsCount})`, icon: FileType },
            { id: "document", label: "Outros", icon: FileText }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as FileCategory)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border shrink-0 cursor-pointer",
                activeCategory === tab.id
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-card border-border/70 text-muted-foreground hover:text-white hover:bg-card/80"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search, Sort and View Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] md:min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou formato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-card border border-border/80 rounded-xl pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-white placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-card border border-border/80 p-1 rounded-xl">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-muted-foreground focus:text-white outline-none px-2 py-1 cursor-pointer"
            >
              <option value="recent" className="bg-zinc-900 text-white">Mais Recentes</option>
              <option value="oldest" className="bg-zinc-900 text-white">Mais Antigos</option>
              <option value="size_desc" className="bg-zinc-900 text-white">Maior Tamanho</option>
              <option value="name" className="bg-zinc-900 text-white">Nome (A-Z)</option>
            </select>
          </div>

          <div className="flex bg-card border border-border/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-all cursor-pointer",
                viewMode === "grid" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
              )}
              title="Modo Grade"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg transition-all cursor-pointer",
                viewMode === "list" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
              )}
              title="Modo Lista Detalhada"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Files Display Viewport */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-card/20 rounded-2xl border border-dashed border-border">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest animate-pulse">
            Carregando todos os arquivos do banco de dados...
          </p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-24 bg-card/20 border border-dashed border-border rounded-2xl">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-bold text-white mb-1">Nenhum arquivo encontrado</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery ? "Tente alterar os termos da busca." : "Faça upload de fotos, áudios, vídeos ou PDFs para preencher sua biblioteca."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file) => {
            const badge = getCategoryBadge(file.category);
            const Icon = badge.icon;

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-card/50 border border-border/80 hover:border-primary/60 transition-all cursor-pointer shadow-md flex flex-col justify-between"
                onClick={() => setSelectedFile(file)}
              >
                {/* Visual Preview Container */}
                <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-black/40">
                  {file.category === "image" ? (
                    <SmartGridImage file={file} badge={badge} Icon={Icon} />
                  ) : file.category === "video" ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
                      <video
                        src={file.public_url}
                        className="w-full h-full object-cover opacity-80"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20 group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  ) : file.category === "audio" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-amber-500/10 to-amber-950/20 text-amber-400">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-2 border border-amber-500/30">
                        <Music className={cn("w-6 h-6", playingAudioId === file.id && "animate-bounce text-amber-300")} />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleAudio(file); }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] rounded-full uppercase transition-transform active:scale-95 shadow-md flex items-center gap-1"
                      >
                        {playingAudioId === file.id ? <Pause className="w-3 h-3 fill-black" /> : <Play className="w-3 h-3 fill-black" />}
                        <span>{playingAudioId === file.id ? "Pausar" : "Ouvir"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-2 border", badge.color)}>
                        <Icon className="w-7 h-7" />
                      </div>
                    </div>
                  )}

                  {/* Category Badge (Top Left) */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm", badge.color)}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Quick Options Overlay (Bottom) */}
                  <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                    <p className="text-[11px] font-bold text-white truncate mb-0.5">{file.name}</p>
                    <div className="flex items-center justify-between gap-1 text-[9px] text-zinc-300">
                      <span>{formatSize(file.file_size)}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleCopyLink(file); }}
                          className="p-1 rounded bg-white/10 hover:bg-white/30 text-white transition-colors"
                          title="Copiar Link"
                        >
                          {copiedId === file.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                          className="p-1 rounded bg-white/10 hover:bg-white/30 text-white transition-colors"
                          title="Baixar"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="flex flex-col gap-2.5">
          {filteredFiles.map((file) => {
            const badge = getCategoryBadge(file.category);
            const Icon = badge.icon;

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between gap-4 p-3.5 md:p-4 rounded-xl bg-card/50 border border-border/80 hover:border-primary/50 transition-all group cursor-pointer"
                onClick={() => setSelectedFile(file)}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className={cn("w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 border", badge.color)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">
                        {file.name}
                      </h4>
                      <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 hidden sm:inline-block", badge.color)}>
                        {file.file_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Database className="w-3 h-3 text-primary" /> {file.sourceTable}</span>
                      <span>•</span>
                      <span>{formatSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {file.category === "audio" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleToggleAudio(file); }}
                      className="h-8 px-2.5 text-xs text-amber-400 hover:bg-amber-500/10"
                    >
                      {playingAudioId === file.id ? <Pause className="w-3.5 h-3.5 mr-1 fill-current" /> : <Play className="w-3.5 h-3.5 mr-1 fill-current" />}
                      <span className="hidden sm:inline">{playingAudioId === file.id ? "Pausar" : "Ouvir"}</span>
                    </Button>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleCopyLink(file); }}
                    className="h-8 w-8 rounded-lg hover:bg-muted text-zinc-400 hover:text-white"
                    title="Copiar Link"
                  >
                    {copiedId === file.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                    className="h-8 w-8 rounded-lg hover:bg-muted text-zinc-400 hover:text-white"
                    title="Baixar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                    className="h-8 w-8 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal Viewport (Preview & Full Details) */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-sans"
            onClick={() => setSelectedFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Close Button */}
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="absolute top-3.5 right-3.5 z-[110] p-2 rounded-xl bg-black/60 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              {/* Main Media Player / Preview Header */}
              <div className="flex items-center justify-center min-h-[260px] md:min-h-[380px] bg-black/60 p-4 relative overflow-hidden">
                {selectedFile.category === "image" ? (
                  <img
                    src={selectedFile.public_url}
                    alt={selectedFile.name}
                    className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-2xl"
                    onError={(e) => { (e.target as any).src = "/placeholder.svg"; }}
                  />
                ) : selectedFile.category === "video" ? (
                  <video
                    src={selectedFile.public_url}
                    controls
                    autoPlay
                    className="max-w-full max-h-[50vh] rounded-xl shadow-2xl"
                  />
                ) : selectedFile.category === "audio" ? (
                  <div className="flex flex-col items-center gap-4 py-8 px-6 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-center max-w-md w-full">
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center shadow-inner">
                      <Music className="w-10 h-10 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white truncate max-w-xs">{selectedFile.name}</h4>
                      <p className="text-xs text-amber-400 font-mono mt-0.5">{selectedFile.file_type}</p>
                    </div>
                    <audio
                      src={selectedFile.public_url}
                      controls
                      autoPlay
                      className="w-full mt-2"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg border", getCategoryBadge(selectedFile.category).color)}>
                      {getFileIcon(selectedFile.file_type)({ className: "w-10 h-10" })}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white px-4 truncate max-w-md">{selectedFile.name}</h3>
                      <span className="text-xs text-zinc-400 font-mono">{selectedFile.file_type}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Comprehensive File Details Footer */}
              <div className="p-6 bg-card border-t border-border/80 overflow-y-auto space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <span className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border mb-1.5 inline-block", getCategoryBadge(selectedFile.category).color)}>
                      {getCategoryBadge(selectedFile.category).label}
                    </span>
                    <h3 className="text-lg font-bold text-white truncate max-w-lg">{selectedFile.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleCopyLink(selectedFile)}
                      variant="outline"
                      className="rounded-xl h-10 text-xs font-bold gap-1.5"
                    >
                      {copiedId === selectedFile.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === selectedFile.id ? "Copiado!" : "Copiar Link"}
                    </Button>
                    <Button
                      onClick={() => handleDownload(selectedFile)}
                      className="rounded-xl h-10 text-xs font-bold gap-1.5 bg-primary text-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar Arquivo
                    </Button>
                    <Button
                      onClick={() => handleDelete(selectedFile)}
                      variant="destructive"
                      className="rounded-xl h-10 w-10 p-0"
                      title="Excluir do Banco de Dados"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Technical Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                  <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Tamanho</span>
                    <span className="text-xs font-bold text-white">{formatSize(selectedFile.file_size)}</span>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Data de Cadastro</span>
                    <span className="text-xs font-bold text-white">
                      {new Date(selectedFile.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Tabela do Banco</span>
                    <span className="text-xs font-bold text-primary capitalize">{selectedFile.sourceTable}</span>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">MimeType</span>
                    <span className="text-xs font-bold text-white truncate block" title={selectedFile.file_type}>
                      {selectedFile.file_type}
                    </span>
                  </div>
                </div>

                {/* Raw Database Path & URL */}
                <div className="pt-2">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                    Caminho do Storage / URL do Banco:
                  </span>
                  <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800 font-mono text-[10px]">
                    <span className="text-zinc-400 truncate flex-1">{selectedFile.public_url}</span>
                    <a
                      href={selectedFile.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
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
