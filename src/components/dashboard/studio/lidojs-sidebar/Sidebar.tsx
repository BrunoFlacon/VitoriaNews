import { useCallback, useState } from 'react';
import {
  Type,
  Square,
  Upload,
  Paintbrush,
  Tag,
  Wand2,
} from 'lucide-react';
import { SidebarTab } from './tabs/SidebarTab';
import { TextContent } from './panels/TextContent';
import { ShapeContent } from './panels/ShapeContent';
import { UploadContent } from './panels/UploadContent';
import { BackgroundContent } from './panels/BackgroundContent';
import { BadgeContent } from './panels/BadgeContent';
import { ImageToolsContent } from './panels/ImageToolsContent';

const tabs = [
  { name: 'Texto', icon: <Type size={24} /> },
  { name: 'Formas', icon: <Square size={24} /> },
  { name: 'Fundo', icon: <Paintbrush size={24} /> },
  { name: 'Badges', icon: <Tag size={24} /> },
  { name: 'Upload', icon: <Upload size={24} /> },
  { name: 'Ferramentas', icon: <Wand2 size={24} /> },
];

export const Sidebar = () => {
  const [tab, setTab] = useState<string | null>(null);

  const handleCloseTab = useCallback(() => {
    setTab(null);
  }, []);

  return (
    <div className="flex z-[2] relative bg-white border-r border-gray-200/60 shrink-0">
      <div className="flex">
        <SidebarTab
          active={tab}
          tabs={tabs}
          onChange={(_, tabName) => {
            setTab(tabName);
          }}
        />
        {tab && (
          <div className="w-[360px] overflow-y-auto border-r border-gray-200/60">
            {tab === 'Texto' && <TextContent onClose={handleCloseTab} />}
            {tab === 'Formas' && <ShapeContent onClose={handleCloseTab} />}
            {tab === 'Fundo' && <BackgroundContent onClose={handleCloseTab} />}
            {tab === 'Badges' && <BadgeContent onClose={handleCloseTab} />}
            {tab === 'Upload' && <UploadContent onClose={handleCloseTab} />}
            {tab === 'Ferramentas' && <ImageToolsContent onClose={handleCloseTab} />}
          </div>
        )}
      </div>
    </div>
  );
};
