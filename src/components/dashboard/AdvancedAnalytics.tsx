import { motion } from "framer-motion";
import { 
  Eye, 
  Heart, 
  Users, 
  TrendingUp,
  TrendingDown,
  Share2,
  MessageCircle,
  BarChart3,
  Clock,
  Loader2,
  RefreshCw
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { useAnalytics } from "@/hooks/useAnalytics";
import { socialPlatforms } from "@/components/icons/SocialIcons";
import { cn, normalizePlatform } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export const AdvancedAnalytics = () => {
  const { data, loading, period, setPeriod, platform, setPlatform, refetch } = useAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
        <Button onClick={refetch} className="mt-4" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Normalize and merge platform breakdown entries
  const mergedBreakdown: Record<string, { posts: number; engagement: number }> = {};
  Object.entries(data.platformBreakdown).forEach(([key, value]) => {
    const normalized = normalizePlatform(key);
    if (!mergedBreakdown[normalized]) {
      mergedBreakdown[normalized] = { posts: 0, engagement: 0 };
    }
    mergedBreakdown[normalized].posts += value.posts;
    mergedBreakdown[normalized].engagement += value.engagement;
  });

  const platformBreakdownData = Object.entries(mergedBreakdown).map(([key, value], index) => ({
    name: socialPlatforms.find(p => p.id === key)?.name || key,
    posts: value.posts,
    engagement: value.engagement,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl mb-2">Analytics Avançados</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho de suas publicações em tempo real
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as redes</SelectItem>
              {socialPlatforms.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Visualizações"
          value={data.engagement.views.toLocaleString()}
          icon={Eye}
          trend={parseFloat(data.engagement.growth)}
          color="primary"
        />
        <StatsCard
          title="Engajamento Total"
          value={(data.engagement.likes + data.engagement.comments + data.engagement.shares).toLocaleString()}
          icon={Heart}
          trend={parseFloat(data.engagement.engagementRate)}
          trendLabel="taxa"
          color="accent"
        />
        <StatsCard
          title="Alcance"
          value={data.engagement.reach.toLocaleString()}
          icon={Users}
          color="success"
        />
        <StatsCard
          title="Compartilhamentos"
          value={data.engagement.shares.toLocaleString()}
          icon={Share2}
          color="warning"
        />
      </div>

      {/* Posts Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{data.overview.totalPosts}</p>
          <p className="text-sm text-muted-foreground">Total de Posts</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{data.overview.publishedPosts}</p>
          <p className="text-sm text-muted-foreground">Publicados</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{data.overview.scheduledPosts}</p>
          <p className="text-sm text-muted-foreground">Agendados</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{data.overview.draftPosts}</p>
          <p className="text-sm text-muted-foreground">Rascunhos</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{data.overview.failedPosts}</p>
          <p className="text-sm text-muted-foreground">Com Erro</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 glass-card rounded-2xl border border-border p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-bold text-xl">Visão Geral</h2>
              <p className="text-sm text-muted-foreground">Performance no período selecionado</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Visualizações</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-xs text-muted-foreground">Engajamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Alcance</span>
              </div>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(215, 20%, 55%)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(215, 20%, 55%)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 10%)",
                    border: "1px solid hsl(222, 30%, 18%)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)"
                  }}
                  labelStyle={{ color: "hsl(210, 40%, 98%)" }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2}
                  fill="url(#colorViews)"
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={2}
                  fill="url(#colorEngagement)"
                />
                <Area
                  type="monotone"
                  dataKey="reach"
                  stroke="hsl(142, 70%, 45%)"
                  strokeWidth={2}
                  fill="url(#colorReach)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Platform Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl border border-border p-6"
        >
          <h2 className="font-display font-bold text-xl mb-4">Por Plataforma</h2>
          
          {platformBreakdownData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="posts"
                    >
                      {platformBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 10%)",
                        border: "1px solid hsl(222, 30%, 18%)",
                        borderRadius: "8px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2 mt-4">
                {platformBreakdownData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">{item.posts} posts</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum post neste período
            </div>
          )}
        </motion.div>
      </div>

      {/* Best Times & Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Posting Times */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl border border-border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-xl">Melhores Horários</h2>
          </div>
          
          <div className="space-y-3">
            {data.bestTimes.map((time, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                    index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                    index === 1 ? "bg-gray-300/20 text-gray-300" :
                    index === 2 ? "bg-orange-500/20 text-orange-500" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{time.day}</p>
                    <p className="text-sm text-muted-foreground">{time.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">{time.engagement}%</p>
                  <p className="text-xs text-muted-foreground">engajamento</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl border border-border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="font-display font-bold text-xl">Top Conteúdos</h2>
          </div>
          
          {data.topContent.length > 0 ? (
            <div className="space-y-3">
              {data.topContent.map((content, index) => (
                <div 
                  key={content.id}
                  className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm line-clamp-2 mb-2">{content.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {content.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {content.engagement}
                      </span>
                    </div>
                    <div className="flex -space-x-1">
                      {content.platforms.slice(0, 3).map((platformId) => {
                        const normalizedId = normalizePlatform(platformId);
                        const platform = socialPlatforms.find(p => p.id === normalizedId);
                        if (!platform) return null;
                        const Icon = platform.icon;
                        return (
                          <div
                            key={platformId}
                            className={cn(
                              "w-5 h-5 rounded flex items-center justify-center border border-card",
                              platform.color
                            )}
                          >
                            <Icon className="w-2.5 h-2.5 text-white" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum conteúdo publicado neste período
            </div>
          )}
        </motion.div>
      </div>

      {/* Engagement Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card rounded-2xl border border-border p-6"
      >
        <h2 className="font-display font-bold text-xl mb-6">Detalhamento do Engajamento</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-blue-500/10">
            <Heart className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-blue-500">{data.engagement.likes.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Curtidas</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-purple-500/10">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-purple-500">{data.engagement.comments.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Comentários</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-green-500/10">
            <Share2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-500">{data.engagement.shares.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Compartilhamentos</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-orange-500/10">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-orange-500">{data.engagement.engagementRate}%</p>
            <p className="text-sm text-muted-foreground">Taxa de Engajamento</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Internal StatsCard component
interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color: 'primary' | 'accent' | 'success' | 'warning';
}

const StatsCard = ({ title, value, icon: Icon, trend, trendLabel, color }: StatsCardProps) => {
  const colorClasses = {
    primary: "from-primary/20 to-primary/5 text-primary",
    accent: "from-accent/20 to-accent/5 text-accent",
    success: "from-green-500/20 to-green-500/5 text-green-500",
    warning: "from-orange-500/20 to-orange-500/5 text-orange-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl border border-border p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
          colorClasses[color]
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
            {trendLabel && <span className="text-muted-foreground ml-1">{trendLabel}</span>}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
    </motion.div>
  );
};
