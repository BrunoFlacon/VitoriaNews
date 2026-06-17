import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ThumbsUp, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { socialPlatforms } from "@/components/icons/platform-metadata";

interface PlatformPreviewProps {
  content: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'document' | 'story' | 'live';
  selectedPlatforms: string[];
  onClose: () => void;
}

interface PreviewCardProps {
  platform: string;
  content: string;
  mediaUrl?: string;
  mediaType: string;
}

const InstagramPreview = ({ content, mediaUrl }: PreviewCardProps) => (
  <div className="bg-white rounded-lg overflow-hidden shadow-lg max-w-[350px]">
    {/* Header */}
    <div className="flex items-center gap-3 p-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">sua_conta</p>
        <p className="text-xs text-gray-500">Patrocinado</p>
      </div>
      <MoreHorizontal className="w-5 h-5 text-gray-600" />
    </div>
    
    {/* Media */}
    <div className="aspect-square bg-gray-100">
      {mediaUrl ? (
        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          Sua mídia aqui
        </div>
      )}
    </div>
    
    {/* Actions */}
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6 text-gray-800" />
          <MessageCircle className="w-6 h-6 text-gray-800" />
          <Share2 className="w-6 h-6 text-gray-800" />
        </div>
        <Bookmark className="w-6 h-6 text-gray-800" />
      </div>
      <p className="text-sm font-semibold text-gray-900 mb-1">1.234 curtidas</p>
      <p className="text-sm text-gray-800">
        <span className="font-semibold">sua_conta</span>{" "}
        {content || "Sua legenda aparecerá aqui..."}
      </p>
      <p className="text-xs text-gray-500 mt-1">Ver todos os 42 comentários</p>
      <p className="text-xs text-gray-400 mt-1">HÁ 2 HORAS</p>
    </div>
  </div>
);

const FacebookPreview = ({ content, mediaUrl }: PreviewCardProps) => (
  <div className="bg-white rounded-lg overflow-hidden shadow-lg max-w-[400px]">
    {/* Header */}
    <div className="flex items-center gap-3 p-3">
      <div className="w-10 h-10 rounded-full bg-blue-500" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">Sua Página</p>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>2h · 🌎</span>
        </div>
      </div>
      <MoreHorizontal className="w-5 h-5 text-gray-600" />
    </div>
    
    {/* Content */}
    <div className="px-3 pb-2">
      <p className="text-sm text-gray-800">
        {content || "Seu conteúdo aparecerá aqui..."}
      </p>
    </div>
    
    {/* Media */}
    {mediaUrl && (
      <div className="aspect-video bg-gray-100">
        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
      </div>
    )}
    
    {/* Stats */}
    <div className="px-3 py-2 flex items-center justify-between text-xs text-gray-500 border-b">
      <div className="flex items-center gap-1">
        <div className="flex">
          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
            <ThumbsUp className="w-2 h-2 text-white" />
          </div>
          <div className="w-4 h-4 rounded-full bg-red-500 -ml-1 flex items-center justify-center">
            <Heart className="w-2 h-2 text-white" />
          </div>
        </div>
        <span>234</span>
      </div>
      <span>45 comentários · 12 compartilhamentos</span>
    </div>
    
    {/* Actions */}
    <div className="flex items-center justify-around p-2">
      <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded">
        <ThumbsUp className="w-5 h-5" />
        <span className="text-sm font-medium">Curtir</span>
      </button>
      <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded">
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Comentar</span>
      </button>
      <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded">
        <Share2 className="w-5 h-5" />
        <span className="text-sm font-medium">Compartilhar</span>
      </button>
    </div>
  </div>
);

