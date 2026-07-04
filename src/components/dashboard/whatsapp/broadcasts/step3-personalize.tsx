"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Eye, ImageIcon, Loader2 } from "lucide-react";

type VariableType = "static" | "field";

interface VariableMapping {
  type: VariableType;
  value: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  language?: string;
  header_type?: string;
  header_media_url?: string;
  body_text: string;
}

interface Step3Props {
  template: MessageTemplate;
  variables: Record<string, VariableMapping>;
  onUpdate: (variables: Record<string, VariableMapping>) => void;
  headerMediaUrl: string;
  onHeaderMediaUrlChange: (url: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const contactFields = [
  { value: "name", label: "Nome do Contato" },
  { value: "phone", label: "Número de Telefone" },
  { value: "email", label: "E-mail" },
  { value: "company", label: "Empresa" },
];

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function Step3Personalize({
  template,
  variables,
  onUpdate,
  headerMediaUrl,
  onHeaderMediaUrlChange,
  onNext,
  onBack,
}: Step3Props) {
  const [firstContact, setFirstContact] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("contacts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) setFirstContact(data ?? null);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const placeholders = useMemo(() => {
    const matches = template.body_text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches)].sort();
  }, [template.body_text]);

  const mediaHeaderType = template.header_type &&
    ["image", "video", "document"].includes(template.header_type)
    ? template.header_type
    : null;

  useEffect(() => {
    if (mediaHeaderType && !headerMediaUrl && template.header_media_url) {
      onHeaderMediaUrlChange(template.header_media_url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaHeaderType, template.header_media_url]);

  const headerMediaError = useMemo<"missing" | "invalid" | null>(() => {
    if (!mediaHeaderType) return null;
    const value = headerMediaUrl.trim();
    if (!value) return "missing";
    if (!isValidHttpUrl(value)) return "invalid";
    return null;
  }, [mediaHeaderType, headerMediaUrl]);

  const unmappedKeys = useMemo(() => {
    const missing: string[] = [];
    for (const placeholder of placeholders) {
      const key = placeholder.replace(/^\{\{|\}\}$/g, "");
      const mapping = variables[key];
      if (!mapping || !mapping.value?.trim()) {
        missing.push(placeholder);
      }
    }
    return missing;
  }, [placeholders, variables]);

  function updateVariable(key: string, patch: Partial<VariableMapping>) {
    const current = variables[key] ?? { type: "static" as VariableType, value: "" };
    onUpdate({
      ...variables,
      [key]: { ...current, ...patch },
    });
  }

  const previewText = useMemo(() => {
    const contact = firstContact ?? {
      name: "João Silva",
      phone: "+5511999999999",
      email: "joao@exemplo.com",
      company: "Empresa Exemplo",
    };

    let text = template.body_text;
    for (const placeholder of placeholders) {
      const key = placeholder.replace(/^\{\{|\}\}$/g, "");
      const mapping = variables[key];
      let replacement = placeholder;

      if (mapping) {
        if (mapping.type === "static" && mapping.value) {
          replacement = mapping.value;
        } else if (mapping.type === "field" && mapping.value) {
          const fieldMap: Record<string, string | undefined> = {
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            company: contact.company,
          };
          replacement = fieldMap[mapping.value] ?? placeholder;
        }
      }
      text = text.replaceAll(placeholder, replacement);
    }
    return text;
  }, [template.body_text, variables, placeholders, firstContact]);

  const previewLabel = firstContact
    ? firstContact.name || firstContact.phone
    : "dados de exemplo";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Personalizar Mensagem</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mapeie variáveis do template para campos do contato ou valores fixos.
        </p>
      </div>

      {mediaHeaderType && (
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Mídia do cabeçalho</p>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium uppercase text-primary">
              {mediaHeaderType}
            </span>
          </div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            URL da mídia
          </label>
          <Input
            type="url"
            value={headerMediaUrl}
            onChange={(e) => onHeaderMediaUrlChange(e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            URL pública da {mediaHeaderType} enviada como cabeçalho da mensagem.
          </p>
          {mediaHeaderType === "image" && headerMediaError === null && headerMediaUrl.trim() && (
            <img
              src={headerMediaUrl.trim()}
              alt="Preview do cabeçalho"
              className="mt-3 max-h-40 rounded-lg border border-border object-contain"
            />
          )}
          {headerMediaError && (
            <p className="mt-1.5 text-xs text-amber-300">
              {headerMediaError === "missing"
                ? "Uma URL de mídia é obrigatória para enviar este template."
                : "Insira uma URL http(s) válida."}
            </p>
          )}
        </div>
      )}

      {placeholders.length === 0 && !mediaHeaderType ? (
        <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Este template não possui variáveis para personalizar.
          </p>
        </div>
      ) : placeholders.length === 0 ? null : (
        <div className="space-y-4">
          {placeholders.map((placeholder) => {
            const key = placeholder.replace(/^\{\{|\}\}$/g, "");
            const mapping = variables[key] ?? { type: "static", value: "" };

            return (
              <div
                key={placeholder}
                className="rounded-xl border border-border bg-card/50 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary">
                    {placeholder}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Tipo de Mapeamento
                    </label>
                    <select
                      value={mapping.type}
                      onChange={(e) =>
                        updateVariable(key, {
                          type: e.target.value as VariableType,
                          value: "",
                        })
                      }
                      className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="static">Valor Fixo</option>
                      <option value="field">Campo do Contato</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {mapping.type === "static" ? "Valor" : "Campo"}
                    </label>
                    {mapping.type === "static" ? (
                      <Input
                        value={mapping.value}
                        onChange={(e) =>
                          updateVariable(key, { value: e.target.value })
                        }
                        placeholder="Digite o valor..."
                        className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                      />
                    ) : (
                      <select
                        value={mapping.value || ""}
                        onChange={(e) =>
                          updateVariable(key, { value: e.target.value })
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                      >
                        <option value="">Selecione um campo...</option>
                        {contactFields.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground">Prévia ao Vivo</p>
          <span className="text-xs text-muted-foreground">({previewLabel})</span>
          {loadingPreview && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          )}
        </div>
        <div className="rounded-lg bg-[#0e1a12] p-3">
          <div className="ml-auto max-w-[85%] rounded-lg bg-primary/30 px-3 py-2 shadow-sm">
            <p className="whitespace-pre-wrap text-sm text-primary">{previewText}</p>
          </div>
        </div>
      </div>

      {unmappedKeys.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Mapeie todos os placeholders antes de continuar — ainda faltam{" "}
          <span className="font-mono font-semibold">{unmappedKeys.join(", ")}</span>.
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onBack} className="border-border text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={unmappedKeys.length > 0 || headerMediaError !== null}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Próximo
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
