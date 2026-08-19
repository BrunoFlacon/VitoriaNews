import React, { useRef, useEffect, useState, useCallback } from "react";
import { Move, Type, Image as LucideImage, Sparkles, Trash2, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown, Grid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUtils";

export interface CanvasLayer {
  id: string;
  name: string;
  type: "text" | "image" | "badge" | "shape" | "logo";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  content: string; // Text string or Image URL
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  badgeStyle?: "live" | "podcast" | "exclusive" | "news";
  shapeType?: "rectangle" | "circle" | "star" | "arrow" | "divider";
  shadowColor?: string;
  shadowBlur?: number;
}

interface CoverCanvasEngineProps {
  width: number;
  height: number;
  aspectRatio: string;
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
  showSafeZones?: boolean;
}

export const CoverCanvasEngine: React.FC<CoverCanvasEngineProps> = ({
  width,
  height,
  aspectRatio,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  backgroundColor = "#0F172A",
  backgroundImageUrl = null,
  showSafeZones = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  // Preload image assets into HTMLImageElement cache with clean public URLs
  useEffect(() => {
    layers.forEach((layer) => {
      if ((layer.type === "image" || layer.type === "logo") && layer.content) {
        const cleanUrl = getMediaUrl(layer.content);
        if (!loadedImages[cleanUrl]) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = cleanUrl;
          img.onload = () => {
            setLoadedImages((prev) => ({ ...prev, [cleanUrl]: img, [layer.content]: img }));
          };
          img.onerror = () => {
            // Ignore broken image to prevent loop
          };
        }
      }
    });

    if (backgroundImageUrl) {
      const cleanBgUrl = getMediaUrl(backgroundImageUrl);
      if (!loadedImages[cleanBgUrl]) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = cleanBgUrl;
        img.onload = () => {
          setLoadedImages((prev) => ({ ...prev, [cleanBgUrl]: img, [backgroundImageUrl]: img }));
        };
        img.onerror = () => {
          // Ignore broken bg
        };
      }
    }
  }, [layers, backgroundImageUrl, loadedImages]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Render Background Image if present
    if (backgroundImageUrl && loadedImages[backgroundImageUrl]) {
      ctx.drawImage(loadedImages[backgroundImageUrl], 0, 0, width, height);
    }

    // Render Layers in order
    layers.forEach((layer) => {
      if (!layer.visible) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      // Transform
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-(layer.x + layer.width / 2), -(layer.y + layer.height / 2));

      if (layer.type === "text") {
        ctx.font = `${layer.fontWeight || "bold"} ${layer.fontSize || 60}px ${layer.fontFamily || "Inter, sans-serif"}`;
        ctx.fillStyle = layer.color || "#FFFFFF";
        ctx.textBaseline = "top";

        if (layer.shadowColor) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur || 15;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 4;
        }

        ctx.fillText(layer.content, layer.x, layer.y);
      } else if (layer.type === "badge") {
        // Render Badge Background
        const badgeColor =
          layer.badgeStyle === "live"
            ? "#EF4444"
            : layer.badgeStyle === "podcast"
            ? "#3B82F6"
            : layer.badgeStyle === "exclusive"
            ? "#A855F7"
            : "#F59E0B";

        ctx.fillStyle = badgeColor;
        ctx.beginPath();
        ctx.roundRect(layer.x, layer.y, layer.width, layer.height, 14);
        ctx.fill();

        // Badge Text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 26px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(layer.content.toUpperCase(), layer.x + layer.width / 2, layer.y + layer.height / 2);
      } else if (layer.type === "shape") {
        ctx.fillStyle = layer.color || "#3B82F6";
        ctx.beginPath();

        if (layer.shapeType === "circle") {
          const radius = Math.min(layer.width, layer.height) / 2;
          ctx.arc(layer.x + layer.width / 2, layer.y + layer.height / 2, radius, 0, 2 * Math.PI);
          ctx.fill();
        } else if (layer.shapeType === "star") {
          const cx = layer.x + layer.width / 2;
          const cy = layer.y + layer.height / 2;
          const outerR = layer.width / 2;
          const innerR = outerR / 2;
          for (let i = 0; i < 5; i++) {
            ctx.lineTo(
              cx + Math.cos(((18 + i * 72) * Math.PI) / 180) * outerR,
              cy - Math.sin(((18 + i * 72) * Math.PI) / 180) * outerR
            );
            ctx.lineTo(
              cx + Math.cos(((54 + i * 72) * Math.PI) / 180) * innerR,
              cy - Math.sin(((54 + i * 72) * Math.PI) / 180) * innerR
            );
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Default Rectangle
          ctx.roundRect(layer.x, layer.y, layer.width, layer.height, 12);
          ctx.fill();
        }
      } else if ((layer.type === "image" || layer.type === "logo") && loadedImages[layer.content]) {
        ctx.drawImage(loadedImages[layer.content], layer.x, layer.y, layer.width, layer.height);
      }

      ctx.restore();
    });

    // Draw Safe Zone Grid if enabled
    if (showSafeZones) {
      ctx.save();
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);

      // Top and Bottom Safe Margins (for Shorts / Reels UI overlays)
      const topMargin = height * 0.15;
      const bottomMargin = height * 0.85;
      const sideMargin = width * 0.08;

      ctx.strokeRect(sideMargin, topMargin, width - sideMargin * 2, bottomMargin - topMargin);

      ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
      ctx.font = "bold 18px Inter, sans-serif";
      ctx.fillText("MARGEM SEGURA (REELS / SHORTS)", sideMargin + 10, topMargin + 25);
      ctx.restore();
    }

    // Draw Selection Overlay
    const selected = layers.find((l) => l.id === selectedLayerId);
    if (selected) {
      ctx.save();
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(selected.x - 4, selected.y - 4, selected.width + 8, selected.height + 8);
      ctx.restore();
    }
  }, [width, height, layers, selectedLayerId, backgroundColor, backgroundImageUrl, showSafeZones, loadedImages]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Find clicked layer (topmost first)
    const clickedLayer = [...layers].reverse().find((l) => {
      return (
        l.visible &&
        !l.locked &&
        mouseX >= l.x &&
        mouseX <= l.x + l.width &&
        mouseY >= l.y &&
        mouseY <= l.y + l.height
      );
    });

    if (clickedLayer) {
      onSelectLayer(clickedLayer.id);
      setIsDragging(true);
      setDragOffset({ x: mouseX - clickedLayer.x, y: mouseY - clickedLayer.y });
    } else {
      onSelectLayer(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedLayerId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    onUpdateLayer(selectedLayerId, {
      x: Math.round(mouseX - dragOffset.x),
      y: Math.round(mouseY - dragOffset.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-slate-950 p-6 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
      <div className="relative flex items-center justify-center max-w-full max-h-[70vh]">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl cursor-crosshair border border-white/20"
          style={{ aspectRatio }}
        />
      </div>
    </div>
  );
};
