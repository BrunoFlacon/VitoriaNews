import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image, 
  Video, 
  FileText, 
  Upload, 
  Grid, 
  List, 
  Search, 
  Filter,
  MoreVertical,
  Trash2,
  Download,
  Eye,
  X,
  FolderOpen,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type MediaType = "all" | "image" | "video" | "document";
type ViewMode = "grid" | "list";

interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  url: string;
  size: string;
  uploadedAt: Date;
  thumbnail?: string;
}

const mockMedia: MediaItem[] = [
  { id: '1', name: 'banner-promo.jpg', type: 'image', url: '/placeholder.svg', size: '2.4 MB', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '2', name: 'video-produto.mp4', type: 'video', url: '/placeholder.svg', size: '45.2 MB', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  { id: '3', name: 'apresentacao.pdf', type: 'document', url: '/placeholder.svg', size: '1.8 MB', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 48) },
  { id: '4', name: 'story-destaque.jpg', type: 'image', url: '/placeholder.svg', size: '890 KB', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) },
  { id: '5', name: 'tutorial.mp4', type: 'video', url: '/placeholder.svg', size: '128.5 MB', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 96) },
  { id: '6', name: 'catalogo.pdf', type: 'document', url: '/placeholder.svg', size: '5.2 MB', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 120) },
  { id: '7', name: 'foto-equipe.jpg', type: 'image', url: '/placeholder.svg', size: '3.1 MB', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 144) },
  { id: '8', name: 'reels-trend.mp4', type: 'video', url: '/placeholder.svg', size: '22.8 MB', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 168) },
];

export const MediaGalleryView = () => {
  const [media, setMedia] = useState<MediaItem[]>(mockMedia);
  const [filter, setFilter] = useState<MediaType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      setSearchQuery(e.detail);
    };
    window.addEventListener('system-search', handleGlobalSearch);
    return () => window.removeEventListener('system-search', handleGlobalSearch);
  }, []);

  const filteredMedia = media.filter(item => {
    const matchesFilter = filter === "all" || item.type === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const newMedia: MediaItem[] = files.map(file => {
      let type: "image" | "video" | "document" = "document";
      if (file.type.startsWith("image/")) type = "image";
      if (file.type.startsWith("video/")) type = "video";

      return {
        id: crypto.randomUUID(),
        name: file.name,
        type,
        url: URL.createObjectURL(file),
        size: formatFileSize(file.size),
        uploadedAt: new Date()
      };
    });

    setMedia(prev => [...newMedia, ...prev]);
    toast({
      title: "Upload concluído",
      description: `${files.length} arquivo(s) adicionado(s) à galeria.`
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDelete = (id: string) => {
    setMedia(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Arquivo excluído",
      description: "O arquivo foi removido da galeria."
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image": return Image;
      case "video": return Video;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "image": return "bg-blue-500/20 text-blue-500";
      case "video": return "bg-purple-500/20 text-purple-500";
      default: return "bg-orange-500/20 text-orange-500";
    }
  };

  return (
    <div>
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display font-bold text-3xl mb-2"
        >
          Galeria de Mídia
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          Gerencie suas imagens, vídeos e documentos
        </motion.p>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "mb-6 border-2 border-dashed rounded-2xl p-4 md:p-8 text-center transition-all",
          isDragging 
            ? "border-primary bg-primary/10" 
            : "border-border hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-medium text-lg mb-2">
            {isDragging ? "Solte os arquivos aqui" : "Arraste e solte arquivos"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            Suporta: JPG, PNG, GIF, MP4, MOV, PDF, DOC
          </p>
        </label>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar arquivos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="flex bg-muted/50 rounded-lg p-1">
            {(["all", "image", "video", "document"] as MediaType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  filter === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type === "all" ? "Todos" : type === "image" ? "Imagens" : type === "video" ? "Vídeos" : "Docs"}
              </button>
            ))}
          </div>
          
          <div className="flex bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Media Grid/List */}
      {filteredMedia.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">Nenhum arquivo encontrado</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Tente uma busca diferente" : "Faça upload de arquivos para começar"}
          </p>
        </motion.div>
      ) : viewMode === "grid" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          {filteredMedia.map((item, index) => {
            const TypeIcon = getTypeIcon(item.type);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-muted/50 border border-border cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => setSelectedMedia(item)}
              >
                {item.type === "image" ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center", getTypeColor(item.type))}>
                      <TypeIcon className="w-8 h-8" />
                    </div>
                  </div>
                )}
                
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    <p className="text-white/70 text-xs">{item.size}</p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          {filteredMedia.map((item, index) => {
            const TypeIcon = getTypeIcon(item.type);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => setSelectedMedia(item)}
              >
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center shrink-0", getTypeColor(item.type))}>
                  <TypeIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.size} • {item.uploadedAt.toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedMedia(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {selectedMedia.type === "image" ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : selectedMedia.type === "video" ? (
                <video
                  src={selectedMedia.url}
                  controls
                  className="max-w-full max-h-[70vh]"
                />
              ) : (
                <div className="w-96 h-96 flex flex-col items-center justify-center">
                  <FileText className="w-24 h-24 text-muted-foreground mb-4" />
                  <p className="font-medium">{selectedMedia.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedMedia.size}</p>
                </div>
              )}
              
              <div className="p-4 border-t border-border">
                <p className="font-medium">{selectedMedia.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMedia.size} • Enviado em {selectedMedia.uploadedAt.toLocaleDateString('pt-BR')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
