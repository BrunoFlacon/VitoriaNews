import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  FileText,
  Tag,
  TagIcon,
  UserCheck,
  PencilLine,
  Briefcase,
  Hourglass,
  GitBranch,
  Webhook,
  CircleSlash,
  Zap,
  Loader2,
  ArrowDown,
  ArrowUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {
  AccountMember,
  AutomationStepType,
  AutomationTriggerType,
  CustomField,
  KeywordMatchTriggerConfig,
  MessageTemplate,
  Tag as TagRecord,
} from "@/types"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

// ------------------------------------------------------------
// Types (builder-local)
// ------------------------------------------------------------

export interface BuilderStep {
  cid: string
  step_type: AutomationStepType
  step_config: Record<string, unknown>
  branches?: { yes: BuilderStep[]; no: BuilderStep[] }
}

export interface BuilderInitial {
  id?: string
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, unknown>
  is_active: boolean
  steps: BuilderStep[]
}

// ------------------------------------------------------------
// Step metadata
// ------------------------------------------------------------

interface StepMeta {
  label: string
  icon: typeof Zap
  border: string
}

const STEP_META: Record<AutomationStepType, StepMeta> = {
  send_message: { label: "Enviar Mensagem", icon: MessageSquare, border: "border-l-primary" },
  send_template: { label: "Enviar Template", icon: FileText, border: "border-l-primary" },
  add_tag: { label: "Adicionar Tag", icon: Tag, border: "border-l-primary" },
  remove_tag: { label: "Remover Tag", icon: TagIcon, border: "border-l-primary" },
  assign_conversation: { label: "Atribuir Conversa", icon: UserCheck, border: "border-l-primary" },
  update_contact_field: { label: "Atualizar Campo", icon: PencilLine, border: "border-l-primary" },
  create_deal: { label: "Criar Negócio", icon: Briefcase, border: "border-l-primary" },
  wait: { label: "Aguardar", icon: Hourglass, border: "border-l-border" },
  condition: { label: "Condição (Se/Senão)", icon: GitBranch, border: "border-l-amber-500" },
  send_webhook: { label: "Enviar Webhook", icon: Webhook, border: "border-l-primary" },
  close_conversation: { label: "Fechar Conversa", icon: CircleSlash, border: "border-l-primary" },
}

const ADDABLE_STEPS: AutomationStepType[] = [
  "send_message", "send_template", "add_tag", "remove_tag",
  "assign_conversation", "update_contact_field", "create_deal",
  "wait", "condition", "send_webhook", "close_conversation",
]

const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string; hint: string }[] = [
  { value: "new_message_received", label: "Nova Mensagem Recebida", hint: "Qualquer mensagem recebida" },
  { value: "first_inbound_message", label: "Primeira Mensagem do Contato", hint: "Primeira vez que este contato envia mensagem" },
  { value: "keyword_match", label: "Palavra-chave", hint: "Mensagem contém palavra(s) específica(s)" },
  { value: "new_contact_created", label: "Novo Contato Criado", hint: "Quando um contato é criado automaticamente" },
  { value: "conversation_assigned", label: "Conversa Atribuída", hint: "Quando atribuída a um agente" },
  { value: "tag_added", label: "Tag Adicionada", hint: "Quando uma tag é adicionada a um contato" },
  { value: "time_based", label: "Baseado em Tempo", hint: "Em um agendamento recorrente" },
]

function cid(): string {
  return (
    "c_" +
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36))
  )
}

function blankConfig(type: AutomationStepType): Record<string, unknown> {
  switch (type) {
    case "send_message": return { text: "" }
    case "send_template": return { template_name: "", language: "pt_BR" }
    case "add_tag":
    case "remove_tag": return { tag_id: "" }
    case "assign_conversation": return { mode: "round_robin" }
    case "update_contact_field": return { field: "name", value: "" }
    case "create_deal": return { pipeline_id: "", stage_id: "", title: "", value: 0 }
    case "wait": return { amount: 1, unit: "hours" }
    case "condition": return { subject: "tag_presence", operand: "", value: "" }
    case "send_webhook": return { url: "", headers: {}, body_template: "" }
    case "close_conversation": return {}
    default: return {}
  }
}

// ------------------------------------------------------------
// Resources
// ------------------------------------------------------------

interface AutomationResources {
  tags: TagRecord[]
  members: AccountMember[]
  templates: MessageTemplate[]
  customFields: CustomField[]
  pipelines: PipelineOption[]
  stages: PipelineStageOption[]
}

interface PipelineOption { id: string; name: string }
interface PipelineStageOption { id: string; name: string; pipeline_id: string; position: number }

