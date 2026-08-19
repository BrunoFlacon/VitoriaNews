import React, { useState, useEffect, useCallback } from "react";
import { 
  Palette, Type, Image as LucideImage, Sparkles, Download, Save, RefreshCw, 
  Layers, Video, Music, Radio, BarChart3, Plus, ShieldCheck, CheckCircle2, Eye, Copy,
  Upload, LayoutTemplate, Shapes, Sliders, Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { COVER_PRESETS, CoverPreset, PresetSelector } from "./PresetSelector";
import { CoverCanvasEngine, CanvasLayer } from "./CoverCanvasEngine";
import { AudioWaveformOverlay } from "./AudioWaveformOverlay";
import { CoverAnalyticsView } from "./CoverAnalyticsView";
import { StudioToolbar } from "./StudioToolbar";
import { StudioUploadsTab } from "./StudioUploadsTab";
import { StudioElementsTab } from "./StudioElementsTab";
import { LidoJSStudioView } from "./LidoJSStudioView";

type SidebarTab = "templates" | "text" | "uploads" | "elements" | "background" | "audio";

export const CoverStudioView: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"editor" | "analytics" | "advanced">("editor");
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("text");
  const [selectedPreset, setSelectedPreset] = useState<CoverPreset>(COVER_PRESETS[0]);
  const [title, setTitle] = useState("Capa para Vídeo / Live / Podcast");
  const [backgroundColor, setBackgroundColor] = useState("#0F172A");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);

  // Layers & Undo/Redo History Stack
  const [layers, setLayers] = useState<CanvasLayer[]>([
    {
      id: "layer_title",
      name: "Título Principal",
      type: "text",
      x: 100,
      y: 150,
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
      shadowColor: "rgba(0, 0, 0, 0.8)",
      shadowBlur: 20,
    },
    {
      id: "layer_badge",
      name: "Badge AO VIVO",
      type: "badge",
      x: 100,
      y: 60,
      width: 200,
      height: 60,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: "AO VIVO",
      badgeStyle: "live",
    }
  ]);

  const [history, setHistory] = useState<CanvasLayer[][]>([[...layers]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushStateToHistory = useCallback((newLayers: CanvasLayer[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    setHistory([...updatedHistory, newLayers]);
    setHistoryIndex(updatedHistory.length);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setLayers(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setLayers(next);
    }
  };

  // Keyboard shortcut handler (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

  const handleSelectPreset = (preset: CoverPreset) => {
    setSelectedPreset(preset);
    toast({
      title: `Formato Alterado: ${preset.name}`,
      description: `Dimensões ajustadas para ${preset.width}x${preset.height} (${preset.aspectRatio})`,
    });
  };

  const handleAddTextLayer = (presetText: string = "Novo Texto da Capa", fontSize: number = 48, color: string = "#FACC15") => {
    const newLayer: CanvasLayer = {
      id: `text_${Date.now()}`,
      name: `Texto ${layers.length + 1}`,
      type: "text",
      x: 150,
      y: 250 + layers.length * 30,
      width: 600,
      height: 80,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: presetText,
      fontSize,
      fontFamily: "Inter, sans-serif",
      fontWeight: "bold",
      color,
    };
    const nextLayers = [...layers, newLayer];
    setLayers(nextLayers);
    setSelectedLayerId(newLayer.id);
    pushStateToHistory(nextLayers);
  };

  const handleAddBadgeLayer = (style: "live" | "podcast" | "exclusive" | "news") => {
    const labels = { live: "AO VIVO", podcast: "PODCAST", exclusive: "EXCLUSIVO", news: "URGENTE" };
    const newLayer: CanvasLayer = {
      id: `badge_${Date.now()}`,
      name: `Selo ${labels[style]}`,
      type: "badge",
      x: 100,
      y: 60,
      width: 220,
      height: 65,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: labels[style],
      badgeStyle: style,
    };
    const nextLayers = [...layers, newLayer];
    setLayers(nextLayers);
    setSelectedLayerId(newLayer.id);
    pushStateToHistory(nextLayers);
  };

  const handleAddShapeLayer = (shapeType: "rectangle" | "circle" | "star" | "arrow" | "divider") => {
    const newLayer: CanvasLayer = {
      id: `shape_${Date.now()}`,
      name: `Forma ${shapeType}`,
      type: "shape",
      shapeType,
      x: 200,
      y: 300,
      width: shapeType === "circle" ? 200 : 300,
      height: 200,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: shapeType,
      color: "#3B82F6",
    };
    const nextLayers = [...layers, newLayer];
    setLayers(nextLayers);
    setSelectedLayerId(newLayer.id);
    pushStateToHistory(nextLayers);
  };

  const handleAddImageLayer = (url: string, name: string) => {
    const newLayer: CanvasLayer = {
      id: `img_${Date.now()}`,
      name: name || "Imagem Adicionada",
      type: "image",
      x: 200,
      y: 200,
      width: 400,
      height: 300,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: url,
    };
    const nextLayers = [...layers, newLayer];
    setLayers(nextLayers);
    setSelectedLayerId(newLayer.id);
    pushStateToHistory(nextLayers);
  };

  const handleUpdateLayer = (id: string, updates: Partial<CanvasLayer>) => {
    const nextLayers = layers.map((l) => (l.id === id ? { ...l, ...updates } : l));
    setLayers(nextLayers);
    pushStateToHistory(nextLayers);
  };

  const handleDeleteLayer = (id: string) => {
    const nextLayers = layers.filter((l) => l.id !== id);
    setLayers(nextLayers);
    setSelectedLayerId(null);
    pushStateToHistory(nextLayers);
  };

  const handleDuplicateLayer = (id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const dup: CanvasLayer = {
      ...layer,
      id: `dup_${Date.now()}`,
      name: `${layer.name} (Cópia)`,
      x: layer.x + 30,
      y: layer.y + 30,
    };
    const nextLayers = [...layers, dup];
    setLayers(nextLayers);
    setSelectedLayerId(dup.id);
    pushStateToHistory(nextLayers);
  };

  const handleMoveLayerOrder = (id: string, direction: "up" | "down" | "top" | "bottom") => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const nextLayers = [...layers];
    const [item] = nextLayers.splice(idx, 1);

    if (direction === "up") nextLayers.splice(Math.min(layers.length - 1, idx + 1), 0, item);
    else if (direction === "down") nextLayers.splice(Math.max(0, idx - 1), 0, item);
    else if (direction === "top") nextLayers.push(item);
    else if (direction === "bottom") nextLayers.unshift(item);

    setLayers(nextLayers);
    pushStateToHistory(nextLayers);
  };

  const handleExportCover = async () => {
    setIsExporting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) throw new Error("Usuário não autenticado");

      // Save project metadata to DB
      const { error: dbError } = await (supabase as any).from("cover_projects").insert({
        user_id: userRes.user.id,
        title,
        media_type: selectedPreset.category,
        aspect_ratio: selectedPreset.aspectRatio,
        canvas_width: selectedPreset.width,
        canvas_height: selectedPreset.height,
        layers: layers as any,
      });

      if (dbError) console.warn("DB record error:", dbError.message);

      toast({
        title: "Capa Exportada & Gravada com Sucesso!",
        description: `Projeto '${title}' (${selectedPreset.aspectRatio}) salvo. Pronta para publicar nos posts e stories!`,
      });
    } catch (err: any) {
      toast({
        title: "Erro na Exportação",
        description: err.message || "Falha ao salvar o projeto de capa.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-6 rounded-3xl border border-border/60 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Palette className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Social Canvas Studio — Criador de Capas (Canva Editor)
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Crie artes profissionais para Vídeos, Lives, Reels/Shorts, Posts e Podcasts no Spotify com ferramentas completas de arrastar e soltar.
          </p>
        </div>

        {/* Tab Navigation (Editor vs Analytics) */}
        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border/50">
          <Button
            variant={activeTab === "editor" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("editor")}
            className="gap-2 text-xs font-bold uppercase tracking-wider rounded-xl h-9 px-4"
          >
            <Palette className="w-4 h-4" />
            Estúdio Canva
          </Button>
          <Button
            variant={activeTab === "advanced" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("advanced")}
            className="gap-2 text-xs font-bold uppercase tracking-wider rounded-xl h-9 px-4"
          >
            <Wand2 className="w-4 h-4" />
            Editor Avançado
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("analytics")}
            className="gap-2 text-xs font-bold uppercase tracking-wider rounded-xl h-9 px-4"
          >
            <BarChart3 className="w-4 h-4" />
            Métricas CTR
          </Button>
        </div>
      </div>

      {activeTab === "advanced" ? (
        <LidoJSStudioView onBack={() => setActiveTab("editor")} />
      ) : activeTab === "analytics" ? (
        <CoverAnalyticsView />
      ) : (
        <div className="space-y-6">
          {/* Format Preset Selector */}
          <div className="bg-card/40 p-5 rounded-3xl border border-border/60">
            <PresetSelector
              selectedPresetId={selectedPreset.id}
              onSelectPreset={handleSelectPreset}
            />
          </div>

          {/* Canva Editor Main Workspace (3-Column Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Col 1: Left Navigation Tool Tabs */}
            <div className="lg:col-span-1 bg-card/60 p-2.5 rounded-3xl border border-border/60 flex flex-row lg:flex-col items-center justify-center gap-3">
              <Button
                variant={activeSidebarTab === "text" ? "default" : "ghost"}
                size="icon"
                onClick={() => setActiveSidebarTab("text")}
                title="Adicionar Texto"
                className="w-11 h-11 rounded-2xl"
              >
                <Type className="w-5 h-5" />
              </Button>
              <Button
                variant={activeSidebarTab === "elements" ? "default" : "ghost"}
                size="icon"
                onClick={() => setActiveSidebarTab("elements")}
                title="Formas & Elementos"
                className="w-11 h-11 rounded-2xl"
              >
                <Shapes className="w-5 h-5" />
              </Button>
              <Button
                variant={activeSidebarTab === "uploads" ? "default" : "ghost"}
                size="icon"
                onClick={() => setActiveSidebarTab("uploads")}
                title="Galeria & Uploads"
                className="w-11 h-11 rounded-2xl"
              >
                <Upload className="w-5 h-5" />
              </Button>
              <Button
                variant={activeSidebarTab === "background" ? "default" : "ghost"}
                size="icon"
                onClick={() => setActiveSidebarTab("background")}
                title="Cor de Fundo"
                className="w-11 h-11 rounded-2xl"
              >
                <Sliders className="w-5 h-5" />
              </Button>
            </div>

            {/* Col 2: Active Tool Drawer Panel */}
            <div className="lg:col-span-3 bg-card/50 p-5 rounded-3xl border border-border/60 space-y-5">
              {activeSidebarTab === "text" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">
                      Tipografia & Texto
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Insira títulos impactantes e legendas estilizadas no canvas.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleAddTextLayer("TÍTULO PRINCIPAL", 64, "#FFFFFF")}
                      className="w-full h-12 justify-start font-black text-sm rounded-2xl bg-primary text-primary-foreground"
                    >
                      + Adicionar Título (H1)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAddTextLayer("Subtítulo em Destaque", 40, "#FACC15")}
                      className="w-full h-10 justify-start font-bold text-xs rounded-xl"
                    >
                      + Adicionar Subtítulo (H2)
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleAddTextLayer("Texto descritivo menor", 28, "#CBD5E1")}
                      className="w-full h-9 justify-start text-xs rounded-xl"
                    >
                      + Adicionar Texto Normal
                    </Button>
                  </div>
                </div>
              )}

              {activeSidebarTab === "elements" && (
                <StudioElementsTab
                  onAddBadgeLayer={handleAddBadgeLayer}
                  onAddShapeLayer={handleAddShapeLayer}
                />
              )}

              {activeSidebarTab === "uploads" && (
                <StudioUploadsTab onAddImageLayer={handleAddImageLayer} />
              )}

              {activeSidebarTab === "background" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">
                      Cor de Fundo do Canvas
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Escolha uma cor de fundo para a capa.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-2xl border border-border/60">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono font-bold uppercase">{backgroundColor}</span>
                  </div>
                </div>
              )}

              {/* Audio Waveform for Podcasts */}
              {selectedPreset.category === "audio" && (
                <div className="pt-2">
                  <AudioWaveformOverlay color="#3B82F6" style="bars" />
                </div>
              )}

              {/* Save / Export Cover Action */}
              <div className="pt-4 border-t border-border/60">
                <Button
                  onClick={handleExportCover}
                  disabled={isExporting}
                  className="w-full h-12 rounded-2xl font-black uppercase tracking-wider text-xs gap-2 shadow-xl bg-primary text-primary-foreground"
                >
                  {isExporting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Exportar Capa ({selectedPreset.aspectRatio})
                </Button>
              </div>
            </div>

            {/* Col 3: Canvas Workspace + Top Toolbar */}
            <div className="lg:col-span-8 space-y-4">
              <StudioToolbar
                selectedLayer={selectedLayer}
                onUpdateLayer={handleUpdateLayer}
                onDeleteLayer={handleDeleteLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onMoveLayerOrder={handleMoveLayerOrder}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onUndo={handleUndo}
                onRedo={handleRedo}
                showSafeZones={showSafeZones}
                onToggleSafeZones={() => setShowSafeZones(!showSafeZones)}
              />

              <CoverCanvasEngine
                width={selectedPreset.width}
                height={selectedPreset.height}
                aspectRatio={selectedPreset.aspectRatio}
                layers={layers}
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
                onUpdateLayer={handleUpdateLayer}
                onDeleteLayer={handleDeleteLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onMoveLayerOrder={handleMoveLayerOrder}
                onToggleLock={(id) => {
                  const layer = layers.find((l) => l.id === id);
                  if (layer) handleUpdateLayer(id, { locked: !layer.locked });
                }}
                backgroundColor={backgroundColor}
                backgroundImageUrl={backgroundImageUrl}
                showSafeZones={showSafeZones}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
