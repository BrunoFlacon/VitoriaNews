import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Trash2, Copy, Lock, Unlock, ArrowUp, ArrowDown,
  ChevronsUp, ChevronsDown, ZoomIn, ZoomOut, Maximize,
  RotateCcw
} from "lucide-react";
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
  content: string;
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
  onDeleteLayer?: (id: string) => void;
  onDuplicateLayer?: (id: string) => void;
  onMoveLayerOrder?: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  onToggleLock?: (id: string) => void;
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
  showSafeZones?: boolean;
  /** When true, clicks on the selected image layer add polygon points for cutout */
  cutoutMode?: boolean;
  /** Called when the user completes a polygon cutout. Receives the new image data URI */
  onCutoutComplete?: (newDataUri: string) => void;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  layerId: string | null;
}

const HANDLE_SIZE = 8;
const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize", e: "ew-resize",
  se: "nwse-resize", s: "ns-resize", sw: "nesw-resize", w: "ew-resize",
};

function getHandlePositions(x: number, y: number, w: number, h: number) {
  return {
    nw: { x: x, y: y },
    n: { x: x + w / 2, y: y },
    ne: { x: x + w, y: y },
    e: { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s: { x: x + w / 2, y: y + h },
    sw: { x: x, y: y + h },
    w: { x: x, y: y + h / 2 },
  };
}

export const CoverCanvasEngine: React.FC<CoverCanvasEngineProps> = ({
  width, height, aspectRatio, layers, selectedLayerId,
  onSelectLayer, onUpdateLayer, onDeleteLayer, onDuplicateLayer,
  onMoveLayerOrder, onToggleLock,
  backgroundColor = "#0F172A", backgroundImageUrl = null, showSafeZones = false,
  cutoutMode = false, onCutoutComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, x: 0, y: 0, w: 0, h: 0 });

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, layerId: null,
  });

  // Cutout polygon state
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const polygonPointsRef = useRef<{ x: number; y: number }[]>([]);
  const cutoutCompletingRef = useRef(false);

  // Cursor state
  const [currentCursor, setCurrentCursor] = useState("crosshair");

  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  // Preload images
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
          img.onerror = () => {};
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
        img.onerror = () => {};
      }
    }
  }, [layers, backgroundImageUrl, loadedImages]);

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  }, [width, height]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (backgroundImageUrl && loadedImages[backgroundImageUrl]) {
      ctx.drawImage(loadedImages[backgroundImageUrl], 0, 0, width, height);
    }

    // Render Layers
    layers.forEach((layer) => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity;

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
        const badgeColor =
          layer.badgeStyle === "live" ? "#EF4444" :
          layer.badgeStyle === "podcast" ? "#3B82F6" :
          layer.badgeStyle === "exclusive" ? "#A855F7" : "#F59E0B";
        ctx.fillStyle = badgeColor;
        ctx.beginPath();
        ctx.roundRect(layer.x, layer.y, layer.width, layer.height, 14);
        ctx.fill();
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
            ctx.lineTo(cx + Math.cos(((18 + i * 72) * Math.PI) / 180) * outerR, cy - Math.sin(((18 + i * 72) * Math.PI) / 180) * outerR);
            ctx.lineTo(cx + Math.cos(((54 + i * 72) * Math.PI) / 180) * innerR, cy - Math.sin(((54 + i * 72) * Math.PI) / 180) * innerR);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.roundRect(layer.x, layer.y, layer.width, layer.height, 12);
          ctx.fill();
        }
      } else if ((layer.type === "image" || layer.type === "logo") && loadedImages[layer.content]) {
        ctx.drawImage(loadedImages[layer.content], layer.x, layer.y, layer.width, layer.height);
      }
      ctx.restore();
    });

    // Safe zones
    if (showSafeZones) {
      ctx.save();
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      const topMargin = height * 0.15;
      const bottomMargin = height * 0.85;
      const sideMargin = width * 0.08;
      ctx.strokeRect(sideMargin, topMargin, width - sideMargin * 2, bottomMargin - topMargin);
      ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
      ctx.font = "bold 18px Inter, sans-serif";
      ctx.fillText("MARGEM SEGURA (REELS / SHORTS)", sideMargin + 10, topMargin + 25);
      ctx.restore();
    }

    // Selection overlay + resize handles
    const selected = layers.find((l) => l.id === selectedLayerId);
    if (selected && !isResizing) {
      ctx.save();
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(selected.x - 1, selected.y - 1, selected.width + 2, selected.height + 2);

      // Resize handles
      const handles = getHandlePositions(selected.x, selected.y, selected.width, selected.height);
      Object.values(handles).forEach((pos) => {
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.fillRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      });
      ctx.restore();
    }

    // Cutout polygon overlay
    if (cutoutMode && selectedLayerId && polygonPoints.length > 0) {
      const sel = layers.find((l) => l.id === selectedLayerId);
      if (sel && (sel.type === "image" || sel.type === "logo")) {
        ctx.save();

        // Semi-transparent dim overlay outside the polygon
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(sel.x, sel.y, sel.width, sel.height);

        // Clear the polygon area (show original image through)
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.moveTo(sel.x + polygonPoints[0].x, sel.y + polygonPoints[0].y);
        for (let i = 1; i < polygonPoints.length; i++) {
          ctx.lineTo(sel.x + polygonPoints[i].x, sel.y + polygonPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Restore compositing and draw polygon outline
        ctx.globalCompositeOperation = "source-over";

        // Draw the polygon path with dashed lines
        ctx.strokeStyle = "#00FF88";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sel.x + polygonPoints[0].x, sel.y + polygonPoints[0].y);
        for (let i = 1; i < polygonPoints.length; i++) {
          ctx.lineTo(sel.x + polygonPoints[i].x, sel.y + polygonPoints[i].y);
        }
        // Preview line to mouse cursor
        if (mousePos) {
          const selAtMouse = sel;
          const relMouseX = mousePos.x - selAtMouse.x;
          const relMouseY = mousePos.y - selAtMouse.y;
          ctx.lineTo(selAtMouse.x + relMouseX, selAtMouse.y + relMouseY);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw vertex dots
        polygonPoints.forEach((pt, i) => {
          ctx.beginPath();
          ctx.arc(sel.x + pt.x, sel.y + pt.y, i === 0 ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = i === 0 ? "#FF4444" : "#00FF88";
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // "Double-click to finish" hint
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `${polygonPoints.length} pontos — Duplo-clique para recortar`,
          sel.x + sel.width / 2,
          sel.y - 12,
        );

        ctx.restore();
      }
    }
  }, [width, height, layers, selectedLayerId, backgroundColor, backgroundImageUrl, showSafeZones, loadedImages, isResizing, cutoutMode, polygonPoints, mousePos]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  // ---- MOUSE HANDLERS ----

  const findLayerAtPoint = (mx: number, my: number): CanvasLayer | undefined => {
    return [...layers].reverse().find((l) =>
      l.visible && mx >= l.x && mx <= l.x + l.width && my >= l.y && my <= l.y + l.height
    );
  };

  const hitTestHandle = (mx: number, my: number): ResizeHandle | null => {
    if (!selectedLayerId) return null;
    const sel = layers.find((l) => l.id === selectedLayerId);
    if (!sel) return null;
    const handles = getHandlePositions(sel.x, sel.y, sel.width, sel.height);
    const threshold = HANDLE_SIZE + 4;
    for (const [key, pos] of Object.entries(handles) as [ResizeHandle, { x: number; y: number }][]) {
      if (Math.abs(mx - pos.x) <= threshold && Math.abs(my - pos.y) <= threshold) {
        return key;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) return; // right click handled separately
    setContextMenu({ visible: false, x: 0, y: 0, layerId: null });

    const { x: mx, y: my } = screenToCanvas(e.clientX, e.clientY);

    // Middle mouse = pan
    if (e.button === 1) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      panOffsetStart.current = { ...panOffset };
      return;
    }

    // Cutout mode: add polygon point to selected image layer
    if (cutoutMode && selectedLayerId) {
      const sel = layers.find((l) => l.id === selectedLayerId);
      if (sel && (sel.type === "image" || sel.type === "logo")) {
        // Convert canvas coords to image-relative coords
        const relX = mx - sel.x;
        const relY = my - sel.y;
        // Only add point if inside the image bounds (with small margin)
        if (relX >= -5 && relX <= sel.width + 5 && relY >= -5 && relY <= sel.height + 5) {
          const clampedX = Math.max(0, Math.min(sel.width, relX));
          const clampedY = Math.max(0, Math.min(sel.height, relY));

          // If near the first point, complete the polygon instead of adding
          if (polygonPoints.length >= 3) {
            const first = polygonPoints[0];
            const dist = Math.hypot(clampedX - first.x, clampedY - first.y);
            if (dist < 15) {
              completeCutout();
              return;
            }
          }

          setPolygonPoints((prev) => [...prev, { x: clampedX, y: clampedY }]);
        }
        return;
      }
    }

    // Check resize handles first
    const handle = hitTestHandle(mx, my);
    if (handle && selectedLayerId) {
      const sel = layers.find((l) => l.id === selectedLayerId);
      if (sel && !sel.locked) {
        setIsResizing(true);
        setResizeHandle(handle);
        resizeStart.current = { mouseX: mx, mouseY: my, x: sel.x, y: sel.y, w: sel.width, h: sel.height };
        return;
      }
    }

    // Check layer hit
    const clicked = findLayerAtPoint(mx, my);
    if (clicked) {
      onSelectLayer(clicked.id);
      if (!clicked.locked) {
        setIsDragging(true);
        setDragOffset({ x: mx - clicked.x, y: my - clicked.y });
      }
    } else {
      onSelectLayer(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x: mx, y: my } = screenToCanvas(e.clientX, e.clientY);

    // Track mouse for cutout polygon preview line
    if (cutoutMode && selectedLayerId) {
      setMousePos({ x: mx, y: my });
    }

    // Panning
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPanOffset({ x: panOffsetStart.current.x + dx, y: panOffsetStart.current.y + dy });
      return;
    }

    // Resizing
    if (isResizing && selectedLayerId && resizeHandle) {
      const s = resizeStart.current;
      const dx = mx - s.mouseX;
      const dy = my - s.mouseY;
      let newX = s.x, newY = s.y, newW = s.w, newH = s.h;

      if (resizeHandle.includes("e")) newW = Math.max(20, s.w + dx);
      if (resizeHandle.includes("w")) { newW = Math.max(20, s.w - dx); newX = s.x + dx; }
      if (resizeHandle.includes("s")) newH = Math.max(20, s.h + dy);
      if (resizeHandle.includes("n")) { newH = Math.max(20, s.h - dy); newY = s.y + dy; }

      onUpdateLayer(selectedLayerId, {
        x: Math.round(newX), y: Math.round(newY),
        width: Math.round(newW), height: Math.round(newH),
      });
      return;
    }

    // Dragging
    if (isDragging && selectedLayerId) {
      onUpdateLayer(selectedLayerId, {
        x: Math.round(mx - dragOffset.x),
        y: Math.round(my - dragOffset.y),
      });
      return;
    }

    // Cursor logic
    if (selectedLayerId) {
      const hh = hitTestHandle(mx, my);
      if (hh) {
        setCurrentCursor(HANDLE_CURSORS[hh]);
        return;
      }
    }
    const hovered = findLayerAtPoint(mx, my);
    if (hovered) {
      setCurrentCursor(hovered.locked ? "not-allowed" : "move");
    } else {
      setCurrentCursor("crosshair");
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setIsPanning(false);
  };

  // Right click context menu
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x: mx, y: my } = screenToCanvas(e.clientX, e.clientY);
    const clicked = findLayerAtPoint(mx, my);

    if (clicked) {
      onSelectLayer(clicked.id);
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, layerId: clicked.id });
    } else {
      setContextMenu({ visible: false, x: 0, y: 0, layerId: null });
    }
  };

  // Zoom with scroll wheel — registered via addEventListener to use { passive: false }
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(3, Math.max(0.2, prev + delta)));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Close context menu on click anywhere
  useEffect(() => {
    const close = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // Extracted cutout completion logic — callable from both mousedown and dblclick
  const completeCutout = useCallback(() => {
    if (cutoutCompletingRef.current) return; // prevent double-fire
    const points = polygonPointsRef.current;
    if (!cutoutMode || points.length < 3 || !selectedLayerId || !onCutoutComplete) return;
    const sel = layers.find((l) => l.id === selectedLayerId);
    if (!sel || (sel.type !== "image" && sel.type !== "logo")) return;

    cutoutCompletingRef.current = true;

    import("./image-tools/cutoutObject").then(({ clipImageToPolygon }) => {
      clipImageToPolygon(sel.content, points, sel.width, sel.height)
        .then((newDataUri) => {
          onCutoutComplete(newDataUri);
          setPolygonPoints([]);
          polygonPointsRef.current = [];
          setMousePos(null);
        })
        .catch((err) => {
          console.error("Cutout failed:", err);
          setPolygonPoints([]);
          polygonPointsRef.current = [];
          setMousePos(null);
        })
        .finally(() => {
          cutoutCompletingRef.current = false;
        });
    });
  }, [cutoutMode, selectedLayerId, layers, onCutoutComplete]);

  // Complete cutout polygon on double-click
  const handleDoubleClick = useCallback(() => {
    completeCutout();
  }, [completeCutout]);

  // Reset polygon when cutout mode is turned off
  useEffect(() => {
    if (!cutoutMode) {
      setPolygonPoints([]);
      polygonPointsRef.current = [];
      setMousePos(null);
    }
  }, [cutoutMode]);

  // Keep ref in sync with state
  useEffect(() => {
    polygonPointsRef.current = polygonPoints;
  }, [polygonPoints]);

  const selected = layers.find((l) => l.id === selectedLayerId);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-gray-900/90 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/10">
        <button
          className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors"
          onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-white/70 font-mono w-12 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors"
          onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-4 bg-white/20" />
        <button
          className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors"
          onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
          title="Reset Zoom"
        >
          <Maximize size={16} />
        </button>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="flex items-center justify-center w-full h-full overflow-hidden rounded-3xl bg-slate-950 border border-white/10 shadow-2xl"
      >
        <div
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.1s ease-out",
          }}
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            className="rounded-xl shadow-2xl border border-white/20"
            style={{
              cursor: cutoutMode ? "crosshair" : isPanning ? "grabbing" : currentCursor,
              maxWidth: "75vw",
              maxHeight: "70vh",
              width: "auto",
              height: "auto",
              aspectRatio: `${width}/${height}`,
            }}
          />
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu.visible && contextMenu.layerId && (
        <div
          className="fixed z-[9999] bg-gray-900 border border-white/15 rounded-xl shadow-2xl py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <CtxMenuItem
            icon={<Copy size={14} />}
            label="Duplicar"
            shortcut="Ctrl+D"
            onClick={() => { onDuplicateLayer?.(contextMenu.layerId!); setContextMenu({ ...contextMenu, visible: false }); }}
          />
          <CtxMenuItem
            icon={selected?.locked ? <Unlock size={14} /> : <Lock size={14} />}
            label={selected?.locked ? "Desbloquear" : "Bloquear"}
            onClick={() => { onToggleLock?.(contextMenu.layerId!); setContextMenu({ ...contextMenu, visible: false }); }}
          />
          <div className="h-px bg-white/10 my-1" />
          <CtxMenuItem
            icon={<ChevronsUp size={14} />}
            label="Trazer para frente"
            onClick={() => { onMoveLayerOrder?.(contextMenu.layerId!, "top"); setContextMenu({ ...contextMenu, visible: false }); }}
          />
          <CtxMenuItem
            icon={<ChevronsDown size={14} />}
            label="Enviar para tras"
            onClick={() => { onMoveLayerOrder?.(contextMenu.layerId!, "bottom"); setContextMenu({ ...contextMenu, visible: false }); }}
          />
          <CtxMenuItem
            icon={<ArrowUp size={14} />}
            label="Avancar"
            onClick={() => { onMoveLayerOrder?.(contextMenu.layerId!, "up"); setContextMenu({ ...contextMenu, visible: false }); }}
          />
          <CtxMenuItem
            icon={<ArrowDown size={14} />}
            label="Recuar"
            onClick={() => { onMoveLayerOrder?.(contextMenu.layerId!, "down"); setContextMenu({ ...contextMenu, visible: false }); }}
          />
          <div className="h-px bg-white/10 my-1" />
          <CtxMenuItem
            icon={<Trash2 size={14} />}
            label="Excluir"
            shortcut="Del"
            danger
            onClick={() => { onDeleteLayer?.(contextMenu.layerId!); setContextMenu({ ...contextMenu, visible: false }); }}
          />
        </div>
      )}
    </div>
  );
};

// Context menu item
function CtxMenuItem({
  icon, label, shortcut, danger, onClick,
}: {
  icon: React.ReactNode; label: string; shortcut?: string; danger?: boolean; onClick: () => void;
}) {
  return (
    <button
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
        danger ? "text-red-400 hover:bg-red-500/20" : "text-white/80 hover:bg-white/10"
      }`}
      onClick={onClick}
    >
      <span className="w-4 flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-white/30 text-[10px]">{shortcut}</span>}
    </button>
  );
}
