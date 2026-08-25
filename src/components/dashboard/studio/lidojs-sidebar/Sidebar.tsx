import { useCallback, useState } from 'react';
import { useEditor } from '../EditorContext';
import type { CanvasLayer } from '../CoverCanvasEngine';
import { getMediaUrl } from '@/utils/mediaUtils';
import { useToast } from '@/hooks/use-toast';
import {
  Type,
  Square,
  Upload,
  Paintbrush,
  Tag,
  Wand2,
  LayoutTemplate
} from 'lucide-react';
import { SidebarTab } from './tabs/SidebarTab';
import { TextContent } from './panels/TextContent';
import { ShapeContent } from './panels/ShapeContent';
import { StudioUploadsTab } from '../StudioUploadsTab';
import { BackgroundContent } from './panels/BackgroundContent';
import { BadgeContent } from './panels/BadgeContent';
import { ImageToolsContent } from './panels/ImageToolsContent';
import { FormatosContent } from './panels/FormatosContent';

const tabs = [
  { name: 'Formatos', icon: <LayoutTemplate size={24} /> },
  { name: 'Texto', icon: <Type size={24} /> },
  { name: 'Formas', icon: <Square size={24} /> },
  { name: 'Fundo', icon: <Paintbrush size={24} /> },
  { name: 'Badges', icon: <Tag size={24} /> },
  { name: 'Upload', icon: <Upload size={24} /> },
  { name: 'Ferramentas', icon: <Wand2 size={24} /> },
];

export const Sidebar = () => {
  const [tab, setTab] = useState<string | null>(null);
  const { addLayer, selectLayer, canvasWidth, canvasHeight } = useEditor();
  const { toast } = useToast();

  const handleCloseTab = useCallback(() => {
    setTab(null);
  }, []);

  return (
    <div className="flex z-[2] relative bg-[#1E1E2D] border-r border-white/10 shrink-0 text-white">
      <div className="flex">
        <SidebarTab
          active={tab}
          tabs={tabs}
          onChange={(_, tabName) => {
            setTab(tabName);
          }}
        />
        {tab && (
          <div className="w-[360px] overflow-y-auto border-r border-white/10 bg-[#151521]">
            {tab === 'Formatos' && <FormatosContent onClose={handleCloseTab} />}
            {tab === 'Texto' && <TextContent onClose={handleCloseTab} />}
            {tab === 'Formas' && <ShapeContent onClose={handleCloseTab} />}
            {tab === 'Fundo' && <BackgroundContent onClose={handleCloseTab} />}
            {tab === 'Badges' && <BadgeContent onClose={handleCloseTab} />}
            {tab === 'Upload' && (
              <div className="p-4 flex flex-col h-full overflow-y-auto">
                <StudioUploadsTab onAddImageLayer={(url, name, type = 'image') => {
                  const cleanUrl = getMediaUrl(url) || url;
                  const img = new Image();
                  img.onload = () => {
                    // Scale image to fit canvas while preserving aspect ratio
                    // Leave 10% margin on each side
                    const maxW = canvasWidth * 0.8;
                    const maxH = canvasHeight * 0.8;
                    let w = img.naturalWidth;
                    let h = img.naturalHeight;
                    if (w > maxW) { h = h * (maxW / w); w = maxW; }
                    if (h > maxH) { w = w * (maxH / h); h = maxH; }
                    // Center on canvas
                    const layer: CanvasLayer = {
                      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                      name,
                      type: type as 'image' | 'logo',
                      x: Math.round((canvasWidth - w) / 2),
                      y: Math.round((canvasHeight - h) / 2),
                      width: Math.round(w),
                      height: Math.round(h),
                      rotation: 0,
                      opacity: 1,
                      visible: true,
                      locked: false,
                      content: url,
                    };
                    addLayer(layer);
                    selectLayer(layer.id);
                  };
                  img.onerror = () => {
                    toast({
                      title: "Erro ao carregar imagem",
                      description: `Não foi possível carregar "${name}".`,
                      variant: "destructive",
                    });
                  };
                  img.src = cleanUrl;
                }} />
              </div>
            )}
            {tab === 'Ferramentas' && <ImageToolsContent onClose={handleCloseTab} />}
          </div>
        )}
      </div>
    </div>
  );
};
