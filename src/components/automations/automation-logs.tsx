import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Check, XCircle, AlertCircle, SkipForward } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import type { AutomationLog } from "@/types"
import { Button } from "@/components/ui/button"
import { formatRelative } from "@/lib/automations/trigger-meta"

const STATUS_ICON: Record<string, typeof Check> = {
  success: Check,
  partial: AlertCircle,
  failed: XCircle,
  skipped: SkipForward,
}

const STATUS_COLOR: Record<string, string> = {
  success: "text-green-400",
  partial: "text-amber-400",
  failed: "text-red-400",
  skipped: "text-muted-foreground",
}

interface AutomationLogsProps {
  automationId: string
  automationName: string
  onBack: () => void
}

export function AutomationLogs({ automationId, automationName, onBack }: AutomationLogsProps) {
  const [logs, setLogs] = useState<AutomationLog[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error: fetchErr } = await supabase
          .from("automation_logs")
          .select("*, contact:contact_id(*)")
          .eq("automation_id", automationId)
          .order("created_at", { ascending: false })
          .limit(50)
        if (fetchErr) throw fetchErr
        if (!cancelled) setLogs((data ?? []) as AutomationLog[])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Falha ao carregar logs")
      }
    }
    load()
    return () => { cancelled = true }
  }, [automationId])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Logs de Execução</h2>
          <p className="text-xs text-muted-foreground">{automationName}</p>
        </div>
      </div>

      {error && (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {logs === null && !error && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {logs && logs.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-card/40">
          <p className="text-sm text-muted-foreground">Nenhum log de execução encontrado.</p>
        </div>
      )}

      {logs && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log) => {
            const Icon = STATUS_ICON[log.status] ?? AlertCircle
            const color = STATUS_COLOR[log.status] ?? "text-muted-foreground"
            return (
              <div key={log.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatRelative(log.created_at)}</span>
                      {log.contact && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate">{log.contact.name || log.contact.phone}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-foreground/80">{log.trigger_event}</p>
                    {log.steps_executed && log.steps_executed.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {log.steps_executed.map((step, i) => {
                          const StepIcon = STATUS_ICON[step.status] ?? AlertCircle
                          const stepColor = STATUS_COLOR[step.status] ?? "text-muted-foreground"
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                              title={step.detail}
                            >
                              <StepIcon className={`h-3 w-3 ${stepColor}`} />
                              {step.step_type}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {log.error_message && (
                      <p className="mt-1 text-xs text-red-400">{log.error_message}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
