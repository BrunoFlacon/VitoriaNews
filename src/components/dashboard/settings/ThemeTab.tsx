import React, { useState, useEffect } from "react";
import { useThemeStore, AdvancedTheme } from "@/stores/themeStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, RefreshCw, LayoutTemplate, Type, Palette, Move, Shapes, Eye, Check, Globe, Laptop } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ThemeTab = () => {
  const { 
    draftTheme, 
    activeTheme, 
    presets, 
    updateDraft, 
    saveDraft, 
    applyDraftToActive, 
    loadPreset, 
    isLoading,
    currentTarget,
    setTarget,
    fetchThemes
  } = useThemeStore();
  
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchThemes(currentTarget);
  }, [currentTarget]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-display">Sincronizando Estúdio...</div>;
  if (!draftTheme) return null;

  const handleSaveDraft = async () => {
    setSaving(true);
    await saveDraft();
    setSaving(false);
    toast({ title: "Rascunho Salvo", description: `O tema para ${currentTarget} foi guardado.` });
  };

  const handleApply = async () => {
    setApplying(true);
    await applyDraftToActive();
    setApplying(false);
    toast({ title: "Tema Publicado", description: `O tema agora está ativo no ${currentTarget}.` });
  };

  const handleColorChange = (key: string, value: string) => {
    updateDraft('colors', { [key]: value });
  };

  const handleTypographyChange = (key: string, value: string) => {
    updateDraft('typography', { [key]: value });
  };

  const handleButtonChange = (key: string, value: string) => {
    updateDraft('buttons', { [key]: value });
  };

  const toggleFeature = (key: string, value: boolean) => {
    updateDraft('features', { [key]: value });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] w-full border border-border rounded-2xl overflow-hidden bg-background shadow-2xl">
      
      {/* LEFT PANEL: CONTROLS */}
      <div className="w-full lg:w-[420px] border-r border-border bg-sidebar/30 backdrop-blur-sm flex flex-col flex-shrink-0 relative z-10">
        
        {/* HEADER & TOGGLE */}
        <div className="p-5 border-b border-border bg-muted/10 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-display font-bold uppercase tracking-tight text-sm flex items-center gap-2 text-primary">
              <Palette className="w-4 h-4" /> Estúdio de Visual
            </h2>
            <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
               </span>
               <span className="text-[10px] font-bold text-primary">REAL-TIME PREVIEW</span>
            </div>
          </div>

          <Tabs value={currentTarget} onValueChange={(val: any) => setTarget(val)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-background/50 border border-border/50 h-10 p-1">
              <TabsTrigger value="dashboard" className="text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Laptop className="w-3.5 h-3.5" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="portal" className="text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Globe className="w-3.5 h-3.5" /> Portal Público
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin space-y-4">
          
          {/* PRESETS SECTION */}
          <div className="space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1">Presets do Sistema</Label>
            <div className="grid grid-cols-2 gap-2.5">
              {presets.map((p) => (
                <button
                  key={p.name}
                  onClick={() => loadPreset(p)}
                  className="flex flex-col items-start p-3 rounded-2xl border border-border bg-background/50 hover:border-primary/50 transition-all group relative overflow-hidden active:scale-95"
                >
                  <div className="flex gap-1.5 mb-2.5">
                    <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: p.colors.primary }} />
                    <div className="w-4 h-4 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: p.colors.background }} />
                  </div>
                  <span className="text-[11px] font-bold truncate w-full text-left group-hover:text-primary transition-colors">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-2" defaultValue="colors">
            
            <AccordionItem value="colors" className="border-none bg-background/40 rounded-2xl overflow-hidden border border-border/50">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors text-xs font-bold uppercase tracking-wider">
                <div className="flex items-center gap-3"><Palette className="w-4 h-4 text-primary"/> Paleta de Cores</div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pt-2 pb-6 space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  {[
                    { key: "primary", label: "Principal (Actions)" },
                    { key: "background", label: "Fundo Geral" },
                    { key: "surface", label: "Cards e Painéis" },
                    { key: "text_primary", label: "Textos de Destaque" },
                    { key: "text_secondary", label: "Textos de Apoio" }
                  ].map(({key, label}) => (
                    <div key={key} className="space-y-2.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground/80">{label}</Label>
                      <div className="flex gap-3 items-center">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-border bg-muted shadow-md flex-shrink-0 group">
                          <input
                            type="color"
                            value={(draftTheme.colors as any)[key] || "#000000"}
                            onChange={(e) => handleColorChange(key, e.target.value)}
                            className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer scale-150 transition-transform group-hover:scale-125"
                          />
                        </div>
                        <Input
                          type="text"
                          value={(draftTheme.colors as any)[key] || "#000000"}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="font-mono text-xs uppercase h-10 border-border/60 bg-background/50 rounded-xl"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-border/50 space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-primary">Modo Transparência (Glass)</Label>
                      <p className="text-[10px] text-muted-foreground">Efeitos de desfoque e vidro</p>
                    </div>
                    <Switch 
                      checked={draftTheme.features?.glass_effect} 
                      onCheckedChange={(val) => toggleFeature('glass_effect', val)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="typography" className="border-none bg-background/40 rounded-2xl overflow-hidden border border-border/50">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors text-xs font-bold uppercase tracking-wider">
                <div className="flex items-center gap-3"><Type className="w-4 h-4 text-primary"/> Tipografia</div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pt-2 pb-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground/80">Família de Fontes Principal</Label>
                  <select
                    value={draftTheme.typography.font_family || "Inter"}
                    onChange={(e) => handleTypographyChange('font_family', e.target.value)}
                    className="w-full text-sm font-medium border border-border/60 rounded-xl h-10 px-4 bg-background shadow-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  >
                    <option value="Inter">Inter (Padrão)</option>
                    <option value="Roboto">Roboto (Clássica)</option>
                    <option value="Outfit">Outfit (Marca/Moderna)</option>
                    <option value="Montserrat">Montserrat (Display)</option>
                  </select>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground/80">Tamanho H1</Label>
                    <span className="text-[11px] font-mono text-primary font-bold">{draftTheme.typography.h1 || "2.5rem"}</span>
                  </div>
                  <Slider 
                    value={[parseFloat(draftTheme.typography.h1 || "2.5")]} 
                    max={5} min={1} step={0.1}
                    onValueChange={([val]) => handleTypographyChange('h1', `${val}rem`)}
                    className="py-2"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="buttons" className="border-none bg-background/40 rounded-2xl overflow-hidden border border-border/50">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors text-xs font-bold uppercase tracking-wider">
                <div className="flex items-center gap-3"><Shapes className="w-4 h-4 text-primary"/> Formas e Botões</div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pt-2 pb-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground/80">Cantos Arredondados (Radius)</Label>
                    <span className="text-[11px] font-mono text-primary font-bold">{draftTheme.buttons.radius || "12px"}</span>
                  </div>
                  <Slider 
                    value={[parseInt(draftTheme.buttons.radius || "12")]} 
                    max={40} min={0} step={1}
                    onValueChange={([val]) => handleButtonChange('radius', `${val}px`)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>

        <div className="p-5 border-t border-border bg-muted/20 grid grid-cols-2 gap-3 mt-auto">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleSaveDraft} 
            disabled={saving} 
            className="w-full rounded-2xl font-bold text-xs gap-2 border-primary/20 text-primary hover:bg-primary/5 h-12"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={applying} 
            size="lg" 
            className="w-full rounded-2xl font-bold text-xs gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12"
          >
            {applying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Publicar
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL: LIVE MOCKUP PREVIEW */}
      <div className="flex-1 bg-muted/30 relative overflow-hidden flex flex-col p-6 lg:p-10">
        
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentTarget}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 w-full max-w-5xl mx-auto border border-border/50 shadow-2xl relative overflow-hidden flex flex-col glass-morphism"
            style={{ 
              borderRadius: draftTheme.buttons.radius || "1.5rem",
              backgroundColor: draftTheme.colors.background || "#0f172a",
              color: draftTheme.colors.text_primary || "#ffffff",
              fontFamily: draftTheme.typography.font_family || "Inter"
            }}
          >
             {/* Mock Header */}
             <header 
              className="h-20 flex items-center justify-between px-8 border-b border-border/40 backdrop-blur-3xl sticky top-0 z-20"
              style={{ backgroundColor: `${draftTheme.colors.surface || "#1e293b"}cc` }}
             >
                <div className="flex items-center gap-3.5">
                  <div 
                    className="w-10 h-10 flex items-center justify-center shadow-lg" 
                    style={{ 
                      backgroundColor: draftTheme.colors.primary || "#ff4c30", 
                      borderRadius: (parseInt(draftTheme.buttons.radius || "12") * 0.7) + "px" 
                    }}
                  >
                    {currentTarget === 'dashboard' ? <Laptop className="w-5 h-5 text-white" /> : <Globe className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-bold text-lg leading-tight">Hub de Notícias</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{currentTarget} v1.0</span>
                  </div>
                </div>
                
                <div className="hidden md:flex gap-8 items-center">
                  <nav className="flex gap-6">
                    {['Início', 'Produtos', 'Explore'].map(item => (
                       <a key={item} href="#" className="text-sm font-medium hover:text-primary transition-colors opacity-70 hover:opacity-100">{item}</a>
                    ))}
                  </nav>
                  <Button 
                    size="sm" 
                    className="font-bold text-xs h-9 px-5 rounded-full" 
                    style={{ backgroundColor: draftTheme.colors.primary, color: 'white' }}
                  >
                    Get Started
                  </Button>
                </div>
             </header>

             {/* Mock Content Body */}
             <div className="flex-1 p-8 md:p-12 space-y-12 overflow-y-auto overflow-x-hidden scrollbar-thin">
               
               <div className="max-w-3xl space-y-6">
                 <motion.h1 
                   className="font-display font-black tracking-tight leading-[1.1]" 
                   style={{ fontSize: draftTheme.typography.h1 || "3.5rem" }}
                 >
                   O Futuro do seu <span className="text-primary" style={{ color: draftTheme.colors.primary }}>{currentTarget === 'dashboard' ? 'Gerenciamento' : 'Conteúdo'}</span> Começa Aqui.
                 </motion.h1>
                 <p 
                   className="text-lg leading-relaxed opacity-70 font-medium" 
                   style={{ fontSize: draftTheme.typography.body || "1.1rem" }}
                 >
                   Experimente a liberdade de customizar cada detalhe visual. Do arredondamento dos botões à paleta de cores primárias, seu controle é total e instantâneo.
                 </p>
                 <div className="flex flex-wrap gap-4 pt-4">
                    <Button 
                      className="h-14 px-8 font-bold text-base shadow-xl hover:scale-105 active:scale-95 transition-all"
                      style={{ 
                        backgroundColor: draftTheme.colors.primary, 
                        borderRadius: draftTheme.buttons.radius || "12px",
                        color: 'white'
                      }}
                    >
                      Ação Principal
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-14 px-8 font-bold text-base border-2 hover:bg-primary/5 transition-all"
                      style={{ 
                        borderColor: draftTheme.colors.primary, 
                        color: draftTheme.colors.primary,
                        borderRadius: draftTheme.buttons.radius || "12px"
                      }}
                    >
                      Saber Mais
                    </Button>
                 </div>
               </div>

               {/* Mock Feature Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                 {[
                   { title: 'Estúdio Design', desc: 'Edite tipografia e layouts sem tocar em uma única linha de código.' },
                   { title: 'Velocidade', desc: 'Carregamento instantâneo via CDN otimizada para todas as regiões.' }
                 ].map((card, i) => (
                    <motion.div 
                      key={card.title}
                      initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-8 border border-white/10 shadow-xl relative overflow-hidden flex flex-col gap-4 group"
                      style={{ 
                        backgroundColor: draftTheme.colors.surface || "#1e293b", 
                        borderRadius: draftTheme.buttons.radius || "24px" 
                      }}
                    >
                      <div className="absolute -top-10 -right-10 w-40 h-40 blur-3xl rounded-full opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: draftTheme.colors.primary }} />
                      <h3 className="font-display font-bold text-xl">{card.title}</h3>
                      <p className="text-sm opacity-60 leading-relaxed font-medium">{card.desc}</p>
                      <a href="#" className="mt-4 text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                        Detalhes do Módulo <Check className="w-3 h-3" />
                      </a>
                    </motion.div>
                 ))}
               </div>

             </div>

             {/* Footer Mock */}
             <footer className="p-8 border-t border-white/5 opacity-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span>© 2024 Hub de Notícias</span>
                <span className="text-primary" style={{ color: draftTheme.colors.primary }}>v1.0.5 Release</span>
             </footer>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
