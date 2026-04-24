import React, { useState, useMemo } from 'react';
import { 
  Bot, Target, Search, Filter, Activity, Clock, 
  ChevronRight, Play, Settings, ShieldCheck, PenTool, 
  Video, Radio, Copy, ExternalLink, ZoomIn, ZoomOut,
  Newspaper, TrendingUp, Zap, User, AlertCircle, Share2,
  Sun, Moon, Radar, Globe
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const cn = (...classes) => classes.filter(Boolean).join(' ');

// --- DADOS REAIS & MOCKADOS ---
const TRENDS_DATA = [
  { 
    id: 'n1', 
    type: 'news',
    topic: 'Reforma Tributária: Alíquota Trava em 26.5%', 
    headline: 'Governo cede e trava alíquota máxima do IVA. Varejo reage.',
    category: 'Política & Economia',
    source: 'GloboNews',
    url: 'https://g1.globo.com/economia',
    publishedAt: 'Hoje, 08:30',
    narrativeStart: '06:00',
    shelfLifeHours: 48,
    engagement: 85,  
    velocity: 88,    
    volume: 120, 
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=200',
    connections: ['n2'],
    platforms: ['X', 'LinkedIn', 'Facebook', 'Threads', 'Telegram'],
    lifecycle: [
      { time: '06:00', buzz: 10 }, { time: '08:30', buzz: 50 }, { time: 'Agora', buzz: 100 }, 
      { time: '+12h', buzz: 80 }, { time: '+24h', buzz: 30 }
    ],
    scripts: {
      video: "O IMPOSTO VAI TER UM TETO! A decisão de hoje cedo em Brasília muda o preço de tudo que você compra. Vem entender...",
      body: "Foi definido: o novo IVA não vai passar de 26.5%. Isso afeta diretamente o setor de serviços e o varejo. Se você tem empresa, preste atenção nestes 3 pontos...",
      cta: "Compartilhe essa notícia urgente com o seu contador."
    }
  },
  { 
    id: 'n2', 
    type: 'trend',
    topic: 'Impacto nos Preços de Supermercado', 
    headline: 'Consumidores temem alta nos alimentos básicos após votação.',
    category: 'Economia Popular',
    source: 'Twitter Trends',
    url: 'https://twitter.com/search?q=imposto',
    publishedAt: 'Hoje, 09:15',
    narrativeStart: '08:45',
    shelfLifeHours: 72,
    engagement: 50,  
    velocity: 65,    
    volume: 90,
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=200',
    connections: ['n1'],
    platforms: ['Instagram', 'TikTok', 'WhatsApp', 'Pinterest', 'Kwai'],
    lifecycle: [
      { time: '08:00', buzz: 5 }, { time: '09:15', buzz: 40 }, { time: 'Agora', buzz: 85 }, 
      { time: '+12h', buzz: 95 }, { time: '+24h', buzz: 60 }
    ],
    scripts: {
      video: "O QUE VAI FICAR MAIS CARO NO MERCADO? A lista vazou.",
      body: "Com a nova trava do imposto, produtos da cesta básica estendida podem sofrer reajustes. Veja o que comprar hoje antes que mude.",
      cta: "Sua compra do mês vai aumentar? Comenta aqui embaixo."
    }
  },
  { 
    id: 'n3', 
    type: 'news',
    topic: 'Crise do Petróleo: Tensão no Oriente', 
    headline: 'Barril dispara 5% após novos conflitos e ameaça preço nas bombas.',
    category: 'Geopolítica',
    source: 'Reuters / Bloomberg',
    url: 'https://bloomberg.com',
    publishedAt: 'Hoje, 04:00',
    narrativeStart: 'Ontem, 23:00',
    shelfLifeHours: 120,
    engagement: 25,  
    velocity: 75,    
    volume: 110,
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&q=80&w=200',
    connections: ['n4'],
    platforms: ['Youtube', 'Reddit', 'Gettr', 'Truth Social'],
    lifecycle: [
      { time: '23:00', buzz: 20 }, { time: '04:00', buzz: 80 }, { time: 'Agora', buzz: 90 }, 
      { time: '+24h', buzz: 95 }, { time: '+48h', buzz: 70 }
    ],
    scripts: {
      video: "A GASOLINA PODE SUBIR AMANHÃ. O motivo não é no Brasil.",
      body: "A tensão no oriente médio atingiu um ponto crítico nesta madrugada. O barril de petróleo disparou. A Petrobras já está monitorando.",
      cta: "Mande para quem precisa abastecer o carro hoje!"
    }
  },
  { 
    id: 'n4', 
    type: 'trend',
    topic: 'Preço da Gasolina nas Redes', 
    headline: 'Motoristas de app planejam paralisação por conta de rumores de alta.',
    category: 'Sociedade',
    source: 'TikTok Trends',
    url: 'https://tiktok.com',
    publishedAt: 'Hoje, 10:00',
    narrativeStart: 'Hoje, 08:00',
    shelfLifeHours: 24,
    engagement: 75,  
    velocity: 40,    
    volume: 100,
    image: 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&q=80&w=200',
    connections: ['n3'],
    platforms: ['TikTok', 'Rumble', 'Snapchat', 'WhatsApp'],
    lifecycle: [
      { time: '08:00', buzz: 10 }, { time: '10:00', buzz: 60 }, { time: 'Agora', buzz: 100 }, 
      { time: '+12h', buzz: 40 }, { time: '+24h', buzz: 10 }
    ],
    scripts: {
      video: "PARALISAÇÃO DE MOTORISTAS? O que está acontecendo agora.",
      body: "Grupos de WhatsApp de motoristas estão fervendo com a possibilidade de alta da gasolina. Tem movimento de greve sendo articulado para sexta-feira.",
      cta: "Você apoia a paralisação? Vote nos comentários."
    }
  }
];

export default function SocialHubDashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [activeNode, setActiveNode] = useState(TRENDS_DATA[0].id);
  const [activeListTab, setActiveListTab] = useState('news');

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

  // Controle de Zoom
  const handleZoom = (direction) => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev + 0.1 : prev - 0.1;
      return Math.min(Math.max(newZoom, 0.5), 1.5);
    });
  };

  return (
    <div className={cn("min-h-screen transition-colors duration-300 font-sans", darkMode ? "dark bg-[#12121A] text-zinc-300" : "bg-[#F4F5F7] text-zinc-600")}>
      
      {/* CSS DO MAPA */}
      <style>{`
        .node-bubble { cursor: grab; transition: box-shadow 0.2s, border-color 0.2s; }
        .node-bubble:active { cursor: grabbing; }
        .map-grid { background-image: radial-gradient(circle, ${darkMode ? '#3f3f46' : '#d4d4d8'} 1px, transparent 1px); background-size: 30px 30px; }
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
                SocialHub News <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider">Radar</span>
              </h1>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Barra de Pesquisa */}
            <div className="relative flex-1 xl:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Pesquisar assuntos..." 
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

        {/* PIPELINE DE PRODUÇÃO (IA vs HUMANO) */}
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
          <section className="xl:col-span-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative flex flex-col h-[600px] overflow-hidden">
            <div className="absolute top-5 left-5 z-20 pointer-events-none bg-white/80 dark:bg-zinc-900/80 p-2 rounded-xl backdrop-blur-sm">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Target className="text-blue-500" size={20} />
                Radar de Oportunidades Virais
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Clique na imagem para ler a matéria ou arraste para examinar.</p>
            </div>

            {/* Controles de Zoom */}
            <div className="absolute bottom-5 right-5 z-20 flex bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm overflow-hidden">
               <button onClick={() => handleZoom('out')} className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"><ZoomOut size={16} /></button>
               <div className="w-[1px] bg-zinc-200 dark:bg-zinc-700" />
               <button onClick={() => handleZoom('in')} className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"><ZoomIn size={16} /></button>
            </div>

            {/* Container do Mapa com Zoom e Margens Seguras */}
            <div className="flex-1 w-full h-full relative overflow-hidden bg-zinc-50 dark:bg-zinc-950/30">
              <motion.div 
                className="w-full h-full relative"
                animate={{ scale: zoom }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {/* GRÁFICO REAL DE FUNDO (Eixos e Grades) */}
                <div className="absolute top-20 bottom-16 left-16 right-16 border-l-2 border-b-2 border-zinc-300 dark:border-zinc-700 map-grid">
                  
                  {/* Linhas Guias Internas (25%, 50%, 75%) */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-0 w-full border-t border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute top-2/4 left-0 w-full border-t border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute top-3/4 left-0 w-full border-t border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute left-1/4 top-0 h-full border-l border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute left-2/4 top-0 h-full border-l border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                    <div className="absolute left-3/4 top-0 h-full border-l border-zinc-200 dark:border-zinc-800/50 border-dashed" />
                  </div>

                  {/* Eixo Y Labels (Velocidade) */}
                  <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[10px] text-zinc-400 font-bold pb-0">
                    <span className="-mt-2">100</span>
                    <span className="-mt-1">75</span>
                    <span className="mt-1">50</span>
                    <span className="mt-3">25</span>
                    <span className="mb-[-8px]">0</span>
                  </div>
                  
                  {/* Eixo X Labels (Engajamento) */}
                  <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-zinc-400 font-bold">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>

                  {/* Títulos dos Eixos */}
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">
                    Velocidade de Propagação
                  </div>
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">
                    Engajamento Estimado
                  </div>

                  {/* CONTAINER DOS DADOS (LINHAS E BOLHAS) */}
                  <div className="absolute inset-0">
                    {/* Linhas de Conexão */}
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

                    {/* Bolhas Interativas (Nodes) */}
                    {filteredData.map(node => {
                      const isActive = activeNode === node.id;
                      const pxSize = Math.max(60, Math.min(130, node.volume)); 

                      return (
                        <motion.div 
                          key={node.id}
                          drag
                          dragSnapToOrigin={true}
                          dragElastic={0.1}
                          onClick={() => {
                            if (isActive) {
                              window.open(node.url, '_blank');
                            } else {
                              setActiveNode(node.id);
                            }
                          }}
                          whileDrag={{ scale: 1.1, zIndex: 50, cursor: 'grabbing' }}
                          className={cn(
                            "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 shadow-md node-bubble group z-10",
                            isActive ? "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.6)] z-30" : "border-white dark:border-zinc-700 hover:border-blue-300"
                          )}
                          style={{ 
                            left: `${node.engagement}%`, 
                            top: `${100 - node.velocity}%`, 
                            width: `${pxSize}px`, height: `${pxSize}px` 
                          }}
                        >
                          {/* Imagem Notícia */}
                          <img 
                            src={node.image} alt={node.topic} 
                            className={cn("absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-300", isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")} 
                            draggable="false"
                          />
                          {/* Escurecimento interno */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-full pointer-events-none" />
                          
                          {/* Ícone Indicador Tipo */}
                          <div className="absolute top-0 right-0 -mr-1 -mt-1 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-white dark:border-zinc-800 flex items-center justify-center text-blue-500 shadow-sm pointer-events-none">
                            {node.type === 'news' ? <Newspaper size={10} /> : <TrendingUp size={10} />}
                          </div>

                          {/* Título Interno e CTA */}
                          <div className="absolute bottom-3 left-0 w-full px-2 text-center pointer-events-none">
                            <p className="text-[10px] font-bold text-white leading-tight drop-shadow-md line-clamp-2">
                              {node.topic}
                            </p>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 bg-blue-600 rounded-full text-[8px] uppercase font-bold text-white tracking-wider shadow-lg">
                                <ExternalLink size={10} /> Abrir Link
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
          <aside className="xl:col-span-4 flex flex-col h-[600px]">
            <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden">
              
              {/* Cabeçalho das Abas */}
              <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                <button
                  onClick={() => setActiveListTab('news')}
                  className={cn(
                    "flex-1 p-4 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-tight transition-all", 
                    activeListTab === 'news' 
                      ? "bg-white dark:bg-zinc-900 text-emerald-600 border-b-2 border-emerald-500" 
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  <Newspaper size={18} /> Hard News
                </button>
                <button
                  onClick={() => setActiveListTab('trends')}
                  className={cn(
                    "flex-1 p-4 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-tight transition-all", 
                    activeListTab === 'trends' 
                      ? "bg-white dark:bg-zinc-900 text-blue-600 border-b-2 border-blue-500" 
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
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
                    onClick={() => setActiveNode(news.id)} 
                    className={cn("p-4 rounded-xl border cursor-pointer transition-all", activeNode === news.id ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 shadow-sm" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-300")}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5"><Globe size={12}/> {news.source}</p>
                      <p className="text-xs text-zinc-400 font-medium">{news.publishedAt}</p>
                    </div>
                    <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug mb-4">{news.headline}</p>
                    
                    {/* Redes Sociais Captadas */}
                    <div className="flex flex-wrap gap-1.5">
                      {news.platforms?.map(plat => (
                        <span key={plat} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-[10px] font-bold">
                          {plat}
                        </span>
                      ))}
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
                      
                      {/* Redes Sociais Captadas */}
                      <div className="flex flex-wrap gap-1.5">
                        {trend.platforms?.map(plat => (
                          <span key={plat} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-[10px] font-bold">
                            {plat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* PAINEL INFERIOR: DETALHES DO ASSUNTO & ESTÚDIO (2 COLUNAS MACRO) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* DETALHES, GRÁFICO LIFECYCLE E DADOS TEMPORAIS */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            
            {/* Cabeçalho da Notícia/Trend com Link */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", selectedData.type === 'news' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300")}>
                  {selectedData.category}
                </span>
                <span className="text-[11px] text-zinc-500 font-medium">Início: {selectedData.narrativeStart}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white leading-tight">
                {selectedData.headline || selectedData.topic}
              </h2>
              <a href={selectedData.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                <ExternalLink size={14} /> Ler assunto completo na fonte ({selectedData.source})
              </a>
            </div>

            {/* Painel de Tempos e Produção */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-500 mb-1"><Clock size={14} /><span className="text-[10px] uppercase font-bold">Publicado</span></div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedData.publishedAt}</p>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 text-orange-500 mb-1"><AlertCircle size={14} /><span className="text-[10px] uppercase font-bold">Tempo Útil (Shelf)</span></div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedData.shelfLifeHours} Horas</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                <div className="flex items-center gap-1.5 text-blue-600 mb-1"><Settings size={14} /><span className="text-[10px] uppercase font-bold">Ação Sugerida</span></div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Produzir Agora</p>
              </div>
            </div>

            {/* Gráfico do Ciclo de Vida da Narrativa (Área de Fundo) */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                <Activity size={16} className="text-zinc-400"/> Ciclo de Vida da Narrativa
              </h3>
              <div className="h-40 w-full relative">
                {/* Janela de Oportunidade Visual */}
                <div className="absolute left-[40%] right-[20%] top-0 bottom-6 bg-blue-500/5 dark:bg-blue-500/10 border-x border-dashed border-blue-200 dark:border-blue-500/30 z-0 flex items-start justify-center pt-2">
                   <span className="text-[9px] text-blue-500 font-bold uppercase bg-white/80 dark:bg-zinc-900/80 px-1 rounded">Janela Ideal p/ Postar</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedData.lifecycle} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBuzz" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={darkMode ? "#3b82f6" : "#60a5fa"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={darkMode ? "#3b82f6" : "#60a5fa"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#27272a" : "#f4f4f5"} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={10} fill="#71717a" />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} fill="#71717a" />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#71717a', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="buzz" stroke={darkMode ? "#3b82f6" : "#2563eb"} strokeWidth={3} fillOpacity={1} fill="url(#colorBuzz)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ESTÚDIO CRIATIVO */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-base">
                <PenTool className="text-blue-500" size={20} /> Estúdio de Conteúdo IA
              </h3>
              <button className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-100 transition-colors">
                <Copy size={12} /> Copiar Pautas
              </button>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Opção 1: Vídeo Rápido */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Video size={16} className="text-red-500" />
                  <span className="text-xs font-bold uppercase tracking-tight">Roteiro para Vídeo (TikTok/Reels)</span>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-500/5 rounded-xl border-l-4 border-red-500">
                  <p className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 mb-1">Hook (Primeiros 3s)</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 italic">"{selectedData.scripts.video}"</p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Desenvolvimento</p>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">{selectedData.scripts.body}</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Call to Action</p>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{selectedData.scripts.cta}</p>
                </div>
              </div>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              {/* Opção 2: Pauta para Live/Podcast */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Radio size={16} className="text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-tight">Abordagem para Live / Profundidade</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Abertura (Retenção)</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">"Acabou de sair a decisão. E o que eu vou mostrar aqui afeta diretamente o seu planejamento para amanhã..."</p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase text-blue-600 mb-1">Conexão Real</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">"Muita gente tá focada na manchete, mas eu fui ler o documento de 40 páginas. Olha só o detalhe na página 12..."</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}