import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  MessageSquare, 
  Users, 
  Radio, 
  MessageCircle, 
  Save, 
  Plus, 
  Trash2, 
  Zap, 
  Sparkles, 
  Brain,
  ShieldCheck,
  Power,
  PowerOff,
  ChevronRight,
  Settings2,
  Cpu,
  MessagesSquare,
  Hash,
  AlertCircle,
  MousePointer2,
  Bell,
  Info
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BotSetting {
  id?: string;
  platform: string;
  is_active: boolean;
  respond_groups: boolean;
  respond_private: boolean;
  respond_channels: boolean;
  respond_broadcast_lists: boolean;
  respond_comments: boolean;
  ai_prompt: string;
  ai_provider: string;
  ai_model: string;
  openai_api_key?: string;
  groq_api_key?: string;
  openrouter_api_key?: string;
  claude_api_key?: string;
  gemini_api_key?: string;
  flow_coordinates: Array<{ keyword: string; response: string; category: string }>;
  behavior_mode: 'fixed' | 'ai' | 'hybrid';
  floating_button_enabled?: boolean;
  audio_alerts_enabled?: boolean;
  silence_duration_hours?: number;
}

const RobotBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, BotSetting>>({});
  const [activePlatform, setActivePlatform] = useState("whatsapp");
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Load settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('bot_settings' as any)
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        const settingsMap: Record<string, BotSetting> = {};
        data?.forEach((item: any) => {
          settingsMap[item.platform] = item;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error("Error loading bot settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const fetchLogs = async (platform: string) => {
    if (!user) return;
    try {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .order('sent_at', { ascending: false })
        .limit(200); // Mostrando até 200, podemos aumentar se necessário

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
      toast({
        title: "Erro ao carregar logs",
        description: "Não foi possível sincronizar o histórico do robô.",
        variant: "destructive"
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isLogsOpen) {
      fetchLogs(activePlatform);
    }
  }, [isLogsOpen, activePlatform]);

  const handleSave = async (platform: string, overrides: Partial<BotSetting> = {}) => {
    if (!user) return;
    try {
      setSaving(true);
      const currentSetting = settings[platform] || {
        platform,
        is_active: false,
        respond_groups: false,
        respond_private: true,
        respond_channels: false,
        respond_broadcast_lists: false,
        respond_comments: false,
        ai_prompt: "",
        flow_coordinates: [],
        behavior_mode: 'hybrid',
        ai_provider: 'openai',
        ai_model: 'gpt-4o-mini',
        floating_button_enabled: true,
        audio_alerts_enabled: true,
        silence_duration_hours: 1
      };

      const settingToSave = { ...currentSetting, ...overrides };
      const isActive = overrides.is_active ?? settingToSave.is_active;

      const { error } = await supabase
        .from('bot_settings' as any)
        .upsert({
          ...settingToSave,
          user_id: user.id,
          platform,
          is_active: isActive
        }, { onConflict: 'user_id,platform' });

      if (error) throw error;

      const statusLabel = isActive ? "ATIVADO" : "DESATIVADO";
      toast({
        title: `Robô ${statusLabel}!`,
        description: `O assistente para ${platform.toUpperCase()} agora está ${statusLabel.toLowerCase()}.`,
        variant: isActive ? "default" : "destructive",
      });
    } catch (err) {
      console.error("Error saving bot settings:", err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível sincronizar com o servidor.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (platform: string, key: keyof BotSetting, value: any) => {
    setSettings(prev => ({
      ...prev,
      [platform]: {
        ...(prev[platform] || {
          platform,
          is_active: false,
          respond_groups: false,
          respond_private: true,
          respond_channels: false,
          respond_broadcast_lists: false,
          respond_comments: false,
          ai_prompt: "",
          flow_coordinates: [],
          behavior_mode: 'hybrid',
          ai_provider: 'openai',
          ai_model: 'gpt-4o-mini',
          floating_button_enabled: true,
          audio_alerts_enabled: true,
          silence_duration_hours: 1
        } as BotSetting),
        [key]: value
      }
    }));
  };

  const addFlow = (platform: string) => {
    const currentFlows = settings[platform]?.flow_coordinates || [];
    updateSetting(platform, 'flow_coordinates', [
      ...currentFlows,
      { keyword: "", response: "", category: "geral" }
    ]);
  };

  const removeFlow = (platform: string, index: number) => {
    const currentFlows = [...(settings[platform]?.flow_coordinates || [])];
    currentFlows.splice(index, 1);
    updateSetting(platform, 'flow_coordinates', currentFlows);
  };

  const updateFlow = (platform: string, index: number, key: string, value: string) => {
    const currentFlows = [...(settings[platform]?.flow_coordinates || [])];
    currentFlows[index] = { ...currentFlows[index], [key]: value };
    updateSetting(platform, 'flow_coordinates', currentFlows);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Bot className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-black text-4xl tracking-tight text-foreground">
                Artesão de Bots <span className="text-primary italic">Universal</span>
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Brain className="w-4 h-4" /> Inteligência Artificial & Fluxos de Atendimento Híbridos
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-4 py-2 bg-green-500/10 text-green-500 border-green-500/20 font-black text-xs uppercase tracking-widest">
            Brain Engine v2.0
          </Badge>
          <Button 
            onClick={() => handleSave(activePlatform)} 
            disabled={saving}
            className="rounded-xl shadow-lg shadow-primary/20 gap-2 font-bold px-6"
          >
            {saving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Fluxo
          </Button>
        </div>
      </div>

      <Tabs value={activePlatform} onValueChange={setActivePlatform} className="w-full">
        <TabsList className="bg-muted/30 p-1.5 h-auto rounded-2xl grid grid-cols-2 md:grid-cols-5 gap-2 border border-border/50">
          {['whatsapp', 'telegram', 'instagram', 'facebook', 'threads'].map((platId) => {
            const plat = socialPlatforms.find(p => p.id === platId);
            return (
              <TabsTrigger 
                key={platId} 
                value={platId}
                className="rounded-xl py-3 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2"
              >
                {plat && <plat.icon className="w-4 h-4" />}
                <span className="capitalize">{platId}</span>
                {settings[platId]?.is_active && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping absolute top-2 right-2" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <AnimatePresence>
          {['whatsapp', 'telegram', 'instagram', 'facebook', 'threads'].map((platId) => (
            <TabsContent key={platId} value={platId} className="mt-8 focus-visible:outline-none focus-visible:ring-0">
              {activePlatform === platId && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* CONFIG COL 1: ACTIVATION & UX (THE CLASSIC DESIGN) */}
                <div className="space-y-6">
                  <Card className="p-6 bg-card/50 backdrop-blur-md border-border/50 rounded-3xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <Settings2 className="w-24 h-24 group-hover:rotate-45 transition-transform duration-1000" />
                    </div>
                    
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                      <Power className={cn("w-5 h-5", settings[platId]?.is_active ? "text-green-500" : "text-muted-foreground")} />
                      Conexão e Status
                    </h3>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/20">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-black uppercase tracking-wider">Robô Ativo</Label>
                          <p className="text-xs text-muted-foreground">Responder automaticamente em {platId}</p>
                        </div>
                        <Switch 
                          checked={!!settings[platId]?.is_active} 
                          onCheckedChange={async (val) => {
                            updateSetting(platId, 'is_active', val);
                            // Pass override to ensure correct toast label and immediate save
                            await handleSave(platId, { is_active: val });
                          }}
                        />
                      </div>

                      <Separator className="bg-border/30" />

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Experiência do Usuário (UX)</h4>
                        
                        <div className="grid gap-3">
                          <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted/30 transition-colors">
                            <label className="text-xs font-semibold flex items-center gap-2 cursor-pointer">
                              <Zap className="w-3.5 h-3.5 text-primary/70" />
                              Botão Flutuante Inteligente
                            </label>
                            <Switch 
                              checked={settings[platId]?.floating_button_enabled ?? true} 
                              onCheckedChange={async (val) => {
                                updateSetting(platId, 'floating_button_enabled', val);
                                await handleSave(platId, { floating_button_enabled: val });
                              }}
                              className="scale-75"
                            />
                          </div>

                          <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted/30 transition-colors">
                            <label className="text-xs font-semibold flex items-center gap-2 cursor-pointer">
                              <Radio className="w-3.5 h-3.5 text-primary/70" />
                              Alertas Sonoros (WhatsApp Style)
                            </label>
                            <Switch 
                              checked={settings[platId]?.audio_alerts_enabled ?? true} 
                              onCheckedChange={async (val) => {
                                updateSetting(platId, 'audio_alerts_enabled', val);
                                await handleSave(platId, { audio_alerts_enabled: val });
                              }}
                              className="scale-75"
                            />
                          </div>

                          <div className="px-3 py-2 space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Silêncio Inteligente (Horas)</Label>
                            <Input 
                              type="number" 
                              min="0" 
                              max="24"
                              value={settings[platId]?.silence_duration_hours ?? 1}
                              onChange={(e) => updateSetting(platId, 'silence_duration_hours', parseInt(e.target.value))}
                              className="h-8 bg-muted/20 border-none rounded-lg text-xs font-bold"
                            />
                            <p className="text-[9px] text-muted-foreground leading-tight italic">
                              Tempo que o robô aguarda após uma intervenção humana.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator className="bg-border/30" />

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Onde ele atua?</h4>
                        
                        <div className="grid gap-3">
                          {[
                            { label: "Conversas Privadas (Inbox)", key: "respond_private", icon: MessageSquare },
                            { label: "Grupos de Chat", key: "respond_groups", icon: Users },
                            { label: "Canais / Comunidades", key: "respond_channels", icon: MessagesSquare },
                            { label: "Comentários em Posts", key: "respond_comments", icon: Hash },
                            { label: "Lista de Transmissão", key: "respond_broadcast_lists", icon: Radio },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted/30 transition-colors">
                              <label className="text-xs font-semibold flex items-center gap-2 cursor-pointer">
                                <item.icon className="w-3.5 h-3.5 text-primary/70" />
                                {item.label}
                              </label>
                              <Switch 
                                checked={!!(settings[platId] as any)?.[item.key]} 
                                onCheckedChange={async (val) => {
                                  updateSetting(platId, item.key as any, val);
                                  await handleSave(platId, { [item.key]: val });
                                }}
                                className="scale-75"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* GLOBAL SAVE BUTTON PER PLATFORM */}
                  <Button 
                    onClick={() => handleSave(platId)} 
                    disabled={saving}
                    className="w-full rounded-2xl shadow-xl shadow-primary/20 gap-3 font-black py-8 h-auto text-lg hover:scale-[1.02] transition-transform flex flex-col"
                  >
                    <div className="flex items-center gap-2">
                      {saving ? <Sparkles className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                      Salvar Tudo em {platId.toUpperCase()}
                    </div>
                    <span className="text-[10px] font-medium opacity-60">Sincroniza todas as abas e painéis</span>
                  </Button>
                </div>

                {/* CONFIGURATION AREA: THE 3-TAB SYSTEM (UPGRADED DESIGN) */}
                <div className="lg:col-span-2 space-y-6">
                  <Tabs defaultValue="ia-config" className="w-full">
                    <TabsList className="bg-muted/20 border border-border/50 p-1.5 h-auto rounded-2xl mb-6 flex flex-wrap">
                      <TabsTrigger value="ia-config" className="gap-2 font-black px-6 py-3 data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground/70">
                        <Zap className="w-4 h-4" /> Chaves IA
                      </TabsTrigger>
                      <TabsTrigger value="flows-config" className="gap-2 font-black px-6 py-3 data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground/70">
                        <MessagesSquare className="w-4 h-4" /> Fluxos do Bot
                      </TabsTrigger>
                      <TabsTrigger value="prompt-config" className="gap-2 font-black px-6 py-3 data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground/70">
                        <Sparkles className="w-4 h-4" /> Modelo & Prompt
                      </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: AI CONFIG & KEYS */}
                    <TabsContent value="ia-config" className="focus-visible:ring-0">
                      <Card className="p-8 bg-card border-border rounded-3xl shadow-xl shadow-black/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                          <Cpu className="w-32 h-32" />
                        </div>
                        
                        <div className="flex items-center gap-3 mb-8">
                          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Zap className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-display font-black text-xl text-foreground">Provedores de Inteligência</h3>
                            <p className="text-sm text-muted-foreground italic">Selecione seu motor de IA e configure a chave de acesso.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50 space-y-3">
                              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Configurar Provedor</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { id: 'openai', label: 'OpenAI (GPT)', icon: Sparkles },
                                  { id: 'groq', label: 'Groq (Llama)', icon: Zap },
                                  { id: 'openrouter', label: 'OpenRouter', icon: Cpu },
                                  { id: 'google', label: 'Gemini', icon: Brain },
                                ].map((p) => (
                                  <Button
                                    key={p.id}
                                    variant={settings[platId]?.ai_provider === p.id ? "default" : "outline"}
                                    onClick={() => updateSetting(platId, 'ai_provider', p.id)}
                                    className={cn(
                                      "h-12 gap-2 font-bold rounded-xl justify-start px-4",
                                      settings[platId]?.ai_provider === p.id 
                                        ? "bg-primary text-primary-foreground" 
                                        : "bg-background text-foreground border-border hover:bg-muted"
                                    )}
                                  >
                                    <p.icon className="w-4 h-4" />
                                    <span className="text-[10px]">{p.label}</span>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <form onSubmit={(e) => e.preventDefault()} className="space-y-6 bg-muted/20 p-6 rounded-3xl border border-border/50">
                            {/* Hidden field for accessibility/autocomplete */}
                            <input 
                              type="text" 
                              name="username" 
                              autoComplete="username" 
                              value={platId} 
                              readOnly 
                              className="sr-only" 
                              tabIndex={-1} 
                            />
                            
                            <div className="space-y-2">
                              <Label className="text-xs font-black uppercase tracking-wider ml-1 text-foreground">API KEY</Label>
                              <Input 
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                value={
                                  (settings[platId]?.ai_provider === 'groq' ? settings[platId]?.groq_api_key :
                                  settings[platId]?.ai_provider === 'openrouter' ? settings[platId]?.openrouter_api_key :
                                  settings[platId]?.ai_provider === 'openai' ? settings[platId]?.openai_api_key :
                                  settings[platId]?.ai_provider === 'google' ? settings[platId]?.gemini_api_key :
                                  '') || ""
                                }
                                onChange={(e) => {
                                  const key = 
                                    settings[platId]?.ai_provider === 'groq' ? 'groq_api_key' :
                                    settings[platId]?.ai_provider === 'openrouter' ? 'openrouter_api_key' :
                                    settings[platId]?.ai_provider === 'openai' ? 'openai_api_key' :
                                    settings[platId]?.ai_provider === 'google' ? 'gemini_api_key' :
                                    '';
                                  if (key) updateSetting(platId, key as any, e.target.value);
                                }}
                                placeholder="sk-..."
                                className="h-12 bg-background border-input rounded-xl font-mono text-sm text-foreground shadow-inner focus:ring-primary/20"
                              />
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                              <ShieldCheck className="w-4 h-4 text-green-500" />
                              <span className="text-[10px] font-bold text-green-500">Inteligência Híbrida Ativada</span>
                              <Switch 
                                checked={settings[platId]?.behavior_mode !== 'fixed'} 
                                onCheckedChange={(val) => updateSetting(platId, 'behavior_mode', val ? 'hybrid' : 'fixed')}
                                className="ml-auto"
                              />
                            </div>
                          </form>
                        </div>
                      </Card>
                    </TabsContent>

                    {/* TAB 2: FLOWS (KEYWORD TRIGGERS) */}
                    <TabsContent value="flows-config" className="focus-visible:ring-0">
                      <Card className="p-8 bg-card border-border rounded-3xl shadow-xl shadow-black/20">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                              <MessagesSquare className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-display font-black text-xl text-foreground">Fluxos de Resposta</h3>
                              <p className="text-sm text-muted-foreground italic">Gatilhos automáticos para mensagens tradicionais.</p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={() => addFlow(platId)}
                            className="rounded-xl border-primary/30 text-primary hover:bg-primary/5 font-bold gap-2"
                          >
                            <Plus className="w-4 h-4" /> Novo Gatilho
                          </Button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {settings[platId]?.flow_coordinates?.length === 0 ? (
                            <div className="text-center py-20 rounded-3xl border-2 border-dashed border-border/50 bg-muted/5">
                              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                              <p className="text-muted-foreground font-medium">Nenhum fluxo configurado.</p>
                            </div>
                          ) : (
                            settings[platId]?.flow_coordinates.map((flow, fIdx) => (
                              <Card key={fIdx} className="p-6 bg-muted/10 border border-border/40 rounded-2xl group hover:border-primary/30 transition-all">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                  <div className="md:col-span-4 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Usuário diz:</Label>
                                    <Input 
                                      value={flow.keyword || ""} 
                                      onChange={(e) => updateFlow(platId, fIdx, 'keyword', e.target.value)}
                                      placeholder="Ex: oi, olá" 
                                      className="bg-background border-none rounded-xl text-xs font-bold text-foreground shadow-sm"
                                    />
                                  </div>
                                  <div className="md:col-span-7 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Robô responde:</Label>
                                    <Textarea 
                                      value={flow.response || ""}
                                      onChange={(e) => updateFlow(platId, fIdx, 'response', e.target.value)}
                                      placeholder="Sua resposta..." 
                                      className="min-h-[80px] bg-background border-none rounded-xl text-xs text-foreground shadow-sm resize-none"
                                    />
                                  </div>
                                  <div className="md:col-span-1 pt-8 flex justify-end">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => removeFlow(platId, fIdx)}
                                      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))
                          )}
                        </div>
                      </Card>
                    </TabsContent>

                    {/* TAB 3: MODEL & PROMPT */}
                    <TabsContent value="prompt-config" className="focus-visible:ring-0">
                      <Card className="p-8 bg-card border-border rounded-3xl shadow-xl shadow-black/20">
                        <div className="flex items-center gap-3 mb-8">
                          <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                            <Brain className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-display font-black text-xl text-foreground">Alma do Robô</h3>
                            <p className="text-sm text-muted-foreground italic">Combine a personalidade com o motor de inteligência.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
                          <div className="lg:col-span-7 space-y-6">
                            <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Prompt do Sistema (Contexto)</Label>
                              <Textarea 
                                value={settings[platId]?.ai_prompt || ""}
                                onChange={(e) => updateSetting(platId, 'ai_prompt', e.target.value)}
                                placeholder="Você é o assistente virtual da empresa..."
                                className="min-h-[200px] rounded-2xl bg-muted/20 border-border/50 text-foreground resize-none font-medium leading-relaxed"
                              />
                            </div>
                          </div>

                          <div className="lg:col-span-3 space-y-6">
                            <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Modelo IA</Label>
                              <div className="space-y-2">
                                {[
                                  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
                                  { id: 'mixtral-8x7b-32768', label: 'Mixtral (Live)', provider: 'groq' },
                                  { id: 'llama3-70b-8192', label: 'Llama 3 70B', provider: 'groq' },
                                  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'google' },
                                ].map((m) => (
                                  <button
                                    key={m.id}
                                    onClick={() => updateSetting(platId, 'ai_model', m.id)}
                                    className={cn(
                                      "w-full text-left p-3 rounded-xl border transition-all",
                                      settings[platId]?.ai_model === m.id 
                                        ? "bg-primary text-primary-foreground border-primary" 
                                        : "bg-muted/30 border-transparent text-foreground hover:bg-muted/50"
                                    )}
                                  >
                                    <p className="text-xs font-bold">{m.label}</p>
                                  </button>
                                ))}
                                <div className="pt-2">
                                  <Label className="text-[10px] font-black uppercase opacity-40 text-foreground">Custom ID</Label>
                                  <Input 
                                    value={settings[platId]?.ai_model || ""}
                                    onChange={(e) => updateSetting(platId, 'ai_model', e.target.value)}
                                    className="h-8 bg-muted/20 border-none rounded-lg text-xs text-foreground"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="p-4 rounded-3xl bg-amber-500/5 border border-amber-500/10">
                              <Label className="text-[10px] font-black uppercase text-amber-500 mb-2 block">Cérebro do Robô</Label>
                              <select 
                                value={settings[platId]?.behavior_mode || "hybrid"}
                                onChange={(e) => updateSetting(platId, 'behavior_mode', e.target.value)}
                                className="w-full bg-background border border-border rounded-lg p-2 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary shadow-sm"
                              >
                                <option value="hybrid" className="bg-background text-foreground">Híbrido (Fluxo + IA)</option>
                                <option value="fixed" className="bg-background text-foreground">Rígido (Apenas Fluxo)</option>
                                <option value="ai" className="bg-background text-foreground">IA Livre (Experimental)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
            </TabsContent>
          ))}
        </AnimatePresence>
      </Tabs>
      <div className="p-8 rounded-[40px] bg-gradient-to-br from-indigo-500/10 via-accent/5 to-primary/10 border border-border/50 text-center relative overflow-hidden group">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
         <Zap className="w-12 h-12 text-primary mx-auto mb-4 animate-bounce" />
         <h2 className="text-2xl font-black mb-2 italic">Integração Total Vitória Net</h2>
         <p className="text-muted-foreground max-w-2xl mx-auto font-medium">
           Este robô não apenas responde mensagens. Ele sincroniza o sentimento das conversas com o seu <strong>Analytics</strong>, identifica <strong>Trends</strong> virais no inbox e alerta sobre <strong>Eventos de Ataque</strong> em tempo real.
         </p>
         <div className="mt-8 flex justify-center gap-4">
            <Sheet open={isLogsOpen} onOpenChange={setIsLogsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="rounded-2xl gap-2 font-bold px-8 py-6 h-auto border-border bg-background shadow-xl hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5 text-green-500" /> Auditoria de Logs
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col h-full bg-card border-l border-border/50">
                <SheetHeader className="p-6 border-b border-border/30 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <SheetTitle className="font-black text-2xl uppercase tracking-tighter">Auditoria de Operações</SheetTitle>
                      <SheetDescription className="text-xs font-medium italic">
                        Histórico completo de interações para {activePlatform.toUpperCase()}
                      </SheetDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => fetchLogs(activePlatform)}
                      disabled={loadingLogs}
                      className="rounded-full hover:bg-primary/10 text-primary"
                    >
                      <Zap className={cn("w-5 h-5", loadingLogs && "animate-spin")} />
                    </Button>
                  </div>
                </SheetHeader>
                
                <ScrollArea className="flex-1 p-6">
                  {loadingLogs && logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Cpu className="w-10 h-10 text-primary/30 animate-pulse" />
                      <p className="text-sm font-bold text-muted-foreground animate-pulse">Sincronizando logs...</p>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                      <ShieldCheck className="w-16 h-16" />
                      <p className="font-bold">Nenhum registro encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {logs.map((log) => {
                        const isSystem = log.metadata?.is_system_log;
                        const botError = log.metadata?.bot_error;

                        return (
                          <div key={log.id} className={cn(
                            "flex flex-col gap-2 p-4 rounded-2xl border transition-all",
                            log.status === 'sent' 
                              ? "bg-primary/5 border-primary/20 ml-6" 
                              : isSystem
                                ? "bg-amber-500/5 border-amber-500/20 mx-3"
                                : "bg-muted/10 border-border/30 mr-6"
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {log.status === 'sent' ? (
                                  <>
                                    <Bot className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[10px] font-black uppercase text-primary">Resposta Robô</span>
                                  </>
                                ) : isSystem ? (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[10px] font-black uppercase text-amber-500">Log de Sistema</span>
                                  </>
                                ) : (
                                  <>
                                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground">Cliente</span>
                                  </>
                                )}
                              </div>
                              <span className="text-[9px] font-mono opacity-50">
                                {log.sent_at ? format(new Date(log.sent_at), "HH:mm:ss 'em' dd/MM", { locale: ptBR }) : '-'}
                              </span>
                            </div>
                            
                            <p className={cn(
                              "text-sm font-medium leading-relaxed break-words",
                              isSystem ? "text-amber-600/90 italic" : "text-foreground"
                            )}>
                              {log.content}
                            </p>
                            
                            {(log.metadata?.bot_reply || botError) && (
                              <div className="flex items-center gap-1.5 mt-1 border-t border-primary/10 pt-2">
                                <Badge variant="outline" className={cn(
                                  "text-[8px] px-1 py-0 font-bold uppercase",
                                  botError 
                                    ? "bg-destructive/10 text-destructive border-destructive/20"
                                    : "bg-primary/10 text-primary border-primary/20"
                                )}>
                                  {botError ? "FALHA NA LÓGICA" : "IA ATIVA"}
                                </Badge>
                                <span className="text-[9px] text-muted-foreground italic">
                                  {botError ? `Motivo: ${botError}` : "Processado via Brain Engine"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
                
                <div className="p-4 bg-muted/10 border-t border-border/30 text-center">
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">
                    Vitoria Net Security Audit • {new Date().getFullYear()}
                  </p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
      </div>
    </div>
  );
};

export default RobotBuilder;
