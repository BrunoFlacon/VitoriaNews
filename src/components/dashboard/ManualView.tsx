import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Book, 
  ChevronRight, 
  HelpCircle, 
  Zap, 
  LayoutDashboard, 
  PenSquare, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  Share2,
  Info,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSystem } from "@/contexts/SystemContext";
import { supabase } from "@/integrations/supabase/client";

const SECTIONS = [
  { 
    id: 'intro', 
    title: 'Início Rápido', 
    icon: Zap,
    content: (
      <div className="space-y-4">
        <p>Bem-vindo ao Vitória Net! Este guia ajudará você a configurar sua presença digital em poucos minutos.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <h4 className="font-bold text-sm mb-2 text-primary">Passo 1: Redes Sociais</h4>
            <p className="text-xs text-muted-foreground">Vá até a aba "Redes Sociais" e conecte seus perfis (Facebook, Instagram, X, etc).</p>
          </div>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <h4 className="font-bold text-sm mb-2 text-primary">Passo 2: Primeiro Post</h4>
            <p className="text-xs text-muted-foreground">Clique em "Criar Post" ou use o Calendário para agendar sua primeira publicação.</p>
          </div>
        </div>
      </div>
    )
  },
  { 
    id: 'posting', 
    title: 'Postagem e Agendamento', 
    icon: PenSquare,
    content: (
      <div className="space-y-4">
        <p>Nossa plataforma suporta múltiplos formatos de mídia e agendamento inteligente.</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li><span className="text-foreground font-bold">Imagens e Vídeos:</span> Upload direto para a Galeria ou via drag & drop no editor.</li>
          <li><span className="text-foreground font-bold">Preview em Tempo Real:</span> Veja como seu post aparecerá exatamente em cada rede social antes de publicar.</li>
          <li><span className="text-foreground font-bold">Horários Sugeridos:</span> O sistema analisa seus seguidores para sugerir o melhor horário de engajamento.</li>
        </ul>
      </div>
    )
  },
  { 
    id: 'analytics', 
    title: 'Análise de Performance', 
    icon: BarChart3,
    content: (
      <div className="space-y-4">
        <p>A aba Analytics oferece uma visão profunda do seu crescimento.</p>
        <div className="space-y-3">
           <div className="flex gap-4 p-4 rounded-xl border border-border bg-muted/20">
              <BarChart3 className="w-8 h-8 text-primary shrink-0" />
              <div>
                 <h5 className="font-bold text-sm">Métricas de Engajamento</h5>
                 <p className="text-xs text-muted-foreground">Acompanhe curtidas, comentários e compartilhamentos consolidados de todas as redes.</p>
              </div>
           </div>
           <div className="flex gap-4 p-4 rounded-xl border border-border bg-muted/20">
              <Info className="w-8 h-8 text-primary shrink-0" />
              <div>
                 <h5 className="font-bold text-sm">Crescimento de Seguidores</h5>
                 <p className="text-xs text-muted-foreground">Gráficos históricos para identificar quais conteúdos geraram mais novos seguidores.</p>
              </div>
           </div>
        </div>
      </div>
    )
  },
  { 
    id: 'admin', 
    title: 'Configurações e Segurança', 
    icon: Settings,
    content: (
      <div className="space-y-4">
        <p>Gerencie sua conta, equipe e permissões de acesso.</p>
        <div className="space-y-2">
           <h4 className="font-bold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Controle de Acesso (RBAC)</h4>
           <p className="text-sm text-muted-foreground">Administradores podem definir quem visualiza cada aba do dashboard através do sistema de permissões internas.</p>
        </div>
        <div className="space-y-2 mt-4">
           <h4 className="font-bold text-sm flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Estúdio Temático</h4>
           <p className="text-sm text-muted-foreground">Personalize as cores, fontes e arredondamentos de toda a plataforma de acordo com a sua identidade visual.</p>
        </div>
      </div>
    )
  }
];

export const ManualView = () => {
  const [activeSection, setActiveSection] = useState('intro');
  const { settings } = useSystem();
  const [masterPhone, setMasterPhone] = useState("");

  useEffect(() => {
    const fetchMasterContact = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or('role.eq.admin_master,role.eq.dev_master')
        .maybeSingle() as any;
      
      if (data?.phone) setMasterPhone(data.phone.replace(/\D/g, ''));
    };
    fetchMasterContact();
  }, []);

  const openWhatsApp = () => {
    const phone = masterPhone || "5511999999999"; // Fallback or user profile
    const text = encodeURIComponent(`Olá! Preciso de ajuda com o sistema ${settings?.platform_name || "Vitória Net"}.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-120px)] w-full overflow-hidden p-4 lg:p-0">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full lg:w-72 bg-sidebar/50 backdrop-blur-sm border border-border rounded-2xl flex flex-col p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-8 px-2">
           <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} className="w-6 h-6 object-contain" alt="Logo" />
              ) : (
                <Book className="w-5 h-5 text-primary" />
              )}
           </div>
           <div>
              <h2 className="font-display font-black text-lg tracking-tight uppercase">Manual</h2>
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest opacity-60">Instruções de Uso</p>
           </div>
        </div>

        <nav className="space-y-2">
           {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold transition-all border ${activeSection === section.id ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-muted/80 border-transparent text-muted-foreground'}`}
              >
                 <section.icon className="w-4 h-4 shrink-0" />
                 <span className="truncate">{section.title}</span>
                 <ChevronRight className={`ml-auto w-3.5 h-3.5 transition-transform ${activeSection === section.id ? 'rotate-90' : ''}`} />
              </button>
           ))}
        </nav>

        <div className="mt-auto bg-primary/5 p-4 rounded-xl border border-primary/10">
           <HelpCircle className="w-5 h-5 text-primary mb-2" />
           <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">Precisa de Suporte Extra?</p>
           <Button 
             variant="link" 
             className="p-0 h-auto text-[10px] font-black uppercase tracking-tighter text-primary mt-1 flex items-center gap-1.5"
             onClick={openWhatsApp}
           >
             <MessageSquare className="w-3 h-3" /> Falar com Especialista
           </Button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 bg-background border border-border rounded-2xl flex flex-col overflow-hidden shadow-2xl">
         <header className="h-20 border-b border-border bg-muted/10 flex items-center px-10">
            <AnimatePresence mode="wait">
               <motion.div 
                 key={activeSection}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 10 }}
                 className="flex items-center gap-4"
               >
                  {(() => {
                    const section = SECTIONS.find(s => s.id === activeSection);
                    const Icon = section?.icon || Book;
                    return (
                      <>
                        <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/20">
                           <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="font-display font-black text-2xl tracking-tight">{section?.title}</h1>
                      </>
                    );
                  })()}
               </motion.div>
            </AnimatePresence>
         </header>

         <div className="flex-1 overflow-y-auto p-10 scrollbar-thin">
            <AnimatePresence mode="wait">
               <motion.div 
                 key={activeSection}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="max-w-3xl prose prose-slate prose-invert"
               >
                 {SECTIONS.find(s => s.id === activeSection)?.content}
               </motion.div>
            </AnimatePresence>
         </div>
         
         <footer className="h-14 border-t border-border bg-muted/5 flex items-center px-10 justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
              {settings?.platform_name || "Vitória Net"} • Manual v1.0
            </span>
            <div className="flex gap-4">
               {/* Nav controls if needed */}
            </div>
         </footer>
      </div>

    </div>
  );
};
