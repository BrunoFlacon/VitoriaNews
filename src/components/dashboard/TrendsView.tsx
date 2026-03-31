import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  TrendingUp, 
  Globe, 
  Zap,
  RefreshCw,
  Loader2,
  Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTrends, TrendItem } from "@/hooks/useTrends";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { TrendDetailDrawer } from "./TrendDetailDrawer";

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export const TrendsView = () => {
  const { trends, loading, syncTrends } = useTrends();
  const [searchTerm, setSearchTerm] = useState("");
  const [activePlatform, setActivePlatform] = useState("googlenews");
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredTrends = useMemo(() => {
    let combined = [...trends];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      combined = combined.filter(t => 
        t.keyword?.toLowerCase().includes(lowerSearch) ||
        t.source?.toLowerCase().includes(lowerSearch)
      );
    }

    return combined.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
  }, [trends, searchTerm]);

  const topTrendsChartData = useMemo(() => {
    return filteredTrends
      .slice(0, 8)
      .map(t => ({
        name: t.keyword.length > 20 ? t.keyword.substring(0, 17) + "..." : t.keyword,
        score: t.score || 50,
        fullName: t.keyword
      }))
      .sort((a, b) => b.score - a.score);
  }, [filteredTrends]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 bg-card/50 p-4 rounded-3xl border border-border/50 backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar tendências..." 
            className="pl-10 bg-background/50 border-border/50 rounded-2xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => syncTrends()}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-primary text-white font-black"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar Radar
          </Button>
        </div>
      </div>

      {!loading && topTrendsChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2 shadow-sm border-white/5 bg-[#000000] flex flex-col h-[300px] rounded-[32px]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2 uppercase tracking-tight">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Top Impulso Digital
                </h3>
              </div>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTrendsChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#333" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={10}
                    tick={{ fill: '#888', fontWeight: 'bold' }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', color: '#fff' }}
                    formatter={(value) => [`${value}%`, 'Score']}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                    {topTrendsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 shadow-sm border-white/5 bg-[#000000] flex flex-col h-[300px] rounded-[32px]">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2 uppercase tracking-tight">
              <Zap className="w-5 h-5 text-yellow-500" />
              Volume AI
            </h3>
            <div className="flex-1 w-full flex items-center justify-center relative">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={topTrendsChartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScore)" />
                 </AreaChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-10 text-center">
                  <p className="text-4xl font-black text-primary/10 tracking-tighter">AI LIVE</p>
                  <p className="text-[10px] text-primary/40 font-black uppercase tracking-[0.2em] mt-2">{filteredTrends.length} Ativos</p>
               </div>
            </div>
          </Card>
        </div>
      )}

      {/* SISTEMA DE ABAS POR REDE (TABBED CONTENT) */}
      <Tabs value={activePlatform} onValueChange={setActivePlatform} className="w-full">
              <div className="overflow-x-auto mb-6 -mx-1 px-1 flex [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <TabsList className="bg-transparent h-auto p-0 gap-2 flex flex-nowrap w-max min-w-full">
            {Object.entries(
              trends.reduce((acc: any, trend) => {
                const id = (trend.source || "Other").toLowerCase().replace(/\s+/g, '');
                if (!acc[id]) acc[id] = { name: trend.source || "Other" };
                return acc;
              }, {
                'googlenews': { name: 'Google News' }
              })
            ).map(([id, info]: [string, any]) => {
              const platformId: any = id;
              const platformMeta = socialPlatforms.find(p => p.id === platformId || p.name.toLowerCase() === info.name.toLowerCase());
              return (
                <TabsTrigger 
                  key={id} 
                  value={id}
                  className={cn(
                    "relative h-10 px-4 rounded-xl border border-white/5 bg-white/[0.02] text-xs font-bold uppercase tracking-wider transition-all",
                    "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20",
                    "hover:bg-white/5 text-muted-foreground hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {platformMeta && <platformMeta.icon className="w-4 h-4" />}
                    {info.name}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {Object.entries(
          trends.reduce((acc: any, trend) => {
            const id = (trend.source || "Other").toLowerCase().replace(/\s+/g, '');
            if (!acc[id]) acc[id] = [];
            acc[id].push(trend);
            return acc;
          }, { 'googlenews': [] })
        ).map(([id, platformTrends]: [string, any]) => (
          <TabsContent key={id} value={id} className="mt-0 focus-visible:outline-none">
            <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
              <div className="divide-y divide-white/5">
                {(platformTrends as TrendItem[]).length > 0 ? (
                  (platformTrends as TrendItem[])
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .slice(0, 20)
                    .map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => {
                        setSelectedTrend(item);
                        setIsDrawerOpen(true);
                      }}
                      className="group relative flex items-center justify-between p-5 px-8 hover:bg-white/[0.04] transition-all cursor-pointer border-l-4 border-transparent hover:border-primary"
                    >
                      <div className="relative z-10 flex items-start gap-5 flex-1 pr-4 min-w-0">
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 bg-white/5 shadow-xl">
                          <img 
                            src={item.thumbnail_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='100%25' height='100%25' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' font-weight='bold' fill='%234a4a4a'%3ECapa%3C/text%3E%3C/svg%3E`} 
                            alt="" 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.dataset.fallback) {
                                 target.dataset.fallback = 'true';
                                 target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 200 200'%3E%3Crect width='100%25' height='100%25' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' font-weight='bold' fill='%234a4a4a'%3ECapa%3C/text%3E%3C/svg%3E`;
                              }
                            }}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                          />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-white/5 border-white/10 text-muted-foreground">
                              {item.category || 'Viral'}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                              {item.metadata?.published_at ? `${new Date(item.metadata.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${new Date(item.metadata.published_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : `${new Date(item.detected_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (Captação)`}
                            </span>
                          </div>
                          <h4 className="font-black text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1 text-white">
                            {item.keyword}
                          </h4>
                          <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                               <span className="text-[10px] font-black text-primary uppercase tracking-widest">{Math.floor(item.score)}% Relevância</span>
                             </div>
                             <div className="flex items-center gap-1.5 grayscale opacity-40">
                               <Zap className="w-3 h-3 text-yellow-500" />
                               <span className="text-[10px] font-bold uppercase tracking-widest">Alta Velocidade</span>
                             </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                         <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-white/5 hover:bg-primary hover:border-primary text-white">
                            <Plus className="w-5 h-5" />
                         </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-28 text-center flex flex-col items-center justify-center">
                    <Globe className="w-12 h-12 text-muted-foreground/20 mb-4 animate-pulse" />
                    <h3 className="text-muted-foreground font-black uppercase tracking-[0.2em]">Varredura em Curso</h3>
                    <p className="text-xs text-muted-foreground/40 mt-1 uppercase font-bold tracking-widest">Aguardando sinais de {id}</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <TrendDetailDrawer 
        trend={selectedTrend}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onProduce={(trend) => {
          setIsDrawerOpen(false);
          // Redirecionamento de produção aqui se necessário
        }}
      />
    </div>
  );
};

export default TrendsView;
