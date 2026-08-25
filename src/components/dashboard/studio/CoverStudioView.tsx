// CoverStudioView — Unified studio editor
// Merges "Estudio Canva" and "Editor Avancado" into a single view.
// State management via EditorContext, rich sidebar from lidojs-sidebar,
// plus PresetSelector and AudioWaveformOverlay from the original Canva tab.

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Palette,
  BarChart3,
  Download,
  RefreshCw,
  Grid,
  Undo2,
  Redo2,
  Ruler,
  ZoomIn,
  ZoomOut,
  Maximize,
  PanelRightOpen,
  PanelRightClose,
  FileImage,
  FileText,
  FileDown,
  FileUp,
  Upload,
  Pencil,
  Check,
  X,
  Settings2,
  Copy,
  Menu,
  FileJson,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COVER_PRESETS, CoverPreset, PresetSelector } from "./PresetSelector";
import { EditorProvider, useEditor } from "./EditorContext";
import { CoverCanvasEngine, type CoverCanvasEngineRef, type CanvasLayer } from "./CoverCanvasEngine";
import { RightSidebar } from "./lidojs-sidebar/RightSidebar";
import { AudioWaveformOverlay } from "./AudioWaveformOverlay";
import { CoverAnalyticsView } from "./CoverAnalyticsView";
import { FloatingLayerToolbar } from "./FloatingLayerToolbar";
// Floating left panel content
import { TextContent } from "./lidojs-sidebar/panels/TextContent";
import { ShapeContent } from "./lidojs-sidebar/panels/ShapeContent";
import { BackgroundContent } from "./lidojs-sidebar/panels/BackgroundContent";
import { BadgeContent } from "./lidojs-sidebar/panels/BadgeContent";
import { ImageToolsContent } from "./lidojs-sidebar/panels/ImageToolsContent";
import { FormatosContent } from "./lidojs-sidebar/panels/FormatosContent";
import { StudioUploadsTab } from "./StudioUploadsTab";
import { AiToolsPanel } from "./ai-tools/AiToolsPanel";
import { AnimationTimelinePanel } from "./animation/AnimationTimelinePanel";
import { SymbolsPanel } from "./symbols/SymbolsPanel";
import { PrintExportPanel } from "./export/PrintExportPanel";
import { PluginManagerPanel } from "./plugins/PluginManagerPanel";
import { LayersPanel } from "./layers/LayersPanel";
import { getMediaUrl } from "@/utils/mediaUtils";
import { Type, Square, Paintbrush, Tag, Wand2, LayoutTemplate, Upload as UploadIcon, Sparkles, Film, Layers, Printer, Puzzle } from "lucide-react";
import { loadAllStudioFonts } from "./lidojs-config/palette";

// Load all studio fonts on module init
loadAllStudioFonts();

// ── Floating left panel helpers ──────────────────────────────────────
const LEFT_PANEL_TABS = [
  { name: "Camadas", icon: <Layers size={20} /> },
  { name: "Formatos", icon: <LayoutTemplate size={20} /> },
  { name: "Texto", icon: <Type size={20} /> },
  { name: "Formas", icon: <Square size={20} /> },
  { name: "Fundo", icon: <Paintbrush size={20} /> },
  { name: "Badges", icon: <Tag size={20} /> },
  { name: "Upload", icon: <UploadIcon size={20} /> },
  { name: "Ferramentas", icon: <Wand2 size={20} /> },
  { name: "IA", icon: <Sparkles size={20} /> },
  { name: "Animação", icon: <Film size={20} /> },
  { name: "Símbolos", icon: <Package size={20} /> },
  { name: "Impressão", icon: <Printer size={20} /> },
  { name: "Plugins", icon: <Puzzle size={20} /> },
] as const;

/** Slim vertical tab bar for the floating left panel */
const SidebarTabBar = ({ tabs, active, onChange }: {
  tabs: readonly { name: string; icon: React.ReactNode }[];
  active: string | null;
  onChange: (e: React.MouseEvent, name: string) => void;
}) => (
  <div className="flex flex-col items-center bg-[#1E1E2D] border-r border-white/10 py-1 shrink-0">
    {tabs.map((tab) => {
      const isActive = tab.name === active;
      return (
        <button
          key={tab.name}
          onClick={(e) => onChange(e, tab.name)}
          title={tab.name}
          className={`flex flex-col items-center justify-center w-[52px] h-[52px] gap-0.5 transition-colors ${
            isActive ? "text-blue-400 bg-blue-500/15" : "text-gray-500 hover:text-blue-400"
          }`}
        >
          {tab.icon}
          <span className="text-[9px] font-semibold leading-tight">{tab.name}</span>
        </button>
      );
    })}
  </div>
);

