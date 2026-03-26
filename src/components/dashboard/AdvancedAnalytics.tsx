import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Card } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  Eye, Heart, Share2, TrendingUp, Users, 
  Settings, Clock, Activity, AlertCircle, BarChart3,
  Calendar, Loader2, ArrowUpRight, ArrowDownRight,
  RefreshCw, Check, MessageCircle
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { socialPlatforms } from "@/components/icons/SocialIcons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const PERIOD_OPTIONS = [
  { value: '24h', label: 'Últimas 24 horas' },
  { value: '3d', label: 'Últimos 3 dias' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '15d', label: 'Últimos 15 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '60d', label: 'Últimos 60 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '120d', label: 'Últimos 120 dias' },
  { value: '365d', label: 'Último 1 ano' },
];

const POST_TYPES = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'video', label: 'Vídeo' },
  { value: 'reel', label: 'Reels' },
  { value: 'story', label: 'Stories' },
  { value: 'live', label: 'Lives' },
  { value: 'photo', label: 'Foto' },
  { value: 'text', label: 'Texto' },
  { value: 'audio', label: 'Áudio' }
];

export const AdvancedAnalytics = () => {
  const { data, loading, period, setPeriod, platform, setPlatform, syncAnalytics } = useAnalytics();
  const [postType, setPostType] = useState('all');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [platformActiveProfile, setPlatformActiveProfile] = useState<Record<string, string>>({});
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);

  // Aggregating Follower Data to prevent duplicates
  const groupedFollowers = useMemo(() => {
    if (!data?.followerData) return [];
    
    // Group by platform
    const grouped = data.followerData.reduce((acc: any, curr: any) => {
      const platformKey = curr.platform;
      if (!acc[platformKey]) {
        acc[platformKey] = {
          platform: platformKey,
          totalFollowers: 0,
          totalPosts: 0,
          profiles: []
        };
      }
      acc[platformKey].totalFollowers += curr.currentFollowers || 0;
      acc[platformKey].totalPosts += curr.postsCount || 0;
      acc[platformKey].profiles.push(curr);
      return acc;
    }, {});

    return Object.values(grouped);
  }, [data?.followerData]);

  // Find currently selected profile details if any
  const activeProfile = useMemo(() => {
    if (!selectedProfileId || !data?.followerData) return null;
    return data.followerData.find((p: any) => 
      `${p.platform}-${p.username || p.platform_user_id}` === selectedProfileId
    );
  }, [selectedProfileId, data?.followerData]);

  if (loading) {
    return (
      <div className="flex bg-background/50 h-[600px] items-center justify-center rounded-2xl border border-border">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">
            Carregando analytics em tempo real...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex bg-background h-[600px] items-center justify-center rounded-2xl border border-border">
        <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="font-display font-bold text-xl">Erro ao carregar dados</h3>
          <p className="text-muted-foreground">
            Não foi possível carregar as informações do dashboard. Verifique sua conexão e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  const { overview, engagement, chartData, platformBreakdown, topContent, bestTimes } = data;

  // Render helper for trend percentage
  const renderTrend = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const isPositive = numValue > 0;
    const isNeutral = numValue === 0;

    return (
      <div className={`flex items-center text-xs font-medium space-x-1 px-2 py-1 rounded-full ${
        isNeutral ? "bg-muted text-muted-foreground" : 
        isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
      }`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : !isNeutral && <ArrowDownRight className="w-3 h-3" />}
        <span>{numValue > 0 ? "+" : ""}{numValue}%</span>
      </div>
    );
  };

  const getPlatformDetails = (id: string) => 
    socialPlatforms.find(p => p.id === id) || { name: id, color: 'bg-muted', icon: Activity };

  const getPlatformHex = (id: string) => {
    switch (normalizePlatform(id)) {
      case 'facebook': return '#1877F2';
      case 'instagram': return '#E4405F';
      case 'twitter': return '#000000';
      case 'linkedin': return '#0A66C2';
      case 'youtube': return '#FF0000';
      case 'tiktok': return '#000000';
      case 'whatsapp': return '#25D366';
      case 'telegram': return '#0088CC';
      case 'threads': return '#000000';
      default: return '#3b82f6';
    }
  }

  function normalizePlatform(platform: string): string {
    const value = platform.toLowerCase().trim();
    if (value === "x" || value === "twitter" || value === "x (twitter)") return "twitter";
    return value;
  }

  return (
    <div className="space-y-8 pb-12 w-full animate-fade-in">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Analytics Avançados
            {data.dataSource === 'seeded' && (
              <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full font-medium ml-2">
                Dados Históricos Pendentes
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho de suas publicações e perfis em tempo real com base em relatórios reais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="w-[180px] bg-background font-medium">
              <Calendar className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={isPlatformMenuOpen} onOpenChange={setIsPlatformMenuOpen}>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-md hover:border-primary/50 transition-colors font-medium text-sm group mr-1"
                onMouseEnter={() => setIsPlatformMenuOpen(true)}
              >
                <Settings className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-500" />
                <span>{platform === 'all' ? 'Todas as Redes' : getPlatformDetails(platform).name}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              align="end" 
              className="w-[240px] p-2"
              onMouseLeave={() => setIsPlatformMenuOpen(false)}
            >
              <div className="text-xs font-bold text-muted-foreground px-2 py-1 mb-1 uppercase tracking-wider">
                Redes Sociais
              </div>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => setPlatform('all')}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                    platform === 'all' ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Sumarizado
                  </div>
                  {platform === 'all' && <Check className="w-3 h-3" />}
                </button>
                {socialPlatforms.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                      platform === p.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <p.icon className={cn("w-4 h-4", p.textColor)} />
                      {p.name}
                    </div>
                    {platform === p.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger className="w-[180px] bg-background font-medium">
              <Activity className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Tipo de Post" />
            </SelectTrigger>
            <SelectContent>
              {POST_TYPES.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full hover:bg-primary/5 hover:text-primary transition-all border-primary/20"
                  onClick={syncAnalytics}
                  disabled={loading}
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sincronizar dados das APIs</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* TOP WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de Visualizações", value: engagement.views, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Engajamento Total", value: engagement.likes + engagement.comments, icon: Heart, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Alcance Estimado", value: engagement.reach, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Compartilhamentos", value: engagement.shares, icon: Share2, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/30 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {renderTrend(engagement.growth || "0")}
            </div>
            <div>
              <h3 className="text-3xl font-bold font-display tracking-tight text-card-foreground">
                {stat.value.toLocaleString()}
              </h3>
              <p className="text-sm text-muted-foreground font-medium mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Posts</p>
            <p className="text-2xl font-bold text-primary">{overview.totalPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Publicados</p>
            <p className="text-2xl font-bold text-green-500">{overview.publishedPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Agendados</p>
            <p className="text-2xl font-bold text-blue-500">{overview.scheduledPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Rascunhos</p>
            <p className="text-2xl font-bold text-yellow-500">{overview.draftPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Com Erro</p>
            <p className="text-2xl font-bold text-red-500">{overview.failedPosts}</p>
         </div>
         <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Taxa de Sucesso</p>
            <p className="text-2xl font-bold text-primary">{overview.publishRate}%</p>
         </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 col-span-2 shadow-sm border-border bg-card">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-card-foreground">Visão Geral</h3>
              <p className="text-sm text-muted-foreground">Evolução do engajamento no período</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEngs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="views" name="Visualizações" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="engagement" name="Engajamento" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorEngs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 shadow-sm border-border bg-card">
          <h3 className="font-display font-bold text-lg mb-2 text-card-foreground">Por Plataforma</h3>
          <p className="text-sm text-muted-foreground mb-6">Distribuição de publicações e métricas</p>
          
          {Object.keys(platformBreakdown).length > 0 ? (
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(platformBreakdown as Record<string, any>).map(([key, d]) => ({
                      name: key,
                      value: d.posts,
                      fill: getPlatformHex(key)
                    }))}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                  >
                    {Object.keys(platformBreakdown).map((key) => (
                      <Cell key={`cell-${key}`} fill={getPlatformHex(key)} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Nenhum dado das plataformas neste período.</div>
          )}

          <div className="mt-4 space-y-3">
            {Object.entries(platformBreakdown as Record<string, any>).map(([key, data], index) => {
              const p = getPlatformDetails(key);
              return (
                <div key={key} className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPlatformHex(key) }} />
                    <span className="text-card-foreground group-hover:text-primary transition-colors">{p.name}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">{data.posts} posts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* FOLLOWER CARDS AGGREGATED */}
      <Card className="p-6 shadow-sm border-border bg-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-bold text-lg text-card-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Crescimento de Seguidores por Rede
          </h3>
          {selectedProfileId && (
            <button 
              onClick={() => setSelectedProfileId(null)}
              className="text-xs text-primary hover:underline"
            >
              Ver visão geral agrupada
            </button>
          )}
        </div>
        
        {groupedFollowers && groupedFollowers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groupedFollowers.map((group: any) => {
              const platformInfo = getPlatformDetails(group.platform);
              const Icon = platformInfo.icon;
              return (
                <div key={group.platform} className="bg-background rounded-xl p-5 border border-border hover:border-primary/50 transition-all group overflow-hidden relative">
                   <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${platformInfo.color}`}>
                          <Icon className="w-5 h-5 text-white" />
                       </div>
                       <div>
                         <h4 className="font-bold text-card-foreground">{platformInfo.name}</h4>
                         <p className="text-xs text-muted-foreground">{group.profiles.length} perfil(is)</p>
                       </div>
                     </div>
                     {renderTrend(group.profiles[0]?.growth || "0")}
                   </div>
                   
                   <p className="text-2xl font-bold mt-2 font-display">
                     {platformActiveProfile[group.platform] 
                       ? group.profiles.find((p: any) => `${p.platform}-${p.username || p.platform_user_id}` === platformActiveProfile[group.platform])?.currentFollowers?.toLocaleString()
                       : group.totalFollowers.toLocaleString()}
                   </p>
                   <p className="text-xs text-muted-foreground mt-1">
                     {platformActiveProfile[group.platform] ? "seguidores do perfil" : "seguidores combinados"}
                   </p>

                   {/* Profile Selector Dropdown */}
                   <div className="mt-4 pt-4 border-t border-border">
                     {group.profiles.length > 1 ? (
                       <Select 
                         value={platformActiveProfile[group.platform] || "all"} 
                         onValueChange={(val) => {
                           setPlatformActiveProfile(prev => ({ ...prev, [group.platform]: val === "all" ? "" : val }));
                           if (val !== "all") setSelectedProfileId(val);
                           else setSelectedProfileId(null);
                         }}
                       >
                         <SelectTrigger className="h-8 text-[10px] bg-muted/30 border-none">
                           <SelectValue placeholder="Selecionar perfil" />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="all">Todos os perfis (Soma)</SelectItem>
                            {group.profiles.map((prof: any, pIdx: number) => {
                              const pId = `${prof.platform}-${prof.username || prof.platform_user_id}`;
                              return (
                                <SelectItem key={pIdx} value={pId}>
                                  @{prof.username || 'Perfil'} ({prof.currentFollowers?.toLocaleString()})
                                </SelectItem>
                              );
                            })}
                         </SelectContent>
                       </Select>
                     ) : (
                       <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                         {group.profiles[0]?.profileImage ? (
                            <img src={group.profiles[0].profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
                         ) : (
                            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">?</div>
                         )}
                         <span className="truncate">@{group.profiles[0]?.username || 'Perfil único'}</span>
                       </div>
                     )}
                   </div>

                   {/* Condensed profile details if one is selected */}
                   {platformActiveProfile[group.platform] && (
                     <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-2 bg-primary/5 rounded-lg border border-primary/10 space-y-1.5"
                     >
                        {(() => {
                           const prof = group.profiles.find((p: any) => `${p.platform}-${p.username || p.platform_user_id}` === platformActiveProfile[group.platform]);
                           if (!prof) return null;
                           return (
                             <>
                               <div className="flex items-center gap-2 mb-1">
                                  {prof.profileImage ? (
                                     <img src={prof.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                                  ) : (
                                     <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px]">?</div>
                                  )}
                                  <span className="text-[10px] font-bold text-primary truncate">@{prof.username}</span>
                               </div>
                               <div className="flex justify-between text-[9px]">
                                  <span className="text-muted-foreground">Posts:</span>
                                  <span className="font-bold">{prof.postsCount || 0}</span>
                               </div>
                               <div className="flex justify-between text-[9px]">
                                  <span className="text-muted-foreground">Crescimento:</span>
                                  <span className={cn("font-bold", (prof.growth || 0) >= 0 ? "text-green-500" : "text-red-500")}>
                                    {prof.growth > 0 ? `+${prof.growth}` : prof.growth}%
                                  </span>
                                </div>
                             </>
                           );
                        })()}
                     </motion.div>
                   )}
                </div>
              );
            })}
          </div>
        ) : (
           <div className="text-center py-12 text-muted-foreground">
              Não há dados de seguidores arquivados para consolidar.
           </div>
        )}
      </Card>

      {/* BEST TIMES & TOP CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-sm border-border bg-card">
          <h3 className="font-display font-bold text-lg mb-6 text-card-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            Melhores Horários (Histórico Real)
          </h3>
          <div className="space-y-4">
            {bestTimes && bestTimes.length > 0 ? bestTimes.map((bt: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-card-foreground">{bt.day}</h4>
                    <p className="text-sm text-muted-foreground">{bt.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-500">{bt.engagement}</p>
                  <p className="text-xs text-muted-foreground">índice engajamento</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground text-sm">Sem métricas de horários capturadas</div>
            )}
          </div>
        </Card>

        <Card className="p-6 shadow-sm border-border bg-card">
          <h3 className="font-display font-bold text-lg mb-6 text-card-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Melhores Publicações
          </h3>
          <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
            {topContent && topContent.length > 0 ? topContent.map((item: any, i: number) => (
              <div key={item.id} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {item.platforms && item.platforms.map((p: string) => {
                      const Icon = getPlatformDetails(p).icon;
                      return <Icon key={p} className={`w-4 h-4 ${getPlatformDetails(p).color.replace('bg-', 'text-')}`} />;
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Desconhecido'}
                  </span>
                </div>
                <p className="text-sm text-card-foreground line-clamp-2 mb-3">{item.content}</p>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1 text-blue-500"><Eye className="w-3 h-3" /> {item.views.toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-purple-500"><Heart className="w-3 h-3" /> {item.engagement.toLocaleString()}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma publicação arquivada neste período</div>
            )}
          </div>
        </Card>
      </div>

      {/* MESSAGE DELIVERY REPORTS - RESTORED */}
      <Card className="p-6 mt-6 shadow-sm border-border bg-card">
        <h3 className="font-display font-bold text-lg mb-6 text-card-foreground flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          Relatórios de Entrega de Mensagens
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-muted/20 border border-border/50 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Taxa de Sucesso</p>
                <p className="text-4xl font-bold text-green-500">
                  {data?.messageStats?.successRate || 0}%
                </p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/30"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={226}
                    strokeDashoffset={226 - (226 * (data?.messageStats?.successRate || 0)) / 100}
                    className="text-green-500 transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Entregues</p>
                <p className="text-2xl font-bold text-green-500">{data?.messageStats?.totalSent || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Falhas</p>
                <p className="text-2xl font-bold text-red-500">{data?.messageStats?.totalFailed || 0}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-4 text-muted-foreground">Entrega por Plataforma</p>
            <div className="space-y-4">
              {data?.messageStats?.platformStats && Object.entries(data.messageStats.platformStats).length > 0 ? (
                Object.entries(data.messageStats.platformStats).map(([platform, stats]: [string, any]) => {
                  const details = getPlatformDetails(platform);
                  const total = stats.sent + stats.failed;
                  const percent = total > 0 ? Math.round((stats.sent / total) * 100) : 0;
                  return (
                    <div key={platform} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold flex items-center gap-2">
                           <details.icon className={`w-3 h-3 ${details.color.replace('bg-', 'text-')}`} />
                           {details.name}
                        </span>
                        <span className="text-muted-foreground">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-500", details.color)} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                   Sem disparos registrados no período
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
