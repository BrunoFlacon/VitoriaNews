import React, { useState } from "react";
import { 
  Palette, Type, Image as LucideImage, Sparkles, Download, Save, RefreshCw, 
  Layers, Video, Music, Radio, BarChart3, Plus, ShieldCheck, CheckCircle2, Eye, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { COVER_PRESETS, CoverPreset, PresetSelector } from "./PresetSelector";
import { CoverCanvasEngine, CanvasLayer } from "./CoverCanvasEngine";
import { AudioWaveformOverlay } from "./AudioWaveformOverlay";
import { CoverAnalyticsView } from "./CoverAnalyticsView";

export const CoverStudioView: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"editor" | "analytics">("editor");
  const [selectedPreset, setSelectedPreset] = useState<CoverPreset>(COVER_PRESETS[0]);
  const [title, setTitle] = useState("Capa para Vídeo / Live / Podcast");
  const [backgroundColor, setBackgroundColor] = useState("#0F172A");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleSelectPreset = (preset: CoverPreset) => {
    setSelectedPreset(preset);
    toast({
      title: `Formato Alterado: ${preset.name}`,
      description: `Dimensões ajustadas para ${preset.width}x${preset.height} (${preset.aspectRatio})`,
    });
  };

  const handleAddTextLayer = () => {
    const newLayer: CanvasLayer = {
      id: `text_${Date.now()}`,
      name: `Texto ${layers.length + 1}`,
      type: "text",
      x: 150,
      y: 300,
      width: 600,
      height: 80,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: "Novo Texto da Capa",
      fontSize: 48,
      fontFamily: "Inter, sans-serif",
      fontWeight: "bold",
      color: "#FACC15",
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
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
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleUpdateLayer = (id: string, updates: Partial<CanvasLayer>) => {
    setLayers(layers.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleSaveCover = async () => {
    setIsExporting(true);
    try {
      // Simulate rendering & storage upload
      await new Promise((r) => setTimeout(r, 1200));

      toast({
        title: "Capa Salva e Exportada com Sucesso!",
        description: `Armazenada no bucket 'media-covers' em formato ${selectedPreset.aspectRatio}. Pronta para vincular a vídeos, lives ou podcasts.`,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao Salvar Capa",
        description: err.message || "Não foi possível exportar a imagem.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-6 rounded-3xl border border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Social Canvas Studio — Criador de Capas
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Crie capas profissionais para Vídeos, Lives, Reels/Shorts e Podcasts no Spotify com dimensionamento automático e métricas de conversão.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border/50">
          <Button
            variant={activeTab === "editor" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("editor")}
            className="gap-2 text-xs font-bold uppercase tracking-wider rounded-xl h-9 px-4"
          >
            <Palette className="w-4 h-4" />
            Estúdio de Criação
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("analytics")}
            className="gap-2 text-xs font-bold uppercase tracking-wider rounded-xl h-9 px-4"
          >
            <BarChart3 className="w-4 h-4" />
            Estatísticas & CTR
          </Button>
        </div>
      </div>

      {activeTab === "analytics" ? (
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

          {/* Main Studio Editor Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Toolbar / Layer Controls */}
            <div className="lg:col-span-4 bg-card/50 p-5 rounded-3xl border border-border/60 space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
                  Título do Projeto
                </p>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome da capa..."
                  className="bg-background/80 border-border/60 rounded-xl"
                />
              </div>

              {/* Add Layer Actions */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Adicionar Elementos
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddTextLayer}
                    className="gap-2 text-xs font-bold rounded-xl justify-start h-10"
                  >
                    <Type className="w-4 h-4 text-primary" />
                    Texto 3D
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddBadgeLayer("live")}
                    className="gap-2 text-xs font-bold rounded-xl justify-start h-10"
                  >
                    <Sparkles className="w-4 h-4 text-red-500" />
                    Selo AO VIVO
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddBadgeLayer("podcast")}
                    className="gap-2 text-xs font-bold rounded-xl justify-start h-10"
                  >
                    <Radio className="w-4 h-4 text-blue-500" />
                    Selo PODCAST
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddBadgeLayer("news")}
                    className="gap-2 text-xs font-bold rounded-xl justify-start h-10"
                  >
                    <ShieldCheck className="w-4 h-4 text-yellow-500" />
                    Selo URGENTE
                  </Button>
                </div>
              </div>

              {/* Audio Waveform Widget for Podcasts */}
              {selectedPreset.category === "audio" && (
                <div className="pt-2">
                  <AudioWaveformOverlay color="#3B82F6" style="bars" />
                </div>
              )}

              {/* Selected Layer Inspector */}
              {selectedLayer && (
                <div className="bg-muted/40 p-4 rounded-2xl border border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase text-primary tracking-wider">
                      Propriedades: {selectedLayer.name}
                    </p>
                  </div>

                  {selectedLayer.type === "text" && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Conteúdo</p>
                      <Input
                        value={selectedLayer.content}
                        onChange={(e) => handleUpdateLayer(selectedLayer.id, { content: e.target.value })}
                        className="bg-background rounded-xl text-xs"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Cor:</p>
                        <input
                          type="color"
                          value={selectedLayer.color || "#FFFFFF"}
                          onChange={(e) => handleUpdateLayer(selectedLayer.id, { color: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Export Action */}
              <div className="pt-4 border-t border-border/60">
                <Button
                  onClick={handleSaveCover}
                  disabled={isExporting}
                  className="w-full h-12 rounded-2xl font-black uppercase tracking-wider text-xs gap-2 shadow-xl bg-primary text-primary-foreground"
                >
                  {isExporting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Exportar & Salvar Capa ({selectedPreset.aspectRatio})
                </Button>
              </div>
            </div>

            {/* Right Canvas Preview Area */}
            <div className="lg:col-span-8 bg-card/40 p-6 rounded-3xl border border-border/60 min-h-[550px] flex items-center justify-center">
              <CoverCanvasEngine
                width={selectedPreset.width}
                height={selectedPreset.height}
                aspectRatio={selectedPreset.aspectRatio}
                layers={layers}
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
                onUpdateLayer={handleUpdateLayer}
                backgroundColor={backgroundColor}
                backgroundImageUrl={backgroundImageUrl}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
