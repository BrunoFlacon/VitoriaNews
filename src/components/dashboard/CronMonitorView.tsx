import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, CheckCircle2, XCircle, Activity, Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  job_pid: number;
  command: string;
  status: string;
  return_message: string;
  start_time: string;
  end_time: string;
}

export const CronMonitorView = () => {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["cron-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("cron-status");
      if (error) throw error;
      return data as { jobs: CronJob[]; runs: CronRun[] };
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const jobs = data?.jobs || [];
  const runs = data?.runs || [];

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
    </div>
  );
};

export default CronMonitorView;
