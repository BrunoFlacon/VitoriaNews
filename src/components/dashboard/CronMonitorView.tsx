import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, CheckCircle2, XCircle, Activity, Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { safeInvoke } from "@/utils/supabase-utils";
import { NetworkHealthIndicator } from "./NetworkHealthIndicator";

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
}

interface CronRun {
  runid: number;
  jobid: number;
  status: string;
  start_time: string;
  end_time: string | null;
  return_message: string | null;
}

interface SyncTask {
  id: string;
  user_id: string;
  connection_id: string;
  sync_type: 'historical_15d' | 'polling_4h';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  days_offset: number;
  last_sync_at: string | null;
  next_sync_at: string | null;
  error_log: string | null;
  social_connections: {
    platform: string;
    username: string;
    page_name: string;
  } | null;
}

export const CronMonitorView = () => {
  const { data, isLoading, refetch, isFetching, error: queryError } = useQuery({
    queryKey: ["cron-status"],
    queryFn: async () => {
      try {
        const { data, error } = await safeInvoke("cron-status", { timeoutMs: 15000 });
        if (error) {
          // Se for erro de conexão/deploy em ambiente local, retornamos estado vazio "saudável"
          // para não quebrar a UI conforme pedido do usuário
          if (error.message.includes('request') || error.message.includes('CORS') || error.message.includes('404')) {
            console.info("[CronMonitor] Edge Function offline, usando modo de espera silencioso.");
            return { jobs: [] as CronJob[], runs: [] as CronRun[] };
          }
          throw error;
        }
        return (data as { jobs: CronJob[]; runs: CronRun[] }) || { jobs: [], runs: [] };
      } catch (e) {
        // Fallback final para evitar crash
        return { jobs: [] as CronJob[], runs: [] as CronRun[] };
      }
    },
    staleTime: 1000 * 30, // 30s até marcar como stale
    refetchInterval: false, // ZERO background polling
    refetchOnWindowFocus: false, // Save resources when user is away
    refetchOnReconnect: false,
    retry: false,
    retryOnMount: false,
  });

  // Destructure safely with defaults to prevent "not defined" crashes
  const jobs: CronJob[] = data?.jobs || [];
  const runs: CronRun[] = data?.runs || [];

  // Subscribe to Realtime updates to avoid polling
  useEffect(() => {
    const channel = supabase
      .channel('cron-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_posts' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const { data: syncTasks, refetch: refetchTasks, isFetching: isFetchingTasks } = useQuery({
    queryKey: ["social-sync-tasks"],
    queryFn: async () => {
      try {
        // Cast to 'any' because social_sync_tasks may not yet exist in generated Supabase types
        const { data, error } = await (supabase as any)
          .from("social_sync_tasks")
          .select("*, social_connections(platform, username, page_name)")
          .order("next_sync_at", { ascending: true });
        if (error) {
          if (error.message?.includes('404') || error.message?.includes('relation') || error.message?.includes('does not exist')) {
            console.info("[SyncTasks] Table not available yet:", error.message);
          } else {
            console.warn("[SyncTasks] Error fetching tasks:", error.message);
          }
          return [] as SyncTask[];
        }
        return (data || []) as SyncTask[];
      } catch (e) {
        // Never throw — just return empty so the page doesn't crash
        return [] as SyncTask[];
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'failed' || currentStatus === 'completed' ? 'pending' : 'completed';
    const { error } = await (supabase as any)
      .from("social_sync_tasks")
      .update({ status: newStatus, next_sync_at: new Date().toISOString() })
      .eq("id", taskId);
    if (!error) refetchTasks();
  };

  const triggerHistorical = async (taskId: string) => {
    const { error } = await (supabase as any)
      .from("social_sync_tasks")
      .update({ 
        status: "pending", 
        days_offset: 15, 
        next_sync_at: new Date().toISOString() 
      })
      .eq("id", taskId);
    if (!error) refetchTasks();
  };

  // Group runs by jobid
  const runsByJob = runs.reduce((acc: Record<number, CronRun[]>, run) => {
    if (!acc[run.jobid]) acc[run.jobid] = [];
    acc[run.jobid].push(run);
    return acc;
  }, {});

  const getJobStats = (jobid: number) => {
    const jobRuns = runsByJob[jobid] || [];
    const succeeded = jobRuns.filter(r => r.status === "succeeded").length;
    const failed = jobRuns.filter(r => r.status === "failed").length;
    const lastRun = jobRuns[0];
    return { succeeded, failed, total: jobRuns.length, lastRun };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl mb-2">Monitoramento de Agendamentos</h1>
          <p className="text-muted-foreground">
            Acompanhe o status dos jobs automáticos (pg_cron), últimos runs e erros
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NetworkHealthIndicator />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{jobs.length}</p>
              <p className="text-xs text-muted-foreground">Jobs ativos</p>
            </div>
          </div>
        </Card>
        <Card className="glass-card p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{runs.filter(r => r.status === "succeeded").length}</p>
              <p className="text-xs text-muted-foreground">Runs com sucesso</p>
            </div>
          </div>
        </Card>
        <Card className="glass-card p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{runs.filter(r => r.status === "failed").length}</p>
              <p className="text-xs text-muted-foreground">Runs com falha</p>
            </div>
          </div>
        </Card>
        <Card className="glass-card p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Timer className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{runs.length}</p>
              <p className="text-xs text-muted-foreground">Total de runs</p>
            </div>
          </div>
        </Card>
      </div>

      {queryError && (
        <div className={cn(
          "border rounded-xl p-4 flex items-center gap-3 text-sm transition-all",
          (queryError as Error).message?.includes('request') 
            ? "bg-amber-500/5 border-amber-500/20 text-amber-600" 
            : "bg-red-500/10 border-red-500/30 text-red-500"
        )}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">
              {(queryError as Error).message?.includes('request') ? "Serviço de Monitoramento Offline" : "Erro de Sincronização"}
            </p>
            <p className="opacity-80">
              {(queryError as Error).message?.includes('request') 
                ? "A Edge Function 'cron-status' não foi detectada. Verifique se o deploy foi realizado no Supabase." 
                : ((queryError as Error).message || "Não foi possível carregar o status do Cron.")}
            </p>
          </div>
          {(queryError as Error).message?.includes('request') && (
             <div className="flex gap-2">
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={() => refetch()} 
                 className="h-8 text-xs hover:bg-amber-500/10"
               >
                 Tentar novamente
               </Button>
             </div>
          )}
        </div>
      )}

      {/* Empty State / Success but no jobs */}
      {!queryError && jobs.length === 0 && !isLoading && (
        <div className="bg-muted/10 border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
          <Clock className="w-8 h-8 text-muted-foreground/30" />
          <div>
            <p className="font-medium text-muted-foreground">Nenhum agendamento ativo</p>
            <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto mt-1">
              O sistema de automação está pronto, mas não existem tarefas (jobs) configuradas no momento.
            </p>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <Card className="glass-card border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Jobs Agendados</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhum job encontrado. Verifique se as funções de banco estão configuradas.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {jobs.map((job) => {
              const stats = getJobStats(job.jobid);
              return (
                <motion.div
                  key={job.jobid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">{job.jobname}</h3>
                        <Badge variant={job.active ? "default" : "secondary"} className="text-[10px] h-5">
                          {job.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.schedule}
                        </span>
                        {stats.lastRun && (
                          <span>
                            Último: {new Date(stats.lastRun.start_time).toLocaleString("pt-BR", {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-500">{stats.succeeded}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-medium text-red-500">{stats.failed}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-1 font-mono truncate max-w-full">
                    {job.command.trim().substring(0, 120)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent Runs */}
      <Card className="glass-card border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Últimos Runs</h2>
        </div>
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {runs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum run encontrado</div>
          ) : (
            runs.slice(0, 50).map((run) => {
              const job = jobs.find(j => j.jobid === run.jobid);
              return (
                <div key={run.runid} className="p-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {run.status === "succeeded" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {job?.jobname || `Job #${run.jobid}`}
                      </span>
                      <Badge
                        variant={run.status === "succeeded" ? "default" : "destructive"}
                        className="text-[10px] h-4"
                      >
                        {run.status === "succeeded" ? "OK" : "Falha"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(run.start_time).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
                      })}
                    </div>
                  </div>
                  {run.status === "failed" && run.return_message && (
                    <p className="text-xs text-red-400 mt-1 font-mono truncate">{run.return_message}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
      {/* Omnichannel Sync Management */}
      <div className="flex items-center justify-between mt-8">
        <div>
          <h2 className="font-display font-bold text-2xl mb-1">Fila de Sincronização Omnichannel</h2>
          <p className="text-sm text-muted-foreground">Monitoramento de histórico e polling de 4h para APIs Sociais</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchTasks()} disabled={isFetchingTasks}>
          <RefreshCw className={cn("w-3 h-3 mr-2", isFetchingTasks && "animate-spin")} />
          Atualizar Fila
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {syncTasks?.map((task) => (
          <Card key={task.id} className="glass-card p-4 border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold uppercase text-xs">
                {task.social_connections?.platform?.substring(0, 2) ?? 'NA'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {task.social_connections?.page_name || task.social_connections?.username || 'Desconhecido'}
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {task.sync_type.replace('_', ' ')}
                  </Badge>
                  <Badge 
                    className={cn(
                      "text-[10px]",
                      task.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                      task.status === 'processing' ? "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse" :
                      task.status === 'failed' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}
                  >
                    {task.status}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
                  <span>Plataforma: <span className="capitalize">{task.social_connections?.platform ?? 'N/A'}</span></span>
                  {task.sync_type === 'historical_15d' && (
                    <span className="px-1.5 py-0.5 bg-primary/5 rounded">Faltam {task.days_offset} dias</span>
                  )}
                  {task.last_sync_at && (
                    <span>Última: {new Date(task.last_sync_at).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {task.sync_type === 'historical_15d' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[10px] h-7"
                  onClick={() => triggerHistorical(task.id)}
                >
                  Reiniciar 15 dias
                </Button>
              )}
              <Button 
                variant={task.status === 'completed' ? "outline" : "default"} 
                size="sm" 
                className="text-[10px] h-7"
                onClick={() => toggleTask(task.id, task.status)}
              >
                {task.status === 'completed' ? "Reativar" : "Pausar"}
              </Button>
            </div>
          </Card>
        ))}

        {(!syncTasks || syncTasks.length === 0) && (
          <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-sm">
            Nenhuma tarefa de sincronização omnichannel encontrada.
          </div>
        )}
      </div>
    </div>
  );
};

export default CronMonitorView;
