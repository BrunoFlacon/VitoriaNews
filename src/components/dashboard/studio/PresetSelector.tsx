import React from "react";
import { Youtube, Instagram, Music, Video, Radio, Smartphone, Monitor, Square, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CoverPreset {
  id: string;
  name: string;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  width: number;
  height: number;
  category: "video" | "live" | "short" | "audio";
  platforms: string[];
  icon: React.ElementType;
  description: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: "youtube_video",
    name: "Vídeo Horizontal (16:9)",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    category: "video",
    platforms: ["YouTube", "Facebook", "LinkedIn"],
    icon: Monitor,
    description: "Capa padrão para vídeos longos e horizontais"
  },
  {
    id: "youtube_live",
    name: "Transmissão Ao Vivo (16:9)",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    category: "live",
    platforms: ["YouTube Live", "Facebook Live", "Twitch"],
    icon: Video,
    description: "Ideal para capas de Lives com selo 'AO VIVO'"
  },
  {
    id: "reels_shorts",
    name: "Vídeos Curtos & Stories (9:16)",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    category: "short",
    platforms: ["Shorts", "Reels", "TikTok", "Stories"],
    icon: Smartphone,
    description: "Formato vertical imersivo para Reels e TikTok"
  },
  {
    id: "spotify_podcast",
    name: "Podcast & Áudio (1:1)",
    aspectRatio: "1:1",
    width: 1440,
    height: 1440,
    category: "audio",
    platforms: ["Spotify", "Apple Podcasts", "Web Rádio"],
    icon: Music,
    description: "Capa quadrada para episódios e programas de áudio"
  },
  {
    id: "instagram_feed",
    name: "Feed Instagram & FB (4:5)",
    aspectRatio: "4:5",
    width: 1080,
    height: 1350,
    category: "video",
    platforms: ["Instagram", "Facebook"],
    icon: Square,
    description: "Formato vertical maximizado no feed do Instagram"
  }
];

interface PresetSelectorProps {
  selectedPresetId: string;
  onSelectPreset: (preset: CoverPreset) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPresetId,
  onSelectPreset,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Selecione o Formato da Capa
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {COVER_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = preset.id === selectedPresetId;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={cn(
                "flex flex-col text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden group",
                isSelected
                  ? "bg-primary/10 border-primary shadow-lg shadow-primary/10 ring-1 ring-primary"
                  : "bg-card/50 border-border/60 hover:bg-card hover:border-border"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn(
                  "p-2 rounded-xl transition-transform group-hover:scale-110",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground">
                  {preset.aspectRatio}
                </span>
              </div>
              <p className="text-xs font-bold text-foreground mb-0.5 truncate">
                {preset.name}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">
                {preset.description}
              </p>
              <div className="flex items-center gap-1 flex-wrap mt-auto">
                {preset.platforms.map((p) => (
                  <span
                    key={p}
                    className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-primary/5 text-primary border border-primary/10"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
