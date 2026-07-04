"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  Pencil,
  RotateCcw,
} from "lucide-react";

const CATEGORIES = ["Marketing", "Utility", "Authentication"] as const;
type HeaderFormat = "none" | "text" | "image" | "video" | "document";
const HEADER_FORMATS: HeaderFormat[] = ["none", "text", "image", "video", "document"];

const TEMPLATE_LIMITS = {
  bodyMaxLength: 1024,
  footerMaxLength: 60,
  headerTextMaxLength: 60,
  buttonTextMaxLength: 25,
  maxButtonsTotal: 10,
  nameRegex: /^[a-z0-9_]{1,512}$/,
} as const;

const categoryColors: Record<string, string> = {
  Marketing: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  Utility: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  Authentication: "bg-amber-600/20 text-amber-400 border-amber-600/30",
};

const statusConfig: Record<string, { label: string; classes: string }> = {
  DRAFT: { label: "Rascunho", classes: "bg-slate-600/20 text-muted-foreground border-slate-600/30" },
  PENDING: { label: "Pendente", classes: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30" },
  APPROVED: { label: "Aprovado", classes: "bg-primary/20 text-primary border-primary/30" },
  REJECTED: { label: "Rejeitado", classes: "bg-red-600/20 text-red-400 border-red-600/30" },
  PAUSED: { label: "Pausado", classes: "bg-orange-600/20 text-orange-400 border-orange-600/30" },
  DISABLED: { label: "Desabilitado", classes: "bg-red-900/30 text-red-500 border-red-900/40" },
};

type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";

interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  example?: string;
}

interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  category: string;
  language?: string;
  header_type?: string;
  header_content?: string;
  header_media_url?: string;
  body_text: string;
  footer_text?: string;
  buttons?: TemplateButton[];
  sample_values?: { body?: string[]; header?: string[] };
  status?: string;
  meta_template_id?: string;
  rejection_reason?: string;
  quality_score?: string;
  submission_error?: string;
  created_at: string;
}

interface TemplateFormData {
  name: string;
  category: string;
  language: string;
  header_format: HeaderFormat;
  header_content: string;
  header_media_url: string;
  header_sample: string;
  body_text: string;
  body_samples: string[];
  footer_text: string;
  buttons: TemplateButton[];
}

const emptyForm: TemplateFormData = {
  name: "",
  category: "Marketing",
  language: "pt_BR",
  header_format: "none",
  header_content: "",
  header_media_url: "",
  header_sample: "",
  body_text: "",
  body_samples: [],
  footer_text: "",
  buttons: [],
};

const COMMON_LANGUAGE_CODES = [
  "en_US", "en_GB", "en", "es", "es_ES", "es_MX",
  "fr", "fr_FR", "de", "it", "pt_BR", "pt_PT",
  "nl", "pl", "ru", "tr",
];

