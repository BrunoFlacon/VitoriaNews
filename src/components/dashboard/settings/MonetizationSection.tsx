import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, BarChart3, PieChart, ArrowUpRight, Coins, CalendarDays, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlatformDetails } from "@/components/icons/platform-metadata";

const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#14B8A6", "#F97316"];

interface MonetizationRow {
  id: string;
  platform: string;
  post_type: string;
  source: string;
  amount: number;
  currency: string;
  description: string | null;
  collected_at: string;
}

const KpiCard = ({ title, value, subtitle, icon: Icon, trend }: { title: string; value: string; subtitle: string; icon: any; trend?: string }) => (
  <Card className="p-5 border-border/40 bg-card/60 backdrop-blur-sm">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      {trend && (
        <Badge variant="outline" className="text-xs gap-1 bg-green-500/10 text-green-500 border-green-500/20">
          <ArrowUpRight className="w-3 h-3" /> {trend}
        </Badge>
      )}
    </div>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{title}</p>
    {subtitle && <p className="text-xs text-muted-foreground/60 mt-0.5">{subtitle}</p>}
  </Card>
);

export const MonetizationSection = () => {
  const { user } = useAuth();
  const { data: analytics, loading: analyticsLoading } = useAnalytics();
  const [monetizationData, setMonetizationData] = useState<MonetizationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchMonetization = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("social_monetization_metrics")
        .select("*")
        .eq("user_id", user.id)
        .order("collected_at", { ascending: false });
      if (!error && data) setMonetizationData(data as MonetizationRow[]);
      setLoading(false);
    };
    fetchMonetization();
  }, [user]);

  const stats = useMemo(() => {
    const total = monetizationData.reduce((s, r) => s + Number(r.amount), 0);
    const byPlatform: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    monetizationData.forEach(r => {
      byPlatform[r.platform] = (byPlatform[r.platform] || 0) + Number(r.amount);
      bySource[r.source] = (bySource[r.source] || 0) + Number(r.amount);
      byType[r.post_type] = (byType[r.post_type] || 0) + Number(r.amount);
      const month = r.collected_at?.slice(0, 7);
      if (month) byMonth[month] = (byMonth[month] || 0) + Number(r.amount);
    });
    return { total, byPlatform, bySource, byType, byMonth };
  }, [monetizationData]);

  const platformChartData = useMemo(() =>
    Object.entries(stats.byPlatform).map(([id, value]) => ({ 
      name: getPlatformDetails(id)?.name || id, 
      value: Math.round(value) 
    })),
    [stats.byPlatform]
  );

  const sourceChartData = useMemo(() =>
    Object.entries(stats.bySource).map(([name, value]) => ({ name, value: Math.round(value) })),
    [stats.bySource]
  );

  const monthlyChartData = useMemo(() =>
    Object.entries(stats.byMonth).map(([month, value]) => ({ month, receita: Math.round(value) })),
    [stats.byMonth]
  );

  if (loading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const isEmpty = monetizationData.length === 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Receita Total"
          value={stats.total > 0 ? `R$ ${stats.total.toFixed(2)}` : "R$ 0,00"}
          subtitle={`${monetizationData.length} registros`}
          icon={DollarSign}
        />
        <KpiCard
          title="Plataformas com Receita"
          value={String(Object.keys(stats.byPlatform).length)}
          subtitle={Object.keys(stats.byPlatform).join(", ") || "nenhuma"}
          icon={BarChart3}
        />
        <KpiCard
          title="Fontes de Receita"
          value={String(Object.keys(stats.bySource).length)}
          subtitle={Object.keys(stats.bySource).join(", ") || "nenhuma"}
          icon={Coins}
        />
      </div>

      {isEmpty ? (
        <Card className="p-12 border-border/40 bg-card/60 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum dado de monetização ainda</p>
            <p className="text-sm text-muted-foreground/60 max-w-md mx-auto">
              Os dados de receita aparecerão aqui conforme as integrações com as plataformas forem coletando métricas de superchat, PIX, anúncios e patrocínios.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Gráfico: Receita por Plataforma */}
          <Card className="p-6 border-border/40 bg-card/60 backdrop-blur-sm">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" /> Receita por Plataforma
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <RPieChart>
                <Pie
                  data={platformChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: R$ ${value}`}
                >
                  {platformChartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value}`} />
              </RPieChart>
            </ResponsiveContainer>
          </Card>

          {/* Gráfico: Evolução Mensal */}
          <Card className="p-6 border-border/40 bg-card/60 backdrop-blur-sm">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Evolução Mensal
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `R$ ${value}`} />
                <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Gráfico: Distribuição por Tipo e Fonte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 border-border/40 bg-card/60 backdrop-blur-sm">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Receita por Tipo de Conteúdo
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(stats.byType).map(([name, value]) => ({ 
                  name: name === 'post' ? 'Post' : name === 'live' ? 'Live' : name === 'story' ? 'Story' : name === 'reels' ? 'Reels' : name === 'shorts' ? 'Shorts' : name, 
                  value: Math.round(value) 
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `R$ ${value}`} />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 border-border/40 bg-card/60 backdrop-blur-sm">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" /> Receita por Fonte
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sourceChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `R$ ${value}`} />
                  <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

            {/* Últimos Registros */}
            <Card className="p-6 border-border/40 bg-card/60 backdrop-blur-sm">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Últimos Registros
              </h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {monetizationData.slice(0, 10).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{r.platform}</Badge>
                      <span className="text-xs text-muted-foreground">{r.source}</span>
                      {r.post_type !== "unknown" && (
                        <span className="text-xs text-muted-foreground/60">({r.post_type})</span>
                      )}
                    </div>
                    <span className="font-medium text-green-500">R$ {Number(r.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </motion.div>
  );
};
