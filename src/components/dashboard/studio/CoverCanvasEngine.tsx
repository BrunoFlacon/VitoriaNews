import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Trash2, Copy, Lock, Unlock, ArrowUp, ArrowDown,
  ChevronsUp, ChevronsDown,
} from "lucide-react";
import { getMediaUrl } from "@/utils/mediaUtils";
import { CanvasRulers } from "./CanvasRulers";

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
  // Text properties
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  // Shadow (works for text + shapes)
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  // Shape / Badge properties
  backgroundColor?: string;
  badgeStyle?: "live" | "podcast" | "exclusive" | "news";
  shapeType?: "rectangle" | "circle" | "star" | "arrow" | "divider" | "svg";
  /** Custom SVG path for rendering complex shapes on canvas */
  svgPath?: string;
  // Stroke / outline (shapes + text)
  strokeColor?: string;
  strokeWidth?: number;
  // Background gradient (for shape fill)
  gradient?: string;
  // Grouping
  groupId?: string;
  // Image adjustments
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hueRotate?: number;

  // ── Blend Mode ───────────────────────────────────────────────
  blendMode?: GlobalCompositeOperation;

  // ── Clipping Mask ────────────────────────────────────────────
  mask?: {
    type: 'rectangle' | 'ellipse' | 'inverted-ellipse';
  };

  // ── Color Overlay ────────────────────────────────────────────
  colorOverlay?: string;      // hex color, drawn on top with screen/overlay compositing
  colorOverlayOpacity?: number; // 0-1
  colorOverlayMode?: GlobalCompositeOperation;

  // ── Gradient Overlay ─────────────────────────────────────────
  gradientOverlay?: {
    angle: number;
    stops: { offset: number; color: string; opacity: number }[];
  };
}

