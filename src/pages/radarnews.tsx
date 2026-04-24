import React, { useState, useMemo } from 'react';
import { 
  Bot, Target, Search, Filter, Activity, Clock, 
  ChevronRight, Play, Settings, ShieldCheck, PenTool, 
  Video, Radio, Copy, ExternalLink, ZoomIn, ZoomOut,
  Newspaper, TrendingUp, Zap, User, AlertCircle, Share2,
  Sun, Moon, Radar, Globe, X as XIcon, Hash, BarChart2,
  Image as ImageIcon, Music, LayoutGrid, Twitter, Instagram, Smartphone, Flame
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, BarChart, Bar, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const cn = (...classes) => classes.filter(Boolean).join(' ');

// --- DADOS REAIS & MOCKADOS ---
const TRENDS_DATA = [
  { 
    id: 'n1', 
    type: 'news',
    topic: 'Irã aprova plano para impor pedágios no uso do Estreito de Ormuz', 
    headline: 'Irã aprova plano para impor pedágios no uso do Estreito de Ormuz',
    description: 'Tendência identificada pelo radar de inteligência artificial em tempo real na plataforma Google News.',
    category: 'POLITICS/GENERAL',
    source: 'Google News',
    url: 'https://news.google.com',
    publishedAt: '31/03/2026',
    captacaoAt: '01:50 (CAPTAÇÃO)',
    narrativeStart: '01:00',
    shelfLifeHours: 48,
    engagement: 88,  
    velocity: 95,    
    volume: 120, 
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&q=80&w=600',
    connections: ['n3'],
    platforms: ['X', 'LinkedIn', 'Facebook', 'Threads', 'Telegram'],
    lifecycle: [
      { time: '01:00', buzz: 10 }, { time: '01:50', buzz: 50 }, { time: 'Agora', buzz: 100 }, 
      { time: '+12h', buzz: 80 }, { time: '+24h', buzz: 30 }
    ],
    scripts: {
      video: "O MUNDO PODE PARAR AMANHÃ! O Irã acabou de aprovar um pedágio no lugar por onde passa quase todo o petróleo do mundo...",
      body: "O Estreito de Ormuz agora pode ter pedágio. Isso afeta diretamente o preço da gasolina e do diesel no Brasil. Especialistas preveem impacto global nas próximas 48 horas.",
      cta: "Compartilhe essa notícia com quem precisa abastecer o carro hoje!"
    }
  },
  { 
    id: 'n2', 
    type: 'news',
    topic: 'Mãe e filho morrem em acidente na Tijuca', 
    headline: 'Mãe e filho morrem em acidente entre ônibus e bicicleta elétrica na Tijuca',
    description: 'Tendência identificada pelo radar de inteligência artificial na editoria Cidades.',
    category: 'CITY/NEWS',
    source: 'Portal G1',
    url: 'https://g1.globo.com',
    publishedAt: '31/03/2026',
    captacaoAt: '01:50 (CAPTAÇÃO)',
    narrativeStart: '00:30',
    shelfLifeHours: 24,
    engagement: 92,  
    velocity: 80,    
    volume: 90,
    image: '', 
    connections: [],
    platforms: ['Instagram', 'TikTok', 'WhatsApp', 'Facebook'],
    lifecycle: [
      { time: '00:30', buzz: 5 }, { time: '01:50', buzz: 40 }, { time: 'Agora', buzz: 85 }, 
      { time: '+12h', buzz: 95 }, { time: '+24h', buzz: 60 }
    ],
    scripts: {
      video: "TRAGÉDIA NA TIJUCA LEVANTA DEBATE: Bicicletas elétricas são seguras no trânsito urbano?",
      body: "Um acidente fatal reacendeu a discussão sobre a regulamentação de veículos elétricos leves nas grandes vias.",
      cta: "Qual a sua opinião sobre regras mais rígidas para bikes elétricas? Comente."
    }
  },
  { 
    id: 'n3', 
    type: 'trend',
    topic: 'Impacto nos Preços de Combustível', 
    headline: 'Postos já registram filas após anúncio internacional',
    category: 'ECONOMIA POPULAR',
    source: 'Twitter Trends',
    url: 'https://twitter.com/search?q=gasolina',
    publishedAt: 'Hoje, 02:15',
    captacaoAt: '02:30 (CAPTAÇÃO)',
    narrativeStart: '01:45',
    shelfLifeHours: 72,
    engagement: 75,  
    velocity: 85,    
    volume: 110,
    image: 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&q=80&w=200',
    connections: ['n1'],
    platforms: ['X', 'TikTok', 'Kwai', 'Truth Social', 'Rumble'],
    lifecycle: [
      { time: '01:45', buzz: 20 }, { time: '02:15', buzz: 80 }, { time: 'Agora', buzz: 90 }, 
      { time: '+24h', buzz: 95 }, { time: '+48h', buzz: 70 }
    ],
    scripts: {
      video: "FILAS NOS POSTOS NESTA MADRUGADA. O motivo não é no Brasil.",
      body: "Após a decisão do Irã, motoristas correm para abastecer antes do possível reajuste nas refinarias.",
      cta: "Já abasteceu seu carro? Mande para um amigo avisando!"
    }
  }
];

// DADOS DO NOVO GRÁFICO "TOP IMPULSO DIGITAL"
const TOP_TAGS = [
  { name: '#Happy', value: 100, color: '#3b82f6' },
  { name: 'Espresso - Sabrin...', value: 95, color: '#a855f7' },
  { name: 'Casual - Chappell...', value: 95, color: '#22c55e' },
  { name: '#LMAO', value: 90, color: '#f59e0b' },
  { name: '#Shocked', value: 85, color: '#ef4444' },
  { name: '#Reaction', value: 85, color: '#06b6d4' },
  { name: '#Dance', value: 80, color: '#ec4899' },
  { name: 'Starboy - The Weeknd', value: 75, color: '#84cc16' }
];

export default function SocialHubDashboard() {
  const [darkMode, setDarkMode] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  
  // Estados de Controle de Interface
  const [activeNode, setActiveNode] = useState(TRENDS_DATA[0].id);
  const [activeListTab, setActiveListTab] = useState('news');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerNews, setDrawerNews] = useState(null);

  // Derivando os dados baseados na seleção e filtros
  const selectedData = useMemo(() => TRENDS_DATA.find(t => t.id === activeNode) || TRENDS_DATA[0], [activeNode]);
  
  const filteredData = useMemo(() => {
    return TRENDS_DATA.filter(item => {
      const matchesSearch = item.topic.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'Todos' ? true : (activeFilter === 'Notícias' ? item.type === 'news' : item.type === 'trend');
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const newsList = TRENDS_DATA.filter(t => t.type === 'news');
  const trendsList = TRENDS_DATA.filter(t => t.type === 'trend');

  // Controles
  const handleZoom = (direction) => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev + 0.1 : prev - 0.1;
      return Math.min(Math.max(newZoom, 0.5), 1.5);
    });
  };

  const openNewsDrawer = (news) => {
    setActiveNode(news.id);
    setDrawerNews(news);
    setIsDrawerOpen(true);
  };

  return (
    <div className={cn("min-h-screen transition-colors duration-300 font-sans overflow-x-hidden", darkMode ? "dark bg-[#0f111a] text-zinc-300" : "bg-[#F4F5F7] text-zinc-600")}>
      
      {/* SIDE DRAWER (Matéria Detalhada) */}
      <AnimatePresence>
        {isDrawerOpen && drawerNews && (
          <>
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => setIsDrawerOpen(false)}
            />
            
            {/* Drawer Content */}
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-[#12141d] z-50 shadow-2xl flex flex-col border-l border-zinc-800"
            >
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                
                {/* Drawer Header Tags & Close */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-blue-600 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">{drawerNews.source}</span>
                    <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-full text-[10px] font-bold uppercase tracking-wider">{drawerNews.category}</span>
                    <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-full text-[10px] font-bold uppercase tracking-wider">{drawerNews.publishedAt}</span>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors">
                    <XIcon size={20} />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-white leading-tight mb-3">
                  {drawerNews.headline}
                </h2>
                
                <p className="text-sm text-blue-400 mb-6 font-medium">
                  {drawerNews.description || 'Tendência identificada pelo radar de inteligência artificial em tempo real.'}
                </p>

                {/* Media Container */}
                <div className="w-full h-56 bg-zinc-900 border border-zinc-800 rounded-2xl mb-6 relative overflow-hidden flex items-center justify-center">
                  {drawerNews.image ? (
                    <img src={drawerNews.image} alt="Capa da Matéria" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-zinc-600 flex flex-col items-center gap-2">
                      <ImageIcon size={32} />
                      <span className="text-sm font-semibold">Sem capa disponível</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-1.5 text-white">
                    <LayoutGrid size={12} /> <span className="text-[10px] font-bold uppercase">{drawerNews.source}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Impacto (Score)</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-blue-500">{drawerNews.engagement}%</span>
                      <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Fonte</p>
                    <p className="text-xl font-bold text-white line-clamp-1">{drawerNews.source}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Ações</p>
                  <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20">
                    + Criar este Conteúdo Agora
                  </button>
                  <a href={drawerNews.url} target="_blank" rel="noopener noreferrer" className="w-full py-3.5 bg-transparent border border-zinc-700 hover:bg-zinc-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all">
                    <ExternalLink size={16} /> Ver na Fonte
                  </a>
                </div>

                {/* Social Share Mock */}
                <div className="flex gap-3 mt-4">
                  <button className="flex-1 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all"><Twitter size={14}/> X</button>
                  <button className="flex-1 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all"><Instagram size={14}/> Insta</button>
                  <button className="flex-1 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all"><Smartphone size={14}/> TikTok</button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CSS DO MAPA E SCROLLBAR */}
      <style>{`
        .node-bubble { cursor: grab; transition: box-shadow 0.2s, border-color 0.2s; }
        .node-bubble:active { cursor: grabbing; }
        .map-grid { background-image: radial-gradient(circle, ${darkMode ? '#27272a' : '#d4d4d8'} 1px, transparent 1px); background-size: 30px 30px; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#3f3f46' : '#d4d4d8'}; border-radius: 10px; }
      `}</style>

      <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* HEADER & FILTROS */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                Vitória Net <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider">Radar AI</span>
              </h1>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Barra de Pesquisa */}
            <div className="relative flex-1 xl:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar publicações, redes, analytics..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
              />
            </div>

            {/* Filtros */}
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {['Todos', 'Notícias', 'Trends'].map(cat => (
                <button 
                  key={cat} onClick={() => setActiveFilter(cat)}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", activeFilter === cat ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dark Mode Toggle */}
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* PIPELINE DE PRODUÇÃO */}
        <section className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between min-w-[900px] gap-2 px-2">
            {[
              { label: 'Rastreamento', actor: 'IA Scout', icon: Radar, status: 'done', time: 'Em tempo real' },
              { label: 'Apuração/Validação', actor: 'Jornalista', icon: ShieldCheck, status: 'active', time: '15m restantes' },
              { label: 'Geração de Roteiro', actor: 'IA + Humano', icon: PenTool, status: 'waiting', time: 'Pendente' },
              { label: 'Mídia & Edição', actor: 'Equipe de Arte', icon: Video, status: 'waiting', time: 'Pendente' },
              { label: 'Publicação', actor: 'Automação', icon: Zap, status: 'waiting', time: 'Pendente' },
            ].map((step, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-2 w-40 shrink-0 relative">
                  {step.status === 'active' && <div className="absolute -top-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                    step.status === 'done' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600" :
                    step.status === 'active' ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" :
                    "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                  )}>
                    <step.icon size={18} />
                  </div>
                  <div className="text-center">
                    <p className={cn("text-[11px] font-bold text-zinc-900 dark:text-zinc-100", step.status === 'waiting' && "text-zinc-400")}>{step.label}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      {step.actor.includes('IA') ? <Bot size={10} className="text-blue-500"/> : <User size={10} className="text-emerald-500"/>}
                      <p className="text-[9px] text-zinc-500 uppercase font-semibold">{step.actor}</p>
                    </div>
                  </div>
                </div>
                {i < 4 && (
                  <div className="flex-1 h-[2px] bg-zinc-100 dark:bg-zinc-800 relative">
                    {step.status === 'done' && <div className="absolute inset-0 bg-emerald-500" />}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* MAPA PRINCIPAL & LISTAS LATERAIS */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* MAPA DRAG & DROP (8 COLS) */}
          <section className="xl:col-span-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative flex flex-col h-[550px] overflow-hidden">
            <div className="absolute top-5 left-5 z-20 pointer-events-none bg-white/80 dark:bg-zinc-900/80 p-3 rounded-xl backdrop-blur-sm border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Target className="text-blue-500" size={20} />
                Radar de Oportunidades Virais
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Selecione uma bolha na lista ou arraste para examinar o mapa.</p>
            </div>

            {/* Controles de Zoom */}
            <div className="absolute bottom-5 right-5 z-20 flex bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm overflow-hidden">
               <button onClick={() => handleZoom('out')} className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"><ZoomOut size={16} /></button>
               <div className="w-[1px] bg-zinc-200 dark:bg-zinc-700" />
               <button onClick={() => handleZoom('in')} className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"><ZoomIn size={16} /></button>
            </div>

            <div className="flex-1 w-full h-full relative overflow-hidden bg-zinc-50 dark:bg-zinc-950/30">
              <motion.div 
                className="w-full h-full relative"
                animate={{ scale: zoom }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {/* GRÁFICO REAL DE FUNDO */}
                <div className="absolute top-20 bottom-16 left-16 right-16 border-l-2 border-b-2 border-zinc-300 dark:border-zinc-700 map-grid">
                  
                  {/* Linhas Guias Internas */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-0 w-full border-t border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute top-2/4 left-0 w-full border-t border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute top-3/4 left-0 w-full border-t border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute left-1/4 top-0 h-full border-l border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute left-2/4 top-0 h-full border-l border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute left-3/4 top-0 h-full border-l border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                  </div>

                  <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[10px] text-zinc-400 font-bold pb-0">
                    <span className="-mt-2">100</span><span className="-mt-1">75</span><span className="mt-1">50</span><span className="mt-3">25</span><span className="mb-[-8px]">0</span>
                  </div>
                  <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-zinc-400 font-bold">
                    <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                  </div>
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">Velocidade de Propagação</div>
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">Engajamento Estimado</div>

                  {/* Nodes e Conexões */}
                  <div className="absolute inset-0">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-50">
                      {filteredData.map(source => 
                        source.connections.map(targetId => {
                          const target = filteredData.find(t => t.id === targetId);
                          if (!target) return null;
                          return (
                            <line 
                              key={`${source.id}-${target.id}`}
                              x1={`${source.engagement}%`} y1={`${100 - source.velocity}%`}
                              x2={`${target.engagement}%`} y2={`${100 - target.velocity}%`}
                              stroke={darkMode ? "#60a5fa" : "#3b82f6"}
                              strokeWidth="2" strokeDasharray="4 4"
                            />
                          );
                        })
                      )}
                    </svg>

                    {filteredData.map(node => {
                      const isActive = activeNode === node.id;
                      const pxSize = Math.max(60, Math.min(130, node.volume)); 

                      return (
                        <motion.div 
                          key={node.id} drag dragSnapToOrigin={true} dragElastic={0.1}
                          onClick={() => node.type === 'news' ? openNewsDrawer(node) : setActiveNode(node.id)}
                          whileDrag={{ scale: 1.1, zIndex: 50, cursor: 'grabbing' }}
                          className={cn(
                            "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 shadow-md node-bubble group z-10",
                            isActive ? "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.6)] z-30" : "border-white dark:border-zinc-700 hover:border-blue-300"
                          )}
                          style={{ left: `${node.engagement}%`, top: `${100 - node.velocity}%`, width: `${pxSize}px`, height: `${pxSize}px` }}
                        >
                          {node.image && (
                            <img src={node.image} alt={node.topic} className={cn("absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-300", isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")} draggable="false" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent rounded-full pointer-events-none" />
                          
                          <div className="absolute top-0 right-0 -mr-1 -mt-1 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-white dark:border-zinc-800 flex items-center justify-center text-blue-500 shadow-sm pointer-events-none">
                            {node.type === 'news' ? <Newspaper size={10} /> : <TrendingUp size={10} />}
                          </div>

                          <div className="absolute bottom-3 left-0 w-full px-2 text-center pointer-events-none">
                            <p className="text-[10px] font-bold text-white leading-tight drop-shadow-md line-clamp-2">{node.topic}</p>
                            {isActive && node.type === 'news' && (
                              <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 bg-blue-600 rounded-full text-[8px] uppercase font-bold text-white tracking-wider shadow-lg">
                                <ExternalLink size={10} /> Ver Detalhes
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* LISTAS COMBINADAS COM ABAS LATERAIS (4 COLS) */}
          <aside className="xl:col-span-4 flex flex-col h-[550px]">
            <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden">
              
              {/* Cabeçalho das Abas */}
              <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                <button
                  onClick={() => setActiveListTab('news')}
                  className={cn(
                    "flex-1 p-4 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-tight transition-all", 
                    activeListTab === 'news' ? "bg-white dark:bg-zinc-900 text-emerald-600 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  <Newspaper size={18} /> Hard News
                </button>
                <button
                  onClick={() => setActiveListTab('trends')}
                  className={cn(
                    "flex-1 p-4 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-tight transition-all", 
                    activeListTab === 'trends' ? "bg-white dark:bg-zinc-900 text-blue-600 border-b-2 border-blue-500" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  <TrendingUp size={18} /> Social Trends
                </button>
              </div>

              {/* Conteúdo das Listas */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                
                {/* ABA NOTÍCIAS */}
                {activeListTab === 'news' && newsList.map(news => (
                  <div 
                    key={news.id} 
                    onClick={() => openNewsDrawer(news)} 
                    className={cn("p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4", activeNode === news.id ? "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/30 shadow-sm" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-300")}
                  >
                    <div className="w-12 h-16 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-600 shrink-0 overflow-hidden relative border border-zinc-700">
                      {news.image ? <img src={news.image} alt="" className="w-full h-full object-cover opacity-60" /> : <span className="text-[9px] font-bold absolute">Capa</span>}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{news.category} • {news.captacaoAt}</span>
                      </div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug mb-2">{news.headline}</p>
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-zinc-500">
                         <span className="flex items-center gap-1 text-emerald-500"><Activity size={10}/> {news.engagement}% Relevância</span>
                         <span className="flex items-center gap-1 text-blue-500"><Zap size={10}/> Alta Velocidade</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* ABA TRENDS */}
                {activeListTab === 'trends' && trendsList.map(trend => (
                  <div 
                    key={trend.id} 
                    onClick={() => setActiveNode(trend.id)} 
                    className={cn("p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4", activeNode === trend.id ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 shadow-sm" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-blue-300")}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 relative mt-1">
                       <img src={trend.image} alt={trend.topic} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-zinc-500 font-semibold">{trend.publishedAt}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">Eng: {trend.engagement}%</p>
                      </div>
                      <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug mb-3 line-clamp-2">{trend.topic}</p>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {trend.platforms?.map(plat => (
                          <span key={plat} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-[10px] font-bold">{plat}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* NOVA SEÇÃO: GRÁFICO "TOP IMPULSO DIGITAL" */}
        <section className="bg-white dark:bg-[#0c0e14] p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Gráfico de Barras */}
            <div className="lg:col-span-2 flex flex-col">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2 mb-6 uppercase tracking-tight">
                <TrendingUp className="text-blue-500" size={20} /> TOP IMPULSO DIGITAL
              </h2>
              <div className="flex-1 w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={TOP_TAGS} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#27272a" : "#e4e4e7"} />
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" dataKey="name" axisLine={false} tickLine={false} 
                      tick={{ fill: darkMode ? '#a1a1aa' : '#52525b', fontSize: 11, fontWeight: 'bold' }} 
                      width={120} 
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {TOP_TAGS.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Botões de Plataforma Estilo Print */}
              <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"><LayoutGrid size={14}/> GOOGLE NEWS</button>
                <button className="px-4 py-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"><ImageIcon size={14}/> GIPHY</button>
                <button className="px-4 py-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"><Music size={14}/> SPOTIFY</button>
                <button className="px-4 py-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"><Flame size={14}/> GETTR</button>
                <button className="px-4 py-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"><Hash size={14}/> TRUTH SOCIAL</button>
                <button className="px-4 py-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"><Play size={14}/> RUMBLE</button>
                <button className="px-4 py-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"><Video size={14}/> KWAI</button>
                <button className="px-4 py-2 bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"><Twitter size={14}/> X (TWITTER)</button>
              </div>
            </div>

            {/* Gráfico Lateral Volume AI */}
            <div className="bg-gradient-to-br from-[#0c142e] to-[#040814] rounded-2xl p-6 border border-blue-900/30 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-6 left-6 flex items-center gap-2 text-white font-black text-lg z-10">
                <Zap size={20} className="text-yellow-500 fill-yellow-500" /> VOLUME AI
              </div>
              <div className="w-full h-full absolute bottom-0 left-0 opacity-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedData.lifecycle}>
                    <defs>
                      <linearGradient id="volAI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="buzz" stroke="#3b82f6" fillOpacity={1} fill="url(#volAI)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="relative z-10 text-center mt-10">
                <h3 className="text-4xl font-black text-blue-900 tracking-wider">AI LIVE</h3>
                <p className="text-blue-500 text-xs font-bold uppercase tracking-widest mt-2">50 ATIVOS</p>
              </div>
            </div>

          </div>
        </section>

        {/* PAINEL INFERIOR: ESTÚDIO CRIATIVO */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col mt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-base uppercase tracking-tight">
              <PenTool className="text-blue-500" size={20} /> Estúdio de Conteúdo IA
            </h3>
            <div className="flex items-center gap-2">
               <span className="text-xs text-zinc-500 font-medium">Referência: <strong className="text-blue-500">{selectedData.headline || selectedData.topic}</strong></span>
               <button className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-100 transition-colors ml-4">
                 <Copy size={12} /> Copiar Pautas
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vídeo Rápido */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Video size={16} className="text-red-500" />
                <span className="text-xs font-bold uppercase tracking-tight">Roteiro para Vídeo Curtos</span>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-500/5 rounded-xl border-l-4 border-red-500">
                <p className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 mb-1">Hook (Primeiros 3s)</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 italic">"{selectedData.scripts.video}"</p>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Desenvolvimento</p>
                <p className="text-xs text-zinc-700 dark:text-zinc-300">{selectedData.scripts.body}</p>
              </div>
            </div>

            {/* Live/Podcast */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Radio size={16} className="text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-tight">Roteiro para Live / Profundidade</span>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Abertura (Retenção)</p>
                <p className="text-xs text-zinc-700 dark:text-zinc-300">"Acabou de sair a decisão. E o que eu vou mostrar aqui afeta diretamente o seu planejamento para amanhã..."</p>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase text-blue-600 mb-1">Conexão Real</p>
                <p className="text-xs text-zinc-700 dark:text-zinc-300">"Muita gente tá focada na manchete, mas eu fui ler o documento oficial. Olha só esse detalhe importante..."</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}