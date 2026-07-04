"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users,
  Tags,
  Filter,
  Upload,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";

type AudienceType = "all" | "tags" | "csv";

interface AudienceConfig {
  type: AudienceType;
  tagIds?: string[];
  csvContacts?: { phone: string; name?: string }[];
  excludeTagIds?: string[];
}

interface Step2Props {
  audience: AudienceConfig;
  onUpdate: (audience: AudienceConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const audienceOptions: {
  type: AudienceType;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    type: "all",
    label: "Todos os Contatos",
    description: "Enviar para todos os contatos no banco de dados",
    icon: Users,
  },
  {
    type: "tags",
    label: "Filtrar por Tags",
    description: "Segmentar contatos com tags específicas",
    icon: Tags,
  },
  {
    type: "csv",
    label: "Upload CSV",
    description: "Enviar uma lista de números de telefone",
    icon: Upload,
  },
];

export function Step2SelectAudience({
  audience,
  onUpdate,
  onNext,
  onBack,
}: Step2Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [csvText, setCsvText] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTags(true);
      try {
        const { data } = await supabase.from("tags").select("*").order("name");
        if (!cancelled) setTags(data ?? []);
      } finally {
        if (!cancelled) setLoadingTags(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchEstimatedCount = useCallback(async () => {
    setLoadingCount(true);
    try {
      if (audience.type === "all") {
        const { count } = await supabase
          .from("contacts")
          .select("*", { count: "exact", head: true });
        const total = count ?? 0;
        let excludeCount = 0;
        if (audience.excludeTagIds?.length) {
          const { data: excludeRows } = await supabase
            .from("contact_tags")
            .select("contact_id")
            .in("tag_id", audience.excludeTagIds);
          excludeCount = new Set((excludeRows ?? []).map((r) => r.contact_id)).size;
        }
        setEstimatedCount(Math.max(0, total - excludeCount));
      } else if (audience.type === "tags" && audience.tagIds?.length) {
        const { data } = await supabase
          .from("contact_tags")
          .select("contact_id")
          .in("tag_id", audience.tagIds);
        const baseIds = new Set((data ?? []).map((r) => r.contact_id));

        let excludeSet = new Set<string>();
        if (audience.excludeTagIds?.length) {
          const { data: excludeRows } = await supabase
            .from("contact_tags")
            .select("contact_id")
            .in("tag_id", audience.excludeTagIds);
          excludeSet = new Set((excludeRows ?? []).map((r) => r.contact_id));
        }
        setEstimatedCount([...baseIds].filter((id) => !excludeSet.has(id)).length);
      } else if (audience.type === "csv" && audience.csvContacts?.length) {
        setEstimatedCount(audience.csvContacts.length);
      } else {
        setEstimatedCount(null);
      }
    } finally {
      setLoadingCount(false);
    }
  }, [audience]);

  useEffect(() => {
    fetchEstimatedCount();
  }, [fetchEstimatedCount]);

  function toggleTag(tagId: string) {
    const current = audience.tagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdate({ ...audience, tagIds: updated });
  }

  function toggleExcludeTag(tagId: string) {
    const current = audience.excludeTagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdate({ ...audience, excludeTagIds: updated });
  }

  function parseCsv(text: string) {
    const lines = text.trim().split("\n").filter(Boolean);
    const contacts = lines.map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      const phone = parts[0]?.replace(/\D/g, "") || "";
      const name = parts[1] || undefined;
      return { phone, name };
    }).filter((c) => c.phone.length >= 10);
    onUpdate({ ...audience, csvContacts: contacts });
  }

  const isValid =
    audience.type === "all" ||
    (audience.type === "tags" && (audience.tagIds?.length ?? 0) > 0) ||
    (audience.type === "csv" && (audience.csvContacts?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Selecionar Público</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha quem receberá esta transmissão.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {audienceOptions.map((option) => {
          const isSelected = audience.type === option.type;
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              onClick={() =>
                onUpdate({
                  ...audience,
                  type: option.type,
                  tagIds: option.type === "tags" ? audience.tagIds : undefined,
                  csvContacts: option.type === "csv" ? audience.csvContacts : undefined,
                })
              }
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-card/50 hover:border-border"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {audience.type === "tags" && (
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Selecionar Tags</p>
          {loadingTags ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma tag encontrada. Crie tags em Configurações.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = audience.tagIds?.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-border"
                    }`}
                  >
                    <span
                      className="mr-1.5 h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {audience.type === "csv" && (
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Upload CSV</p>
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              parseCsv(e.target.value);
            }}
            placeholder="Cole números de telefone aqui, um por linha.&#10;Opcional: Nome após vírgula.&#10;Exemplo:&#10;5511999999999,João Silva&#10;5511888888888"
            rows={6}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          {audience.csvContacts && audience.csvContacts.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {audience.csvContacts.length} contato(s) reconhecido(s)
            </p>
          )}
        </div>
      )}

      {(audience.type === "tags" || audience.type === "all") && (
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <X className="h-4 w-4 text-red-400" />
            <p className="text-sm font-medium text-foreground">
              Excluir contatos com estas tags
            </p>
            <span className="text-xs text-muted-foreground">(opcional)</span>
          </div>
          {tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma tag disponível.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isExcluded = audience.excludeTagIds?.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleExcludeTag(tag.id)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      isExcluded
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-border bg-muted text-muted-foreground hover:border-border"
                    }`}
                  >
                    <span
                      className="mr-1.5 h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/50 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Resumo do Público</p>
        {loadingCount ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Calculando...</span>
          </div>
        ) : estimatedCount !== null ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">{estimatedCount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">destinatários estimados</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Selecione um tipo de público para ver a estimativa.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onBack} className="border-border text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Próximo
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