/** Content panel for the selected left-panel tab */
const LeftPanelContent = ({ tab, onClose, canvasWidth, canvasHeight }: {
  tab: string;
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
}) => {
  const { addLayer, selectLayer } = useEditor();
  const { toast } = useToast();
  return (
    <div className="w-[340px] overflow-y-auto border-r border-white/10 bg-[#151521] text-white max-h-full">
      {tab === "Camadas" && <LayersPanel />}
      {tab === "Formatos" && <FormatosContent onClose={onClose} />}
      {tab === "Texto" && <TextContent onClose={onClose} />}
      {tab === "Formas" && <ShapeContent onClose={onClose} />}
      {tab === "Fundo" && <BackgroundContent onClose={onClose} />}
      {tab === "Badges" && <BadgeContent onClose={onClose} />}
      {tab === "Upload" && (
        <div className="p-4 flex flex-col h-full overflow-y-auto">
          <StudioUploadsTab onAddImageLayer={(url, name, type = "image") => {
            const cleanUrl = getMediaUrl(url) || url;
            const img = new Image();
            img.onload = () => {
              const maxW = canvasWidth * 0.8;
              const maxH = canvasHeight * 0.8;
              let w = img.naturalWidth;
              let h = img.naturalHeight;
              if (w > maxW) { h = h * (maxW / w); w = maxW; }
              if (h > maxH) { w = w * (maxH / h); h = maxH; }
              const layer: CanvasLayer = {
                id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name,
                type: type as "image" | "logo",
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
      {tab === "Ferramentas" && <ImageToolsContent onClose={onClose} />}
      {tab === "IA" && <AiToolsPanel />}
      {tab === "Animação" && <AnimationTimelinePanel />}
      {tab === "Símbolos" && <SymbolsPanel />}
      {tab === "Impressão" && <PrintExportPanel />}
      {tab === "Plugins" && <PluginManagerPanel />}
    </div>
  );
};

// ── Inner editor (must be inside EditorProvider) ─────────────────────
interface EditorInnerProps {
  onShowAnalytics?: () => void;
}

/** Common document resize presets inspired by img.ly/CE.SDK */
const RESIZE_PRESETS = [
  { label: "YouTube Thumbnail", width: 1280, height: 720 },
  { label: "YouTube Banner", width: 2560, height: 1440 },
  { label: "Instagram Post (1:1)", width: 1080, height: 1080 },
  { label: "Instagram Story (9:16)", width: 1080, height: 1920 },
  { label: "Facebook Cover", width: 820, height: 312 },
  { label: "Twitter Header", width: 1500, height: 500 },
  { label: "LinkedIn Banner", width: 1584, height: 396 },
  { label: "A4 (300dpi)", width: 2480, height: 3508 },
  { label: "Custom", width: 0, height: 0 },
] as const;

const EditorInner = ({ onShowAnalytics }: EditorInnerProps) => {
  const { toast } = useToast();
  const {
    layers,
    selectedLayerId,
    selectedLayerIds,
    selectLayer,
    toggleLayerSelection,
    updateLayer,
    updateSelectedLayers,
    removeLayer,
    removeSelectedLayers,
    duplicateLayer,
    duplicateSelectedLayers,
    moveLayerOrder,
    groupSelectedLayers,
    ungroupSelectedLayers,
    replaceLayers,
    setBackgroundColor,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    backgroundGradient,
    setCanvasSize,
    cutoutMode,
    setCutoutMode,
    clipContent,
    eraserMode,
    eraserSize,
    eraserSoftness,
    eraserTolerance,
    eraserType,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useEditor();

  const [isExporting, setIsExporting] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<CoverPreset>(COVER_PRESETS[0]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const engineRef = useRef<CoverCanvasEngineRef>(null);
  // Floating left sidebar state
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<string | null>(null);
  // Inline text editing
  const [editingTextLayer, setEditingTextLayer] = useState<{
    id: string;
    x: number; y: number;
    width: number; height: number;
    content: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    textAlign: "left" | "center" | "right";
    displayScale: number;
  } | null>(null);

  // ── Project name ─────────────────────────────────────
  const [projectName, setProjectName] = useState("Projeto Sem Título");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Resize dialog ────────────────────────────────────
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [resizeW, setResizeW] = useState(canvasWidth);
  const [resizeH, setResizeH] = useState(canvasHeight);
  const [resizePreset, setResizePreset] = useState<string>(RESIZE_PRESETS[0].label);
  const [lockAspect, setLockAspect] = useState(true);
  const aspectRatio = canvasWidth / canvasHeight;

  const handleResizePresetChange = (label: string) => {
    setResizePreset(label);
    const p = RESIZE_PRESETS.find((r) => r.label === label);
    if (p && p.width > 0) {
      setResizeW(p.width);
      setResizeH(p.height);
    }
  };

  const handleResizeWChange = (val: number) => {
    setResizeW(val);
    if (lockAspect && aspectRatio > 0) {
      setResizeH(Math.round(val / aspectRatio));
    }
  };

  const handleResizeHChange = (val: number) => {
    setResizeH(val);
    if (lockAspect && aspectRatio > 0) {
      setResizeW(Math.round(val * aspectRatio));
    }
  };

  const applyResize = () => {
    if (resizeW > 0 && resizeH > 0) {
      setCanvasSize(resizeW, resizeH);
      toast({ title: "Tamanho atualizado", description: `${resizeW} x ${resizeH} px` });
    }
    setShowResizeDialog(false);
  };

  // ── Zoom helpers ─────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    engineRef.current?.setZoom((z) => Math.min(3, z + 0.1));
    requestAnimationFrame(() => {
      if (engineRef.current) setZoomDisplay(Math.round(engineRef.current.zoom * 100));
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    engineRef.current?.setZoom((z) => Math.max(0.2, z - 0.1));
    requestAnimationFrame(() => {
      if (engineRef.current) setZoomDisplay(Math.round(engineRef.current.zoom * 100));
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    engineRef.current?.setZoom(() => 1);
    engineRef.current?.setPanOffset({ x: 0, y: 0 });
    requestAnimationFrame(() => setZoomDisplay(100));
  }, []);

  const handleFitToScreen = useCallback(() => {
    engineRef.current?.fitToScreen();
    requestAnimationFrame(() => {
      if (engineRef.current) setZoomDisplay(Math.round(engineRef.current.zoom * 100));
    });
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoomDisplay(Math.round(newZoom * 100));
  }, []);

  // ── Inline text editing (triggered by double-click in engine) ──
  // The engine provides viewport-relative coords; we subtract the canvas area offset
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const handleTextDoubleClick = useCallback((layerId: string, screenX: number, screenY: number, displayW: number, displayH: number, displayScale: number) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || layer.type !== "text") return;
    // Convert viewport coords to canvas-area-relative coords
    const areaRect = canvasAreaRef.current?.getBoundingClientRect();
    const offsetX = areaRect?.left ?? 0;
    const offsetY = areaRect?.top ?? 0;
    setEditingTextLayer({
      id: layer.id,
      x: screenX - offsetX,
      y: screenY - offsetY,
      width: displayW,
      height: displayH,
      content: layer.content,
      fontSize: layer.fontSize || 60,
      fontFamily: layer.fontFamily || "Inter, sans-serif",
      fontWeight: layer.fontWeight || "bold",
      color: layer.color || "#FFFFFF",
      textAlign: layer.textAlign || "left",
      displayScale,
    });
  }, [layers]);

  const handleTextEditingComplete = useCallback(() => {
    if (editingTextLayer) {
      updateLayer(editingTextLayer.id, { content: editingTextLayer.content });
      setEditingTextLayer(null);
    }
  }, [editingTextLayer, updateLayer]);

  // Auto-fit canvas on initial mount and when canvas size changes
  useEffect(() => {
    const t = setTimeout(() => handleFitToScreen(), 150);
    return () => clearTimeout(t);
  }, [canvasWidth, canvasHeight, handleFitToScreen]);

  // ── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        groupSelectedLayers();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete layers when user is typing in an input/textarea/contentEditable
        const tag = document.activeElement?.tagName;
        const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable;
        if (isEditing) return;
        if (selectedLayerIds.length > 1) {
          e.preventDefault();
          removeSelectedLayers();
        } else if (selectedLayerId) {
          removeLayer(selectedLayerId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedLayerIds.length > 1) {
          duplicateSelectedLayers();
        } else if (selectedLayerId) {
          duplicateLayer(selectedLayerId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedLayerId, selectedLayerIds, removeLayer, removeSelectedLayers, duplicateLayer, duplicateSelectedLayers, groupSelectedLayers]);

  const handleSelectPreset = useCallback((preset: CoverPreset) => {
    setSelectedPreset(preset);
    setCanvasSize(preset.width, preset.height);
    toast({
      title: `Formato: ${preset.name}`,
      description: `${preset.width}x${preset.height} (${preset.aspectRatio})`,
    });
  }, [setCanvasSize, toast]);

  // ── Export handlers ───────────────────────────────────
  const handleExportPNG = async () => {
    try {
      setIsExporting(true);
      if (engineRef.current) {
        const dataUrl = engineRef.current.exportAsDataURL();
        if (dataUrl) {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `${projectName.replace(/\s+/g, "_")}-${Date.now()}.png`;
          a.click();
        }
      }
      toast({ title: "PNG Exportado", description: "Imagem baixada com sucesso." });
    } catch (err: unknown) {
      toast({ title: "Erro", description: (err as Error).message || "Falha ao exportar.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJPEG = async () => {
    try {
      setIsExporting(true);
      if (engineRef.current) {
        const offscreen = document.createElement("canvas");
        offscreen.width = canvasWidth;
        offscreen.height = canvasHeight;
        const ctx = offscreen.getContext("2d");
        if (ctx) {
          // We need to access drawCanvasContent — but it's internal to engine.
          // Use the data URL from PNG export and convert via a temp image.
          const pngUrl = engineRef.current.exportAsDataURL();
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            const jpegUrl = offscreen.toDataURL("image/jpeg", 0.92);
            const a = document.createElement("a");
            a.href = jpegUrl;
            a.download = `${projectName.replace(/\s+/g, "_")}-${Date.now()}.jpg`;
            a.click();
            setIsExporting(false);
          };
          img.src = pngUrl;
          return;
        }
      }
      toast({ title: "JPEG Exportado", description: "Imagem baixada com sucesso." });
    } catch (err: unknown) {
      toast({ title: "Erro", description: (err as Error).message || "Falha ao exportar.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportProject = async () => {
    try {
      setIsExporting(true);
      const projectData = {
        name: projectName,
        version: "1.0",
        canvas: { width: canvasWidth, height: canvasHeight },
        background: { color: backgroundColor, gradient: backgroundGradient },
        layers,
      };
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, "_")}.canvas.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Projeto Exportado", description: "Arquivo .canvas.json baixado." });
    } catch (err: unknown) {
      toast({ title: "Erro", description: (err as Error).message || "Falha ao exportar projeto.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      if (!engineRef.current) return;
      const { jsPDF } = await import("jspdf");
      const dataUrl = engineRef.current.exportAsDataURL();
      if (!dataUrl) return;

      const orientation = canvasWidth > canvasHeight ? "landscape" : "portrait";
      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format: [canvasWidth, canvasHeight],
        compress: true,
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, canvasWidth, canvasHeight);
      pdf.save(`${projectName.replace(/\s+/g, "_")}-${Date.now()}.pdf`);
      toast({ title: "PDF Exportado", description: "Arquivo PDF baixado com sucesso." });
    } catch (err: unknown) {
      toast({ title: "Erro", description: (err as Error).message || "Falha ao exportar PDF.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Save as template ──────────────────────────────────
  const handleSaveTemplate = async () => {
    try {
      setIsExporting(true);
      const userRes = await supabase.auth.getUser();
      if (!userRes.user?.id) throw new Error("Usuário não autenticado");

      const { error: dbError } = await (supabase as any).from("cover_projects").insert({
        user_id: userRes.user.id,
        title: `${projectName} (Template)`,
        media_type: selectedPreset.category,
        aspect_ratio: selectedPreset.aspectRatio,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        layers: layers as any,
        is_template: true,
      });

      if (dbError) throw dbError;

      toast({ title: "Template Salvo", description: "Modelo salvo com sucesso." });
    } catch (err: unknown) {
      toast({ title: "Erro ao Salvar", description: (err as Error).message || "Falha ao salvar template.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Import project ────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);
        if (data.canvas && data.layers) {
          setCanvasSize(data.canvas.width, data.canvas.height);
          if (data.background?.color) {
            setBackgroundColor(data.background.color);
          }
          // Restore layers directly via replaceLayers
          const restoredLayers: CanvasLayer[] = data.layers.map((l: any) => ({
            ...l,
            // Ensure required fields have defaults
            rotation: l.rotation ?? 0,
            opacity: l.opacity ?? 1,
            visible: l.visible ?? true,
            locked: l.locked ?? false,
          }));
          replaceLayers(restoredLayers);
          // Set project name if available
          if (data.name) setProjectName(data.name);
          toast({ title: "Projeto Importado", description: `"${data.name || file.name}" — ${restoredLayers.length} camadas restauradas.` });
        } else {
          toast({ title: "Formato não reconhecido", description: "Arquivo não é um projeto .canvas.json válido.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Erro na Importação", description: "Arquivo corrompido ou formato inválido.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  return (
    <div className="flex w-full h-full max-h-[calc(100vh-1rem)] bg-[#151521] overflow-hidden shadow-2xl">
      {/* ════ CENTER COLUMN: Toolbar + Canvas ════ */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* ════ FIXED TOP TOOLBAR ════ */}
        <div className="h-11 bg-[#1E1E2D] border-b border-white/10 flex items-center px-2 gap-1 shrink-0 z-20">
          {/* — Hamburger / Left Tools Toggle — */}
          <button
            onClick={() => { setLeftPanelOpen(!leftPanelOpen); if (leftPanelOpen) setLeftPanelTab(null); }}
            title={leftPanelOpen ? "Fechar Painel de Ferramentas" : "Abrir Painel de Ferramentas"}
            className={`p-1.5 transition-colors ${leftPanelOpen ? "text-blue-400 bg-blue-500/15" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          >
            <Menu size={14} />
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* — Project Name (editable) — */}
          <div className="flex items-center gap-1.5 min-w-0 max-w-[200px]">
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  ref={nameInputRef}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setProjectName(draftName); setEditingName(false); }
                    if (e.key === "Escape") { setDraftName(projectName); setEditingName(false); }
                  }}
                  autoFocus
                  className="h-6 px-2 bg-white/10 border border-blue-500 text-xs text-white font-medium outline-none min-w-0 w-full"
                />
                <button onClick={() => { setProjectName(draftName); setEditingName(false); }} className="text-emerald-400 hover:text-emerald-300">
                  <Check size={12} />
                </button>
                <button onClick={() => { setDraftName(projectName); setEditingName(false); }} className="text-white/50 hover:text-white/80">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setDraftName(projectName); setEditingName(true); }}
                className="flex items-center gap-1 text-xs text-white/80 hover:text-white font-medium truncate max-w-[160px] group"
                title="Clique para renomear"
              >
                <Palette className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="truncate">{projectName}</span>
                <Pencil size={10} className="text-white/30 group-hover:text-white/60 shrink-0" />
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-white/10" />

          {/* — Undo / Redo — */}
          <button onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Undo2 size={14} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Y)" className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Redo2 size={14} />
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* — Rulers + Safe Zones — */}
          <button
            onClick={() => setShowRulers(!showRulers)}
            title="Réguas"
            className={`p-1.5 transition-colors ${showRulers ? "text-blue-400 bg-blue-500/15" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          >
            <Ruler size={14} />
          </button>
          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            title="Margens Seguras"
            className={`p-1.5 transition-colors ${showSafeZones ? "text-emerald-400 bg-emerald-500/15" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          >
            <Grid size={14} />
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* — Zoom Controls — */}
          <button onClick={handleZoomOut} title="Zoom Out" className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] text-white/60 font-mono w-10 text-center select-none">{zoomDisplay}%</span>
          <button onClick={handleZoomIn} title="Zoom In" className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <ZoomIn size={14} />
          </button>
          <button onClick={handleFitToScreen} title="Ajustar à Tela" className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={handleZoomReset} title="Zoom 100%" className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <Maximize size={14} />
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* — Document Size — */}
          <button
            onClick={() => { setResizeW(canvasWidth); setResizeH(canvasHeight); setShowResizeDialog(true); }}
            title="Configurar Tamanho do Documento"
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-colors font-mono"
          >
            <Settings2 size={12} />
            <span>{canvasWidth}×{canvasHeight}</span>
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* — Metrics — */}
          <button
            onClick={onShowAnalytics}
            title="Métricas"
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <BarChart3 size={14} />
          </button>

          {/* — Spacer — */}
          <div className="flex-1" />

          {/* — Import Project — */}
          <button
            onClick={handleImportProject}
            title="Importar Projeto (.canvas.json / compatível)"
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Upload size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.canvas.json,.psd,.psb"
            onChange={handleFileImport}
            className="hidden"
          />

          {/* — Save as Template — */}
          <button
            onClick={handleSaveTemplate}
            title="Salvar como Template"
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            disabled={isExporting}
          >
            <Package size={14} />
          </button>

          {/* — Export Dropdown — */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors disabled:opacity-50"
              >
                <Download size={13} />
                {isExporting ? "Exportando..." : "Exportar"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-[#1E1E2D] border-white/10 text-white">
              <DropdownMenuItem onClick={handleExportPNG} className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
                <FileImage size={14} />
                <div className="flex flex-col">
                  <span>Imagem PNG</span>
                  <span className="text-[10px] text-white/40">Alta qualidade, fundo transparente</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJPEG} className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
                <FileImage size={14} />
                <div className="flex flex-col">
                  <span>Imagem JPEG</span>
                  <span className="text-[10px] text-white/40">Comprimido, sem transparência</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
                <FileText size={14} />
                <div className="flex flex-col">
                  <span>PDF</span>
                  <span className="text-[10px] text-white/40">Documento PDF</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleExportProject} className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
                <FileJson size={14} />
                <div className="flex flex-col">
                  <span>Projeto (.canvas.json)</span>
                  <span className="text-[10px] text-white/40">Dados editáveis do projeto</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleSaveTemplate} className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white" disabled={isExporting}>
                <Package size={14} />
                <div className="flex flex-col">
                  <span>Salvar como Template</span>
                  <span className="text-[10px] text-white/40">Modelo reutilizável</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-white/10" />

          {/* — Right Panel Toggle — */}
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            title={rightPanelCollapsed ? "Mostrar Propriedades" : "Ocultar Propriedades"}
            className={`p-1.5 transition-colors ${!rightPanelCollapsed ? "text-blue-400 bg-blue-500/15" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          >
            {rightPanelCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
          </button>
        </div>

        {/* ════ CANVAS AREA (with floating panels) ════ */}
        <div ref={canvasAreaRef} className="flex-1 overflow-auto relative bg-[#0D0D14]">
          {/* Canvas centered */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <CoverCanvasEngine
              ref={engineRef}
              width={canvasWidth}
              height={canvasHeight}
              aspectRatio={`${canvasWidth}:${canvasHeight}`}
              layers={layers}
              selectedLayerId={selectedLayerId}
              selectedLayerIds={selectedLayerIds}
              onSelectLayer={selectLayer}
              onToggleLayerSelection={toggleLayerSelection}
              onUpdateLayer={updateLayer}
              onUpdateSelectedLayers={updateSelectedLayers}
              onDeleteLayer={removeLayer}
              onDuplicateLayer={duplicateLayer}
              onMoveLayerOrder={moveLayerOrder}
              onToggleLock={(id) => {
                const layer = layers.find((l) => l.id === id);
                if (layer) updateLayer(id, { locked: !layer.locked });
              }}
              backgroundColor={backgroundColor}
              backgroundGradient={backgroundGradient}
              showSafeZones={showSafeZones}
              showRulers={showRulers}
              clipContent={clipContent}
              cutoutMode={cutoutMode}
              onCutoutComplete={(newDataUri) => {
                if (selectedLayerId) {
                  updateLayer(selectedLayerId, { content: newDataUri });
                  setCutoutMode(false);
                }
              }}
              onZoomChange={handleZoomChange}
              onTextDoubleClick={handleTextDoubleClick}
              eraserMode={eraserMode}
              eraserSize={eraserSize}
              eraserSoftness={eraserSoftness}
              eraserTolerance={eraserTolerance}
              eraserType={eraserType}
              onEraseComplete={(newDataUri) => {
                if (selectedLayerId) {
                  updateLayer(selectedLayerId, { content: newDataUri });
                }
              }}
            />
          </div>

          {/* ════ FLOATING LEFT PANEL (Tool Selector) ════ */}
          {leftPanelOpen && (
            <div
              className="absolute top-0 left-0 bottom-0 z-30 flex shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarTabBar
                tabs={LEFT_PANEL_TABS}
                active={leftPanelTab}
                onChange={(_, name) => setLeftPanelTab(leftPanelTab === name ? null : name)}
              />
              {leftPanelTab && (
                <LeftPanelContent
                  tab={leftPanelTab}
                  onClose={() => setLeftPanelTab(null)}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                />
              )}
            </div>
          )}

          {/* ════ FLOATING RIGHT PANEL (Properties) ════ */}
          {!rightPanelCollapsed && selectedLayerId && (
            <div
              className="absolute top-2 right-2 bottom-2 z-30 pointer-events-auto shadow-2xl bg-[#151521] border border-white/10 overflow-hidden transition-all duration-300"
              style={{ width: 280 }}
            >
              <RightSidebar />
            </div>
          )}

          {/* ════ FLOATING LAYER TOOLBAR ════ */}
          {(selectedLayerIds.length > 1 || (selectedLayerId && !editingTextLayer)) && (
            <FloatingLayerToolbar layerId={selectedLayerId || selectedLayerIds[0]} />
          )}

          {/* ════ INLINE TEXT EDITING OVERLAY ════ */}
          {editingTextLayer && (
            <div
              className="absolute z-40 pointer-events-auto"
              style={{
                left: editingTextLayer.x,
                top: editingTextLayer.y,
                width: editingTextLayer.width,
                minHeight: editingTextLayer.height,
              }}
            >
              {/* Floating text editing toolbar */}
              <div className="absolute -top-10 left-0 right-0 flex items-center justify-center gap-1 bg-[#1E1E2D]/95 backdrop-blur-md border border-white/10 shadow-2xl px-2 py-1">
                <select
                  value={editingTextLayer.fontFamily}
                  onChange={(e) => setEditingTextLayer({ ...editingTextLayer, fontFamily: e.target.value })}
                  className="h-6 px-1 bg-white/10 border border-white/10 text-[10px] text-white outline-none max-w-[120px]"
                >
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Impact, sans-serif">Impact</option>
                  <option value="Oswald, sans-serif">Oswald</option>
                  <option value="'Playfair Display', serif">Playfair</option>
                  <option value="Montserrat, sans-serif">Montserrat</option>
                  <option value="'Bebas Neue', sans-serif">Bebas Neue</option>
                  <option value="Poppins, sans-serif">Poppins</option>
                </select>
                <input
                  type="number"
                  value={editingTextLayer.fontSize}
                  onChange={(e) => setEditingTextLayer({ ...editingTextLayer, fontSize: Number(e.target.value) })}
                  className="h-6 w-12 px-1 bg-white/10 border border-white/10 text-[10px] text-white font-mono text-center outline-none"
                  min={8}
                  max={500}
                />
                <button
                  onClick={() => setEditingTextLayer({ ...editingTextLayer, fontWeight: editingTextLayer.fontWeight === "bold" ? "normal" : "bold" })}
                  className={`h-6 px-1.5 text-[10px] font-bold border border-white/10 transition-colors ${editingTextLayer.fontWeight === "bold" ? "bg-blue-600 text-white" : "bg-white/10 text-white/60 hover:text-white"}`}
                >
                  B
                </button>
                <div className="w-px h-4 bg-white/20 mx-0.5" />
                <button
                  onClick={() => setEditingTextLayer({ ...editingTextLayer, textAlign: "left" })}
                  className={`h-6 px-1 text-[10px] border border-white/10 ${editingTextLayer.textAlign === "left" ? "bg-blue-600 text-white" : "bg-white/10 text-white/60"}`}
                >
                  L
                </button>
                <button
                  onClick={() => setEditingTextLayer({ ...editingTextLayer, textAlign: "center" })}
                  className={`h-6 px-1 text-[10px] border border-white/10 ${editingTextLayer.textAlign === "center" ? "bg-blue-600 text-white" : "bg-white/10 text-white/60"}`}
                >
                  C
                </button>
                <button
                  onClick={() => setEditingTextLayer({ ...editingTextLayer, textAlign: "right" })}
                  className={`h-6 px-1 text-[10px] border border-white/10 ${editingTextLayer.textAlign === "right" ? "bg-blue-600 text-white" : "bg-white/10 text-white/60"}`}
                >
                  R
                </button>
                <div className="w-px h-4 bg-white/20 mx-0.5" />
                <input
                  type="color"
                  value={editingTextLayer.color}
                  onChange={(e) => setEditingTextLayer({ ...editingTextLayer, color: e.target.value })}
                  className="h-6 w-6 cursor-pointer bg-transparent border-0 p-0"
                />
                <div className="w-px h-4 bg-white/20 mx-0.5" />
                <button onClick={handleTextEditingComplete} className="h-6 px-2 bg-emerald-600 hover:bg-emerald-500 text-[10px] text-white font-medium transition-colors">
                  <Check size={12} />
                </button>
                <button onClick={() => setEditingTextLayer(null)} className="h-6 px-2 bg-white/10 hover:bg-white/20 text-[10px] text-white/60 transition-colors">
                  <X size={12} />
                </button>
              </div>
              <textarea
                value={editingTextLayer.content}
                onChange={(e) => setEditingTextLayer({ ...editingTextLayer, content: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { handleTextEditingComplete(); }
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextEditingComplete(); }
                }}
                autoFocus
                className="w-full h-full bg-transparent border-2 border-blue-500 resize-none outline-none p-2 overflow-hidden"
                style={{
                  fontSize: editingTextLayer.fontSize * editingTextLayer.displayScale,
                  fontFamily: editingTextLayer.fontFamily,
                  fontWeight: editingTextLayer.fontWeight,
                  color: editingTextLayer.color,
                  textAlign: editingTextLayer.textAlign,
                  lineHeight: 1.2,
                }}
              />
            </div>
          )}

          {/* Audio Waveform Overlay (podcast presets) */}
          {selectedPreset.category === "audio" && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none z-10">
              <AudioWaveformOverlay color="#3B82F6" style="bars" />
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="h-7 bg-[#1E1E2D] border-t border-white/10 flex items-center px-4 shrink-0 text-[10px] text-white/50 gap-4 z-20">
          <span>{canvasWidth} x {canvasHeight}</span>
          <span>|</span>
          <span>{layers.length} camadas</span>
          {selectedLayerIds.length > 1 ? (
            <>
              <span>|</span>
              <span className="text-blue-400">{selectedLayerIds.length} camadas selecionadas</span>
            </>
          ) : selectedLayer ? (
            <>
              <span>|</span>
              <span>Selecionado: {selectedLayer.name}</span>
            </>
          ) : null}
          <div className="flex-1" />
          <span>{zoomDisplay}%</span>
        </div>
      </div>

      {/* ════ RESIZE DIALOG ════ */}
      <Dialog open={showResizeDialog} onOpenChange={setShowResizeDialog}>
        <DialogContent className="bg-[#1E1E2D] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Configurar Documento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Preset selector */}
            <div className="space-y-2">
              <label className="text-xs text-white/60">Formato Predefinido</label>
              <Select value={resizePreset} onValueChange={handleResizePresetChange}>
                <SelectTrigger className="h-9 bg-white/5 border-white/10 text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A3D] border-white/10 text-white">
                  {RESIZE_PRESETS.map((p) => (
                    <SelectItem key={p.label} value={p.label}>
                      {p.label}{p.width > 0 ? ` (${p.width}×${p.height})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Width / Height */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/60">Largura (px)</label>
                <Input
                  type="number"
                  value={resizeW}
                  onChange={(e) => handleResizeWChange(Number(e.target.value))}
                  className="h-9 bg-white/5 border-white/10 text-sm text-white font-mono"
                  min={1}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Altura (px)</label>
                <Input
                  type="number"
                  value={resizeH}
                  onChange={(e) => handleResizeHChange(Number(e.target.value))}
                  className="h-9 bg-white/5 border-white/10 text-sm text-white font-mono"
                  min={1}
                />
              </div>
            </div>

            {/* Lock aspect ratio */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLockAspect(!lockAspect)}
                className={`w-8 h-4 relative cursor-pointer transition-colors ${lockAspect ? "bg-blue-600" : "bg-white/20"}`}
              >
                <div className={`w-3 h-3 bg-white absolute top-0.5 shadow-sm transition-transform ${lockAspect ? "right-0.5" : "left-0.5"}`} />
              </button>
              <span className="text-xs text-white/60">Manter proporção ({canvasWidth}:{canvasHeight})</span>
            </div>

            {/* Quick presets grid */}
            <div className="space-y-2">
              <label className="text-xs text-white/60">Tamanhos Comuns</label>
              <div className="grid grid-cols-3 gap-2">
                {COVER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setResizeW(p.width); setResizeH(p.height); setResizePreset(p.name); }}
                    className={`text-[10px] p-2 border transition-colors text-left ${
                      resizeW === p.width && resizeH === p.height
                        ? "bg-blue-500/20 border-blue-500 text-blue-300"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-bold">{p.name.split("(")[0].trim()}</div>
                    <div className="font-mono text-white/40">{p.width}×{p.height}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowResizeDialog(false)} className="text-white/60 hover:text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button onClick={applyResize} className="bg-blue-600 hover:bg-blue-500 text-white">
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Outer wrapper (manages EditorProvider + Analytics toggle) ────────
export const CoverStudioView: React.FC = () => {
  const [view, setView] = useState<"editor" | "analytics">("editor");

  const [initialPreset] = useState<CoverPreset>(COVER_PRESETS[0]);

  return (
    <div className="space-y-4 h-[calc(100vh-4rem)]">
      {/* View Toggle (Editor vs Analytics) */}
      {view === "analytics" && (
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("editor")}
            className="gap-2 text-xs font-bold"
          >
            ← Voltar ao Editor
          </Button>
        </div>
      )}

      {view === "analytics" ? (
        <CoverAnalyticsView />
      ) : (
        <EditorProvider
          initialLayers={[
            {
              id: "layer_title",
              name: "Título Principal",
              type: "text",
              x: 100,
              y: 200,
              width: 800,
              height: 120,
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: false,
              content: "TÍTULO IMPRESSIONANTE",
              fontSize: 72,
              fontFamily: "Inter, sans-serif",
              fontWeight: "bold",
              color: "#FFFFFF",
              shadowColor: "#000000",
              shadowBlur: 20,
            },
            {
              id: "layer_badge",
              name: "Badge AO VIVO",
              type: "badge",
              x: 100,
              y: 60,
              width: 220,
              height: 65,
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: false,
              content: "AO VIVO",
              badgeStyle: "live",
            },
          ]}
          initialWidth={initialPreset.width}
          initialHeight={initialPreset.height}
          initialBackgroundColor="#1a1a2e"
        >
          <EditorInner onShowAnalytics={() => setView("analytics")} />
        </EditorProvider>
      )}
    </div>
  );
};