interface CoverCanvasEngineProps {
  width: number;
  height: number;
  aspectRatio: string;
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  selectedLayerIds?: string[];
  onSelectLayer: (id: string | null) => void;
  onToggleLayerSelection?: (id: string, shiftKey?: boolean) => void;
  onUpdateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  onUpdateSelectedLayers?: (updates: Partial<CanvasLayer>) => void;
  onDeleteLayer?: (id: string) => void;
  onDuplicateLayer?: (id: string) => void;
  onMoveLayerOrder?: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  onToggleLock?: (id: string) => void;
  backgroundColor?: string;
  backgroundGradient?: string | null;
  backgroundImageUrl?: string | null;
  showSafeZones?: boolean;
  showRulers?: boolean;
  clipContent?: boolean;
  /** When true, clicks on the selected image layer add polygon points for cutout */
  cutoutMode?: boolean;
  /** Called when the user completes a polygon cutout. Receives the new image data URI */
  onCutoutComplete?: (newDataUri: string) => void;
  /** Called when zoom or pan changes (e.g. via mouse wheel) */
  onZoomChange?: (zoom: number, panOffset: { x: number; y: number }) => void;
  /** Called on double-click of a text layer — provides screen-space coordinates for inline editing */
  onTextDoubleClick?: (layerId: string, screenX: number, screenY: number, displayW: number, displayH: number, displayScale: number) => void;
  /** When true, clicking/dragging on an image layer erases pixels */
  eraserMode?: boolean;
  eraserSize?: number;
  eraserSoftness?: number;
  eraserTolerance?: number;
  eraserType?: 'basic' | 'magic' | 'pixel';
  /** Called when eraser finishes — receives the new image data URI */
  onEraseComplete?: (newDataUri: string) => void;
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

/** A single alignment guide line drawn across the viewport */
export interface SnapGuide {
  /** "h" = horizontal, "v" = vertical */
  axis: "h" | "v";
  /** Position in canvas coordinates */
  pos: number;
  /** Which edges/centers this guide represents (for labeling) */
  label?: string;
}

export interface CoverCanvasEngineRef {
  exportAsDataURL: () => string;
  zoom: number;
  setZoom: (fn: (prev: number) => number) => void;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;
  /** Auto-scale zoom so the canvas fits inside the container with padding */
  fitToScreen: () => void;
}

export const CoverCanvasEngine = forwardRef<CoverCanvasEngineRef, CoverCanvasEngineProps>(({
  width, height, aspectRatio, layers, selectedLayerId, selectedLayerIds = [],
  onSelectLayer, onToggleLayerSelection, onUpdateLayer, onUpdateSelectedLayers,
  onDeleteLayer, onDuplicateLayer,
  onMoveLayerOrder, onToggleLock,
  backgroundColor = "#0F172A", backgroundGradient = null, backgroundImageUrl = null, showSafeZones = false,
  showRulers = false,
  clipContent = false, cutoutMode = false, onCutoutComplete, onZoomChange, onTextDoubleClick,
  eraserMode = false, eraserSize = 20, eraserSoftness = 50, eraserTolerance = 30, eraserType = 'basic', onEraseComplete,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Container dimensions (for rulers)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Cursor position in canvas coords (for ruler crosshair) — throttled via rAF
  const [cursorCanvasPos, setCursorCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const cursorRafRef = useRef<number>(0);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);

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

  // Marquee selection state
  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 });
  const [marqueeEnd, setMarqueeEnd] = useState({ x: 0, y: 0 });

  // Multi-select drag state
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({});

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, layerId: null,
  });

  // Cutout polygon state
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const polygonPointsRef = useRef<{ x: number; y: number }[]>([]);
  const cutoutCompletingRef = useRef(false);

  // Eraser brush state
  const [eraserStroke, setEraserStroke] = useState<{ x: number; y: number }[]>([]);
  const isErasingRef = useRef(false);
  const eraserDebounceRef = useRef<number>(0);

  // Cursor state
  const [currentCursor, setCurrentCursor] = useState("crosshair");

  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  // Snap guide lines — shown while dragging or resizing
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  /** Wrap text into lines that fit within a given width */
  const wrapText = useCallback((ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const paragraphs = text.split('\n');
    const lines: string[] = [];

    for (const para of paragraphs) {
      if (para === '') { lines.push(''); continue; }
      const words = para.split(/\s+/);
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  }, []);

  /** Cached canvas bounding rect — refreshed once per mouse event, avoids repeated getBoundingClientRect */
  const canvasRectRef = useRef<DOMRect | null>(null);

  /** Snap threshold in canvas pixels (how close an edge/center must be to snap) */
  const SNAP_THRESHOLD = 5;

  // Preload images
  const loadingImages = useRef<Record<string, boolean>>({});

  useEffect(() => {
    layers.forEach((layer) => {
      if ((layer.type === "image" || layer.type === "logo") && layer.content) {
        const cleanUrl = getMediaUrl(layer.content);
        if (!loadedImages[cleanUrl] && !loadingImages.current[cleanUrl]) {
          loadingImages.current[cleanUrl] = true;
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = cleanUrl;
          img.onload = () => {
            setLoadedImages((prev) => ({ ...prev, [cleanUrl]: img, [layer.content]: img }));
          };
          img.onerror = () => {
             loadingImages.current[cleanUrl] = false;
          };
        }
      }
    });
    if (backgroundImageUrl) {
      const cleanBgUrl = getMediaUrl(backgroundImageUrl);
      if (!loadedImages[cleanBgUrl] && !loadingImages.current[cleanBgUrl]) {
        loadingImages.current[cleanBgUrl] = true;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = cleanBgUrl;
        img.onload = () => {
          setLoadedImages((prev) => ({ ...prev, [cleanBgUrl]: img, [backgroundImageUrl]: img }));
        };
        img.onerror = () => {
           loadingImages.current[cleanBgUrl] = false;
        };
      }
    }
  }, [layers, backgroundImageUrl]);

  // Convert screen coords to canvas coords — uses cached rect when available
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    // Use cached rect if available (set by mouse handlers), otherwise read once
    const rect = canvasRectRef.current || canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  }, [width, height]);

  // Function to draw only the layers and background (used for rendering and exporting)
  const drawCanvasContent = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);

    // Background
    if (backgroundGradient) {
      try {
        // Parse CSS gradient string like "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        const gradMatch = backgroundGradient.match(/linear-gradient\((.+?)\)/);
        if (gradMatch) {
          const parts = gradMatch[1].split(',').map(s => s.trim());
          const angle = parseFloat(parts[0]) || 135;
          const rad = (angle - 90) * (Math.PI / 180);
          const x1 = 0.5 - Math.cos(rad) * 0.5;
          const y1 = 0.5 - Math.sin(rad) * 0.5;
          const x2 = 0.5 + Math.cos(rad) * 0.5;
          const y2 = 0.5 + Math.sin(rad) * 0.5;
          const g = ctx.createLinearGradient(x1 * width, y1 * height, x2 * width, y2 * height);
          for (let i = 1; i < parts.length; i++) {
            const colorMatch = parts[i].match(/(#[0-9a-fA-F]{3,8})/);
            if (colorMatch) g.addColorStop((i - 1) / Math.max(1, parts.length - 2), colorMatch[1]);
          }
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = backgroundColor;
        }
      } catch {
        ctx.fillStyle = backgroundColor;
      }
    } else {
      ctx.fillStyle = backgroundColor;
    }
    ctx.fillRect(0, 0, width, height);

    if (backgroundImageUrl && loadedImages[backgroundImageUrl]) {
      ctx.drawImage(loadedImages[backgroundImageUrl], 0, 0, width, height);
    }

    // Render Layers
    layers.forEach((layer) => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity;

      // ── Apply blend mode (per-layer compositing) ──
      if (layer.blendMode && layer.blendMode !== 'source-over') {
        ctx.globalCompositeOperation = layer.blendMode;
      }

      // Clip content to canvas bounds when clipContent is enabled
      if (clipContent) {
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.clip();
      }

      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-(layer.x + layer.width / 2), -(layer.y + layer.height / 2));

      // ── Apply clipping mask ──
      if (layer.mask) {
        ctx.beginPath();
        if (layer.mask.type === 'ellipse') {
          const rx = layer.width / 2;
          const ry = layer.height / 2;
          ctx.ellipse(layer.x + rx, layer.y + ry, rx, ry, 0, 0, Math.PI * 2);
        } else if (layer.mask.type === 'inverted-ellipse') {
          // Draw full canvas rect then cut out ellipse (inverted mask) using evenodd rule
          ctx.rect(layer.x - 10, layer.y - 10, layer.width + 20, layer.height + 20);
          const rx = layer.width / 2;
          const ry = layer.height / 2;
          ctx.ellipse(layer.x + rx, layer.y + ry, rx, ry, 0, 0, Math.PI * 2);
        } else {
          // rectangle mask
          ctx.rect(layer.x, layer.y, layer.width, layer.height);
        }
        // Use evenodd for inverted-ellipse to cut the inner ellipse out of the outer rect
        ctx.clip(layer.mask.type === 'inverted-ellipse' ? 'evenodd' : undefined);
      }

      if (layer.type === "text") {
        const fontSize = layer.fontSize || 60;
        const fontStr = `${layer.fontWeight || "bold"} ${fontSize}px ${layer.fontFamily || "Inter, sans-serif"}`;
        ctx.font = fontStr;
        ctx.fillStyle = layer.color || "#FFFFFF";
        ctx.textBaseline = "top";

        // Shadow
        if (layer.shadowColor && (layer.shadowBlur || 0) > 0) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur || 15;
          ctx.shadowOffsetX = layer.shadowOffsetX ?? 4;
          ctx.shadowOffsetY = layer.shadowOffsetY ?? 4;
        }

        // Word-wrap text into lines
        const lineHeight = fontSize * 1.2;
        const maxLineWidth = layer.width || 400;
        const lines = wrapText(ctx, layer.content || '', maxLineWidth);
        const textAlign = layer.textAlign || 'left';

        lines.forEach((line, i) => {
          const yPos = layer.y + i * lineHeight;
          // Stop drawing if we overflow the layer height
          if (yPos > layer.y + layer.height) return;

          let xPos = layer.x;
          if (textAlign === 'center') xPos = layer.x + layer.width / 2;
          else if (textAlign === 'right') xPos = layer.x + layer.width;

          // Text stroke (outline)
          if (layer.strokeColor && (layer.strokeWidth || 0) > 0) {
            ctx.strokeStyle = layer.strokeColor;
            ctx.lineWidth = layer.strokeWidth || 2;
            ctx.lineJoin = "round";
            ctx.textAlign = textAlign;
            ctx.strokeText(line, xPos, yPos, maxLineWidth);
          }

          ctx.textAlign = textAlign;
          ctx.fillText(line, xPos, yPos, maxLineWidth);
        });

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
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
        // Shadow
        if (layer.shadowColor && (layer.shadowBlur || 0) > 0) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur || 15;
          ctx.shadowOffsetX = layer.shadowOffsetX ?? 4;
          ctx.shadowOffsetY = layer.shadowOffsetY ?? 4;
        }

        // Fill: gradient or solid color
        if (layer.gradient) {
          try {
            const grad = JSON.parse(layer.gradient);
            const g = ctx.createLinearGradient(layer.x, layer.y, layer.x + layer.width, layer.y + layer.height);
            grad.stops.forEach((s: { offset: number; color: string }) => g.addColorStop(s.offset, s.color));
            ctx.fillStyle = g;
          } catch {
            ctx.fillStyle = layer.color || "#3B82F6";
          }
        } else {
          ctx.fillStyle = layer.color || "#3B82F6";
        }

        ctx.beginPath();

        if (layer.shapeType === "svg" && layer.svgPath) {
          // ── SVG path shape: parse the path, scale to layer bounds ──
          try {
            const path2d = new Path2D(layer.svgPath);
            // The SVG paths are defined in a 64x64 viewBox. We scale to layer bounds.
            const scaleX = layer.width / 64;
            const scaleY = layer.height / 64;
            ctx.save();
            ctx.translate(layer.x, layer.y);
            ctx.scale(scaleX, scaleY);
            ctx.fill(path2d);
            // Stroke if needed
            if (layer.strokeColor && (layer.strokeWidth || 0) > 0) {
              ctx.strokeStyle = layer.strokeColor;
              ctx.lineWidth = (layer.strokeWidth || 2) / Math.min(scaleX, scaleY);
              ctx.shadowColor = "transparent";
              ctx.shadowBlur = 0;
              ctx.stroke(path2d);
            }
            ctx.restore();
          } catch {
            // Fallback to rounded rectangle
            ctx.roundRect(layer.x, layer.y, layer.width, layer.height, 12);
            ctx.fill();
          }
        } else if (layer.shapeType === "circle") {
          const radius = Math.min(layer.width, layer.height) / 2;
          ctx.arc(layer.x + layer.width / 2, layer.y + layer.height / 2, radius, 0, 2 * Math.PI);
          ctx.fill();
          // Stroke
          if (layer.strokeColor && (layer.strokeWidth || 0) > 0) {
            ctx.strokeStyle = layer.strokeColor;
            ctx.lineWidth = layer.strokeWidth || 2;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(layer.x + layer.width / 2, layer.y + layer.height / 2, radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
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
          if (layer.strokeColor && (layer.strokeWidth || 0) > 0) {
            ctx.strokeStyle = layer.strokeColor;
            ctx.lineWidth = layer.strokeWidth || 2;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
        } else {
          ctx.roundRect(layer.x, layer.y, layer.width, layer.height, 12);
          ctx.fill();
          if (layer.strokeColor && (layer.strokeWidth || 0) > 0) {
            ctx.strokeStyle = layer.strokeColor;
            ctx.lineWidth = layer.strokeWidth || 2;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.roundRect(layer.x, layer.y, layer.width, layer.height, 12);
            ctx.stroke();
          }
        }

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else if ((layer.type === "image" || layer.type === "logo") && loadedImages[layer.content]) {
        // Apply image adjustments via CSS-like filters
        const filters: string[] = [];
        if (layer.brightness !== undefined && layer.brightness !== 100) filters.push(`brightness(${layer.brightness}%)`);
        if (layer.contrast !== undefined && layer.contrast !== 100) filters.push(`contrast(${layer.contrast}%)`);
        if (layer.saturation !== undefined && layer.saturation !== 100) filters.push(`saturate(${layer.saturation}%)`);
        if (layer.hueRotate !== undefined && layer.hueRotate !== 0) filters.push(`hue-rotate(${layer.hueRotate}deg)`);
        if (filters.length > 0) ctx.filter = filters.join(' ');

        ctx.drawImage(loadedImages[layer.content], layer.x, layer.y, layer.width, layer.height);

        // Reset filter
        if (filters.length > 0) ctx.filter = 'none';
      }

      // ── Color Overlay (solid color overlay on top of layer content) ──
      if (layer.colorOverlay && (layer.colorOverlayOpacity ?? 0) > 0) {
        ctx.save();
        // Reset blend mode so the overlay uses its own
        ctx.globalCompositeOperation = layer.colorOverlayMode || 'overlay';
        ctx.globalAlpha = (layer.opacity ?? 1) * (layer.colorOverlayOpacity ?? 0.5);
        ctx.fillStyle = layer.colorOverlay;
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
        ctx.restore();
      }

      // ── Gradient Overlay ──
      if (layer.gradientOverlay && layer.gradientOverlay.stops.length >= 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const angle = layer.gradientOverlay.angle ?? 135;
        const rad = (angle - 90) * (Math.PI / 180);
        const lx = layer.x;
        const ly = layer.y;
        const lw = layer.width;
        const lh = layer.height;
        const x1 = lx + lw / 2 - Math.cos(rad) * lw / 2;
        const y1 = ly + lh / 2 - Math.sin(rad) * lh / 2;
        const x2 = lx + lw / 2 + Math.cos(rad) * lw / 2;
        const y2 = ly + lh / 2 + Math.sin(rad) * lh / 2;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        layer.gradientOverlay.stops.forEach((s) => {
          // Parse hex color to rgba with per-stop opacity
          const hex = s.color;
          const hexClean = hex.replace('#', '');
          const r = parseInt(hexClean.substring(0, 2), 16) || 0;
          const g = parseInt(hexClean.substring(2, 4), 16) || 0;
          const b = parseInt(hexClean.substring(4, 6), 16) || 0;
          grad.addColorStop(s.offset, `rgba(${r}, ${g}, ${b}, ${s.opacity})`);
        });
        ctx.globalAlpha = layer.opacity ?? 1;
        ctx.fillStyle = grad;
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
        ctx.restore();
      }

      ctx.restore();
    });
  }, [width, height, backgroundColor, backgroundGradient, backgroundImageUrl, loadedImages, layers, clipContent]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawCanvasContent(ctx);

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
    // Multi-select: draw outlines around all selected layers
    if (selectedLayerIds.length > 1 && !isResizing) {
      ctx.save();
      selectedLayerIds.forEach((sid) => {
        const sel = layers.find((l) => l.id === sid);
        if (sel) {
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(sel.x - 1, sel.y - 1, sel.width + 2, sel.height + 2);
        }
      });
      // Draw resize handles only on the primary selected layer
      const primary = layers.find((l) => l.id === selectedLayerId);
      if (primary) {
        ctx.setLineDash([]);
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.strokeRect(primary.x - 1, primary.y - 1, primary.width + 2, primary.height + 2);
        const handles = getHandlePositions(primary.x, primary.y, primary.width, primary.height);
        Object.values(handles).forEach((pos) => {
          ctx.fillStyle = "#FFFFFF";
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 2;
          ctx.fillRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        });
      }
      ctx.restore();
    } else {
      // Single selection (original behavior)
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
    }

    // Marquee selection rectangle
    if (isMarquee) {
      ctx.save();
      const mx1 = Math.min(marqueeStart.x, marqueeEnd.x);
      const my1 = Math.min(marqueeStart.y, marqueeEnd.y);
      const mw = Math.abs(marqueeEnd.x - marqueeStart.x);
      const mh = Math.abs(marqueeEnd.y - marqueeStart.y);
      ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
      ctx.fillRect(mx1, my1, mw, mh);
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(mx1, my1, mw, mh);
      ctx.setLineDash([]);
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

    // ── Eraser brush preview (shows stroke being erased) ──────
    if (eraserMode && eraserStroke.length > 0 && selectedLayerId) {
      const sel = layers.find((l) => l.id === selectedLayerId);
      if (sel && (sel.type === 'image' || sel.type === 'logo')) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = eraserSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(sel.x + eraserStroke[0].x, sel.y + eraserStroke[0].y);
        for (let i = 1; i < eraserStroke.length; i++) {
          ctx.lineTo(sel.x + eraserStroke[i].x, sel.y + eraserStroke[i].y);
        }
        ctx.stroke();
        // Draw brush circle at the last point
        const last = eraserStroke[eraserStroke.length - 1];
        ctx.beginPath();
        ctx.arc(sel.x + last.x, sel.y + last.y, eraserSize / 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Eraser cursor circle (follows mouse) ──────────
    if (eraserMode && mousePos && selectedLayerId) {
      const sel = layers.find((l) => l.id === selectedLayerId);
      if (sel && (sel.type === 'image' || sel.type === 'logo')) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, eraserSize / 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        // Crosshair in center
        ctx.beginPath();
        ctx.moveTo(mousePos.x - 4, mousePos.y);
        ctx.lineTo(mousePos.x + 4, mousePos.y);
        ctx.moveTo(mousePos.x, mousePos.y - 4);
        ctx.lineTo(mousePos.x, mousePos.y + 4);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Snap alignment guide lines (drawn over everything) ──────────
    if (snapGuides.length > 0) {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      const SNAP_COLOR = "#3B82F6"; // bright blue
      snapGuides.forEach((g) => {
        ctx.strokeStyle = SNAP_COLOR;
        ctx.beginPath();
        if (g.axis === "v") {
          // Vertical line at g.pos across the full canvas height
          ctx.moveTo(g.pos, 0);
          ctx.lineTo(g.pos, height);
        } else {
          // Horizontal line at g.pos across the full canvas width
          ctx.moveTo(0, g.pos);
          ctx.lineTo(width, g.pos);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [width, height, selectedLayerId, selectedLayerIds, showSafeZones, isResizing, cutoutMode, clipContent, polygonPoints, mousePos, drawCanvasContent, layers, snapGuides, isMarquee, marqueeStart, marqueeEnd, eraserMode, eraserStroke, eraserSize]);

  // Render canvas — wait for fonts to be ready so canvas text renders correctly
  useEffect(() => {
    document.fonts.ready.then(() => renderCanvas());
  }, [renderCanvas]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    exportAsDataURL: () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return "";
      drawCanvasContent(ctx);
      return offscreen.toDataURL("image/png");
    },
    get zoom() { return zoom; },
    setZoom,
    get panOffset() { return panOffset; },
    setPanOffset,
    fitToScreen,
  }));

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

    // Cache canvas rect once per mouse event to avoid repeated getBoundingClientRect
    canvasRectRef.current = canvasRef.current?.getBoundingClientRect() ?? null;

    const { x: mx, y: my } = screenToCanvas(e.clientX, e.clientY);

    // Middle mouse = pan
    if (e.button === 1) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      panOffsetStart.current = { ...panOffset };
      return;
    }

    // Eraser mode: erase pixels on the selected image layer
    if (eraserMode && selectedLayerId) {
      const sel = layers.find((l) => l.id === selectedLayerId);
      if (sel && (sel.type === 'image' || sel.type === 'logo') && !sel.locked) {
        isErasingRef.current = true;
        const relX = mx - sel.x;
        const relY = my - sel.y;
        setEraserStroke([{ x: relX, y: relY }]);
        return;
      }
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
      // Shift+Click → toggle layer in multi-selection
      if (e.shiftKey && onToggleLayerSelection) {
        onToggleLayerSelection(clicked.id, true);
      } else {
        onSelectLayer(clicked.id);
        // If clicking a layer already in multi-selection, keep the selection for drag
        if (selectedLayerIds.includes(clicked.id) && selectedLayerIds.length > 1) {
          // Don't change selection — allow drag of entire group
        }
      }
      if (!clicked.locked) {
        setIsDragging(true);
        if (selectedLayerIds.length > 1 && selectedLayerIds.includes(clicked.id) && onUpdateSelectedLayers) {
          // Multi-select drag: compute offsets for all selected layers
          const offsets: Record<string, { x: number; y: number }> = {};
          selectedLayerIds.forEach((id) => {
            const l = layers.find((ly) => ly.id === id);
            if (l) offsets[id] = { x: mx - l.x, y: my - l.y };
          });
          setDragOffsets(offsets);
        } else {
          setDragOffset({ x: mx - clicked.x, y: my - clicked.y });
          setDragOffsets({});
        }
      }
    } else {
      // Click on empty canvas — start marquee selection or deselect
      if (e.shiftKey && onToggleLayerSelection) {
        // Shift+click on empty area = marquee start
        setIsMarquee(true);
        setMarqueeStart({ x: mx, y: my });
        setMarqueeEnd({ x: mx, y: my });
      } else {
        onSelectLayer(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Refresh cached rect on first move of a drag/resize sequence
    if (isDragging || isResizing) {
      canvasRectRef.current = canvasRef.current?.getBoundingClientRect() ?? null;
    }
    const { x: mx, y: my } = screenToCanvas(e.clientX, e.clientY);

    // Update cursor canvas position for rulers (throttled via rAF)
    if (showRulers) {
      pendingCursorRef.current = { x: mx, y: my };
      if (!cursorRafRef.current) {
        cursorRafRef.current = requestAnimationFrame(() => {
          cursorRafRef.current = 0;
          if (pendingCursorRef.current) {
            setCursorCanvasPos(pendingCursorRef.current);
          }
        });
      }
    }

    // Track mouse for cutout polygon preview line
    if (cutoutMode && selectedLayerId) {
      setMousePos({ x: mx, y: my });
    }

    // Track mouse for eraser cursor
    if (eraserMode && selectedLayerId) {
      setMousePos({ x: mx, y: my });
    }

    // Track eraser brush stroke
    if (eraserMode && isErasingRef.current && selectedLayerId) {
      const sel = layers.find((l) => l.id === selectedLayerId);
      if (sel) {
        const relX = mx - sel.x;
        const relY = my - sel.y;
        setEraserStroke((prev) => [...prev, { x: relX, y: relY }]);
      }
      return;
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

      // Apply snap guides
      const { snappedX, snappedY, guides } = computeSnapLines(selectedLayerId, newX, newY, newW, newH);
      setSnapGuides(guides);

      onUpdateLayer(selectedLayerId, {
        x: Math.round(snappedX), y: Math.round(snappedY),
        width: Math.round(newW), height: Math.round(newH),
      });
      return;
    }

    // Marquee selection
    if (isMarquee) {
      setMarqueeEnd({ x: mx, y: my });
      return;
    }

    // Dragging — single or multi-select
    if (isDragging && selectedLayerId) {
      // Multi-select drag
      if (Object.keys(dragOffsets).length > 1 && onUpdateSelectedLayers) {
        const updates: Record<string, { x: number; y: number }> = {};
        Object.entries(dragOffsets).forEach(([id, offset]) => {
          const newX = mx - offset.x;
          const newY = my - offset.y;
          updates[id] = { x: Math.round(newX), y: Math.round(newY) };
        });
        // Apply snap to the "anchor" layer (the one being directly dragged)
        const anchorId = selectedLayerIds.find((id) => dragOffsets[id]) || selectedLayerId;
        const anchorOff = dragOffsets[anchorId];
        if (anchorOff) {
          const rawAX = mx - anchorOff.x;
          const rawAY = my - anchorOff.y;
          const anchorLayer = layers.find((l) => l.id === anchorId);
          const { snappedX, snappedY, guides } = computeSnapLines(anchorId, rawAX, rawAY, anchorLayer?.width ?? 0, anchorLayer?.height ?? 0);
          setSnapGuides(guides);
          const dx = snappedX - rawAX;
          const dy = snappedY - rawAY;
          Object.entries(updates).forEach(([id, pos]) => {
            updates[id] = { x: Math.round(pos.x + dx), y: Math.round(pos.y + dy) };
          });
        }
        // Batch update all selected layers
        layers.forEach((l) => {
          if (updates[l.id]) {
            onUpdateLayer(l.id, { x: updates[l.id].x, y: updates[l.id].y });
          }
        });
      } else {
        // Single layer drag
        const rawX = mx - dragOffset.x;
        const rawY = my - dragOffset.y;
        const sel = layers.find((l) => l.id === selectedLayerId);
        const nw = sel?.width ?? 0;
        const nh = sel?.height ?? 0;

        // Apply snap guides
        const { snappedX, snappedY, guides } = computeSnapLines(selectedLayerId, rawX, rawY, nw, nh);
        setSnapGuides(guides);

        onUpdateLayer(selectedLayerId, {
          x: Math.round(snappedX),
          y: Math.round(snappedY),
        });
      }
      return;
    }

    // Cursor logic
    if (eraserMode) {
      setCurrentCursor('none'); // We'll draw a custom cursor
    } else if (selectedLayerId) {
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
    // Complete eraser stroke
    if (eraserMode && isErasingRef.current && selectedLayerId && onEraseComplete) {
      isErasingRef.current = false;
      setEraserStroke((stroke) => {
        if (stroke.length > 0) {
          const sel = layers.find((l) => l.id === selectedLayerId);
          if (sel && (sel.type === 'image' || sel.type === 'logo')) {
            // Apply eraser asynchronously
            import("./image-tools/eraserTool").then(({ eraseBrushStroke }) => {
              eraseBrushStroke(sel.content, stroke, sel.width, sel.height, {
                mode: eraserType,
                size: eraserSize,
                softness: eraserSoftness,
                tolerance: eraserTolerance,
              }).then((newDataUri) => {
                onEraseComplete(newDataUri);
              }).catch((err) => {
                console.error("Eraser failed:", err);
              });
            });
          }
        }
        return [];
      });
    }
    // Complete marquee selection
    if (isMarquee && onToggleLayerSelection) {
      const x1 = Math.min(marqueeStart.x, marqueeEnd.x);
      const y1 = Math.min(marqueeStart.y, marqueeEnd.y);
      const x2 = Math.max(marqueeStart.x, marqueeEnd.x);
      const y2 = Math.max(marqueeStart.y, marqueeEnd.y);
      // Only select if marquee has meaningful size
      if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5) {
        // Deselect first (without shift)
        onSelectLayer(null);
        // Find all visible, unlocked layers inside the marquee
        layers.forEach((l) => {
          if (!l.visible || l.locked) return;
          const lx1 = l.x, ly1 = l.y;
          const lx2 = l.x + l.width, ly2 = l.y + l.height;
          // Check if layer intersects the marquee rectangle
          if (lx1 < x2 && lx2 > x1 && ly1 < y2 && ly2 > y1) {
            onToggleLayerSelection(l.id, true);
          }
        });
      }
    }

    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setIsPanning(false);
    setIsMarquee(false);
    setDragOffsets({});
    setSnapGuides([]); // clear alignment guides
    // Cancel pending cursor rAF and clear
    if (cursorRafRef.current) {
      cancelAnimationFrame(cursorRafRef.current);
      cursorRafRef.current = 0;
    }
    pendingCursorRef.current = null;
    setCursorCanvasPos(null);
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

  // Zoom with scroll wheel / Pan with Shift+wheel — registered via addEventListener to use { passive: false }
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        // Pan with Shift+wheel
        setPanOffset((prev) => ({
          x: prev.x - e.deltaY,
          y: prev.y - e.deltaX,
        }));
      } else {
        // Zoom with scroll wheel
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((prev) => Math.min(3, Math.max(0.2, prev + delta)));
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Notify parent of zoom changes — use requestAnimationFrame to defer and
  // avoid setState-during-render warnings when the parent updates in response.
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      onZoomChangeRef.current?.(zoom, panOffset);
    });
    return () => cancelAnimationFrame(raf);
  }, [zoom, panOffset]);

  // Track container dimensions for rulers — use rAF to defer setState after ResizeObserver read
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId: number;
    const update = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setContainerSize({ width: el.clientWidth, height: el.clientHeight });
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
  }, []);

  // Close context menu on click anywhere
  useEffect(() => {
    const close = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // Escape key: cancel cutout mode, deselect layer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (cutoutMode) {
          setPolygonPoints([]);
          polygonPointsRef.current = [];
          setMousePos(null);
        }
        onSelectLayer(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cutoutMode, onSelectLayer]);

  // Ctrl+A: select all layers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && onToggleLayerSelection) {
        e.preventDefault();
        // Select all visible, unlocked layers
        const selectable = layers.filter((l) => l.visible && !l.locked);
        if (selectable.length > 0) {
          onSelectLayer(selectable[selectable.length - 1].id);
          selectable.forEach((l) => onToggleLayerSelection(l.id, true));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [layers, onSelectLayer, onToggleLayerSelection]);

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

  // ── Snap / alignment guides ─────────────────────────────────────────
  // When dragging or resizing, compute snap positions against:
  //  - canvas edges (left, right, top, bottom) and center
  //  - other visible layers' edges and centers
  const computeSnapLines = useCallback(
    (
      movingId: string,
      nx: number, ny: number, nw: number, nh: number,
    ): { snappedX: number; snappedY: number; guides: SnapGuide[] } => {
      const cx = nx + nw / 2;
      const cy = ny + nh / 2;
      const cxEnd = nx + nw;
      const cyEnd = ny + nh;

      // Build reference points from canvas + other layers
      const hRefs: { pos: number; label: string }[] = [
        { pos: 0, label: "Canvas esquerda" },
        { pos: width / 2, label: "Canvas centro" },
        { pos: width, label: "Canvas direita" },
      ];
      const vRefs: { pos: number; label: string }[] = [
        { pos: 0, label: "Canvas topo" },
        { pos: height / 2, label: "Canvas centro" },
        { pos: height, label: "Canvas baixo" },
      ];

      layers.forEach((l) => {
        if (l.id === movingId || !l.visible) return;
        const lcx = l.x + l.width / 2;
        const lcy = l.y + l.height / 2;
        hRefs.push(
          { pos: l.x, label: `${l.name} esquerda` },
          { pos: lcx, label: `${l.name} centro` },
          { pos: l.x + l.width, label: `${l.name} direita` },
        );
        vRefs.push(
          { pos: l.y, label: `${l.name} topo` },
          { pos: lcy, label: `${l.name} centro` },
          { pos: l.y + l.height, label: `${l.name} baixo` },
        );
      });

      const guides: SnapGuide[] = [];
      let snappedX = nx;
      let snappedY = ny;

      // Horizontal snapping (x-axis alignment — vertical guide lines)
      const xChecks = [
        { moving: nx, label: "esquerda" },           // left edge
        { moving: cx, label: "centro" },             // center
        { moving: cxEnd, label: "direita" },         // right edge
      ];
      let bestXDist = SNAP_THRESHOLD;
      for (const ref of hRefs) {
        for (const xc of xChecks) {
          const dist = Math.abs(xc.moving - ref.pos);
          if (dist < bestXDist) {
            bestXDist = dist;
            const delta = ref.pos - xc.moving;
            snappedX = nx + delta;
            guides.length = 0; // clear previous x-guides
            guides.push({ axis: "v", pos: ref.pos, label: ref.label });
          } else if (Math.abs(dist - bestXDist) < 0.001) {
            guides.push({ axis: "v", pos: ref.pos, label: ref.label });
          }
        }
      }

      // Recalculate centers after x snap
      const snappedCx = snappedX + nw / 2;
      const snappedCxEnd = snappedX + nw;

      // Vertical snapping (y-axis alignment — horizontal guide lines)
      const yChecks = [
        { moving: ny, label: "topo" },
        { moving: cy, label: "centro" },
        { moving: cyEnd, label: "baixo" },
      ];
      let bestYDist = SNAP_THRESHOLD;
      for (const ref of vRefs) {
        for (const yc of yChecks) {
          const dist = Math.abs(yc.moving - ref.pos);
          if (dist < bestYDist) {
            bestYDist = dist;
            const delta = ref.pos - yc.moving;
            snappedY = ny + delta;
            // Clear only y-guides (keep x-guides)
            const xGuides = guides.filter((g) => g.axis === "v");
            guides.length = 0;
            guides.push(...xGuides);
            guides.push({ axis: "h", pos: ref.pos, label: ref.label });
          } else if (Math.abs(dist - bestYDist) < 0.001) {
            guides.push({ axis: "h", pos: ref.pos, label: ref.label });
          }
        }
      }

      return { snappedX, snappedY, guides };
    },
    [width, height, layers],
  );

  // ── Fit to Screen ───────────────────────────────────────────────────
  // Use already-tracked containerSize (from ResizeObserver) to avoid forced reflow
  const fitToScreen = useCallback(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) return;
    const padding = 60; // px around the canvas
    const availW = containerSize.width - padding * 2;
    const availH = containerSize.height - padding * 2;
    if (availW <= 0 || availH <= 0) return;
    const scaleX = availW / width;
    const scaleY = availH / height;
    const newZoom = Math.min(scaleX, scaleY, 3);
    setZoom(newZoom);
    setPanOffset({ x: 0, y: 0 });
  }, [width, height, containerSize]);

  // Complete cutout polygon on double-click (or start inline text editing)
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // If in cutout mode, finish the polygon
    if (cutoutMode) {
      completeCutout();
      return;
    }

    // Check if double-clicked on a text layer → trigger inline editing
    const { x: mx, y: my } = screenToCanvas(e.clientX, e.clientY);
    const clicked = findLayerAtPoint(mx, my);
    if (clicked && clicked.type === "text") {
      // Use cached rect (set by handleMouseDown) to avoid extra getBoundingClientRect
      const rect = canvasRectRef.current || canvasRef.current?.getBoundingClientRect();
      if (rect && onTextDoubleClick) {
        const scaleX = rect.width / width;
        const scaleY = rect.height / height;
        const screenX = rect.left + clicked.x * scaleX;
        const screenY = rect.top + clicked.y * scaleY;
        const displayW = clicked.width * scaleX;
        const displayH = clicked.height * scaleY;
        onTextDoubleClick(clicked.id, screenX, screenY, displayW, displayH, scaleX);
      }
    }
  }, [cutoutMode, completeCutout, screenToCanvas, width, height, onTextDoubleClick]);

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
      {/* Canvas Container — always centered regardless of ruler visibility */}
      <div
        ref={containerRef}
        className={`relative w-full h-full bg-slate-950 border border-white/10 shadow-2xl overflow-hidden`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Rulers */}
        <CanvasRulers
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          canvasWidth={width}
          canvasHeight={height}
          zoom={zoom}
          panOffset={panOffset}
          cursorCanvasPos={cursorCanvasPos}
          visible={showRulers}
        />

        <div
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.1s ease-out",
            flexShrink: 0,
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
            className="shadow-2xl border border-white/20"
            style={{
              cursor: cutoutMode ? "crosshair" : isPanning ? "grabbing" : currentCursor,
              width: `${width}px`,
              height: `${height}px`,
            }}
          />
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu.visible && contextMenu.layerId && (
        <div
          className="fixed z-[9999] bg-gray-900 border border-white/15 shadow-2xl py-1 min-w-[180px]"
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
});

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
