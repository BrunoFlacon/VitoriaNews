"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, Users, Save } from "lucide-react";

interface AudienceConfig {
  type: string;
  tagIds?: string[];
  csvContacts?: { phone: string; name?: string }[];
}

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  language?: string;
}

interface Step4Props {
  name: string;
  onNameChange: (name: string) => void;
  template: MessageTemplate;
  audience: AudienceConfig;
  onSend: () => void;
  onSaveDraft?: () => void;
  onBack: () => void;
  isProcessing: boolean;
  progress: number;
}

export function Step4ScheduleSend({
  name,
  onNameChange,
  template,
  audience,
  onSend,
  onSaveDraft,
  onBack,
  isProcessing,
  progress,
}: Step4Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [estimatedReach, setEstimatedReach] = useState<number>(0);
  const [loadingReach, setLoadingReach] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingReach(true);
      try {
        if (audience.type === "all") {
          const { count } = await supabase
            .from("contacts")
            .select("*", { count: "exact", head: true });
          if (!cancelled) setEstimatedReach(count ?? 0);
        } else if (audience.type === "tags" && audience.tagIds?.length) {
          const { data: contactTags } = await supabase
            .from("contact_tags")
            .select("contact_id")
            .in("tag_id", audience.tagIds);
          const uniqueIds = new Set((contactTags ?? []).map((ct) => ct.contact_id));
          if (!cancelled) setEstimatedReach(uniqueIds.size);
        } else if (audience.type === "csv" && audience.csvContacts) {
          if (!cancelled) setEstimatedReach(audience.csvContacts.length);
        } else {
          if (!cancelled) setEstimatedReach(0);
        }
      } finally {
        if (!cancelled) setLoadingReach(false);
      }
    })();
    return () => { cancelled = true; };
  }, [audience]);

  const audienceLabel =
    audience.type === "all"
      ? "Todos os Contatos"
      : audience.type === "tags"
        ? `Tags (${audience.tagIds?.length ?? 0} selecionadas)`
        : audience.type === "csv"
          ? "Upload CSV"
          : "Personalizado";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Revisar & Enviar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dê um nome à transmissão, revise os detalhes e envie.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Nome da Transmissão</label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Promoção de Verão"
          className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Resumo</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Template</p>
            <p className="text-foreground">{template.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Público</p>
            <p className="text-foreground">{audienceLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Alcance Estimado</p>
            <div className="flex items-center gap-1.5">
              {loadingReach ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <>
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <p className="font-medium text-foreground">{estimatedReach.toLocaleString()}</p>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Idioma</p>
            <p className="text-foreground">{template.language ?? "pt_BR"}</p>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Enviando transmissão...</p>
            </div>
            <span className="text-xs font-medium text-primary">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="border-border text-muted-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>

        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <Button
              variant="outline"
              onClick={onSaveDraft}
              disabled={!name.trim() || isProcessing}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              <Save className="mr-1 h-4 w-4" />
              Salvar Rascunho
            </Button>
          )}

          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!name.trim() || isProcessing}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="mr-1 h-4 w-4" />
            Enviar Transmissão
          </Button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-popover p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-popover-foreground">Confirmar Transmissão</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Você está prestes a enviar esta transmissão para{" "}
              <span className="font-medium text-popover-foreground">{estimatedReach.toLocaleString()}</span>{" "}
              contatos usando o template{" "}
              <span className="font-medium text-popover-foreground">{template.name}</span>.
              Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="border-border text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setShowConfirm(false);
                  onSend();
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="mr-1 h-4 w-4" />
                Confirmar & Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
