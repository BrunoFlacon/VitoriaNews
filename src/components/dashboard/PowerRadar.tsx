import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, 
  TrendingUp, 
  Users, 
  Zap, 
  Activity, 
  MessageSquare, 
  Share2,
  AlertTriangle,
  ArrowUpRight,
  Globe,
  Radio,
  Search,
  Filter,
  Loader2,
  TrendingDown,
  ChevronRight,
  Target
} from "lucide-react";
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ReferenceArea
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIntelligence } from "@/hooks/useIntelligence";
import { useTrends } from "@/hooks/useTrends";
import { useAnalytics } from "@/hooks/useAnalytics";
import { TrendCard } from "./TrendCard";
import { AIContentCard } from "./AIContentCard";
import { RepostSuggestionCard } from "./RepostSuggestionCard";
import { RepostConfirmationModal } from "./RepostConfirmationModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const PowerRadar = () => {
  const { trends, politicalTrends, loading: trendsLoading, syncTrends, isSyncing } = useTrends();
  const { narratives, campaigns, attacks, suggestions, competitors, influenceNodes, updateSuggestionStatus } = useIntelligence();
  const { data: analyticsData, loading: analyticsLoading } = useAnalytics();
  
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRadarTab, setActiveRadarTab] = useState<"overview" | "attacks" | "narratives" | "analytics" | "viral">("overview");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  // Data for the Influence Map (Scatter Chart)
  const influenceData = useMemo(() => {
    if (influenceNodes && influenceNodes.length > 0) {
      return influenceNodes.map((node) => ({
        x: Math.random() * 100, // Still randomized position for visual map, but metrics are real
        y: Math.random() * 100,
        z: (node.influence_score || 0) * 10,
        name: node.username || 'Desconhecido',
        engagement: (node.engagement_rate || 0) * 100,
        followers: node.followers || 0
      }));
    }
    // Fallback Mock Data
    return Array.from({ length: 15 }).map((_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 80 + 20,
      name: `Impacto ${i + 1}`,
      engagement: Math.floor(Math.random() * 100)
    }));
  }, [influenceNodes]);

  const handleApprove = (id: string) => {
    const sug = suggestions.find(s => s.id === id);
    if (sug) {
       setSelectedSuggestion(sug);
       setIsModalOpen(true);
    }
  };

  const confirmPublish = async () => {
    if (selectedSuggestion) {
       await updateSuggestionStatus.mutateAsync({ id: selectedSuggestion.id, status: 'approved' });
       setIsModalOpen(false);
       setSelectedSuggestion(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER RADAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0c0c0e] p-8 rounded-[40px] border border-white/5 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48" />
         <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 rounded-[28px] bg-primary/20 border border-primary/30 flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
               <Radio className="w-10 h-10 text-primary" />
            </div>
            <div>
               <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Radar de Poder</h1>
               <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  <p className="text-sm text-muted-foreground font-black uppercase tracking-[0.3em]">Varredura Cognitiva Ativa</p>
               </div>
            </div>
         </div>
         
         <div className="relative z-10 flex items-center gap-4">
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
               {["overview", "viral", "analytics", "attacks", "narratives"].map((tab) => (
                 <Button
                   key={tab}
                   variant="ghost"
                   onClick={() => setActiveRadarTab(tab as any)}
                   className={cn(
                     "text-[10px] font-black uppercase tracking-widest px-4 h-10 transition-all rounded-xl",
                     activeRadarTab === tab ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                   )}
                 >
                   {tab === "overview" && "Visão Geral"}
                   {tab === "viral" && "Viralidade"}
                   {tab === "analytics" && "Analytics"}
                   {tab === "attacks" && "Ataques"}
                   {tab === "narratives" && "Narrativas"}
                 </Button>
               ))}
            </div>
            <Button 
               onClick={() => syncTrends()}
               disabled={isSyncing}
               variant="outline"
               className="border-primary/30 text-primary font-black uppercase tracking-widest px-4 h-12 rounded-2xl hover:bg-primary/10 transition-all"
            >
               {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
               Sincronizar Inteligência
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* COLUNA ESQUERDA: IA & REPOSTS */}
        <div className="lg:col-span-1 space-y-8">
           <section>
              <div className="flex items-center justify-between mb-4 px-2">
                 <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> Sugestões IA
                 </h2>
                 <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">LIVE</Badge>
              </div>
              <ScrollArea className="h-[750px] pr-4">
                 <div className="space-y-4 pb-10">
                   {suggestions.length > 0 ? (
                      suggestions.map((sug) => (
                        <RepostSuggestionCard 
                          key={sug.id} 
                          suggestion={sug}
                          onApprove={() => handleApprove(sug.id)}
                          onReject={(id) => updateSuggestionStatus.mutate({ id, status: 'rejected' })}
                          onEdit={(id) => updateSuggestionStatus.mutate({ id, status: 'editing' })}
                        />
                      ))
                   ) : (
                     <div className="p-10 border border-dashed border-white/10 rounded-[32px] text-center">
                        <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Nenhuma sugestão no momento</p>
                     </div>
                   )}
                 </div>
              </ScrollArea>
           </section>
        </div>

        {/* COLUNA CENTRAL: MAPA DE INFLUÊNCIA & TENDÊNCIAS */}
        <div className="lg:col-span-2 space-y-8">
           {/* MAPA DE INFLUÊNCIA */}
           <Card className="bg-[#0c0c0e] border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
              <CardHeader className="p-8 pb-0">
                 <div className="flex items-center justify-between">
                    <div>
                       <CardTitle className="text-2xl font-black text-white uppercase italic tracking-tighter">Influência Geopolítica</CardTitle>
                       <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">Conexões de rede e poder de engajamento</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                          <span className="text-[10px] font-black text-primary uppercase block">Rede Ativa</span>
                          <span className="text-xl font-black text-white">{influenceNodes.length > 0 ? `${influenceNodes.length} Nós` : '4.2k Nós'}</span>
                       </div>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-8">
                 <div className="h-[400px] w-full bg-black/40 rounded-[32px] border border-white/5 relative group p-4">
                    <ResponsiveContainer width="100%" height="100%">
                       <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <XAxis type="number" dataKey="x" hide />
                          <YAxis type="number" dataKey="y" hide />
                          <ZAxis type="number" dataKey="z" range={[50, 400]} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }} 
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                          />
                          <Scatter name="Nós de Influência" data={influenceData} fill="#3b82f6">
                             {influenceData.map((entry, index) => (
                               <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.engagement > 80 ? '#3b82f6' : (entry.engagement > 40 ? '#8b5cf6' : '#6366f1')} 
                                  fillOpacity={0.6}
                                  stroke={entry.engagement > 80 ? '#fff' : 'none'}
                                  strokeWidth={2}
                                />
                             ))}
                          </Scatter>
                       </ScatterChart>
                    </ResponsiveContainer>
                    <div className="absolute top-4 left-4 flex gap-2">
                       <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] font-black uppercase">Forte</Badge>
                       <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[9px] font-black uppercase">Médio</Badge>
                       <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[9px] font-black uppercase">Difundido</Badge>
                    </div>
                 </div>
              </CardContent>
           </Card>

            {/* CONTEÚDO DINÂMICO POR ABA */}
            <AnimatePresence mode="wait">
              {activeRadarTab === "analytics" ? (
                <motion.div 
                  key="analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {(analyticsData?.followerData || []).map((site, idx) => (
                    <Card key={idx} className="bg-[#0c0c0e] border-white/5 rounded-[32px] p-6 hover:bg-white/[0.03] transition-all group">
                       <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center">
                                {site.profileImage ? (
                                   <img src={site.profileImage} alt={site.platform} className="w-full h-full object-cover" />
                                ) : (
                                   <Users className="w-6 h-6 text-muted-foreground/40" />
                                )}
                             </div>
                             <div>
                                <h3 className="text-sm font-black text-white uppercase italic">{site.platform.toUpperCase()}</h3>
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">@{site.username || 'conectado'}</p>
                             </div>
                          </div>
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] font-black uppercase">Online</Badge>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                             <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] mb-1">Seguidores</p>
                             <p className="text-xl font-black text-white italic tracking-tighter">{(site.currentFollowers || 0).toLocaleString()}</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                             <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] mb-1">Total Posts</p>
                             <p className="text-xl font-black text-white italic tracking-tighter">{(site.postsCount || 0).toLocaleString()}</p>
                          </div>
                       </div>
                    </Card>
                  ))}
                  {(analyticsData?.followerData?.length === 0) && (
                    <div className="col-span-full p-20 border border-dashed border-white/10 rounded-[40px] text-center">
                       <Activity className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                       <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Nenhum dado analítico capturado ainda</p>
                    </div>
                  )}
                </motion.div>
              ) : activeRadarTab === "viral" ? (
                <motion.div 
                   key="viral"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20 }}
                   className="space-y-6"
                >
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trends.filter(t => (t.score || 0) > 80).slice(0, 6).map((trend) => (
                        <TrendCard key={trend.id} trend={trend as any} />
                      ))}
                   </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

           {/* MONITOR DE NARRATIVAS & IMPACTO (NOVO INTEGRADO) */}
           <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-[#0c0c0e] border-white/5 rounded-[32px] p-6 shadow-xl">
                 <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Monitor de Narrativas
                 </h3>
                 <div className="space-y-4">
                    {narratives.slice(0, 3).map((nar) => (
                       <div key={nar.id} className="space-y-2">
                          <div className="flex justify-between text-[11px] font-bold uppercase tracking-tighter text-white/80">
                             <span>{nar.topic}</span>
                             <span className={cn(
                                nar.sentiment === 'positivo' ? "text-green-500" : (nar.sentiment === 'negativo' ? "text-red-500" : "text-blue-500")
                             )}>
                                {Math.floor(nar.dominance_score)}% Dominância
                             </span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${nar.dominance_score}%` }}
                                className={cn(
                                   "h-full",
                                   nar.sentiment === 'positivo' ? "bg-green-500" : (nar.sentiment === 'negativo' ? "bg-red-500" : "bg-blue-500")
                                )}
                             />
                          </div>
                       </div>
                    ))}
                    {narratives.length === 0 && (
                       <div className="text-center py-6 text-[10px] text-muted-foreground uppercase font-black opacity-40">
                          Aguardando inteligência cognitiva...
                       </div>
                    )}
                 </div>
              </Card>

              <Card className="bg-[#0c0c0e] border-white/5 rounded-[32px] p-6 shadow-xl">
                 <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Target className="w-3 h-3" /> Benchmark Competitivo
                 </h3>
                 <div className="space-y-3">
                    {competitors.slice(0, 3).map((comp) => (
                       <div key={comp.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-400">
                                {comp.competitor_name ? comp.competitor_name[0] : 'C'}
                             </div>
                             <div>
                                <p className="text-xs font-bold text-white">{comp.competitor_name}</p>
                                <p className="text-[9px] text-muted-foreground uppercase font-black">{comp.platform}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[11px] font-black text-indigo-400">{((comp.engagement_rate || 0) * 100).toFixed(1)}%</p>
                             <p className="text-[9px] text-muted-foreground uppercase font-black">Engajamento</p>
                          </div>
                       </div>
                    ))}
                    {competitors.length === 0 && (
                       <div className="text-center py-6 text-[10px] text-muted-foreground uppercase font-black opacity-40">
                          Monitorando concorrentes...
                       </div>
                    )}
                 </div>
              </Card>
           </section>

           {/* TENDÊNCIAS POLÍTICAS GRID */}
           <section>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 px-2 gap-4">
                 <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Tendências e Narrativas
                 </h2>
                 <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 p-1 flex-wrap">
                    {["all", "google", "meta", "x-twitter", "tiktok", "newsapi"].map((platform) => (
                       <button
                          key={platform}
                          onClick={() => setPlatformFilter(platform)}
                          className={cn(
                             "px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all",
                             platformFilter === platform 
                                ? "bg-primary text-white" 
                                : "text-muted-foreground hover:text-white hover:bg-white/5"
                          )}
                       >
                          {platform}
                       </button>
                    ))}
                 </div>
                 <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-primary ml-2">Ver Tudo <ArrowUpRight className="w-3 h-3 ml-1" /></Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {[...politicalTrends, ...trends.filter(t => t && ((t.score || 0) > 90 || t.sub_source === 'NewsAPI'))]
                    .filter(t => {
                      if (!t) return false;
                      if (platformFilter === 'all') return true;
                      const kw = (t.keyword || "").toLowerCase();
                      const src = ((t as any).source || "").toLowerCase();
                      return kw.includes(platformFilter) || src.includes(platformFilter);
                    })
                    .sort((a, b) => {
                      const dateA = new Date(a?.detected_at || 0).getTime();
                      const dateB = new Date(b?.detected_at || 0).getTime();
                      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
                    })
                    .slice(0, 4).map((trend) => (
                      <TrendCard key={trend.id} trend={trend as any} />
                 ))}
                 {politicalTrends.length === 0 && trends.length === 0 && (
                   <div className="col-span-full py-12 text-center bg-white/5 rounded-[32px] border border-dashed border-white/10">
                      <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-relaxed">Nenhuma tendência detectada no radar secundário</p>
                   </div>
                 )}
              </div>
           </section>
        </div>

        {/* COLUNA DIREITA: ATAQUES & CAMPANHAS */}
        <div className="lg:col-span-1 space-y-8">
           {/* ATAQUES COORDENADOS */}
           <section>
              <div className="flex items-center justify-between mb-4 px-2">
                 <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Atividade Coordenada
                 </h2>
                 <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="space-y-4">
                 {(attacks || []).slice(0, 3).map((attack) => (
                   <motion.div 
                     key={attack.id}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className={cn(
                        "p-5 rounded-[28px] border bg-black/40 shadow-xl transition-all hover:bg-black/60",
                        attack.nivel_de_risco === 'alto' ? "border-red-500/20" : "border-white/5"
                     )}
                   >
                      <div className="flex justify-between items-start mb-3">
                         <Badge className={cn(
                            "text-[9px] font-black uppercase",
                            attack.nivel_de_risco === 'alto' ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500"
                         )}>
                            Risco {attack.nivel_de_risco === 'alto' ? 'Alto' : 'Médio'}
                         </Badge>
                         <span className="text-[10px] font-bold text-muted-foreground">
                            {attack.criado_em ? new Date(attack.criado_em).toLocaleTimeString('pt-BR') : 'Agora'}
                         </span>
                      </div>
                      <h3 className="text-sm font-black text-white uppercase italic tracking-tight mb-2">{attack.topico || 'Ataque Detectado'}</h3>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mb-4">
                        {attack.padrao_detectado || 'Padrão inusual detectado'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                         <div className="flex items-center gap-1.5 text-red-400">
                            <Activity className="w-3 h-3" /> {(attack.pontuacao_de_intensidade || 0)}% Intensidade
                         </div>
                         <div className="flex items-center gap-1.5 text-white/40">
                            <Users className="w-3 h-3" /> {attack.contas_envolvidas?.length || 0} Contas
                         </div>
                      </div>
                   </motion.div>
                 ))}
                 {attacks.length === 0 && (
                   <div className="p-8 border border-white/5 rounded-[28px] bg-black/20 text-center">
                      <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground/10 mb-2" />
                      <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">Nenhuma ameaça detectada</p>
                   </div>
                 )}
              </div>
           </section>

           {/* CAMPANHAS VIRAIS */}
           <section>
              <div className="flex items-center justify-between mb-4 px-2">
                 <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-400" /> Detecção de Campanhas
                 </h2>
              </div>
              <div className="space-y-3">
                 {campaigns.map((camp) => (
                   <div key={camp.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-indigo-500/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{camp.platforms.join(' + ')}</span>
                         <ArrowUpRight className="w-3 h-3 text-muted-foreground group-hover:text-white transition-colors" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{camp.topic}</h4>
                      <div className="h-1 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${camp.intensity_score}%` }}
                           className="h-full bg-indigo-500" 
                         />
                      </div>
                   </div>
                 ))}
                 {campaigns.length === 0 && (
                   <div className="p-8 border border-white/5 rounded-2xl bg-black/20 text-center opacity-40">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Monitorando propagação...</p>
                   </div>
                 )}
              </div>
           </section>
        </div>

      </div>

      {selectedSuggestion && (
        <RepostConfirmationModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={confirmPublish}
          onEdit={() => { /* Navegar para editor */ setIsModalOpen(false); }}
          platform={selectedSuggestion.target_platform}
          content={selectedSuggestion.suggested_content}
        />
      )}
    </div>
  );
};

export default PowerRadar;
