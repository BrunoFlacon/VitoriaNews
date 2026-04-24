import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Terminal, History, ChevronRight, Code, Eye, EyeOff, ArrowLeft, Heart } from "lucide-react";
import { MatrixBackground } from "@/components/MatrixBackground";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PresentationMode } from "@/components/PresentationMode";
interface Milestone {
  id: string;
  date: string;
  title: string;
  phase: string;
  description: string;
  tech_details: string | null;
  is_major_milestone: boolean;
  version: string;
}

const MilestoneItem = React.memo(({ m, showTech }: { m: Milestone, showTech: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    className="relative pl-12 group"
  >
    {/* Ponto na linha */}
    <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-4 border-[#020617] transition-all duration-500 z-10 ${m.is_major_milestone ? 'bg-theme shadow-[0_0_15px_var(--color-primary)] scale-125' : 'bg-slate-700'}`} />
    
    {/* Data e Versão (Destaque Interativo) */}
    <div className="flex flex-wrap items-center gap-3 mb-4">
       <div className="flex bg-[#0A0F1C]/80 border border-theme/20 rounded-lg overflow-hidden shadow-lg shadow-theme/5 hover:border-theme/50 transition-colors cursor-default">
         <div className="bg-theme/20 px-3 py-1.5 flex items-center justify-center border-r border-theme/20">
           <span className="text-theme font-black text-xs md:text-sm uppercase tracking-widest">{new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
         </div>
         <div className="px-3 py-1.5 flex items-center bg-black/40">
           <span className="text-slate-400 font-mono text-xs">{new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
         <div className="px-3 py-1.5 flex items-center bg-white/5 border-l border-theme/20">
           <span className="text-slate-300 font-mono text-[10px] font-bold">{new Date(m.date).getFullYear()}</span>
         </div>
       </div>
       
       <span className="text-[10px] font-mono font-black text-theme bg-theme/10 border border-theme/20 px-2.5 py-1.5 rounded-md">RELEASE v{m.version}</span>
       {m.is_major_milestone && (
         <span className="bg-gradient-to-r from-theme to-green-600 text-[9px] font-black px-3 py-1.5 rounded-md text-white shadow-[0_0_10px_rgba(34,197,94,0.3)] tracking-widest uppercase">Major Release</span>
       )}
    </div>

    {/* Card de Conteúdo Principal */}
    <div className="bg-[#0A0F1C]/40 backdrop-blur-md border border-white/5 p-6 md:p-8 rounded-2xl hover:border-theme/30 transition-all duration-500 group-hover:bg-[#0A0F1C]/80 group-hover:shadow-[0_10px_40px_-20px_rgba(var(--theme),0.3)] relative overflow-hidden">
       {/* Efeito de brilho no hover */}
       <div className="absolute inset-0 bg-gradient-to-br from-theme/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
       
       <div className="relative z-10">
         <div className="flex items-center gap-3 mb-3">
           <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase">{m.title}</h3>
           <div className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[9px] font-bold text-slate-400 tracking-widest uppercase">{m.phase}</div>
         </div>
         
         <p className="text-slate-300 leading-relaxed text-base md:text-lg mb-2">{m.description}</p>
         
         {/* Tech Details (Terminal Box Ocultável) */}
         <AnimatePresence>
           {showTech && m.tech_details && (
             <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: "auto", opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               transition={{ duration: 0.2 }}
               className="overflow-hidden mt-6"
             >
               <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0D1117] shadow-2xl relative group/terminal">
                 {/* Mac OS Style Header */}
                 <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/5">
                   <div className="flex gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                     <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                     <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                   </div>
                   <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest flex items-center gap-2">
                     <Terminal className="w-3 h-3"/> system_{m.phase.toLowerCase()}.sh
                   </div>
                   <Code className="w-3.5 h-3.5 text-slate-600" />
                 </div>
                 
                 {/* Código Fonte Formatado */}
                 <div className="p-5 font-mono text-[11px] md:text-xs text-theme/90 overflow-x-auto custom-scrollbar">
                   <pre className="inline-block min-w-full">
                     <code className="leading-relaxed whitespace-pre-wrap">{m.tech_details}</code>
                   </pre>
                 </div>
               </div>
             </motion.div>
           )}
         </AnimatePresence>
       </div>
    </div>
  </motion.div>
));

export default function SystemEvolutionPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);

  // Verificação de Role de Segurança Máxima
  const isDev = profile?.role === 'dev_master' || profile?.role === 'admin';

  const { data: milestones, isLoading } = useQuery<Milestone[]>({
    queryKey: ["platform-milestones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_evolution_milestones' as any)
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Milestone[];
    },
    enabled: isAuthorized && isDev
  });

  // Real-time Event Listener for new Git Commits Milestones
  useEffect(() => {
    if (!isAuthorized || !isDev) return;

    const channel = supabase.channel('evolution-timeline-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'platform_evolution_milestones' },
        (payload) => {
           console.log('Novo Milestone Capturado via Socket:', payload);
           toast({
             title: "🟢 Novo Capítulo Adicionado!",
             description: `Registro Git Adicionado: ${payload.new.title}`,
             duration: 8000,
           });
           queryClient.invalidateQueries({ queryKey: ["platform-milestones"] }); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthorized, isDev, toast, queryClient]);

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "devmaster2026") {
      setIsAuthorized(true);
      toast({ title: "Acesso Concedido", description: "Bem-vindo aos registros mestre de evolução." });
    } else {
      toast({ title: "Senha Incorreta", variant: "destructive", description: "Tente novamente ou verifique as credenciais." });
    }
  };

  if (!isDev) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-black text-white uppercase tracking-widest">Acesso Restrito</h1>
          <p className="text-slate-400">Esta área contém registros técnicos confidenciais do Social Canvas Hub. Apenas o criador tem acesso.</p>
          <button onClick={() => navigate(-1)} className="text-theme font-bold flex items-center gap-2 mx-auto"><ArrowLeft className="w-4 h-4" /> Voltar</button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <MatrixBackground />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 bg-[#0A0F1C]/80 backdrop-blur-2xl border border-theme/30 p-10 rounded-3xl shadow-2xl w-full max-w-md"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-theme/20 rounded-full border border-theme/40 animate-pulse">
              <Lock className="w-10 h-10 text-theme" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-tighter">Portão de Desenvolvedor</h2>
          <p className="text-slate-400 text-center text-sm mb-8 font-medium">Insira a chave de criptografia para revelar o histórico do sistema.</p>
          
          <form onSubmit={handleAuthorize} className="space-y-4">
            {/* Input para resolver o alerta de acessibilidade do Navegador sem usar 'display:none' */}
            <input type="text" name="username" autoComplete="username" className="absolute w-0 h-0 opacity-0 overflow-hidden" aria-hidden="true" value="devmaster" readOnly />

            <div className="relative">
              <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Developer Password..."
                className="w-full bg-black/40 border border-theme/30 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-theme transition-all font-mono"
                autoFocus
                autoComplete="new-password"
              />
            </div>
            <button className="w-full bg-theme text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-theme hover:brightness-110 active:scale-95 transition-all">
              Descriptografar Registros
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative overflow-hidden selection:bg-theme/30">
      <MatrixBackground />
      
      {/* Header Fixo */}
      <header className="sticky top-0 z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <History className="w-7 h-7 text-theme" />
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Social Canvas Evolution</h1>
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Console de Registro Mestre</span>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={() => setShowPresentation(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all bg-gradient-to-r from-theme to-theme/80 text-white shadow-[0_0_15px_rgba(var(--theme),0.6)] hover:brightness-110 active:scale-95"
          >
             <MonitorPlay className="w-4 h-4" /> Apresentação Master
          </button>
          
          <button 
            onClick={() => setShowTech(!showTech)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${showTech ? 'bg-theme text-white shadow-theme' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
          >
            {showTech ? <><Eye className="w-4 h-4"/> Visão Técnica (On)</> : <><EyeOff className="w-4 h-4"/> Visão Técnica (Off)</>}
          </button>
          <Link to="/profile/bruno-flacon" className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-20 relative z-10">
        
        {/* Intro */}
        <div className="mb-20 space-y-4">
           <div className="inline-block bg-theme/10 border border-theme/20 rounded-full px-4 py-1.5 text-[10px] font-black text-theme uppercase tracking-[0.2em]">Linha do Tempo de Implementação</div>
           <h2 className="text-4xl md:text-6xl font-black text-white transition-all tracking-tight leading-none bg-gradient-to-br from-white via-white to-slate-500 bg-clip-text text-transparent">
             Do Prompt à <br className="hidden md:block" /> Realidade Digital.
           </h2>
           <p className="text-slate-400 max-w-2xl text-lg leading-relaxed">
             Cada marco abaixo representa uma sessão de inteligência, refinamento e construção. De uma ideia bruta no chat para um sistema de gestão de redes de elite.
           </p>
        </div>

        {/* Timeline */}
        <div className="relative border-l border-white/10 ml-4 space-y-16">
          <AnimatePresence>
            {isLoading ? (
              <div className="animate-pulse text-theme font-mono">Lendo registros de memória...</div>
            ) : milestones?.map((m) => (
              <MilestoneItem key={m.id} m={m} showTech={showTech} />
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Assinatura e Projetos */}
      <footer className="mt-auto border-t border-white/5 py-12 px-6 bg-[#02040A]/80 backdrop-blur-xl relative overflow-hidden">
         {/* Import Cursive Font */}
         <style>{`
           @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
           
           .signature-watermark {
             font-family: 'Dancing Script', cursive;
             font-size: 5.5rem;
             color: rgba(255, 255, 255, 0.4);
             transform: rotate(-5deg);
             opacity: 0.4;
           }
         `}</style>
         
         <div className="max-w-5xl mx-auto flex flex-col gap-8 relative z-10">
            {/* Linha Superior (Centro) */}
            <div className="flex justify-center text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-400">
               <span className="flex items-center gap-2">
                 DESENVOLVIDO COM <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" /> POR BRUNO FLACON
               </span>
            </div>
            
            {/* Linha do Meio (Datas dos Projetos) Centro */}
            <div className="flex items-center justify-center gap-3 md:gap-5 text-[9px] md:text-[10px] font-mono text-slate-600 font-bold tracking-widest flex-wrap uppercase">
               <span>Ago/2012 Web Rádio Vitória</span>
               <span className="w-1.5 h-1.5 bg-theme/30 rotate-45" />
               <span>Out/2025 Social Hub</span>
               <span className="w-1.5 h-1.5 bg-theme/30 rotate-45" />
               <span>© Jan/2026 Vitória Net</span>
            </div>

            {/* Linha Inferior (Links menores à Esquerda sem copyright na direita) */}
            <div className="flex flex-col md:flex-row items-center justify-start text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mt-6 md:mt-8">
               <div className="flex gap-4 md:gap-6 border-t border-white/10 pt-3 md:pt-4">
                 <span className="hover:text-white transition-colors cursor-pointer">PRIVACIDADE</span>
                 <span className="hover:text-white transition-colors cursor-pointer">TERMOS DE USO</span>
                 <span className="hover:text-white transition-colors cursor-pointer">MANUAL</span>
               </div>
            </div>
         </div>

         {/* Marca d'água Assinatura Canto Direito MAIS DESTACADA */}
         <div className="absolute right-4 bottom-4 md:right-8 md:bottom-2 pointer-events-none select-none z-0">
           <span className="signature-watermark text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] whitespace-nowrap">Bruno Flacon</span>
         </div>
      </footer>

      {/* Camada do Presentation Mode */}
      <AnimatePresence>
        {showPresentation && (
          <PresentationMode 
            milestones={milestones || []} 
            onClose={() => setShowPresentation(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Ícones faltantes do Lucide
const X = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const Cpu = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>;
const MonitorPlay = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/><polygon points="10 8 15 10 10 12 10 8"/></svg>;
