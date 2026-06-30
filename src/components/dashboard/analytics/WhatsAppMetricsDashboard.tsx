import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Users, Activity, Bot, Hash, AlertCircle } from "lucide-react";

interface WhatsAppMetrics {
  total: number;
  period: string;
  byStatus: Record<string, number>;
  bySender: { bot: number; human: number };
  conversations: number;
  responseRate: number;
  botzap: {
    enviadas: number;
    respondidas: number;
    apagadas: number;
  };
  byConnection: Record<string, number>;
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${color}/10`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider truncate">
            {label}
          </p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
          {sub && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function WhatsAppMetricsDashboard({ userId, connectionId }: { userId?: string; connectionId?: string }) {
  const [metrics, setMetrics] = useState<WhatsAppMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<string>("7");

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const finalUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!finalUserId) throw new Error("User not authenticated");

      const { data, error: fnErr } = await supabase.functions.invoke(
        "whatsapp-analytics",
        {
          method: "GET",
          headers: {
            "x-user-id": finalUserId,
            "x-days": days,
            ...(connectionId ? { "x-connection-id": connectionId } : {}),
          },
        },
      );

      if (fnErr) throw fnErr;
      setMetrics(data as WhatsAppMetrics);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  }, [userId, connectionId, days]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Métricas WhatsApp
        </h3>
        <Tabs value={days} onValueChange={setDays}>
          <TabsList className="h-8">
            <TabsTrigger value="7" className="text-xs px-3">7 dias</TabsTrigger>
            <TabsTrigger value="30" className="text-xs px-3">30 dias</TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-3">Todo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-yellow-600">
            <AlertCircle className="w-4 h-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {metrics && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            icon={MessageSquare}
            label="Total Mensagens"
            value={metrics.total.toLocaleString("pt-BR")}
            sub={`Período: ${metrics.period}`}
            color="text-blue-400"
          />
          <MetricCard
            icon={Users}
            label="Conversas"
            value={metrics.conversations.toLocaleString("pt-BR")}
            color="text-green-400"
          />
          <MetricCard
            icon={Bot}
            label="Taxa de Resposta"
            value={`${metrics.responseRate}%`}
            sub={`${metrics.bySender.bot} bot / ${metrics.bySender.human} human`}
            color="text-purple-400"
          />
          <MetricCard
            icon={Activity}
            label="Bot Ativo"
            value={`${metrics.botzap.respondidas}/${metrics.botzap.enviadas}`}
            sub={`${metrics.botzap.apagadas} system logs`}
            color="text-orange-400"
          />
        </div>
      )}

      {metrics && !loading && metrics.byStatus && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Hash className="w-3.5 h-3.5" />
              Status das Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(metrics.byStatus).map(([status, count]) => (
                <div key={status} className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {status === "received" ? "Recebidas" : status === "sent" ? "Enviadas" : status === "failed" ? "Falhas" : status === "draft" ? "Rascunho" : status === "scheduled" ? "Agendadas" : status}
                  </p>
                  <p className="text-lg font-bold mt-0.5">{count.toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {metrics && !loading && Object.keys(metrics.byConnection).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Send className="w-3.5 h-3.5 inline mr-1" />
              Mensagens por Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {Object.entries(metrics.byConnection).map(([cid, count]) => (
                <div key={cid} className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-muted/20">
                  <span className="text-muted-foreground truncate text-xs font-mono max-w-[200px]">
                    {cid === "unknown" ? "Sem conexão" : cid.substring(0, 12) + "..."}
                  </span>
                  <span className="font-bold text-xs">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
