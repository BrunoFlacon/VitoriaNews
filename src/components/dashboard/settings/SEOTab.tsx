import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Image as ImageIcon, Loader2, Globe, Search } from "lucide-react";
import { motion } from "framer-motion";
import { SafeImage } from "@/components/ui/SafeImage";

export const SEOTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    seo_title: "",
    seo_description: "",
    seo_image_url: "",
    site_url: "https://seusite.com.br"
  });
  
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await (supabase as any).from('system_settings').select('*').eq('group', 'seo').maybeSingle();
      if (data) {
        setSettings({ ...settings, ...data });
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
      const payload = { ...settings, group: 'seo' };
      if (!settings.id) {
        const { error } = await (supabase as any).from('system_settings').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('system_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      }
      toast({ title: "Sucesso", description: "Configurações de SEO atualizadas! Lembre-se de refletir esses dados no seu arquivo index.html em produção." });
      fetchSettings(); // Refresh to get ID if inserted
    } catch (error: any) {
      toast({ 
        title: "Erro ao salvar", 
        description: error?.message || "Falha na comunicação com o banco", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSaving(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `system/seo_cover_${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      
      setSettings((prev: any) => ({ ...prev, seo_image_url: url }));
      toast({ title: "Capa Carregada" });
    } catch (error) {
      toast({ title: "Erro no upload da capa", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-6 space-y-8">
      
      {/* Editor SEO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-black mb-1">Metatags Principais</h3>
            <p className="text-sm text-muted-foreground mb-4">Controle como seu portal é visto no Google e redes sociais.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL Base (Domínio)</label>
            <Input 
              value={settings.site_url || ""} 
              onChange={(e) => setSettings({ ...settings, site_url: e.target.value })} 
              className="bg-muted/30"
              placeholder="https://suaradio.com.br"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título (Title Tag) - Max 60 chars</label>
            <Input 
              value={settings.seo_title || ""} 
              onChange={(e) => setSettings({ ...settings, seo_title: e.target.value })} 
              className="bg-muted/30"
              placeholder="Novo Portal - A Redação Multimídia"
              maxLength={65}
            />
            <div className="text-right text-[10px] text-muted-foreground">{(settings.seo_title || "").length} / 60</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição (Description Tag) - Max 160 chars</label>
            <Textarea 
              value={settings.seo_description || ""} 
              onChange={(e) => setSettings({ ...settings, seo_description: e.target.value })} 
              className="bg-muted/30 resize-none h-24"
              placeholder="Acompanhe as últimas notícias, análises de precisão e podcasts exclusivos..."
              maxLength={160}
            />
            <div className="text-right text-[10px] text-muted-foreground">{(settings.seo_description || "").length} / 160</div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagem de Capa (Open Graph) - 1200x630px</label>
            <div className="flex gap-4 items-center">
              <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} className="flex gap-2">
                <ImageIcon className="w-4 h-4" /> Enviar Capa (OG Image)
              </Button>
              <input type="file" ref={coverInputRef} onChange={handleFileUpload} className="hidden" accept="image/jpeg,image/png,image/webp" />
              {settings.seo_image_url && <span className="text-xs text-green-500 font-bold">Capa Adicionada ✓</span>}
            </div>
            <p className="text-[10px] text-muted-foreground">A imagem que aparece quando alguém compartilha o seu site no WhatsApp, Facebook, LinkedIn, etc.</p>
          </div>
        </div>

        {/* Simuladores / Preview */}
        <div className="space-y-6">
          <h3 className="text-lg font-black mb-1">Preview em Tempo Real</h3>
          
          {/* Mockup WhatsApp/Facebook */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-2"><Globe className="w-3 h-3" /> Redes Sociais (WhatsApp, FB)</div>
            <div className="max-w-sm rounded-xl overflow-hidden border border-border/60 bg-[#1A1A1A] shadow-md">
              <div className="w-full h-44 bg-muted/40 relative flex items-center justify-center overflow-hidden border-b border-border/30">
                {settings.seo_image_url ? (
                  <SafeImage src={settings.seo_image_url} alt="Capa" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                )}
              </div>
              <div className="p-3 bg-muted/10">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide truncate mb-1">
                  {(settings.site_url || "").replace('https://', '').replace('http://', '').split('/')[0]}
                </div>
                <div className="font-bold text-[15px] leading-tight mb-1 text-[#E9EDEF] line-clamp-1">
                  {settings.seo_title || "Defina um título"}
                </div>
                <div className="text-xs text-[#8696A0] line-clamp-1">
                  {settings.seo_description || "Defina uma descrição para a sua página..."}
                </div>
              </div>
            </div>
          </div>

          {/* Mockup Google Search */}
          <div className="space-y-2 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-2"><Search className="w-3 h-3" /> Busca Google (Desktop)</div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 w-full max-w-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                <div className="text-[12px] text-[#202124] leading-none">
                  {settings.site_url || "https://suaradio.com.br"} <span className="text-slate-400">›</span>
                </div>
              </div>
              <div className="text-[#1a0dab] text-[20px] font-medium leading-tight mb-1 hover:underline cursor-pointer truncate">
                {settings.seo_title || "Defina um título"}
              </div>
              <div className="text-[#4d5156] text-[14px] leading-snug line-clamp-2">
                {settings.seo_description || "A descrição da sua página aparecerá aqui nos resultados de busca do Google..."}
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-border/20">
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[150px]">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Configurações SEO
        </Button>
      </div>

    </motion.div>
  );
};
