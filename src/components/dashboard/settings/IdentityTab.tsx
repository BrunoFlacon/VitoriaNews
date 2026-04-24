import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Image as ImageIcon, Loader2, Share2, Globe, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSystem } from "@/contexts/SystemContext";
import { Switch } from "@/components/ui/switch";
import { SafeImage } from "@/components/ui/SafeImage";

export const IdentityTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    platform_name: "",
    logo_url: "",
    favicon_url: "",
    show_logo: true
  });
  const { updateSettingsOptimistic } = useSystem();
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await (supabase as any).from('system_settings').select('*').eq('group', 'general').maybeSingle();
      if (data) {
        setSettings({
          ...data,
          show_logo: data.show_logo !== false // Default to true
        });
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...settings, group: 'general' };
      if (!settings.id) {
        const { error } = await (supabase as any).from('system_settings').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('system_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      }
      updateSettingsOptimistic(settings);
      toast({ title: "Sucesso", description: "Identidade da plataforma atualizada!" });
    } catch (error: any) {
      console.error("Identity Save Error:", error);
      const errorMsg = error?.message || "Falha ao salvar a identidade";
      toast({ 
        title: "Erro no Servidor", 
        description: `${errorMsg}. Verifique se a tabela 'system_settings' existe no banco de dados.`, 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLogo = async () => {
    setSettings((prev: any) => ({ ...prev, logo_url: "" }));
    toast({ title: "Logo removida do preview", description: "Clique em salvar para aplicar a mudança." });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'favicon_url') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSaving(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `system/${field}_${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      
      setSettings((prev: any) => ({ ...prev, [field]: url }));
      toast({ title: "Upload Realizado" });
    } catch (error) {
      toast({ title: "Erro no upload", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-6 space-y-6">
      
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Plataforma</label>
          <Input 
            value={settings.platform_name || ""} 
            onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })} 
            className="bg-muted/30 max-w-md"
          />
        </div>

        <div className="flex flex-col items-end gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exibir Logomarca</label>
          <div className="flex items-center gap-3 bg-muted/20 px-4 py-2 rounded-xl border border-border/40">
            <span className="text-xs font-medium">{settings.show_logo ? "Ativado" : "Desativado"}</span>
            <Switch 
              checked={settings.show_logo} 
              onCheckedChange={(val) => setSettings({ ...settings, show_logo: val })}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/20">
        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logomarca (Dashboard e Login)</label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-16 rounded-lg border border-border/40 bg-muted/20 flex flex-col items-center justify-center overflow-hidden flex-shrink-0">
              {settings.logo_url ? <SafeImage src={settings.logo_url} alt="Logo" className="w-auto h-full object-contain p-2" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/50" />}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>Alterar Logo</Button>
              {settings.logo_url && (
                <Button type="button" variant="destructive" size="sm" onClick={handleDeleteLogo} className="gap-2">
                  <Trash2 className="w-3 h-3" /> Excluir
                </Button>
              )}
              <input type="file" ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo_url')} className="hidden" accept="image/*" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Favicon (Ícone do Navegador)</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {settings.favicon_url ? <SafeImage src={settings.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/50" />}
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()}>Alterar Favicon</Button>
              <input type="file" ref={faviconInputRef} onChange={(e) => handleFileUpload(e, 'favicon_url')} className="hidden" accept="image/png,image/x-icon,image/svg+xml" />
            </div>
          </div>
        </div>
      </div>

      {/* Identidade Visual Preview */}
      <div className="pt-6 border-t border-border/20">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 block">Visualização (Preview)</label>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Mockup Sidebar */}
          <div className="flex-1 rounded-xl border border-border/50 bg-sidebar overflow-hidden shadow-sm relative">
            <div className="absolute top-2 left-2 right-2 flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
            </div>
            <div className="p-6 pt-10 border-b border-sidebar-border flex items-center gap-3">
              {settings.show_logo !== false && (
                settings.logo_url ? (
                  <SafeImage src={settings.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-xl bg-background/50" />
                ) : (
                  /* INÍCIO LOGOMARCA PADRÃO DO SISTEMA (SVG NOVO) */
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4F8AFF] to-[#8B5CF6] flex items-center justify-center">
                    <svg viewBox="0 0 64 64" className="w-[98%] h-[98%] text-black fill-current">
                      <path d="M45.9,26.4l5.2-5.2c-11.8-11.7-26.4-11.7-38.1,0l5.2,5.2C27.1,17.5,37,17.5,45.9,26.4L45.9,26.4z" />
                      <path d="M44.2,38.1L32,26l-12.1,12L7.7,26l-5.2,5.2l17.3,17.2l12.1-12l12.1,12l17.3-17.2L56.3,26L44.2,38.1z" />
                    </svg>
                  </div>
                  /* FIM LOGOMARCA PADRÃO DO SISTEMA */
                )
              )}
              <span className="font-display font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4F8AFF] to-[#8B5CF6] truncate">
                {settings.platform_name || "SocialHub"}
              </span>
            </div>
            <div className="p-4 space-y-2">
              <div className="h-8 rounded-md bg-muted/20 w-full animate-pulse"></div>
              <div className="h-8 rounded-md bg-muted/10 w-3/4 animate-pulse"></div>
            </div>
          </div>

          {/* Mockup Browser Tab */}
          <div className="flex-1 rounded-xl border border-border/50 bg-muted/10 overflow-hidden shadow-sm flex flex-col justify-end relative h-32 md:h-auto">
             <div className="bg-background rounded-t-lg border-t border-x border-border/50 absolute bottom-0 left-4 right-8 h-10 flex items-center px-3 gap-2 shadow-sm">
                <div className="w-4 h-4 rounded-sm flex items-center justify-center overflow-hidden">
                  {settings.favicon_url ? (
                    <SafeImage src={settings.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                  ) : (
                    <Globe className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                  {settings.platform_name || "SocialHub"} - Dashboard
                </span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/20">
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[150px]">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Identidade
        </Button>
      </div>

    </motion.div>
  );
};
