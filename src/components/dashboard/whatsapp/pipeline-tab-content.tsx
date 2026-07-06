"use client";

/**
 * PipelineTabContent — Componente de pipeline usado dentro do WhatsAppHubView.
 * Unifica PipelineContent (que estava inline no WhatsAppHubView) e
 * WhatsAppPipelinesTab (que era duplicado/morto) num único lugar.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DealForm } from "./deal-form";
import { PipelineSettings } from "./pipeline-settings";
import { PipelineAnalytics } from "./pipeline-analytics";
import { PipelineBoard } from "./pipeline-board";
import type { Deal, PipelineStage } from "@/types";
import {
  Kanban,
  Loader2,
  Plus,
} from "lucide-react";
interface PipelineTabContentProps {
  onOpenChat?: (phone: string) => void;
}

export function PipelineTabContent({ onOpenChat }: PipelineTabContentProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineId, setPipelineId] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealFormStageId, setDealFormStageId] = useState<string | undefined>();
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>();

  /** Default stages for a sales pipeline */
  const DEFAULT_STAGES = [
    { name: "Lead", color: "#6b7280" },
    { name: "Qualificado", color: "#3b82f6" },
    { name: "Proposta", color: "#f59e0b" },
    { name: "Fechado Ganho", color: "#22c55e" },
    { name: "Fechado Perdido", color: "#ef4444" },
  ];

  const seedDefaultPipeline = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user already has a pipeline
    const { data: existingPipelines } = await supabase
      .from("pipelines")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existingPipelines && existingPipelines.length > 0) {
      return;
    }

    // Create default pipeline
    const { data: pipeline, error: pipeErr } = await supabase
      .from("pipelines")
      .insert({ user_id: user.id, name: "Pipeline de Vendas" })
      .select()
      .single();

    if (pipeErr) {
      console.error("Failed to create default pipeline:", pipeErr.message);
      return;
    }

    // Create default stages
    const stagesToInsert = DEFAULT_STAGES.map((s, i) => ({
      pipeline_id: pipeline.id,
      name: s.name,
      position: i,
      color: s.color,
    }));

    const { error: stagesErr } = await supabase
      .from("pipeline_stages")
      .insert(stagesToInsert);

    if (stagesErr) {
      console.error("Failed to create default stages:", stagesErr.message);
    }
  };

  const loadDeals = useCallback(async () => {
    const { data } = await supabase
      .from("deals")
      .select("*, contact:contacts(*), stage:pipeline_stages(*)")
      .order("created_at", { ascending: false });
    if (data) setDeals(data as unknown as Deal[]);
  }, []);

  const handleDealMoved = useCallback(async (dealId: string, newStageId: string) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)),
    );
    const { error } = await supabase
      .from("deals")
      .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
      .eq("id", dealId);
    if (error) {
      console.error("Error moving deal:", error);
      loadDeals();
    }
  }, [loadDeals]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [{ data: stagesData, error: stagesError }, { data: dealsData }] = await Promise.all([
          supabase.from("pipeline_stages").select("*").order("position"),
          supabase.from("deals").select("*, contact:contacts(*), stage:pipeline_stages(*)").order("created_at", { ascending: false }),
        ]);

        // If stages query returned an error (table doesn't exist, etc.)
        if (stagesError) {
          console.warn("Pipeline stages table not available:", stagesError.message);
          setLoading(false);
          return;
        }

        // If no stages exist, auto-create default pipeline + stages
        if (!stagesData || stagesData.length === 0) {
          await seedDefaultPipeline();
          // Reload after seeding
          const [stagesReload, dealsReload] = await Promise.all([
            supabase.from("pipeline_stages").select("*").order("position"),
            supabase.from("deals").select("*, contact:contacts(*), stage:pipeline_stages(*)").order("created_at", { ascending: false }),
          ]);
          const loadedStages = (stagesReload.data ?? []) as PipelineStage[];
          setStages(loadedStages);
          if (loadedStages.length > 0) setPipelineId(loadedStages[0].pipeline_id);
          if (dealsReload.data) setDeals(dealsReload.data as unknown as Deal[]);
        } else {
          const loadedStages = (stagesData ?? []) as PipelineStage[];
          setStages(loadedStages);
          if (loadedStages.length > 0) setPipelineId(loadedStages[0].pipeline_id);
          if (dealsData) setDeals(dealsData as unknown as Deal[]);
        }
      } catch (error) {
        console.error("Error loading pipeline data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleStagesChanged = useCallback(() => {
    loadDeals();
  }, [loadDeals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPipelineValue = deals
    .filter(d => d.status !== "lost")
    .reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="px-4 pt-2 pb-1">
        <p className="text-xs text-muted-foreground/70">Pipeline de vendas: organize seus leads e oportunidades em etapas.</p>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Pipeline de Vendas
          </h3>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {deals.length} negócio{deals.length !== 1 ? "s" : ""}
            {totalPipelineValue > 0 && ` · ${formatCurrency(totalPipelineValue)} em pipeline`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingDeal(undefined); setShowDealForm(true); }}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo Negócio
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <Kanban className="h-4 w-4" />
            Gerenciar
          </button>
        </div>
      </div>

      {/* Analytics */}
      <PipelineAnalytics stages={stages} deals={deals} />

      {/* Kanban Board */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/50">
          <h4 className="font-medium text-sm text-muted-foreground">Kanban Board</h4>
        </div>
        <div className="p-3">
          <PipelineBoard
            stages={stages}
            deals={deals}
            onDealMoved={handleDealMoved}
            onAddDeal={(stageId) => {
              setDealFormStageId(stageId);
              setShowDealForm(true);
            }}
            onEditDeal={(deal) => {
              setEditingDeal(deal);
              setShowDealForm(true);
            }}
            onOpenChat={onOpenChat}
          />
        </div>
      </div>

      {/* Deal Form */}
      {pipelineId && (
        <DealForm
          open={showDealForm}
          onOpenChange={(open) => {
            setShowDealForm(open);
            if (!open) {
              setDealFormStageId(undefined);
              setEditingDeal(undefined);
            }
          }}
          pipelineId={pipelineId}
          stages={stages}
          defaultStageId={dealFormStageId}
          deal={editingDeal}
          onSaved={() => {
            setShowDealForm(false);
            setDealFormStageId(undefined);
            setEditingDeal(undefined);
            loadDeals();
          }}
        />
      )}

      {/* Pipeline Settings */}
      {pipelineId && (
        <PipelineSettings
          open={showSettings}
          onOpenChange={setShowSettings}
          pipelineId={pipelineId}
          stages={stages}
          onPipelinesChanged={handleStagesChanged}
          onStagesChanged={() => loadDeals()}
          onCreateNewPipeline={() => {
            console.log("Create new pipeline");
          }}
        />
      )}
    </div>
  );
}

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

export default PipelineTabContent;
