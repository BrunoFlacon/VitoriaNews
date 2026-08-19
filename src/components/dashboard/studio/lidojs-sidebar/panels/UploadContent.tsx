import { useEditor } from '../../EditorContext';
import type { CanvasLayer } from '../../CoverCanvasEngine';
import { useRef, useState } from 'react';
import { PanelHeader } from '../PanelHeader';
import { Upload } from 'lucide-react';

interface UploadContentProps {
  onClose: () => void;
}

export const UploadContent = ({ onClose }: UploadContentProps) => {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const { addLayer, selectLayer } = useEditor();
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setImages((prev) => [...prev, { url, name: file.name }]);
    };
    reader.readAsDataURL(file);
  };

  const addImageToCanvas = (url: string, name: string) => {
    const img = new Image();
    img.onload = () => {
      const layer: CanvasLayer = {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        type: 'image',
        x: 100,
        y: 100,
        width: Math.min(600, img.naturalWidth),
        height: Math.min(400, img.naturalHeight),
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        content: url,
      };
      addLayer(layer);
      selectLayer(layer.id);
    };
    img.src = url;
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <PanelHeader title="Enviar Imagens" onClose={onClose} />

      <div className="p-4">
        <div
          className="bg-gray-700 rounded-lg text-white p-3 cursor-pointer text-center hover:bg-gray-600 transition-colors"
          onClick={() => inputFileRef.current?.click()}
        >
          <Upload className="inline mr-2" size={16} />
          Enviar Imagem
        </div>
        <input
          ref={inputFileRef}
          accept="image/*"
          className="hidden"
          type="file"
          onChange={handleUpload}
        />

        {/* Uploaded images grid */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {images.map((item, idx) => (
            <div
              key={idx}
              className="cursor-pointer relative hover:opacity-80 transition-opacity"
              onClick={() => addImageToCanvas(item.url, item.name)}
            >
              <div className="aspect-square flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                <img alt={item.name} className="max-h-full max-w-full object-contain" loading="lazy" src={item.url} />
              </div>
              <span className="text-[9px] text-gray-500 truncate block text-center mt-0.5">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
