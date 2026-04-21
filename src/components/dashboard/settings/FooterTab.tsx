import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Loader2, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSystem } from "@/contexts/SystemContext";

import { Switch } from "@/components/ui/switch";

export const FooterTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { updateSettingsOptimistic } = useSystem();
  const [settings, setSettings] = useState<any>({
    show_footer: false,
    footer_text: "",
    privacy_policy_url: "",
    terms_of_service_url: "",
    manual_url: "",
    uso_plataforma_url: "",
    responsabilidade_url: "",
    contact_email: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await (supabase as any).from('system_settings').select('*').eq('group', 'general').maybeSingle();
      if (data) setSettings(data);
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
      toast({ title: "Rodapé atualizado" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-6 space-y-6">
      
      <div className="flex items-center justify-between pb-4 border-b border-border/20">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Visibilidade do Rodapé Master</h3>
          <p className="text-xs text-muted-foreground mt-1">Habilite para mostrar o rodapé institucional no login e nas páginas públicas do sistema.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/20 border border-border/10 rounded-full px-4 py-1.5 shadow-inner">
          <span className="text-xs font-bold mr-2 uppercase">{settings.show_footer ? 'Ativado' : 'Oculto'}</span>
          <Switch 
            checked={settings.show_footer} 
            onCheckedChange={(checked) => setSettings({ ...settings, show_footer: checked })}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Texto de Copyright</label>
           <Input 
             value={settings.footer_text || ""} 
             onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })} 
             className="bg-muted/30"
             disabled={!settings.show_footer}
           />
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email de Contato</label>
           <Input 
             value={settings.contact_email || ""} 
             onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} 
             className="bg-muted/30"
             disabled={!settings.show_footer}
           />
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manual do Sistema (URL)</label>
           <Input 
             value={settings.manual_url || ""} 
             onChange={(e) => setSettings({ ...settings, manual_url: e.target.value })} 
             className="bg-muted/30"
             disabled={!settings.show_footer}
           />
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uso da Plataforma (URL)</label>
           <Input 
             value={settings.uso_plataforma_url || ""} 
             onChange={(e) => setSettings({ ...settings, uso_plataforma_url: e.target.value })} 
             className="bg-muted/30"
             disabled={!settings.show_footer}
           />
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Responsabilidade (URL)</label>
           <Input 
             value={settings.responsabilidade_url || ""} 
             onChange={(e) => setSettings({ ...settings, responsabilidade_url: e.target.value })} 
             className="bg-muted/30"
             disabled={!settings.show_footer}
           />
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Política de Privacidade (URL)</label>
           <Input 
             value={settings.privacy_policy_url || ""} 
             onChange={(e) => setSettings({ ...settings, privacy_policy_url: e.target.value })} 
             className="bg-muted/30"
             disabled={!settings.show_footer}
           />
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Termos de Serviço (URL)</label>
           <Input 
             value={settings.terms_of_service_url || ""} 
             onChange={(e) => setSettings({ ...settings, terms_of_service_url: e.target.value })} 
             className="bg-muted/30"
             disabled={!settings.show_footer}
           />
        </div>
      </div>

      {/* Preview Rodapé */}
      <div className="pt-6 border-t border-border/20 mb-6 mt-4">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 block">Visualização do Rodapé Institucional</label>
        
        <div className="rounded-xl border border-border/50 bg-background overflow-hidden shadow-sm relative w-full">
          {!settings.show_footer ? (
            <div className="p-8 text-center text-sm text-muted-foreground bg-muted/10">
              O rodapé institucional está <strong className="text-foreground">Oculto</strong>. 
              <br/>(Ele não aparecerá na tela de Login ou na plataforma principal)
            </div>
          ) : (
            <div className="w-full bg-background/80 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground border-t-2 border-primary/20">
              <span className="truncate max-w-[200px]">{settings.footer_text || "Texto de copyright..."}</span>

              <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 ml-auto">
                {settings.privacy_policy_url && <span className="hover:text-foreground hover:underline cursor-pointer">Política de Privacidade</span>}
                {settings.terms_of_service_url && <span className="hover:text-foreground hover:underline cursor-pointer">Termos de Serviço</span>}
                {settings.manual_url && <span className="hover:text-foreground hover:underline cursor-pointer">Manual</span>}
                {settings.uso_plataforma_url && <span className="hover:text-foreground hover:underline cursor-pointer">Uso da Plataforma</span>}
                {settings.responsabilidade_url && <span className="hover:text-foreground hover:underline cursor-pointer">Responsabilidade</span>}
                {settings.contact_email && <span className="hover:text-foreground hover:underline cursor-pointer">{settings.contact_email}</span>}
              </nav>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/20">
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[150px]">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Rodapé
        </Button>
      </div>

    </motion.div>
  );
};