const ResourcesContext = createContext<AutomationResources>({
  tags: [], members: [], templates: [], customFields: [], pipelines: [], stages: [],
})

function useResources(): AutomationResources {
  return useContext(ResourcesContext)
}

function ResourcesProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<TagRecord[]>([])
  const [members, setMembers] = useState<AccountMember[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [pipelines, setPipelines] = useState<PipelineOption[]>([])
  const [stages, setStages] = useState<PipelineStageOption[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const [tagsRes, templatesRes, customFieldsRes, pipelinesRes, stagesRes] =
        await Promise.all([
          supabase.from("tags").select("*").order("name"),
          supabase.from("message_templates").select("*").eq("status", "APPROVED").order("name"),
          supabase.from("custom_fields").select("*").order("field_name"),
          supabase.from("pipelines").select("id, name").order("name"),
          supabase.from("pipeline_stages").select("id, name, pipeline_id, position").order("position"),
        ])
      if (cancelled) return
      setTags((tagsRes.data as TagRecord[] | null) ?? [])
      setTemplates((templatesRes.data as MessageTemplate[] | null) ?? [])
      setCustomFields((customFieldsRes.data as CustomField[] | null) ?? [])
      setPipelines((pipelinesRes.data as PipelineOption[] | null) ?? [])
      setStages((stagesRes.data as PipelineStageOption[] | null) ?? [])
    })()

    void (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .limit(50)
        if (!cancelled && data) {
          setMembers(data.map((p: any) => ({
            user_id: p.id,
            full_name: p.name || p.email || p.id,
            email: p.email || null,
            avatar_url: p.avatar_url || null,
            role: "member",
            joined_at: p.created_at || new Date().toISOString(),
          })))
        }
      } catch { /* fallback */ }
    })()

    return () => { cancelled = true }
  }, [])

  return (
    <ResourcesContext.Provider value={{ tags, members, templates, customFields, pipelines, stages }}>
      {children}
    </ResourcesContext.Provider>
  )
}

const SELECT_CLASS =
  "w-full rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"

function TagSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { tags } = useResources()
  if (tags.length === 0) {
    return (
      <Input placeholder="Tag id" value={value} onChange={(e) => onChange(e.target.value)} className="bg-muted text-foreground" />
    )
  }
  const selected = tags.find((t) => t.id === value)
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 shrink-0 rounded-full border border-border" style={{ backgroundColor: selected?.color ?? "transparent" }} aria-hidden />
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
        <option value="">Selecione uma tag…</option>
        {tags.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
        {value && !selected && (<option value={value}>{value} (tag desconhecida)</option>)}
      </select>
    </div>
  )
}

function ContactFieldSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { customFields } = useResources()
  const customValue = value.startsWith("custom:") ? value : ""
  const knownCustom = customValue && customFields.some((f) => `custom:${f.id}` === customValue)
  return (
    <select value={value || "name"} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
      <option value="name">Nome</option>
      <option value="email">Email</option>
      <option value="company">Empresa</option>
      {customFields.length > 0 && (
        <optgroup label="Campos personalizados">
          {customFields.map((f) => (<option key={f.id} value={`custom:${f.id}`}>{f.field_name}</option>))}
        </optgroup>
      )}
      {customValue && !knownCustom && (<option value={customValue}>{customValue} (campo desconhecido)</option>)}
    </select>
  )
}

function AgentSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { members } = useResources()
  if (members.length === 0) {
    return (
      <Input placeholder="ID do agente" value={value} onChange={(e) => onChange(e.target.value)} className="bg-muted text-foreground" />
    )
  }
  const selected = members.find((m) => m.user_id === value)
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
      <option value="">Selecione um agente…</option>
      {members.map((m) => (<option key={m.user_id} value={m.user_id}>{m.full_name || m.email || m.user_id}</option>))}
      {value && !selected && (<option value={value}>{value} (agente desconhecido)</option>)}
    </select>
  )
}

