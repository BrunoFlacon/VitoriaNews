"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Step1ChooseTemplate } from "./step1-choose-template";
import { Step2SelectAudience } from "./step2-select-audience";
import { Step3Personalize } from "./step3-personalize";
import { Step4ScheduleSend } from "./step4-schedule-send";
import { Loader2, X } from "lucide-react";

type VariableMapping = { type: "static" | "field"; value: string };

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  language?: string;
  header_type?: string;
  header_media_url?: string;
  body_text: string;
}

interface AudienceConfig {
  type: "all" | "tags" | "csv";
  tagIds?: string[];
  csvContacts?: { phone: string; name?: string }[];
  excludeTagIds?: string[];
}

interface BroadcastWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function BroadcastWizard({ open, onClose, onComplete }: BroadcastWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [audience, setAudience] = useState<AudienceConfig>({ type: "all" });
  const [variables, setVariables] = useState<Record<string, VariableMapping>>({});
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [broadcastName, setBroadcastName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClose = useCallback(() => {
    setStep(1);
    setSelectedTemplate(null);
    setAudience({ type: "all" });
    setVariables({});
    setHeaderMediaUrl("");
    setBroadcastName("");
    setIsProcessing(false);
    setProgress(0);
    onClose();
  }, [onClose]);

  const handleSaveDraft = useCallback(async () => {
    if (!user || !selectedTemplate || !broadcastName.trim()) return;
    try {
      const { error } = await supabase.from("broadcasts").insert({
        user_id: user.id,
        name: broadcastName.trim(),
        template_name: selectedTemplate.name,
        template_language: selectedTemplate.language || "pt_BR",
        template_variables: variables,
        audience_config: audience,
        header_media_url: headerMediaUrl || null,
        status: "draft",
      });
      if (error) throw error;
      toast({ title: "Rascunho salvo!" });
      handleClose();
      onComplete();
    } catch (err: unknown) {
      toast({
        title: "Erro ao salvar rascunho",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, [user, selectedTemplate, broadcastName, variables, audience, headerMediaUrl, handleClose, onComplete, toast]);

  const handleSend = useCallback(async () => {
    if (!user || !selectedTemplate) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      // 1. Determine contacts
      let contactPhones: { phone: string; name?: string }[] = [];

      if (audience.type === "all") {
        const { data } = await supabase
          .from("contacts")
          .select("phone, name");
        contactPhones = (data ?? []).map((c: any) => ({ phone: c.phone, name: c.name }));
      } else if (audience.type === "tags" && audience.tagIds?.length) {
        const { data: contactTags } = await supabase
          .from("contact_tags")
          .select("contact_id")
          .in("tag_id", audience.tagIds);

        let excludeIds = new Set<string>();
        if (audience.excludeTagIds?.length) {
          const { data: excludeRows } = await supabase
            .from("contact_tags")
            .select("contact_id")
            .in("tag_id", audience.excludeTagIds);
          for (const r of excludeRows ?? []) excludeIds.add(r.contact_id);
        }

        const contactIds = [...new Set((contactTags ?? []).map((ct: any) => ct.contact_id))]
          .filter((id) => !excludeIds.has(id));

        if (contactIds.length > 0) {
          const { data: contacts } = await supabase
            .from("contacts")
            .select("phone, name")
            .in("id", contactIds);
          contactPhones = (contacts ?? []).map((c: any) => ({ phone: c.phone, name: c.name }));
        }
      } else if (audience.type === "csv" && audience.csvContacts?.length) {
        contactPhones = audience.csvContacts;
      }

      // 2. Create broadcast record
      const { data: broadcast, error: bcErr } = await supabase
        .from("broadcasts")
        .insert({
          user_id: user.id,
          name: broadcastName.trim(),
          template_name: selectedTemplate.name,
          template_language: selectedTemplate.language || "pt_BR",
          template_variables: variables,
          audience_config: audience,
          header_media_url: headerMediaUrl || null,
          status: "sending",
          recipient_count: contactPhones.length,
        })
        .select()
        .single();

      if (bcErr) throw bcErr;

      // 3. Send to each contact via edge function
      let sent = 0;
      const total = contactPhones.length;

      for (let i = 0; i < total; i++) {
        const contact = contactPhones[i];
        try {
          const result = await supabase.functions.invoke("publish-post", {
            body: {
              content: selectedTemplate.body_text,
              mediaUrls: headerMediaUrl ? [headerMediaUrl] : [],
              postType: "broadcast",
              platforms: ["whatsapp"],
              recipientPhone: contact.phone,
              templateName: selectedTemplate.name,
              templateLanguage: selectedTemplate.language || "pt_BR",
              templateVariables: variables,
            },
          });

          await supabase.from("broadcast_recipients").insert({
            broadcast_id: broadcast.id,
            contact_phone: contact.phone,
            contact_name: contact.name || null,
            whatsapp_message_id: result.data?.messageId || null,
            status: result.error ? "failed" : "sent",
            error_message: result.error?.message || null,
          });
        } catch (sendErr) {
          await supabase.from("broadcast_recipients").insert({
            broadcast_id: broadcast.id,
            contact_phone: contact.phone,
            contact_name: contact.name || null,
            status: "failed",
            error_message: sendErr instanceof Error ? sendErr.message : "Erro de envio",
          });
        }

        sent++;
        setProgress(Math.round((sent / total) * 100));
      }

      // 4. Mark broadcast as complete
      await supabase
        .from("broadcasts")
        .update({ status: "sent", delivered_count: sent })
        .eq("id", broadcast.id);

      toast({
        title: "Transmissão concluída!",
        description: `${sent} mensagem(ns) enviada(s)`,
      });

      handleClose();
      onComplete();
    } catch (err: unknown) {
      toast({
        title: "Erro ao enviar transmissão",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, selectedTemplate, broadcastName, variables, audience, headerMediaUrl, handleClose, onComplete, toast]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-4 sm:pt-12">
      <div className="relative mx-4 mb-4 w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Nova Transmissão</h2>
            <p className="text-xs text-muted-foreground">
              Passo {step} de 4
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicators */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-6 rounded-full transition-all ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Progress bar for processing */}
          {isProcessing && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
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

          {step === 1 && (
            <Step1ChooseTemplate
              selectedTemplate={selectedTemplate}
              onSelect={setSelectedTemplate}
              onNext={() => setStep(2)}
              onBack={handleClose}
            />
          )}

          {step === 2 && (
            <Step2SelectAudience
              audience={audience}
              onUpdate={setAudience}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && selectedTemplate && (
            <Step3Personalize
              template={selectedTemplate}
              variables={variables}
              onUpdate={setVariables}
              headerMediaUrl={headerMediaUrl}
              onHeaderMediaUrlChange={setHeaderMediaUrl}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && selectedTemplate && (
            <Step4ScheduleSend
              name={broadcastName}
              onNameChange={setBroadcastName}
              template={selectedTemplate}
              audience={audience}
              onSend={handleSend}
              onSaveDraft={handleSaveDraft}
              onBack={() => setStep(3)}
              isProcessing={isProcessing}
              progress={progress}
            />
          )}
        </div>
      </div>
    </div>
  );
}
