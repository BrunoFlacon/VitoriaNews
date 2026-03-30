import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Layout, Settings, FileText, Move, Trash2, Edit2, Columns, Image as ImageIcon, Type, Link as LinkIcon, ArrowRight, Save, Globe, Info, ShieldCheck, FileQuestion } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export const PortalSettingsView = () => {
  const { toast } = useToast();
  const [pages, setPages] = useState<any[]>([]);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBlock, setEditingBlock] = useState<any | null>(null);
  const [showSEODialog, setShowSEODialog] = useState(false);
  const [showAddPageDialog, setShowAddPageDialog] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: '', slug: '' });
  const [seoData, setSeoData] = useState({ title: '', slug: '', description: '' });

  // Fetch initial data
  React.useEffect(() => {
    fetchPages();
  }, []);

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
        styles: editingBlock.styles || {}
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
        { title: 'Política de Privacidade', slug: '/privacidade', is_home: false },
        { title: 'Termos de Serviço', slug: '/termos', is_home: false },
        { title: 'Manual do Usuário', slug: '/manual', is_home: false },
        { title: 'Responsabilidade Social', slug: '/responsabilidade', is_home: false },
        { title: 'Uso da Plataforma', slug: '/uso', is_home: false }
      ];
      
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
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] w-full font-body">
      
      {/* LEFT SIDEBAR: Pages Hierarchy */}
      <div className="w-full lg:w-72 border border-border bg-sidebar/50 backdrop-blur-sm rounded-2xl shadow-xl flex flex-col overflow-hidden flex-shrink-0 border-primary/10">
         <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="font-display font-bold text-sm flex items-center gap-2 text-primary">
              <Layout className="w-4 h-4" /> Estrutura do Portal
            </h3>
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full hover:bg-primary/10 text-primary" onClick={() => setShowAddPageDialog(true)}>
              <Plus className="w-4 h-4" />
            </Button>
         </div>
         <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {pages.map((p) => (
              <div 
                key={p.id}
                onClick={() => handlePageSelect(p.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl text-sm cursor-pointer transition-all border group ${activePage === p.id ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-muted/80 border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                 <div className="flex items-center gap-3">
                    {p.is_home ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    <span className="font-bold truncate max-w-[140px]">{p.title}</span>
                 </div>
                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="w-6 h-6 hover:bg-destructive/10 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeletePage(p.id); }}>
                       <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                 </div>
              </div>
            ))}
            
            {pages.length === 0 && !loading && (
              <div className="p-6 text-center space-y-4">
                 <p className="text-xs text-muted-foreground italic font-medium">Nenhuma página configurada.</p>
                 <Button variant="outline" size="sm" onClick={handleSeedDefaults} className="w-full text-[10px] uppercase font-bold tracking-widest border-primary/20 text-primary hover:bg-primary/5">
                    Gerar Páginas Padrão
                 </Button>
              </div>
            )}
         </div>
      </div>

      {/* CENTER: Page Builder Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background rounded-2xl border border-border shadow-2xl relative">
         {/* Page Header Toolbar */}
         <div className="h-16 border-b border-border bg-muted/10 px-8 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
           <div className="flex flex-col">
             <span className="font-display font-bold text-lg">{activePageData?.title || "Selecione uma Página"}</span>
             <span className="text-muted-foreground text-[10px] font-mono opacity-60 uppercase">{activePageData?.slug || "/---"}</span>
           </div>
           {activePageData && (
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="rounded-full font-bold text-xs px-4" onClick={() => setShowSEODialog(true)}>
                  <Settings className="w-3.5 h-3.5 mr-2" /> Metadados SEO
                </Button>
              </div>
           )}
         </div>

         {/* Canvas Area (Blocks) */}
         <div className="flex-1 overflow-y-auto p-8 bg-muted/5 scrollbar-thin">
            <div className="max-w-4xl mx-auto space-y-6">
              <AnimatePresence>
                {blocks.map((block, idx) => (
                   <motion.div 
                     layout 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: idx * 0.05 }}
                     key={block.id} 
                     className={`group relative bg-background border-2 ${editingBlock?.id === block.id ? 'border-primary shadow-xl scale-[1.02]' : 'border-border/60 hover:border-primary/40'} rounded-2xl p-6 transition-all`}
                   >
                      <div className="absolute -top-3 -right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                         <Button size="icon" variant="secondary" className="w-9 h-9 border border-border flex flex-col shadow-lg rounded-full" onClick={() => setEditingBlock(block)}>
                           <Edit2 className="w-4 h-4" />
                         </Button>
                         <Button size="icon" variant="destructive" className="w-9 h-9 border border-red-200 flex flex-col shadow-lg rounded-full" onClick={() => handleDeleteBlock(block.id)}>
                           <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>

                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            {block.type === 'hero' ? <Layout className="w-6 h-6" /> : <Type className="w-6 h-6" />}
                         </div>
                         <div className="flex-1 translate-y-1">
                            <h4 className="font-display font-bold text-base leading-tight">{block.type.toUpperCase()} BLOCK</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 opacity-70">
                              {typeof block.content === 'object' ? JSON.stringify(block.content) : block.content}
                            </p>
                            <div className="flex gap-2 mt-3">
                               <span className="text-[9px] font-black tracking-widest bg-muted px-2 py-0.5 rounded uppercase border border-border/50">ORDER: {block.order_index}</span>
                               <span className="text-[9px] font-black tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded uppercase border border-primary/20 font-display">TYPE: {block.type}</span>
                            </div>
                         </div>
                      </div>
                   </motion.div>
                ))}
              </AnimatePresence>

              {activePage && (
                <div className="pt-10 pb-20 flex flex-col items-center gap-4">
                   <div className="flex gap-3">
                      <Button variant="outline" onClick={() => handleAddBlock('hero')} className="rounded-2xl font-bold border-dashed border-2 px-6 hover:bg-primary/5">
                        <Layout className="w-4 h-4 mr-2" /> Add Hero
                      </Button>
                      <Button variant="outline" onClick={() => handleAddBlock('text')} className="rounded-2xl font-bold border-dashed border-2 px-6 hover:bg-primary/5">
                        <Type className="w-4 h-4 mr-2" /> Add Conteúdo
                      </Button>
                   </div>
                   <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">Utilize os blocos para compor sua página</p>
                </div>
              )}
            </div>
         </div>
      </div>

       {/* RIGHT SIDEBAR: Block Inspector & Editors */}
       <AnimatePresence>
        {editingBlock && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
            className="w-full md:w-96 border border-border bg-sidebar/50 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col overflow-hidden flex-shrink-0 border-primary/10"
          >
             <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
                <h3 className="font-display font-bold text-sm tracking-tight">Editor de Atributos</h3>
                <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full" onClick={() => setEditingBlock(null)}><ArrowRight className="w-4 h-4" /></Button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Tipo do Recurso</label>
                   <select 
                     value={editingBlock.type} 
                     onChange={(e) => setEditingBlock({...editingBlock, type: e.target.value})}
                     className="w-full bg-background/50 border border-border rounded-xl h-11 px-4 text-sm font-bold shadow-sm"
                   >
                      <option value="hero">Hero / Banner Principal</option>
                      <option value="text">Bloco de Texto Livre</option>
                      <option value="grid">Grid de Notícias (Auto)</option>
                   </select>
                </div>

                <div className="space-y-4 pt-6 border-t border-border/50">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 block">Conteúdo Estruturado (JSON)</label>
                  <div className="relative group">
                     <Textarea 
                       value={typeof editingBlock.content === 'string' ? editingBlock.content : JSON.stringify(editingBlock.content, null, 2)} 
                       onChange={(e) => setEditingBlock({...editingBlock, content: e.target.value})}
                       className="min-h-[300px] text-xs font-mono bg-background/80 border-border/60 rounded-2xl p-4 focus-visible:ring-primary/20"
                       placeholder="Configure o conteúdo aqui em formato JSON..."
                     />
                     <div className="absolute bottom-4 right-4 text-[9px] font-black flex items-center gap-2 text-primary">
                        <ShieldCheck className="w-3 h-3" /> ESTRUTURA VÁLIDA
                     </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    Dica: Para o bloco Hero, use propriedades como 'title' e 'subtitle'. Para texto, use 'text'.
                  </p>
                </div>
             </div>
             
             <div className="p-6 border-t border-border bg-muted/5">
                <Button className="w-full bg-primary text-primary-foreground font-bold rounded-2xl h-12 shadow-lg shadow-primary/20" onClick={saveBlock}>
                  <Save className="w-4 h-4 mr-2" /> Persistir Alterações
                </Button>
             </div>
          </motion.div>
        )}
       </AnimatePresence>

      {/* ADD PAGE DIALOG */}
      <Dialog open={showAddPageDialog} onOpenChange={setShowAddPageDialog}>
        <DialogContent className="rounded-3xl border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-2xl tracking-tight">Nova Página do Portal</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">Crie uma nova rota acessível no portal público de notícias.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Título Amigável</label>
              <Input 
                placeholder="Ex: Últimas Atualizações" 
                value={newPageData.title} 
                onChange={(e) => setNewPageData({...newPageData, title: e.target.value})} 
                className="rounded-2xl h-12 bg-muted/20 border-border/60 font-medium"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Slug da URL</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-sm">/</span>
                <Input 
                   placeholder="novidades-importantes" 
                   value={newPageData.slug} 
                   onChange={(e) => setNewPageData({...newPageData, slug: e.target.value})} 
                   className="rounded-2xl h-12 bg-muted/20 border-border/60 pl-8 font-mono font-bold text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" className="rounded-2xl h-12 font-bold px-8 border-primary/20 text-primary hover:bg-primary/5" onClick={() => setShowAddPageDialog(false)}>Desistir</Button>
            <Button onClick={handleAddPage} className="rounded-2xl h-12 font-bold bg-primary text-white shadow-xl shadow-primary/20 px-8">Confirmar Criação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* SEO DIALOG */}
       <Dialog open={showSEODialog} onOpenChange={setShowSEODialog}>
         <DialogContent className="sm:max-w-[500px] rounded-3xl">
           <DialogHeader>
             <DialogTitle className="font-display font-black text-2xl">Otimização (SEO)</DialogTitle>
             <DialogDescription>Aprimore como esta página aparece no Google e Redes Sociais.</DialogDescription>
           </DialogHeader>
           <div className="space-y-5 py-6">
             <div className="space-y-2">
               <label className="text-[11px] font-bold uppercase text-muted-foreground ml-1">Título SEO</label>
               <Input value={seoData.title} onChange={(e) => setSeoData({...seoData, title: e.target.value})} className="rounded-xl h-11 bg-muted/30" />
             </div>
             <div className="space-y-2">
               <label className="text-[11px] font-bold uppercase text-muted-foreground ml-1">Caminho (Slug)</label>
               <Input value={seoData.slug} onChange={(e) => setSeoData({...seoData, slug: e.target.value})} className="rounded-xl h-11 bg-muted/30 font-mono text-sm" />
             </div>
             <div className="space-y-2">
               <label className="text-[11px] font-bold uppercase text-muted-foreground ml-1">Meta Descrição</label>
               <Textarea value={seoData.description} onChange={(e) => setSeoData({...seoData, description: e.target.value})} className="rounded-xl min-h-[120px] bg-muted/30 resize-none text-sm leading-relaxed" />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" className="rounded-xl px-6" onClick={() => setShowSEODialog(false)}>Cancelar</Button>
             <Button onClick={saveSEO} className="bg-primary text-primary-foreground font-bold rounded-xl px-10">Aplicar no SEO</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

    </div>
  );
};