function DealPipelineFields({ pipelineId, stageId, onChange }: {
  pipelineId: string; stageId: string; onChange: (patch: { pipeline_id: string; stage_id: string }) => void
}) {
  const { pipelines, stages } = useResources()
  if (pipelines.length === 0) {
    return (<>
      <FieldBlock label="ID do Pipeline"><Input value={pipelineId} onChange={(e) => onChange({ pipeline_id: e.target.value, stage_id: stageId })} className="bg-muted text-foreground" /></FieldBlock>
      <FieldBlock label="ID do Estágio"><Input value={stageId} onChange={(e) => onChange({ pipeline_id: pipelineId, stage_id: e.target.value })} className="bg-muted text-foreground" /></FieldBlock>
    </>)
  }
  const selectedPipeline = pipelines.find((p) => p.id === pipelineId)
  const stageOptions = stages.filter((s) => s.pipeline_id === pipelineId)
  const selectedStage = stageOptions.find((s) => s.id === stageId)
  return (<>
    <FieldBlock label="Pipeline">
      <select value={pipelineId} onChange={(e) => {
        const nextPipelineId = e.target.value
        const firstStage = stages.find((s) => s.pipeline_id === nextPipelineId)
        onChange({ pipeline_id: nextPipelineId, stage_id: firstStage?.id ?? "" })
      }} className={SELECT_CLASS}>
        <option value="">Selecione um pipeline…</option>
        {pipelines.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        {pipelineId && !selectedPipeline && (<option value={pipelineId}>{pipelineId} (pipeline desconhecido)</option>)}
      </select>
    </FieldBlock>
    <FieldBlock label="Estágio">
      <select value={stageId} onChange={(e) => onChange({ pipeline_id: pipelineId, stage_id: e.target.value })} className={SELECT_CLASS} disabled={!pipelineId || stageOptions.length === 0}>
        <option value="">{pipelineId ? "Selecione um estágio…" : "Selecione um pipeline primeiro…"}</option>
        {stageOptions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
        {stageId && pipelineId && !selectedStage && (<option value={stageId}>{stageId} (estágio desconhecido)</option>)}
      </select>
    </FieldBlock>
  </>)
}

function SendTemplateFields({ templateName, language, onChange }: {
  templateName: string; language: string; onChange: (patch: { template_name: string; language: string }) => void
}) {
  const { templates } = useResources()
  if (templates.length === 0) {
    return (<>
      <FieldBlock label="Nome do Template"><Input value={templateName} onChange={(e) => onChange({ template_name: e.target.value, language })} className="bg-muted text-foreground" /></FieldBlock>
      <FieldBlock label="Idioma"><Input value={language} onChange={(e) => onChange({ template_name: templateName, language: e.target.value })} className="bg-muted text-foreground" /></FieldBlock>
    </>)
  }
  const toValue = (name: string, lang: string) => `${name}::${lang}`
  const current = templateName ? toValue(templateName, language) : ""
  const hasMatch = templates.some((t) => toValue(t.name, t.language ?? "pt_BR") === current)
  return (
    <FieldBlock label="Template">
      <select value={current} onChange={(e) => { const [name, lang] = e.target.value.split("::"); onChange({ template_name: name ?? "", language: lang ?? "" }) }} className={SELECT_CLASS}>
        <option value="">Selecione um template…</option>
        {templates.map((t) => { const lang = t.language ?? "pt_BR"; return (<option key={t.id} value={toValue(t.name, lang)}>{t.name} ({lang})</option>) })}
        {current && !hasMatch && (<option value={current}>{templateName} ({language || "desconhecido"}) — não aprovado</option>)}
      </select>
    </FieldBlock>
  )
}

// ============================================================
// MAIN BUILDER COMPONENT
// ============================================================

interface AutomationBuilderProps {
  initial: BuilderInitial
  onBack: () => void
  onSaved?: () => void
}

export function AutomationBuilder({ initial, onBack, onSaved }: AutomationBuilderProps) {
  const { user } = useAuth()
  const isEditing = !!initial.id
  const [state, setState] = useState<BuilderInitial>(initial)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function patchTop<K extends keyof BuilderInitial>(key: K, value: BuilderInitial[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  function updateStep(path: StepPath, updater: (s: BuilderStep) => BuilderStep) {
    setState((s) => ({ ...s, steps: mapAtPath(s.steps, path, updater) }))
  }

  function addStepAt(parent: ParentScope, index: number, type: AutomationStepType) {
    const node: BuilderStep = {
      cid: cid(),
      step_type: type,
      step_config: blankConfig(type),
      branches: type === "condition" ? { yes: [], no: [] } : undefined,
    }
    setState((s) => ({ ...s, steps: insertAt(s.steps, parent, index, node) }))
    setExpandedId(node.cid)
  }

  function deleteStepAt(path: StepPath) {
    setState((s) => ({ ...s, steps: removeAt(s.steps, path) }))
  }

  function moveStepAt(path: StepPath, direction: -1 | 1) {
    setState((s) => ({ ...s, steps: moveAt(s.steps, path, direction) }))
  }

  async function save() {
    if (!user?.id) {
      toast.error("Usuário não autenticado")
      return
    }
    setSaving(true)
    try {
      const stepsPayload = toApiSteps(state.steps)

      const automationPayload = {
        name: state.name || "Automação sem título",
        description: state.description || null,
        trigger_type: state.trigger_type,
        trigger_config: state.trigger_config,
        is_active: state.is_active,
        user_id: user.id,
      }

      if (isEditing && initial.id) {
        const { error: updateErr } = await supabase
          .from("automations")
          .update(automationPayload)
          .eq("id", initial.id)
        if (updateErr) throw updateErr

        // Delete old steps and re-insert
        await supabase.from("automation_steps").delete().eq("automation_id", initial.id)
        const flatSteps = flattenSteps(stepsPayload, initial.id, null, null)
        if (flatSteps.length > 0) {
          const { error: stepsErr } = await supabase.from("automation_steps").insert(flatSteps)
          if (stepsErr) throw stepsErr
        }
        toast.success("Automação salva!")
      } else {
        const { data: newAuto, error: insertErr } = await supabase
          .from("automations")
          .insert({ ...automationPayload, execution_count: 0 })
          .select()
          .single()
        if (insertErr) throw insertErr
        if (stepsPayload.length > 0) {
          const flatSteps = flattenSteps(stepsPayload, newAuto.id, null, null)
          const { error: stepsErr } = await supabase.from("automation_steps").insert(flatSteps)
          if (stepsErr) throw stepsErr
        }
        toast.success("Automação criada!")
      }
      onSaved?.()
      onBack()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar automação")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-50">
      <header className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-card/80 px-3 py-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          value={state.name}
          onChange={(e) => patchTop("name", e.target.value)}
          placeholder="Automação sem título"
          className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:bg-muted focus:outline-none sm:text-base"
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Ativo</span>
          <Switch checked={state.is_active} onCheckedChange={(v) => patchTop("is_active", !!v)} aria-label="Ativo" />
        </div>
        <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditing ? "Salvar" : "Salvar Rascunho"}
        </Button>
      </header>

      <div className="relative flex-1 overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-0 px-4 py-10">
          <ResourcesProvider>
            <TriggerCard
              type={state.trigger_type}
              config={state.trigger_config}
              onTypeChange={(t) => patchTop("trigger_type", t)}
              onConfigChange={(c) => patchTop("trigger_config", c)}
            />
            <StepList
              steps={state.steps}
              parentPath={[]}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              updateStep={updateStep}
              addStepAt={addStepAt}
              deleteStepAt={deleteStepAt}
              moveStepAt={moveStepAt}
            />
          </ResourcesProvider>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Trigger card
// ------------------------------------------------------------

function TriggerCard({ type, config, onTypeChange, onConfigChange }: {
  type: AutomationTriggerType; config: Record<string, unknown>
  onTypeChange: (t: AutomationTriggerType) => void
  onConfigChange: (c: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="z-10 w-full max-w-[320px] sm:w-80">
      <div className="rounded-lg border border-border border-l-4 border-l-blue-500 bg-card shadow-lg">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400"><Zap className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-blue-300">Gatilho</div>
            <div className="truncate text-sm font-medium text-foreground">{TRIGGER_OPTIONS.find((o) => o.value === type)?.label ?? type}</div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="space-y-3 border-t border-border px-4 py-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de gatilho</label>
              <select value={type} onChange={(e) => onTypeChange(e.target.value as AutomationTriggerType)} className="w-full rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none">
                {TRIGGER_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">{TRIGGER_OPTIONS.find((o) => o.value === type)?.hint}</p>
            </div>
            {type === "keyword_match" && (<KeywordMatchConfig config={config as unknown as KeywordMatchTriggerConfig} onChange={onConfigChange} />)}
            {type === "tag_added" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tag</label>
                <TagSelect value={(config.tag_id as string) ?? ""} onChange={(v) => onConfigChange({ ...config, tag_id: v })} />
              </div>
            )}
            {type === "time_based" && (
              <Input placeholder="Expressão Cron ou HH:mm" value={(config.schedule as string) ?? ""} onChange={(e) => onConfigChange({ ...config, schedule: e.target.value })} className="bg-muted text-foreground" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KeywordMatchConfig({ config, onChange }: { config: KeywordMatchTriggerConfig; onChange: (c: Record<string, unknown>) => void }) {
  const keywords = config?.keywords ?? []
  const [draft, setDraft] = useState(keywords.join(", "))
  useEffect(() => {
    if (config?.match_type == null) {
      onChange({ ...config, match_type: "contains" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function commit() {
    const parsed = draft.split(",").map((s) => s.trim()).filter(Boolean)
    setDraft(parsed.join(", "))
    onChange({ ...config, keywords: parsed })
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Palavras-chave (separadas por vírgula)</label>
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit() } }} placeholder="ex: preço, orçamento, falar com vendas" className="bg-muted text-foreground" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de correspondência</label>
        <select value={config?.match_type ?? "contains"} onChange={(e) => onChange({ ...config, match_type: e.target.value as "exact" | "contains" })} className="w-full rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground focus:outline-none">
          <option value="contains">Contém</option>
          <option value="exact">Exato</option>
        </select>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Step list + card + connectors
// ------------------------------------------------------------

type ParentScope =
  | { kind: "root" }
  | { kind: "branch"; parentCid: string; branch: "yes" | "no" }

type StepPath = (
  | { kind: "root"; index: number }
  | { kind: "branch"; parentCid: string; branch: "yes" | "no"; index: number }
)[]

interface StepListProps {
  steps: BuilderStep[]
  parentPath: StepPath
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  updateStep: (path: StepPath, updater: (s: BuilderStep) => BuilderStep) => void
  addStepAt: (parent: ParentScope, index: number, type: AutomationStepType) => void
  deleteStepAt: (path: StepPath) => void
  moveStepAt: (path: StepPath, direction: -1 | 1) => void
}

function StepList(props: StepListProps) {
  const { steps, parentPath, ...rest } = props
  const parentScope: ParentScope =
    parentPath.length === 0
      ? { kind: "root" }
      : (() => {
          const last = parentPath[parentPath.length - 1]
          if (last.kind !== "branch") return { kind: "root" } as const
          return { kind: "branch", parentCid: last.parentCid, branch: last.branch } as const
        })()

  return (
    <div className="flex flex-col items-center">
      <AddButton onPick={(t) => props.addStepAt(parentScope, 0, t)} />
      {steps.map((step, idx) => (
        <StepRenderer key={step.cid} step={step} index={idx} total={steps.length} parentScope={parentScope} parentPath={parentPath} {...rest} />
      ))}
    </div>
  )
}

function StepRenderer({ step, index, total, parentScope, parentPath, ...props }: {
  step: BuilderStep; index: number; total: number; parentScope: ParentScope; parentPath: StepPath
} & Omit<StepListProps, "steps" | "parentPath">) {
  const path: StepPath = [
    ...parentPath,
    parentScope.kind === "root"
      ? { kind: "root", index }
      : { kind: "branch", parentCid: parentScope.parentCid, branch: parentScope.branch, index },
  ]
  const meta = STEP_META[step.step_type]
  const Icon = meta.icon
  const expanded = props.expandedId === step.cid
  const isCondition = step.step_type === "condition"
  const width = isCondition ? "w-full max-w-[400px] sm:w-[400px]" : "w-full max-w-[320px] sm:w-80"

  return (<>
    <div className={cn("z-10 flex flex-col", width)}>
      <div className={cn("rounded-lg border border-border border-l-4 bg-card shadow-lg", meta.border)}>
        <button type="button" onClick={() => props.setExpandedId(expanded ? null : step.cid)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
          <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{isCondition ? "Condição" : step.step_type === "wait" ? "Espera" : "Ação"}</div>
            <div className="truncate text-sm font-medium text-foreground">{meta.label}</div>
            <div className="truncate text-[11px] text-muted-foreground">{previewFor(step)}</div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>
        {expanded && (
          <div className="border-t border-border px-4 py-3">
            <StepEditor step={step} onChange={(next) => props.updateStep(path, () => next)} />
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={index === 0} aria-label="Mover para cima" onClick={() => props.moveStepAt(path, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" disabled={index === total - 1} aria-label="Mover para baixo" onClick={() => props.moveStepAt(path, 1)}><ArrowDown className="h-4 w-4" /></Button>
              </div>
              <Button variant="destructive" size="sm" onClick={() => props.deleteStepAt(path)}><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
            </div>
          </div>
        )}
      </div>
      {isCondition && <ConditionBranches step={step} parentPath={path} {...props} />}
    </div>
    {!isCondition && (
      <AddButton onPick={(t) => props.addStepAt(parentScope, index + 1, t)} />
    )}
  </>)
}

function ConditionBranches({ step, parentPath, ...props }: {
  step: BuilderStep; parentPath: StepPath
} & Omit<StepListProps, "steps" | "parentPath">) {
  const yes = step.branches?.yes ?? []
  const no = step.branches?.no ?? []
  const yesPath: StepPath = [...parentPath, { kind: "branch", parentCid: step.cid, branch: "yes", index: 0 }]
  const noPath: StepPath = [...parentPath, { kind: "branch", parentCid: step.cid, branch: "no", index: 0 }]
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <BranchColumn label="Sim" color="text-primary">
        <StepList {...props} steps={yes} parentPath={yesPath} />
      </BranchColumn>
      <BranchColumn label="Não" color="text-rose-400">
        <StepList {...props} steps={no} parentPath={noPath} />
      </BranchColumn>
    </div>
  )
}

function BranchColumn({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className={cn("mb-2 text-[11px] font-semibold uppercase", color)}>{label}</div>
      {children}
    </div>
  )
}

function AddButton({ onPick }: { onPick: (t: AutomationStepType) => void }) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="h-4 w-[2px] bg-border" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary data-[popup-open]:border-primary data-[popup-open]:bg-primary/20 data-[popup-open]:text-primary" aria-label="Adicionar passo">
          <Plus className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 min-w-56 overflow-y-auto border-border bg-popover">
          {ADDABLE_STEPS.map((t) => {
            const Icon = STEP_META[t].icon
            return (<DropdownMenuItem key={t} onClick={() => onPick(t)}><Icon className="h-4 w-4" />{STEP_META[t].label}</DropdownMenuItem>)
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="h-4 w-[2px] bg-border" aria-hidden />
    </div>
  )
}

// ------------------------------------------------------------
// Per-step config editor
// ------------------------------------------------------------

function StepEditor({ step, onChange }: { step: BuilderStep; onChange: (s: BuilderStep) => void }) {
  const cfg = step.step_config
  const set = (patch: Record<string, unknown>) => onChange({ ...step, step_config: { ...cfg, ...patch } })

  switch (step.step_type) {
    case "send_message":
      return (<FieldBlock label="Texto da mensagem"><Textarea value={(cfg.text as string) ?? ""} onChange={(e) => set({ text: e.target.value })} placeholder="Olá! Obrigado por entrar em contato…" className="min-h-24 bg-muted text-foreground" /></FieldBlock>)
    case "send_template":
      return (<SendTemplateFields templateName={(cfg.template_name as string) ?? ""} language={(cfg.language as string) ?? ""} onChange={(patch) => set(patch)} />)
    case "add_tag":
    case "remove_tag":
      return (<FieldBlock label="Tag"><TagSelect value={(cfg.tag_id as string) ?? ""} onChange={(v) => set({ tag_id: v })} /></FieldBlock>)
    case "assign_conversation":
      return (<>
        <FieldBlock label="Modo">
          <select value={(cfg.mode as string) ?? "round_robin"} onChange={(e) => set({ mode: e.target.value })} className="w-full rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground">
            <option value="round_robin">Round-robin</option>
            <option value="specific">Agente específico</option>
          </select>
        </FieldBlock>
        {cfg.mode === "specific" && (<FieldBlock label="Agente"><AgentSelect value={(cfg.agent_id as string) ?? ""} onChange={(v) => set({ agent_id: v })} /></FieldBlock>)}
      </>)
    case "update_contact_field":
      return (<>
        <FieldBlock label="Campo"><ContactFieldSelect value={(cfg.field as string) ?? "name"} onChange={(v) => set({ field: v })} /></FieldBlock>
        <FieldBlock label="Valor"><Input value={(cfg.value as string) ?? ""} onChange={(e) => set({ value: e.target.value })} placeholder="Texto ou {{ vars.x }} / {{ message.text }}" className="bg-muted text-foreground" /></FieldBlock>
      </>)
    case "create_deal":
      return (<>
        <DealPipelineFields pipelineId={(cfg.pipeline_id as string) ?? ""} stageId={(cfg.stage_id as string) ?? ""} onChange={(patch) => set(patch)} />
        <FieldBlock label="Título"><Input value={(cfg.title as string) ?? ""} onChange={(e) => set({ title: e.target.value })} className="bg-muted text-foreground" /></FieldBlock>
        <FieldBlock label="Valor"><Input type="number" value={(cfg.value as number) ?? 0} onChange={(e) => set({ value: Number(e.target.value) })} className="bg-muted text-foreground" /></FieldBlock>
      </>)
    case "wait":
      return (
        <div className="grid grid-cols-2 gap-2">
          <FieldBlock label="Quantidade"><Input type="number" min={1} value={(cfg.amount as number) ?? 1} onChange={(e) => set({ amount: Math.max(1, Number(e.target.value)) })} className="bg-muted text-foreground" /></FieldBlock>
          <FieldBlock label="Unidade">
            <select value={(cfg.unit as string) ?? "hours"} onChange={(e) => set({ unit: e.target.value })} className="w-full rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground">
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Dias</option>
            </select>
          </FieldBlock>
        </div>
      )
    case "condition":
      return (<>
        <FieldBlock label="Assunto">
          <select value={(cfg.subject as string) ?? "tag_presence"} onChange={(e) => set({ subject: e.target.value })} className="w-full rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground">
            <option value="tag_presence">Presença de tag</option>
            <option value="contact_field">Campo do contato</option>
            <option value="message_content">Conteúdo da mensagem</option>
            <option value="time_of_day">Horário do dia</option>
          </select>
        </FieldBlock>
        <FieldBlock label="Operando">
          <Input placeholder={cfg.subject === "time_of_day" ? "HH:mm-HH:mm" : cfg.subject === "contact_field" ? "nome / email / empresa" : cfg.subject === "tag_presence" ? "ID da tag" : ""} value={(cfg.operand as string) ?? ""} onChange={(e) => set({ operand: e.target.value })} className="bg-muted text-foreground" />
        </FieldBlock>
        {(cfg.subject === "contact_field" || cfg.subject === "message_content") && (
          <FieldBlock label="Valor"><Input value={(cfg.value as string) ?? ""} onChange={(e) => set({ value: e.target.value })} className="bg-muted text-foreground" /></FieldBlock>
        )}
      </>)
    case "send_webhook":
      return (<>
        <FieldBlock label="URL"><Input value={(cfg.url as string) ?? ""} onChange={(e) => set({ url: e.target.value })} className="bg-muted text-foreground" /></FieldBlock>
        <FieldBlock label="Body template (JSON)"><Textarea value={(cfg.body_template as string) ?? ""} onChange={(e) => set({ body_template: e.target.value })} className="min-h-20 bg-muted font-mono text-xs text-foreground" /></FieldBlock>
      </>)
    case "close_conversation":
      return (<p className="text-xs text-muted-foreground">Define a conversa como &quot;fechada&quot;. Nenhuma configuração necessária.</p>)
    default:
      return null
  }
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function previewFor(step: BuilderStep): string {
  switch (step.step_type) {
    case "send_message": return (step.step_config.text as string) || "sem texto"
    case "send_template": return (step.step_config.template_name as string) || "escolha um template"
    case "wait": return `${step.step_config.amount ?? "?"} ${step.step_config.unit ?? ""}`
    case "condition": return `quando ${step.step_config.subject ?? "?"}`
    case "send_webhook": return (step.step_config.url as string) || "sem url"
    default: return ""
  }
}

// ------------------------------------------------------------
// Tree mutation helpers (immutable)
// ------------------------------------------------------------

function insertAt(steps: BuilderStep[], parent: ParentScope, index: number, node: BuilderStep): BuilderStep[] {
  if (parent.kind === "root") {
    const copy = [...steps]; copy.splice(index, 0, node); return copy
  }
  return steps.map((s) => {
    if (s.cid !== parent.parentCid || !s.branches) return s
    const list = [...s.branches[parent.branch]]; list.splice(index, 0, node)
    return { ...s, branches: { ...s.branches, [parent.branch]: list } }
  })
}

function mapAtPath(steps: BuilderStep[], path: StepPath, updater: (s: BuilderStep) => BuilderStep): BuilderStep[] {
  if (path.length === 0) return steps
  const head = path[0]; const rest = path.slice(1)
  if (head.kind === "root") {
    return steps.map((s, i) => {
      if (i !== head.index) return s
      return rest.length === 0 ? updater(s) : { ...s, branches: walkBranches(s.branches, rest, updater) }
    })
  }
  return steps.map((s) => {
    if (s.cid !== head.parentCid || !s.branches) return s
    const bucket = s.branches[head.branch]
    const updated = bucket.map((child, i) => {
      if (i !== head.index) return child
      return rest.length === 0 ? updater(child) : { ...child, branches: walkBranches(child.branches, rest, updater) }
    })
    return { ...s, branches: { ...s.branches, [head.branch]: updated } }
  })
}

function walkBranches(branches: BuilderStep["branches"], path: StepPath, updater: (s: BuilderStep) => BuilderStep): BuilderStep["branches"] {
  if (!branches) return branches
  const head = path[0]; if (head.kind !== "branch") return branches
  const rest = path.slice(1); const bucket = branches[head.branch]
  const updated = bucket.map((child, i) => {
    if (i !== head.index) return child
    return rest.length === 0 ? updater(child) : { ...child, branches: walkBranches(child.branches, rest, updater) }
  })
  return { ...branches, [head.branch]: updated }
}

function removeAt(steps: BuilderStep[], path: StepPath): BuilderStep[] {
  if (path.length === 0) return steps
  const head = path[0]; const rest = path.slice(1)
  if (head.kind === "root") {
    if (rest.length === 0) return steps.filter((_, i) => i !== head.index)
    return steps.map((s, i) => i !== head.index ? s : { ...s, branches: removeFromBranches(s.branches, rest) })
  }
  return steps.map((s) => {
    if (s.cid !== head.parentCid || !s.branches) return s
    const bucket = s.branches[head.branch]
    const next = rest.length === 0
      ? bucket.filter((_, i) => i !== head.index)
      : bucket.map((child, i) => i !== head.index ? child : { ...child, branches: removeFromBranches(child.branches, rest) })
    return { ...s, branches: { ...s.branches, [head.branch]: next } }
  })
}

function removeFromBranches(branches: BuilderStep["branches"], path: StepPath): BuilderStep["branches"] {
  if (!branches) return branches
  const head = path[0]; if (head.kind !== "branch") return branches
  const rest = path.slice(1); const bucket = branches[head.branch]
  const next = rest.length === 0
    ? bucket.filter((_, i) => i !== head.index)
    : bucket.map((child, i) => i !== head.index ? child : { ...child, branches: removeFromBranches(child.branches, rest) })
  return { ...branches, [head.branch]: next }
}

function moveAt(steps: BuilderStep[], path: StepPath, direction: -1 | 1): BuilderStep[] {
  if (path.length === 0) return steps
  const head = path[0]; const rest = path.slice(1)
  const swap = <T,>(arr: T[], i: number) => {
    const j = i + direction; if (j < 0 || j >= arr.length) return arr
    const copy = [...arr]; [copy[i], copy[j]] = [copy[j], copy[i]]; return copy
  }
  if (head.kind === "root") {
    if (rest.length === 0) return swap(steps, head.index)
    return steps.map((s, i) => i !== head.index ? s : { ...s, branches: moveInBranches(s.branches, rest, direction) })
  }
  return steps.map((s) => {
    if (s.cid !== head.parentCid || !s.branches) return s
    const bucket = s.branches[head.branch]
    const next = rest.length === 0 ? swap(bucket, head.index) : bucket
    return { ...s, branches: { ...s.branches, [head.branch]: next } }
  })
}

function moveInBranches(branches: BuilderStep["branches"], path: StepPath, direction: -1 | 1): BuilderStep["branches"] {
  if (!branches) return branches
  const head = path[0]; if (head.kind !== "branch") return branches
  const rest = path.slice(1); const bucket = branches[head.branch]
  const swap = <T,>(arr: T[], i: number) => {
    const j = i + direction; if (j < 0 || j >= arr.length) return arr
    const copy = [...arr]; [copy[i], copy[j]] = [copy[j], copy[i]]; return copy
  }
  const next = rest.length === 0 ? swap(bucket, head.index) : bucket
  return { ...branches, [head.branch]: next }
}

// ------------------------------------------------------------
// Serialize builder tree → API payload (flattened)
// ------------------------------------------------------------

interface ApiStep {
  step_type: string
  step_config: Record<string, unknown>
  branches?: { yes?: ApiStep[]; no?: ApiStep[] }
}

export function toApiSteps(steps: BuilderStep[]): ApiStep[] {
  return steps.map((s) => ({
    step_type: s.step_type,
    step_config: s.step_config,
    branches: s.branches ? { yes: toApiSteps(s.branches.yes), no: toApiSteps(s.branches.no) } : undefined,
  }))
}

export interface ServerStepNode {
  id: string
  step_type: string
  step_config: Record<string, unknown>
  branches: { yes: ServerStepNode[]; no: ServerStepNode[] }
}

export function fromServerSteps(nodes: ServerStepNode[]): BuilderStep[] {
  return nodes.map((n) => ({
    cid: cid(),
    step_type: n.step_type as AutomationStepType,
    step_config: n.step_config ?? {},
    branches: n.step_type === "condition"
      ? { yes: fromServerSteps(n.branches?.yes ?? []), no: fromServerSteps(n.branches?.no ?? []) }
      : undefined,
  }))
}

// ------------------------------------------------------------
// Flatten API steps into DB rows for automation_steps
// ------------------------------------------------------------

function flattenSteps(
  apiSteps: ApiStep[],
  automationId: string,
  parentStepId: string | null,
  branch: "yes" | "no" | null,
  startPos: number = 0,
): Array<{
  automation_id: string
  parent_step_id: string | null
  branch: "yes" | "no" | null
  step_type: string
  step_config: Record<string, unknown>
  position: number
}> {
  const rows: Array<any> = []
  apiSteps.forEach((step, i) => {
    const pos = startPos + i
    const stepId = `step_${automationId}_${pos}`
    rows.push({
      automation_id: automationId,
      parent_step_id: parentStepId,
      branch: branch,
      step_type: step.step_type,
      step_config: step.step_config,
      position: pos,
    })
    if (step.step_type === "condition" && step.branches) {
      // Yes branch
      rows.push(...flattenSteps(step.branches.yes ?? [], automationId, stepId, "yes", 0))
      // No branch
      rows.push(...flattenSteps(step.branches.no ?? [], automationId, stepId, "no", 0))
    }
  })
  return rows
}
