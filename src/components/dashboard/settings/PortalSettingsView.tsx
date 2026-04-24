import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { 
  Plus, Layout, Settings, FileText, Trash2, Edit2, 
  ArrowRight, Save, Globe, Info, Loader2, Newspaper, 
  X, ExternalLink, Image as ImageIcon, Search, Shield,
  MessageSquare, Send
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSystem } from "@/contexts/SystemContext";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";

export const PortalSettingsView = () => {
  const { toast } = useToast();
  const { settings: systemSettings, updateSettingsOptimistic } = useSystem();
  const [pages, setPages] = useState<any[]>([]);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any | null>(null);
  const [showSEODialog, setShowSEODialog] = useState(false);
  const [showAddPageDialog, setShowAddPageDialog] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: '', slug: '' });
  const [seoData, setSeoData] = useState({ title: '', slug: '', description: '' });

  const [portalConfig, setPortalConfig] = useState({
    platform_name: "Vitória Net",
    public_news_active: true,
    public_articles_active: true,
    public_mediakit_active: true,
    portal_header_visible: true,
    portal_footer_visible: true,
    portal_logo_url: "",
    whatsapp_link: "",
    telegram_link: ""
  });

  // Fetch initial data
  React.useEffect(() => {
    fetchPages();
    if (systemSettings) {
      setPortalConfig({
        platform_name: systemSettings.platform_name || "Vitória Net",
        public_news_active: systemSettings.public_news_active !== false,
        public_articles_active: systemSettings.public_articles_active !== false,
        public_mediakit_active: systemSettings.public_mediakit_active !== false,
        portal_header_visible: systemSettings.portal_header_visible !== false,
        portal_footer_visible: systemSettings.portal_footer_visible !== false,
        portal_logo_url: systemSettings.portal_logo_url || systemSettings.logo_url || "",
        whatsapp_link: systemSettings.whatsapp_link || "",
        telegram_link: systemSettings.telegram_link || ""
      });
    }
  }, [systemSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSavingSettings(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `portal-branding/${Math.random()}.${fileExt}`;

      // Usando bucket 'social_assets' que geralmente existe em projetos SocialHub
      const { error: uploadError } = await supabase.storage
        .from('social_assets')
        .upload(filePath, file);

      if (uploadError) {
        // Fallback para 'documents' se o anterior falhar
        const { error: retryError } = await supabase.storage.from('documents').upload(filePath, file);
        if (retryError) throw retryError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('social_assets')
        .getPublicUrl(filePath);

      setPortalConfig(prev => ({ ...prev, portal_logo_url: publicUrl }));
      toast({ title: "Logo Carregada", description: "Clique em salvar para aplicar." });
    } catch (error: any) {
      toast({ title: "Erro no upload", description: "Verifique se os buckets 'social_assets' ou 'documents' existem no Supabase.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const savePortalConfig = async () => {
    setSavingSettings(true);
    try {
      const payload = { 
        ...portalConfig, 
        platform_name: portalConfig.platform_name,
        group: 'general' 
      };
      
      const { data: existing } = await (supabase as any).from('system_settings').select('id').eq('group', 'general').maybeSingle();
      
      if (existing) {
        await (supabase as any).from('system_settings').update(payload).eq('id', existing.id);
      } else {
        await (supabase as any).from('system_settings').insert([payload]);
      }
      
      updateSettingsOptimistic(portalConfig);
      toast({ title: "Configurações Salvas", description: "O portal foi atualizado com sucesso." });
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('news_pages' as any).select('*').order('created_at') as any;
      if (error) throw error;
      
      setPages(data || []);
      if (data && data.length > 0 && !activePage) {
        setActivePage(data[0].id);
        fetchBlocks(data[0].id);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocks = async (pageId: string) => {
    try {
      const { data } = await supabase
        .from('news_blocks' as any)
        .select('*')
        .eq('page_id', pageId)
        .order('order_index') as any;
      if (data) setBlocks(data);
    } catch(e) {
      console.error(e);
    }
  };

  const handlePageSelect = (pageId: string) => {
    setActivePage(pageId);
    fetchBlocks(pageId);
    const page = pages.find(p => p.id === pageId);
    if (page) {
      setSeoData({ 
        title: page.title, 
        slug: page.slug, 
        description: page.meta_description || '' 
      });
    }
  };

  const activePageData = pages.find(p => p.id === activePage);

  const saveBlock = async () => {
    if (!editingBlock) return;
    try {
      const { error } = await supabase.from('news_blocks' as any).update({ 
        type: editingBlock.type,
        content: typeof editingBlock.content === 'string' ? JSON.parse(editingBlock.content) : editingBlock.content,
        styles: editingBlock.styles || {},
        visibility_tier: editingBlock.visibility_tier || 'public'
      }).eq('id', editingBlock.id) as any;
      
      if (error) throw error;

      toast({ title: "Bloco Atualizado", description: "As mudanças no conteúdo foram salvas." });
      fetchBlocks(activePage!);
      setEditingBlock(null);
    } catch(e) {
      toast({ title: "Erro ao salvar", description: "Verifique se o JSON é válido.", variant: "destructive" });
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("Excluir este bloco permanentemente?")) return;
    try {
      await supabase.from('news_blocks' as any).delete().eq('id', id);
      toast({ title: "Bloco Removido" });
      fetchBlocks(activePage!);
    } catch(e) {
      console.error(e);
    }
  };

  const handleAddBlock = async (type: string = 'text') => {
    if (!activePage) return;
    try {
      const newBlock = {
        page_id: activePage,
        type: type,
        order_index: blocks.length,
        content: type === 'hero' ? { title: 'Novo Hero', subtitle: 'Subtítulo' } : { text: 'Novo parágrafo de texto...' },
        styles: {},
        visibility_tier: 'public',
        visibility: { desktop: true, mobile: true }
      };
      
      const { error } = await supabase.from('news_blocks' as any).insert([newBlock]);
      if (error) throw error;
      
      fetchBlocks(activePage);
      toast({ title: "Bloco Adicionado" });
    } catch(e) {
      console.error(e);
    }
  };

  const saveSEO = async () => {
    if (!activePage) return;
    try {
      const { error } = await supabase.from('news_pages' as any).update({
        title: seoData.title,
        slug: seoData.slug,
        meta_description: seoData.description
      }).eq('id', activePage) as any;

      if (error) throw error;

      toast({ title: "SEO Atualizado", description: "Configurações da página salvas com sucesso." });
      setShowSEODialog(false);
      fetchPages();
    } catch(e) {
      toast({ title: "Erro ao salvar SEO", variant: "destructive" });
    }
  };

  const handleAddPage = async () => {
    if (!newPageData.title || !newPageData.slug) {
      toast({ title: "Campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('news_pages' as any)
        .insert([{ 
          title: newPageData.title, 
          slug: newPageData.slug.startsWith('/') ? newPageData.slug : `/${newPageData.slug}`,
          is_home: pages.length === 0 
        }])
        .select()
        .single() as any;
      
      if (error) throw error;
      
      toast({ title: "Página Criada" });
      setShowAddPageDialog(false);
      setNewPageData({ title: '', slug: '' });
      fetchPages();
    } catch(e) {
      toast({ title: "Erro ao criar página", description: "O slug pode já estar em uso.", variant: "destructive" });
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm("Excluir esta página e todos os seus blocos?")) return;
    try {
      await supabase.from('news_pages' as any).delete().eq('id', id);
      toast({ title: "Página Removida" });
      if (activePage === id) setActivePage(null);
      fetchPages();
    } catch(e) {
      console.error(e);
    }
  };

  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      const defaults = [
        { title: 'Home', slug: '/', is_home: true },
        { title: 'Notícias', slug: '/news', is_home: false },
        { title: 'Artigos', slug: '/artigos', is_home: false },
        { title: 'Mídia Kit', slug: '/mediakit', is_home: false },
        { title: 'Bruno Flacon', slug: '/perfil', is_home: false },
        { title: 'Termos de Uso', slug: '/termos', is_home: false },
        { title: 'Privacidade', slug: '/privacidade', is_home: false },
        { title: 'Contato', slug: '/contato', is_home: false }
      ];

      setPortalConfig(prev => ({ 
        ...prev, 
        platform_name: prev.platform_name || "Web Rádio Vitória" 
      }));
      
      for (const p of defaults) {
        const { data: page } = await supabase.from('news_pages' as any).insert([p]).select().single() as any;
        if (page) {
          // Add a default header and empty grid to each
          await supabase.from('news_blocks' as any).insert([
            { page_id: page.id, type: 'hero', order_index: 0, content: { title: p.title, subtitle: 'Gerencie este conteúdo no Dashboard' } },
            { page_id: page.id, type: 'text', order_index: 1, content: { text: 'Conteúdo inicial da página...' } }
          ]);
        }
      }
      toast({ title: "Seed Concluído", description: "Páginas institucionais e blocos base criados." });
      fetchPages();
    } catch(e) {
      console.error(e);
      toast({ title: "Erro no Seed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] w-full font-body overflow-hidden">
      
      {/* LEFT SIDEBAR: Structure & Global Config */}
      <div className="w-full lg:w-80 border border-border bg-sidebar/50 backdrop-blur-sm rounded-2xl shadow-xl flex flex-col overflow-hidden flex-shrink-0 border-primary/10">
         <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center shrink-0">
            <h3 className="font-display font-bold text-sm flex items-center gap-2 text-primary">
              <Layout className="w-4 h-4" /> Configuração do Portal
            </h3>
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full hover:bg-primary/10 text-primary" onClick={() => setShowAddPageDialog(true)}>
              <Plus className="w-4 h-4" />
            </Button>
         </div>

         <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* Global Settings Section */}
            <div className="p-4 space-y-4 border-b border-border/50 bg-primary/5">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Branding Global</span>
                  <Button size="sm" onClick={savePortalConfig} disabled={savingSettings} className="h-7 px-3 text-[10px] bg-primary font-bold">
                    {savingSettings ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Salvar
                  </Button>
               </div>
               
               <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-background/50 border border-border/30">
                     <span className="font-bold">Menu Superior</span>
                     <Switch checked={portalConfig.portal_header_visible} onCheckedChange={(val) => setPortalConfig({...portalConfig, portal_header_visible: val})} />
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-background/50 border border-border/30">
                     <span className="font-bold">Rodapé</span>
                     <Switch checked={portalConfig.portal_footer_visible} onCheckedChange={(val) => setPortalConfig({...portalConfig, portal_footer_visible: val})} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Nome do Portal</label>
                     <Input 
                        value={portalConfig.platform_name} 
                        onChange={(e) => setPortalConfig({...portalConfig, platform_name: e.target.value})} 
                        className="h-8 text-[10px] bg-background/50 font-bold" 
                        placeholder="Ex: Vitória Net"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Logomarca do Portal</label>
                     <div className="flex items-center gap-3 p-2 bg-background/50 border border-border/30 rounded-xl">
                        {portalConfig.portal_logo_url ? (
                          <div className="relative group shrink-0">
                             <img src={portalConfig.portal_logo_url} className="h-10 w-10 object-contain bg-slate-900/5 rounded-lg p-1" alt="Logo Preview" />
                             <button 
                               onClick={() => setPortalConfig({...portalConfig, portal_logo_url: ''})}
                               className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <X className="w-2 h-2" />
                             </button>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                             <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                           <label className="cursor-pointer block">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary hover:text-primary/80 transition-colors">
                                 <Plus className="w-3 h-3" /> {portalConfig.portal_logo_url ? 'Alterar Logo' : 'Adicionar Logo'}
                              </div>
                              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                           </label>
                           <p className="text-[8px] text-muted-foreground mt-0.5 truncate">PNG, SVG ou JPG (Max 2MB)</p>
                        </div>
                     </div>
                  </div>
               </div>

            {/* Visibility & Access Section */}
            <div className="p-4 space-y-4 border-b border-border/50">
               <span className="text-[10px] font-black uppercase tracking-widest text-primary">Controle de Acesso</span>
               <div className="space-y-3">
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Nível de Visibilidade da Página</label>
                     <select 
                       value={activePageData?.visibility_tier || 'public'}
                       onChange={async (e) => {
                          if (!activePage) return;
                          const tier = e.target.value;
                          const { error } = await supabase.from('news_pages' as any).update({ visibility_tier: tier }).eq('id', activePage);
                          if (!error) {
                             fetchPages();
                             toast({ title: "Visibilidade Atualizada" });
                          }
                       }}
                       className="w-full h-8 bg-background/50 border border-border rounded-lg px-2 text-[10px] font-bold"
                     >
                        <option value="public">🌍 Aberto ao Público</option>
                        <option value="lead">👤 Assinantes (Gratuitos)</option>
                        <option value="free_sub">💎 Assinantes VIP (Pagos)</option>
                      </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">URL de Redirecionamento (WhatsApp/Telegram)</label>
                     <Input 
                        value={activePageData?.redirect_url || ''} 
                        onChange={async (e) => {
                           if (!activePage) return;
                           const url = e.target.value;
                           await supabase.from('news_pages' as any).update({ redirect_url: url }).eq('id', activePage);
                           fetchPages();
                        }}
                        className="h-8 text-[10px] bg-background/50 font-mono" 
                        placeholder="https://chat.whatsapp.com/..."
                     />
                  </div>
               </div>
            </div>

            {/* Official Channels Section */}
            <div className="p-4 space-y-4 border-b border-border/50 bg-primary/5">
               <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                 <Shield className="w-3 h-3" /> Canais VIP Oficiais
               </span>
               <div className="space-y-3">
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">WhatsApp Oficial</label>
                     <Input 
                        value={portalConfig.whatsapp_link} 
                        onChange={(e) => setPortalConfig({...portalConfig, whatsapp_link: e.target.value})} 
                        className="h-8 text-[10px] bg-background/50 font-mono" 
                        placeholder="Link do Grupo VIP"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Telegram Oficial</label>
                     <Input 
                        value={portalConfig.telegram_link} 
                        onChange={(e) => setPortalConfig({...portalConfig, telegram_link: e.target.value})} 
                        className="h-8 text-[10px] bg-background/50 font-mono" 
                        placeholder="Link do Canal VIP"
                     />
                  </div>
               </div>
            </div>

               {/* Visibility Flags */}
               <div className="pt-2 space-y-2 border-t border-border/30 mt-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Visibilidade de Módulos</span>
                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-[10px] font-bold px-1">
                        <span>Notícias</span>
                        <Switch checked={portalConfig.public_news_active} onCheckedChange={(val) => setPortalConfig({...portalConfig, public_news_active: val})} />
                     </div>
                     <div className="flex items-center justify-between text-[10px] font-bold px-1">
                        <span>Artigos</span>
                        <Switch checked={portalConfig.public_articles_active} onCheckedChange={(val) => setPortalConfig({...portalConfig, public_articles_active: val})} />
                     </div>
                     <div className="flex items-center justify-between text-[10px] font-bold px-1">
                        <span>Mídia Kit</span>
                        <Switch checked={portalConfig.public_mediakit_active} onCheckedChange={(val) => setPortalConfig({...portalConfig, public_mediakit_active: val})} />
                     </div>
                  </div>
               </div>
            </div>

            {/* Pages Section */}
            <div className="p-4 space-y-3">
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Páginas e Estrutura</span>
               <div className="space-y-2">
                  {pages.map((p) => (
                    <div 
                      key={p.id}
                      onClick={() => handlePageSelect(p.id)}
                      className={`flex items-center justify-between p-3 rounded-xl text-sm cursor-pointer transition-all border group ${activePage === p.id ? 'bg-primary border-primary text-white shadow-lg' : 'hover:bg-muted/80 border-transparent text-muted-foreground'}`}
                    >
                       <div className="flex items-center gap-3">
                          {p.is_home ? <Globe className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                          <span className="font-bold truncate max-w-[120px]">{p.title}</span>
                       </div>
                       <Button size="icon" variant="ghost" className="w-6 h-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeletePage(p.id); }}>
                          <Trash2 className="w-3 h-3" />
                       </Button>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* CENTER: Live Preview & Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#020617] rounded-2xl border border-border shadow-2xl relative">
         {/* Preview Toolbar */}
         <div className="h-14 border-b border-border bg-muted/20 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="font-display font-bold text-sm leading-none">{activePageData?.title || "Editor de Layout"}</span>
                <span className="text-[9px] font-mono text-primary mt-1">{activePageData?.slug || "portal://"}</span>
              </div>
              <Badge variant="outline" className="text-[9px] uppercase font-black bg-primary/10 border-primary/20 text-primary">Preview Mode</Badge>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 px-3 text-[10px] font-bold gap-1.5 hover:bg-primary/10 text-primary transition-all"
                onClick={() => window.open(activePageData?.slug || '/', '_blank')}
              >
                <ExternalLink className="w-3 h-3" /> Ver Site Ao Vivo
              </Button>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold" onClick={() => setShowSEODialog(true)}>
                 <Settings className="w-3 h-3 mr-2" /> SEO
               </Button>
               <Button onClick={() => handleAddBlock('hero')} className="h-8 rounded-lg text-xs font-bold bg-slate-900 text-white">
                 <Plus className="w-3 h-3 mr-2" /> Adicionar Bloco
               </Button>
            </div>
         </div>

         {/* LIVE PREVIEW AREA */}
         <div className="flex-1 overflow-y-auto scrollbar-none bg-background/50">
            <div className="max-w-5xl mx-auto min-h-full flex flex-col shadow-2xl bg-background border-x border-border/10">
               
               {/* ── PREVIEW HEADER ── */}
               {portalConfig.portal_header_visible && (
                 <header className="border-b border-border/50 bg-card/80 backdrop-blur-md p-4 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                       {portalConfig.portal_logo_url && (
                         <img src={portalConfig.portal_logo_url} className="h-6 w-auto object-contain" alt="Logo" />
                       )}
                       <span className="text-xs font-black uppercase tracking-tight">{portalConfig.platform_name}</span>
                    </div>
                    <nav className="flex items-center gap-4 text-[9px] font-bold uppercase text-muted-foreground">
                       <span>Home</span>
                       <span>Notícias</span>
                       <span>Sobre</span>
                    </nav>
                 </header>
               )}

               {/* ── BLOCKS CANVAS ── */}
               <div className="flex-1 p-6 space-y-6">
                  {blocks.length > 0 ? (
                    <AnimatePresence>
                      {blocks.map((block, idx) => (
                         <motion.div 
                           layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                           key={block.id} 
                           className={`group relative bg-card border ${editingBlock?.id === block.id ? 'border-primary ring-2 ring-primary/10' : 'border-border/60'} rounded-xl overflow-hidden transition-all`}
                         >
                            {/* Block Actions */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                               <Button size="icon" variant="secondary" className="w-7 h-7 rounded-lg" onClick={() => setEditingBlock(block)}>
                                 <Edit2 className="w-3 h-3" />
                               </Button>
                               <Button size="icon" variant="destructive" className="w-7 h-7 rounded-lg" onClick={() => handleDeleteBlock(block.id)}>
                                 <Trash2 className="w-3 h-3" />
                               </Button>
                            </div>

                            {/* Block Visual Content */}
                            <div className="p-4">
                               {block.type === 'hero' ? (
                                 <div className="py-8 text-center bg-muted/30 rounded-lg border border-dashed border-border/50">
                                    <h2 className="text-lg font-black uppercase tracking-tight">{block.content?.title || "Hero Title"}</h2>
                                    <p className="text-[10px] text-muted-foreground mt-1">{block.content?.subtitle || "Subtitle text here"}</p>
                                 </div>
                               ) : (
                                 <div className="text-sm leading-relaxed opacity-80 italic">
                                    {block.content?.text || "Conteúdo de texto do bloco..."}
                                 </div>
                               )}
                               <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                                  <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 uppercase">{block.type}</Badge>
                                  <span className="text-[8px] font-mono opacity-40">ID: {block.id.split('-')[0]}</span>
                               </div>
                            </div>
                         </motion.div>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border/20 rounded-3xl text-muted-foreground/30">
                       <Layout className="w-12 h-12 mb-2" />
                       <p className="text-xs font-bold uppercase tracking-widest">Nenhum bloco nesta página</p>
                    </div>
                  )}
               </div>
               {portalConfig.portal_footer_visible && (
                 <div className="mt-auto pointer-events-none opacity-80 scale-90 origin-bottom">
                   <PortalFooter variant={activePageData?.visibility_tier === 'public' ? 'public' : 'private'} />
                 </div>
               )}
            </div>
         </div>
      </div>

       {/* RIGHT SIDEBAR: Editor */}
       <AnimatePresence>
        {editingBlock && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
            className="w-full md:w-80 border-l border-border bg-sidebar/80 backdrop-blur-xl flex flex-col overflow-hidden flex-shrink-0"
          >
             <div className="p-4 border-b border-border flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest">Atributos do Bloco</span>
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full" onClick={() => setEditingBlock(null)}><ArrowRight className="w-4 h-4" /></Button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
                <div className="space-y-2">
                   <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Tipo do Recurso</label>
                   <select 
                     value={editingBlock.type} 
                     onChange={(e) => setEditingBlock({...editingBlock, type: e.target.value})}
                     className="w-full bg-background/50 border border-border rounded-xl h-9 px-3 text-xs font-bold"
                   >
                      <option value="hero">Hero Banner</option>
                      <option value="text">Texto Livre</option>
                      <option value="grid">Grid Automática</option>
                   </select>
                </div>

                 <div className="space-y-2">
                   <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Visibilidade do Bloco</label>
                   <select 
                     value={editingBlock.visibility_tier || 'public'} 
                     onChange={(e) => setEditingBlock({...editingBlock, visibility_tier: e.target.value})}
                     className="w-full bg-background/50 border border-border rounded-xl h-9 px-3 text-xs font-bold"
                   >
                      <option value="public">🌍 Aberto</option>
                      <option value="lead">📧 Assinantes Gratuitos</option>
                      <option value="free_sub">👤 Assinantes</option>
                      <option value="paid_sub">💎 VIP (Pago)</option>
                   </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Configuração (JSON)</label>
                  <Textarea 
                    value={typeof editingBlock.content === 'string' ? editingBlock.content : JSON.stringify(editingBlock.content, null, 2)} 
                    onChange={(e) => setEditingBlock({...editingBlock, content: e.target.value})}
                    className="min-h-[200px] text-[10px] font-mono bg-background/80 rounded-xl p-3"
                  />
                </div>
             </div>
             
             <div className="p-4 border-t border-border">
                <Button className="w-full bg-primary font-bold rounded-xl h-10 text-xs" onClick={saveBlock}>
                  <Save className="w-3.5 h-3.5 mr-2" /> Salvar Conteúdo
                </Button>
             </div>
          </motion.div>
        )}
       </AnimatePresence>

      {/* DIALOGS */}
      <Dialog open={showAddPageDialog} onOpenChange={setShowAddPageDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nova Página</DialogTitle>
            <DialogDescription>Crie uma nova página institucional ou de conteúdo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input placeholder="Título" value={newPageData.title} onChange={(e) => setNewPageData({...newPageData, title: e.target.value})} />
            <Input placeholder="Slug (ex: news)" value={newPageData.slug} onChange={(e) => setNewPageData({...newPageData, slug: e.target.value})} />
          </div>
          <DialogFooter>
            <Button onClick={handleAddPage} className="font-bold">Criar Página</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSEODialog} onOpenChange={setShowSEODialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>SEO e Metadados</DialogTitle>
            <DialogDescription>Configure o título e descrição que aparecerão no Google e redes sociais.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input placeholder="Meta Title" value={seoData.title} onChange={(e) => setSeoData({...seoData, title: e.target.value})} />
            <Textarea placeholder="Meta Description" value={seoData.description} onChange={(e) => setSeoData({...seoData, description: e.target.value})} />
          </div>
          <DialogFooter>
            <Button onClick={saveSEO} className="font-bold">Salvar SEO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