const TwitterPreview = ({ content, mediaUrl }: PreviewCardProps) => (
  <div className="bg-white rounded-lg overflow-hidden shadow-lg max-w-[400px] p-4">
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-900">Sua Conta</span>
          <span className="text-gray-500">@sua_conta · 2h</span>
        </div>
        <p className="text-gray-800 mt-1">
          {content || "Seu tweet aparecerá aqui..."}
        </p>
        
        {mediaUrl && (
          <div className="mt-3 rounded-2xl overflow-hidden">
            <img src={mediaUrl} alt="Preview" className="w-full h-auto" />
          </div>
        )}
        
        <div className="flex items-center justify-between mt-3 text-gray-500 max-w-[300px]">
          <button className="flex items-center gap-1 hover:text-blue-500">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">42</span>
          </button>
          <button className="flex items-center gap-1 hover:text-green-500">
            <Share2 className="w-4 h-4" />
            <span className="text-sm">128</span>
          </button>
          <button className="flex items-center gap-1 hover:text-red-500">
            <Heart className="w-4 h-4" />
            <span className="text-sm">1.2K</span>
          </button>
          <button className="flex items-center gap-1 hover:text-blue-500">
            <Eye className="w-4 h-4" />
            <span className="text-sm">15K</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

const YouTubePreview = ({ content, mediaUrl }: PreviewCardProps) => (
  <div className="bg-white rounded-lg overflow-hidden shadow-lg max-w-[350px]">
    {/* Thumbnail */}
    <div className="aspect-video bg-gray-900 relative">
      {mediaUrl ? (
        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          Thumbnail do vídeo
        </div>
      )}
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
        12:34
      </div>
    </div>
    
    {/* Info */}
    <div className="flex gap-3 p-3">
      <div className="w-9 h-9 rounded-full bg-red-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
          {content || "Título do seu vídeo aqui..."}
        </h3>
        <p className="text-xs text-gray-500 mt-1">Seu Canal</p>
        <p className="text-xs text-gray-500">123K visualizações · 2 dias atrás</p>
      </div>
    </div>
  </div>
);

const TikTokPreview = ({ content, mediaUrl }: PreviewCardProps) => (
  <div className="bg-black rounded-lg overflow-hidden shadow-lg w-[280px]">
    {/* Video */}
    <div className="aspect-[9/16] relative">
      {mediaUrl ? (
        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-900">
          Seu vídeo
        </div>
      )}
      
      {/* Right sidebar */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur" />
        <div className="text-center">
          <Heart className="w-8 h-8 text-white" />
          <span className="text-white text-xs">1.2K</span>
        </div>
        <div className="text-center">
          <MessageCircle className="w-8 h-8 text-white" />
          <span className="text-white text-xs">234</span>
        </div>
        <div className="text-center">
          <Bookmark className="w-8 h-8 text-white" />
          <span className="text-white text-xs">89</span>
        </div>
        <div className="text-center">
          <Share2 className="w-8 h-8 text-white" />
          <span className="text-white text-xs">45</span>
        </div>
      </div>
      
      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-16 text-white">
        <p className="font-semibold text-sm">@sua_conta</p>
        <p className="text-sm mt-1 line-clamp-2">
          {content || "Sua legenda aparecerá aqui..."}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span>🎵 Som original - sua_conta</span>
        </div>
      </div>
    </div>
  </div>
);

const LinkedInPreview = ({ content, mediaUrl }: PreviewCardProps) => (
  <div className="bg-white rounded-lg overflow-hidden shadow-lg max-w-[400px]">
    {/* Header */}
    <div className="flex items-start gap-3 p-3">
      <div className="w-12 h-12 rounded-full bg-blue-700 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-gray-900">Seu Nome</p>
        <p className="text-xs text-gray-500">CEO | Empreendedor | Inovação</p>
        <p className="text-xs text-gray-500">2h · 🌎</p>
      </div>
    </div>
    
    {/* Content */}
    <div className="px-3 pb-2">
      <p className="text-sm text-gray-800 whitespace-pre-wrap">
        {content || "Seu post do LinkedIn aparecerá aqui..."}
      </p>
    </div>
    
    {/* Media */}
    {mediaUrl && (
      <div className="aspect-video bg-gray-100">
        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
      </div>
    )}
    
    {/* Stats */}
    <div className="px-3 py-2 flex items-center gap-2 text-xs text-gray-500 border-b">
      <div className="flex">
        <div className="w-4 h-4 rounded-full bg-blue-600" />
        <div className="w-4 h-4 rounded-full bg-green-600 -ml-1" />
        <div className="w-4 h-4 rounded-full bg-red-500 -ml-1" />
      </div>
      <span>1.234 · 56 comentários</span>
    </div>
    
    {/* Actions */}
    <div className="flex items-center justify-around p-2 text-gray-600 text-sm">
      <button className="flex items-center gap-1 hover:bg-gray-100 px-3 py-2 rounded">
        <ThumbsUp className="w-4 h-4" />
        Gostei
      </button>
      <button className="flex items-center gap-1 hover:bg-gray-100 px-3 py-2 rounded">
        <MessageCircle className="w-4 h-4" />
        Comentar
      </button>
      <button className="flex items-center gap-1 hover:bg-gray-100 px-3 py-2 rounded">
        <Share2 className="w-4 h-4" />
        Compartilhar
      </button>
    </div>
  </div>
);

const PlatformPreview = ({ content, mediaUrl, mediaType, selectedPlatforms, onClose }: PlatformPreviewProps) => {
  const [activePlatform, setActivePlatform] = useState(selectedPlatforms[0] || 'instagram');

  const renderPreview = () => {
    const props = { platform: activePlatform, content, mediaUrl, mediaType };
    
    switch (activePlatform) {
      case 'instagram':
        return <InstagramPreview {...props} />;
      case 'facebook':
        return <FacebookPreview {...props} />;
      case 'twitter':
        return <TwitterPreview {...props} />;
      case 'youtube':
        return <YouTubePreview {...props} />;
      case 'tiktok':
        return <TikTokPreview {...props} />;
      case 'linkedin':
        return <LinkedInPreview {...props} />;
      default:
        return <InstagramPreview {...props} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl border border-border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Prévia nas Plataformas</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Platform Tabs */}
        <div className="flex gap-2 p-4 border-b border-border overflow-x-auto">
          {selectedPlatforms.map((platformId) => {
            const platform = socialPlatforms.find((p) => p.id === platformId);
            if (!platform) return null;
            
            return (
              <button
                key={platformId}
                onClick={() => setActivePlatform(platformId)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activePlatform === platformId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <platform.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{platform.name}</span>
              </button>
            );
          })}
        </div>

        {/* Preview Area */}
        <div className="flex items-center justify-center p-8 bg-muted/30 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePlatform}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderPreview()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-sm text-muted-foreground text-center">
            Esta é uma prévia aproximada de como seu conteúdo aparecerá em cada plataforma.
            O resultado final pode variar.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PlatformPreview;
