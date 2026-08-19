import React, { useRef, useEffect, useState, useCallback } from "react";
import { Move, Type, Image as LucideImage, Sparkles, Trash2, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
    if (backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = backgroundImageUrl;
      if (img.complete) {
        ctx.drawImage(img, 0, 0, width, height);
      }
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
        const badgeColor = layer.badgeStyle === "live" ? "#EF4444" : layer.badgeStyle === "podcast" ? "#3B82F6" : "#10B981";
        ctx.fillStyle = badgeColor;
        ctx.roundRect(layer.x, layer.y, layer.width, layer.height, 12);
        ctx.fill();

        // Badge Text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 28px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(layer.content.toUpperCase(), layer.x + layer.width / 2, layer.y + layer.height / 2);
      }

      ctx.restore();
    });

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
  }, [width, height, layers, selectedLayerId, backgroundColor, backgroundImageUrl]);

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
