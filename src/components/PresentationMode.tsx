import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, ChevronLeft, ChevronRight, MonitorPlay, Share2 } from 'lucide-react';
import { useSystem } from '@/contexts/SystemContext';

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

interface PresentationModeProps {
  milestones: Milestone[];
  onClose: () => void;
}

// Imagens/Estilos Cyberpunk suaves
const BACKGROUNDS = [
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=2000", // Matrix Style
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=2000", // Coder typing
  "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=2000", // Tech abstract
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000", // Cyber sec
];

export const PresentationMode: React.FC<PresentationModeProps> = ({ milestones, onClose }) => {
  const { settings } = useSystem();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Timer de 25 segundos
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev < milestones.length - 1 ? prev + 1 : 0));
    }, 25000); // 25s
    
    return () => clearInterval(interval);
  }, [isPlaying, milestones.length]);

  // Efeito Sonoro Épico no Play
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
      isPlaying ? audioRef.current.play().catch(()=>console.log("Audio blocked by browser")) : audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleNext = () => setCurrentIndex(i => Math.min(i + 1, milestones.length - 1));
  const handlePrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  const current = milestones[currentIndex];
  // Selecionando o background baseado no index para alternar as imagens
  const bgImage = BACKGROUNDS[currentIndex % BACKGROUNDS.length];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black overflow-hidden font-sans"
    >
      {/* Audio Placeholder (Uma trilha livre sem royalties para teste) */}
      <audio 
        ref={audioRef} 
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" 
        loop 
        autoPlay 
      />

      {/* Camada 1: Background com Efeito Ken Burns Orgânico */}
      <AnimatePresence mode="wait">
        <motion.div
           key={currentIndex}
           initial={{ opacity: 0, scale: 1.05 }}
           animate={{ opacity: 0.3, scale: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 4, ease: "easeOut" }}
           className="absolute inset-0 bg-cover bg-center"
           style={{ backgroundImage: `url(${bgImage})` }}
        />
      </AnimatePresence>

      {/* Camada 2: Overlay escura para garantir leitura e suavidade na lateral esquerda (Timeline) e rodapé (Infos) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
      
      <div className="absolute top-8 right-8 z-[210] flex flex-col items-end gap-6">
        {/* Controles de Play e Fechar minimizados e mais transparentes */}
        <div className="flex gap-3">
          <button 
             onClick={() => setIsPlaying(!isPlaying)}
             className="p-2 bg-white/5 hover:bg-white/10 border border-transparent rounded-full text-white/50 hover:text-white backdrop-blur-sm transition-all active:scale-95"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button 
             onClick={onClose}
             className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-transparent rounded-full text-white/50 hover:text-white backdrop-blur-sm transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Marca do Sistema Vitória Net - Destaque Nativo */}
        <div className="flex items-center gap-4 drop-shadow-[0_0_20px_rgba(var(--primary),0.5)]">
           {settings?.logo_url ? (
             <img 
               src={settings.logo_url} 
               alt="Logo" 
               className="w-16 h-16 object-contain shrink-0 rounded-2xl shadow-xl" 
             />
           ) : (
             <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-primary to-accent border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
               <Share2 className="w-6 h-6 text-black font-black" />
             </div>
           )}
           
           <div className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-display font-black tracking-tight text-4xl whitespace-nowrap">
              {settings?.platform_name || "Vitória Net"}
           </div>
        </div>
      </div>

      {/* Controles Laterais (Avançar/Voltar) - Aparecem no Hover perto da assinatura */}
      <div className="absolute right-6 bottom-32 z-[210] flex flex-col gap-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button 
           onClick={handlePrev}
           disabled={currentIndex === 0}
           className="p-4 bg-black/60 hover:bg-primary border border-white/10 hover:border-primary/50 rounded-xl text-white backdrop-blur-lg disabled:opacity-20 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
           onClick={handleNext}
           disabled={currentIndex === milestones.length - 1}
           className="p-4 bg-black/60 hover:bg-primary border border-white/10 hover:border-primary/50 rounded-xl text-white backdrop-blur-lg disabled:opacity-20 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Layout Grid e Sidebar Escondida */}
      <div className="absolute inset-0 flex h-full w-full">
        
        {/* Aba Lateral Provisória (Visível apenas com hover na extrema esquerda do app) */}
        <div className="absolute left-0 top-0 bottom-0 w-[400px] z-[220] group">
          {/* Zona de Hit invisível mais larga */}
          <div className="absolute inset-0 w-full h-full bg-transparent" />
          
          <div className="w-[300px] md:w-[350px] h-full border-r border-white/10 bg-black/80 backdrop-blur-md overflow-hidden relative -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out shadow-[10px_0_30px_rgba(0,0,0,0.8)]">
            <div className="p-8 pb-4 bg-gradient-to-b from-black to-transparent relative z-20">
              <h2 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                 <MonitorPlay className="w-5 h-5 text-primary"/> Timeline
               </h2>
               <div className="w-12 h-1 bg-primary mt-4" />
            </div>
            
            <div className="absolute inset-0 overflow-y-auto pt-32 pb-40 px-8 no-scrollbar scroll-smooth">
               <div className="border-l-2 border-white/5 space-y-10 ml-2">
                  {milestones.map((m, idx) => {
                    const isActive = idx === currentIndex;
                    const isPast = idx < currentIndex;
                    
                    return (
                      <motion.div 
                        key={m.id}
                        animate={{ 
                          opacity: isActive ? 1 : 0.4,
                          x: isActive ? 10 : 0
                        }}
                        className="relative pl-6 cursor-pointer hover:opacity-100 transition-opacity"
                        onClick={() => { setCurrentIndex(idx); setIsPlaying(false); }}
                      >
                        {/* Pontinho */}
                        <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full transition-all duration-500 ${isActive ? 'bg-primary scale-150 shadow-[0_0_10px_var(--color-primary)]' : isPast ? 'bg-white/40' : 'bg-slate-800'}`} />
                        
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{new Date(m.date).toLocaleDateString('pt-BR')}</div>
                        <div className={`text-xs md:text-sm font-black uppercase mt-1 leading-tight tracking-tight ${isActive ? 'text-white' : 'text-slate-400'}`}>
                           {m.title}
                        </div>
                      </motion.div>
                    )
                  })}
               </div>
            </div>
          </div>
        </div>

        {/* Main Stage: Conteúdo Animado */}
        <div className="flex-1 relative flex flex-col justify-between p-12 md:p-20 z-10 w-full ml-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="max-w-4xl h-full flex flex-col justify-between"
            >
               <div>
                 <div className="flex items-center gap-3 mb-6">
                   <span className="text-primary font-mono font-bold text-xs">RELEASE v{current?.version} • {new Date(current?.date || Date.now()).toLocaleDateString('pt-BR')}</span>
                   <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded border border-white/20 text-[10px] text-white font-black tracking-widest uppercase">
                     {current?.phase}
                   </span>
                   {current?.is_major_milestone && (
                     <span className="text-green-400 font-bold text-[10px] uppercase tracking-widest ml-2 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Impacto
                     </span>
                   )}
                 </div>

                 {/* Título Principal no Topo */}
                 <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-[0.9] mb-8 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
                    {current?.title}
                 </h1>
               </div>

               {/* Bloco Inferior (Sipnose e Código) */}
               <div className="pb-16">
                 {/* Descrição Cinematográfica */}
                 <p className="text-xl md:text-3xl text-slate-300 font-light leading-relaxed max-w-3xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] mb-10">
                    {current?.description}
                 </p>

                 {/* Detalhes Técnicos se houver */}
                 {current?.tech_details && (
                   <div className="inline-block bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
                      <div className="text-primary/80 font-mono text-xs font-bold mb-2">{'// Fragmento Tecnológico Registrado'}</div>
                      <code className="text-slate-400 font-mono text-sm whitespace-pre-wrap">
                        {current.tech_details.length > 250 
                          ? current.tech_details.substring(0, 250) + "..." 
                          : current.tech_details}
                      </code>
                   </div>
                 )}
               </div>
            </motion.div>
          </AnimatePresence>

          {/* Assinatura no canto direito inferior */}
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
            .signature-presentation {
              font-family: 'Dancing Script', cursive;
              font-size: 3rem;
              color: rgba(255, 255, 255, 0.5);
              transform: rotate(-3deg);
              opacity: 0.5;
            }
          `}</style>
          <div className="absolute right-12 bottom-6 pointer-events-none select-none z-0 flex flex-col items-end">
            <span className="signature-presentation drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none">Bruno Flacon</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black mr-4 mt-2">Desenvolvedor</span>
          </div>

          {/* Timer Progress Bar Base */}
          {isPlaying && (
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/5">
              <motion.div 
                key={currentIndex}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 25, ease: "linear" }}
                className="h-full bg-primary relative"
              >
                <div className="absolute right-0 top-0 w-4 h-full bg-white opacity-50 blur-sm" />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