function extractVariableIndices(text: string): number[] {
  const matches = text.matchAll(/\{\{(\d+)\}\}/g);
  const set = new Set<number>();
  for (const m of matches) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

function emptyButton(type: ButtonType): TemplateButton {
  switch (type) {
    case "QUICK_REPLY": return { type: "QUICK_REPLY", text: "" };
    case "URL": return { type: "URL", text: "", url: "" };
    case "PHONE_NUMBER": return { type: "PHONE_NUMBER", text: "", phone_number: "" };
    case "COPY_CODE": return { type: "COPY_CODE", text: "", example: "" };
  }
}

export function WhatsAppTemplatesTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<TemplateFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);

  const bodyVarCount = useMemo(
    () => extractVariableIndices(form.body_text).length,
    [form.body_text],
  );
  const headerVarCount = useMemo(
    () =>
      form.header_format === "text"
        ? extractVariableIndices(form.header_content).length
        : 0,
    [form.header_format, form.header_content],
  );

  useEffect(() => {
    setForm((prev) => {
      if (prev.body_samples.length === bodyVarCount) return prev;
      const next = prev.body_samples.slice(0, bodyVarCount);
      while (next.length < bodyVarCount) next.push("");
      return { ...prev, body_samples: next };
    });
  }, [bodyVarCount]);

  useEffect(() => {
    if (!user) return;
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function fetchTemplates() {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      toast.error("Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  }

  function buildSubmitPayload() {
    const sample_values: { body?: string[]; header?: string[] } = {};
    if (form.body_samples.some((v) => v.trim())) {
      sample_values.body = form.body_samples.map((v) => v.trim());
    }
    if (form.header_format === "text" && form.header_sample.trim()) {
      sample_values.header = [form.header_sample.trim()];
    }

    return {
      name: form.name.trim(),
      category: form.category,
      language: form.language.trim() || "pt_BR",
      header_type: form.header_format === "none" ? undefined : form.header_format,
      header_content:
        form.header_format === "text" ? form.header_content.trim() : undefined,
      header_media_url:
        form.header_format !== "none" && form.header_format !== "text"
          ? form.header_media_url.trim() || undefined
          : undefined,
      body_text: form.body_text.trim(),
      footer_text: form.footer_text.trim() || undefined,
      buttons: form.buttons.length > 0 ? form.buttons : undefined,
      sample_values:
        Object.keys(sample_values).length > 0 ? sample_values : undefined,
    };
  }

  function openEdit(template: MessageTemplate) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      category: template.category,
      language: template.language || "pt_BR",
      header_format: (template.header_type ?? "none") as HeaderFormat,
      header_content: template.header_content ?? "",
      header_media_url: template.header_media_url ?? "",
      header_sample: template.sample_values?.header?.[0] ?? "",
      body_text: template.body_text,
      body_samples: template.sample_values?.body ?? [],
      footer_text: template.footer_text ?? "",
      buttons: template.buttons ?? [],
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (form.category === "Authentication") return;
    if (!user) return;

    // Validation
    if (!form.name.trim()) { toast.error("Nome do template é obrigatório"); return; }
    if (!TEMPLATE_LIMITS.nameRegex.test(form.name.trim())) {
      toast.error("Nome deve usar apenas letras minúsculas, dígitos e underlines");
      return;
    }
    if (!form.body_text.trim()) { toast.error("Texto do corpo é obrigatório"); return; }

    setSubmitting(true);
    try {
      const payload = buildSubmitPayload();

      if (editingId) {
        const { error } = await supabase
          .from("message_templates")
          .update({
            ...payload,
            status: "PENDING",
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Template atualizado. Status redefinido para PENDING.");
      } else {
        const { error } = await supabase.from("message_templates").insert({
          user_id: user.id,
          ...payload,
          status: "DRAFT",
        });
        if (error) throw error;
        toast.success("Template criado como rascunho.");
      }

      await fetchTemplates();
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao salvar template");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    const target = templateToDelete;
    if (!target || deletingId || !user) return;
    setDeletingId(target.id);
    try {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", target.id);
      if (error) throw error;
      toast.success("Template excluído");
      setTemplates((prev) => prev.filter((t) => t.id !== target.id));
      setTemplateToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir template");
    } finally {
      setDeletingId(null);
    }
  }

  function updateButton(index: number, patch: Partial<TemplateButton>) {
    setForm((prev) => {
      const next = [...prev.buttons];
      next[index] = { ...next[index], ...patch };
      return { ...prev, buttons: next };
    });
  }

  function changeButtonType(index: number, type: ButtonType) {
    setForm((prev) => {
      const next = [...prev.buttons];
      next[index] = emptyButton(type);
      return { ...prev, buttons: next };
    });
  }

  function removeButton(index: number) {
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }));
  }

  function addButton() {
    if (form.buttons.length >= TEMPLATE_LIMITS.maxButtonsTotal) return;
    setForm((prev) => ({
      ...prev,
      buttons: [...prev.buttons, emptyButton("QUICK_REPLY")],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Templates de Mensagem
          </h3>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Crie e gerencie templates de mensagem para usar em transmissões e no inbox.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Novo Template
        </Button>
      </div>

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhum template ainda.</p>
          <p className="text-xs mt-1">Crie seu primeiro template de mensagem.</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Novo Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {templates.map((template) => {
            const statusKey = template.status || "DRAFT";
            const status = statusConfig[statusKey] ?? statusConfig.DRAFT;
            return (
              <div
                key={template.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm text-foreground">
                        {template.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${categoryColors[template.category] || ""}`}
                      >
                        {template.category}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.classes}`}
                      >
                        {status.label}
                      </span>
                      {template.language && (
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {template.language}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.body_text}
                    </p>
                    {template.footer_text && (
                      <p className="text-[11px] text-muted-foreground italic">
                        {template.footer_text}
                      </p>
                    )}
                    {(template.rejection_reason || template.submission_error) && (
                      <div className="flex items-start gap-1.5 text-xs text-red-400 bg-red-950/20 border border-red-900/40 rounded px-2 py-1.5">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{template.rejection_reason || template.submission_error}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(statusKey === "APPROVED" || statusKey === "REJECTED" || statusKey === "PAUSED") && (
                      <button
                        onClick={() => openEdit(template)}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg p-1.5 transition-colors"
                        title={
                          statusKey === "APPROVED"
                            ? "Editar (re-envia para revisão)"
                            : "Editar e reenviar"
                        }
                      >
                        {statusKey === "APPROVED" ? (
                          <Pencil className="h-3.5 w-3.5" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setTemplateToDelete(template)}
                      disabled={deletingId === template.id}
                      className="text-muted-foreground hover:text-red-400 hover:bg-red-950/30 rounded-lg p-1.5 transition-colors"
                      title="Excluir template"
                    >
                      {deletingId === template.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-4">
          <div className="relative mx-4 mb-4 w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {editingId ? "Editar Template" : "Novo Template"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {editingId
                    ? "Suas alterações serão salvas. Status voltará para PENDING."
                    : "Crie um template e submeta para aprovação."}
                </p>
              </div>
              <button
                onClick={() => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {form.category === "Authentication" && (
                <div className="flex items-start gap-2 rounded border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    Templates AUTHENTICATION têm formato fixo. Crie-os no Meta WhatsApp
                    Manager por enquanto.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Nome do Template
                </label>
                <Input
                  placeholder="ex: confirmacao_pedido"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={editingId !== null}
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  {editingId
                    ? "Nome fixo após criação no Meta."
                    : "Letras minúsculas, dígitos e underlines."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Idioma</label>
                  <Input
                    list="template-language-codes"
                    placeholder="pt_BR"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    disabled={editingId !== null}
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                  />
                  <datalist id="template-language-codes">
                    {COMMON_LANGUAGE_CODES.map((code) => (
                      <option key={code} value={code} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Cabeçalho</label>
                <select
                  value={form.header_format}
                  onChange={(e) => setForm({ ...form, header_format: e.target.value as HeaderFormat })}
                  className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                >
                  {HEADER_FORMATS.map((type) => (
                    <option key={type} value={type}>
                      {type === "none" ? "Nenhum" : type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>

                {form.header_format === "text" && (
                  <div className="space-y-2 mt-2">
                    <Input
                      placeholder="Texto do cabeçalho (máx 60 chars, opcional {{1}})"
                      value={form.header_content}
                      onChange={(e) => setForm({ ...form, header_content: e.target.value })}
                      maxLength={TEMPLATE_LIMITS.headerTextMaxLength}
                      className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                    />
                    {headerVarCount > 0 && (
                      <Input
                        placeholder="Valor de exemplo para {{1}}"
                        value={form.header_sample}
                        onChange={(e) => setForm({ ...form, header_sample: e.target.value })}
                        className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                      />
                    )}
                  </div>
                )}

                {form.header_format !== "none" && form.header_format !== "text" && (
                  <div className="space-y-2 mt-2">
                    <Input
                      placeholder={`URL pública da ${form.header_format}`}
                      value={form.header_media_url}
                      onChange={(e) => setForm({ ...form, header_media_url: e.target.value })}
                      className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {form.header_format === "image" && "JPEG/PNG, ≤5 MB, 800×418px recomendado."}
                      {form.header_format === "video" && "MP4/3GPP, ≤16 MB, ≤60 segundos."}
                      {form.header_format === "document" && "PDF, ≤100 MB."}
                      {" URL deve ser publicamente acessível via HTTPS."}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Corpo do Texto</label>
                <Textarea
                  placeholder="Olá {{1}}, seu pedido {{2}} foi confirmado."
                  value={form.body_text}
                  onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                  rows={4}
                  maxLength={TEMPLATE_LIMITS.bodyMaxLength}
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Use {"{{1}}"}, {"{{2}}"} para variáveis.
                </p>
                {bodyVarCount > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] text-muted-foreground">
                      Valores de exemplo (obrigatório para revisão do Meta)
                    </label>
                    {form.body_samples.map((val, i) => (
                      <Input
                        key={i}
                        placeholder={`Valor para {{${i + 1}}}`}
                        value={val}
                        onChange={(e) => {
                          const next = [...form.body_samples];
                          next[i] = e.target.value;
                          setForm({ ...form, body_samples: next });
                        }}
                        className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Rodapé (opcional)</label>
                <Input
                  placeholder="Texto opcional do rodapé (máx 60 chars)"
                  value={form.footer_text}
                  onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                  maxLength={TEMPLATE_LIMITS.footerMaxLength}
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Botões (opcional)</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addButton}
                    disabled={form.buttons.length >= TEMPLATE_LIMITS.maxButtonsTotal}
                    className="border-border bg-transparent text-muted-foreground hover:bg-muted h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Botão
                  </Button>
                </div>
                {form.buttons.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Até {TEMPLATE_LIMITS.maxButtonsTotal} botões.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.buttons.map((btn, i) => (
                      <div key={i} className="space-y-2 rounded border border-border bg-muted/50 p-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={btn.type}
                            onChange={(e) => changeButtonType(i, e.target.value as ButtonType)}
                            className="h-8 w-36 rounded-lg border border-border bg-muted px-2 text-xs text-foreground outline-none focus:border-primary"
                          >
                            <option value="QUICK_REPLY">Quick Reply</option>
                            <option value="URL">URL</option>
                            <option value="PHONE_NUMBER">Telefone</option>
                            <option value="COPY_CODE">Copiar Código</option>
                          </select>
                          <Input
                            placeholder="Texto do botão"
                            value={btn.text}
                            maxLength={TEMPLATE_LIMITS.buttonTextMaxLength}
                            onChange={(e) => updateButton(i, { text: e.target.value })}
                            className="flex-1 border-border bg-muted text-foreground placeholder:text-muted-foreground h-8 text-xs"
                          />
                          <button
                            onClick={() => removeButton(i)}
                            className="text-muted-foreground hover:text-red-400 hover:bg-red-950/30 rounded-lg p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {btn.type === "URL" && (
                          <div className="space-y-1 pl-1">
                            <Input
                              placeholder="https://exemplo.com ou com {{1}}"
                              value={btn.url}
                              onChange={(e) => updateButton(i, { url: e.target.value })}
                              className="border-border bg-muted text-foreground placeholder:text-muted-foreground h-8 text-xs"
                            />
                            {extractVariableIndices(btn.url ?? "").length > 0 && (
                              <Input
                                placeholder="Valor de exemplo para {{1}} na URL"
                                value={btn.example ?? ""}
                                onChange={(e) => updateButton(i, { example: e.target.value })}
                                className="border-border bg-muted text-foreground placeholder:text-muted-foreground h-8 text-xs"
                              />
                            )}
                          </div>
                        )}
                        {btn.type === "PHONE_NUMBER" && (
                          <Input
                            placeholder="+5511999999999"
                            value={btn.phone_number}
                            onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                            className="border-border bg-muted text-foreground placeholder:text-muted-foreground h-8 text-xs"
                          />
                        )}
                        {btn.type === "COPY_CODE" && (
                          <Input
                            placeholder="Código de exemplo (e.g. PROMO20)"
                            value={btn.example}
                            onChange={(e) => updateButton(i, { example: e.target.value })}
                            className="border-border bg-muted text-foreground placeholder:text-muted-foreground h-8 text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button
                variant="outline"
                onClick={() => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); }}
                className="border-border text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || form.category === "Authentication"}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : editingId ? (
                  "Salvar & Reenviar"
                ) : (
                  "Criar Template"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-popover p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-popover-foreground">Excluir template?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {templateToDelete.meta_template_id
                ? `"${templateToDelete.name}" será excluído também do Meta. Transmissões ativas podem falhar.`
                : `"${templateToDelete.name}" será excluído localmente.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTemplateToDelete(null)}
                disabled={deletingId !== null}
                className="border-border text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingId !== null ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsAppTemplatesTab;
