import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Zap, Plus, MoreVertical, Copy, Pencil, Trash2,
  FileText, MessageCircle, Clock, Users, PhoneCall, Loader2,
} from "lucide-react"

import { supabase } from "@/integrations/supabase/client"
import type { Automation, TemplateSlug } from "@/types"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates"
import { triggerMeta, formatRelative } from "@/lib/automations/trigger-meta"
import { cn } from "@/lib/utils"

const TEMPLATE_ORDER: TemplateSlug[] = [
  "welcome_message", "out_of_office", "lead_qualifier", "follow_up_reminder",
]

const TEMPLATE_ICON: Record<TemplateSlug, typeof Zap> = {
  welcome_message: MessageCircle,
  out_of_office: Clock,
  lead_qualifier: Users,
  follow_up_reminder: PhoneCall,
}

interface AutomationsListProps {
  onCreateNew?: () => void
  onEdit?: (id: string) => void
  onViewLogs?: (id: string) => void
}

export function AutomationsList({ onCreateNew, onEdit, onViewLogs }: AutomationsListProps) {
  const [automations, setAutomations] = useState<Automation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Automation | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const { data, error: fetchErr } = await supabase
        .from("automations")
        .select("*")
        .order("created_at", { ascending: false })
      if (fetchErr) throw fetchErr
      setAutomations((data ?? []) as Automation[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar automações")
    }
  }

  useEffect(() => { load() }, [])

  async function toggleActive(a: Automation, next: boolean) {
    setAutomations((prev) => prev?.map((x) => (x.id === a.id ? { ...x, is_active: next } : x)) ?? prev)
    try {
      const { error: updateErr } = await supabase
        .from("automations")
        .update({ is_active: next })
        .eq("id", a.id)
      if (updateErr) throw updateErr
      toast.success(next ? "Automação ativada" : "Automação pausada")
    } catch (err: any) {
      setAutomations((prev) => prev?.map((x) => (x.id === a.id ? { ...x, is_active: !next } : x)) ?? prev)
      toast.error(err?.message ?? "Falha ao atualizar")
    }
  }

  async function duplicate(a: Automation) {
    try {
      const { name, description, trigger_type, trigger_config, is_active } = a
      const { data: newAuto, error: insertErr } = await supabase
        .from("automations")
        .insert({ name: `${name} (cópia)`, description, trigger_type, trigger_config, is_active, execution_count: 0, user_id: a.user_id })
        .select()
        .single()
      if (insertErr) throw insertErr

      // Copy steps
      const { data: steps } = await supabase
        .from("automation_steps")
        .select("*")
        .eq("automation_id", a.id)
        .order("position")
      if (steps && steps.length > 0) {
        const newSteps = steps.map((s: any) => ({
          automation_id: newAuto.id,
          parent_step_id: s.parent_step_id,
          branch: s.branch,
          step_type: s.step_type,
          step_config: s.step_config,
          position: s.position,
        }))
        const { error: stepsErr } = await supabase.from("automation_steps").insert(newSteps)
        if (stepsErr) throw stepsErr
      }

      toast.success("Automação duplicada!")
      load()
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao duplicar")
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await supabase.from("automation_steps").delete().eq("automation_id", pendingDelete.id)
      await supabase.from("automation_logs").delete().eq("automation_id", pendingDelete.id)
      await supabase.from("automations").delete().eq("id", pendingDelete.id)
      toast.success("Automação excluída")
      setPendingDelete(null)
      load()
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao excluir")
    } finally {
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
      </div>
    )
  }

  if (automations === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const showTemplates = automations.length < 3

  return (
    <div className="p-4 space-y-6">
      <div className="px-4 pt-2 pb-1">
        <p className="text-xs text-muted-foreground/70">Automações: crie fluxos automatizados de mensagens para suas conversas.</p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie fluxos de trabalho que reagem a eventos do WhatsApp automaticamente.
          </p>
        </div>
        <Button
          onClick={onCreateNew}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Criar Automação
        </Button>
      </div>

      {showTemplates && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Modelos rápidos</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {TEMPLATE_ORDER.map((slug) => {
              const t = AUTOMATION_TEMPLATES[slug]
              const Icon = TEMPLATE_ICON[slug]
              return (
                <button
                  key={slug}
                  onClick={() => onCreateNew?.()}
                  className="group flex flex-col items-start rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-card/80"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {automations.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">Nenhuma automação ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha um modelo acima ou crie uma do zero.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {automations.map((a) => (
            <AutomationCard
              key={a.id}
              automation={a}
              onToggle={(next) => toggleActive(a, next)}
              onEdit={() => onEdit?.(a.id)}
              onDuplicate={() => duplicate(a)}
              onLogs={() => onViewLogs?.(a.id)}
              onDelete={() => setPendingDelete(a)}
            />
          ))}
        </ul>
      )}

      <Dialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir automação</DialogTitle>
            <DialogDescription>
              Isso remove permanentemente{" "}
              <span className="text-foreground">{pendingDelete?.name}</span> e seu histórico de
              execução. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AutomationCard({ automation, onToggle, onEdit, onDuplicate, onLogs, onDelete }: {
  automation: Automation
  onToggle: (next: boolean) => void
  onEdit: () => void
  onDuplicate: () => void
  onLogs: () => void
  onDelete: () => void
}) {
  const meta = triggerMeta(automation.trigger_type)
  return (
    <li className="rounded-xl border border-border bg-card transition-colors hover:border-border">
      <div className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10" aria-hidden>
          <Zap className="h-5 w-5 text-primary" />
        </div>

        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{automation.name}</span>
            {automation.is_active && (
              <span className="relative flex h-2 w-2" aria-label="ativo">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            )}
          </div>
          {automation.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{automation.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.pillClass)}>
              {meta.label}
            </span>
            <span className="tabular-nums">
              {automation.execution_count} execução{(automation.execution_count === 1 ? "" : "ões")}
            </span>
            <span aria-hidden>·</span>
            <span>última {formatRelative(automation.last_executed_at)}</span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <Switch
            checked={automation.is_active}
            onCheckedChange={(v) => onToggle(!!v)}
            aria-label={automation.is_active ? "Desativar" : "Ativar"}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Abrir menu"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[popup-open]:bg-muted"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogs}>
                <FileText className="h-4 w-4" /> Ver Logs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  )
}
