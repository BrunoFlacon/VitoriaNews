"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFetchWhatsAppPhotos } from "@/hooks/useFetchWhatsAppPhotos";
import { cn } from "@/lib/utils";
import { WhatsAppInboxView } from "./WhatsAppInboxView";
import { WhatsAppContactsTab } from "./WhatsAppContactsTab";
import { WhatsAppBroadcastsTab } from "./WhatsAppBroadcastsTab";
import { WhatsAppBotSettingsTab } from "./WhatsAppBotSettingsTab";
import { WhatsAppSettingsView } from "./WhatsAppSettingsView";
import { WhatsAppTemplatesTab } from "../settings/WhatsAppTemplatesTab";
import { DealCard } from "./deal-card";
import { DealForm } from "./deal-form";
import { PipelineSettings } from "./pipeline-settings";
import { PipelineAnalytics } from "./pipeline-analytics";
import { PipelineBoard } from "./pipeline-board";
import type { Deal, PipelineStage } from "@/types";
import {
  MessageCircle, Users, Kanban, Send, Bot, Settings,
  Camera, Smartphone, Loader2, Plus, FileText
} from "lucide-react";
interface WhatsAppHubViewProps {
  defaultTab?: string;
  onBackToInbox?: () => void;
}

const TABS = [
  { id: "inbox", label: "Inbox", icon: MessageCircle },
  { id: "contacts", label: "Contatos", icon: Users },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "broadcasts", label: "Transmissões", icon: Send },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "bot", label: "Bot", icon: Bot },
  { id: "settings", label: "Configurações", icon: Settings },
] as const;

type TabId = typeof TABS[number]["id"];

function PipelineContent({ onOpenChat }: { onOpenChat?: (phone: string) => void }) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealFormStageId, setDealFormStageId] = useState<string | undefined>();
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>();

  const loadDeals = useCallback(async () => {
    const { data } = await supabase
      .from("deals")
      .select("*, contact:contacts(*), stage:pipeline_stages(*)")
      .order("created_at", { ascending: false });
    if (data) setDeals(data);
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
        const [{ data: stagesData }, { data: dealsData }] = await Promise.all([
          supabase.from("pipeline_stages").select("*").order("position"),
          supabase.from("deals").select("*, contact:contacts(*), stage:pipeline_stages(*)").order("created_at", { ascending: false })
        ]);
        if (stagesData) setStages(stagesData);
        if (dealsData) setDeals(dealsData);
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Kanban className="h-5 w-5" />
            Pipeline de Vendas
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe negócios vinculados a conversas do WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDealForm(true)}
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
            Gerenciar Pipeline
          </button>
        </div>
      </div>

      <PipelineAnalytics stages={stages} deals={deals} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/50">
          <h4 className="font-medium text-sm text-muted-foreground">Kanban Board</h4>
        </div>
        <div className="p-4">
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

      <DealForm
        open={showDealForm}
        onOpenChange={(open) => {
          setShowDealForm(open);
          if (!open) {
            setDealFormStageId(undefined);
            setEditingDeal(undefined);
          }
        }}
        pipelineId="whatsapp-default-pipeline"
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

      <PipelineSettings
        open={showSettings}
        onOpenChange={setShowSettings}
        pipelineId="whatsapp-default-pipeline"
        stages={stages}
        onPipelinesChanged={handleStagesChanged}
        onStagesChanged={() => loadDeals()}
        onCreateNewPipeline={() => {
          console.log("Create new pipeline");
        }}
      />
    </div>
  );
}

export function WhatsAppHubView({ defaultTab, onBackToInbox }: WhatsAppHubViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchPhotos, loading: photosLoading } = useFetchWhatsAppPhotos();
  const [activeTab, setActiveTab] = useState<TabId>((defaultTab as TabId) || "inbox");

  useEffect(() => {
    if (defaultTab && TABS.some(t => t.id === defaultTab)) {
      setActiveTab(defaultTab as TabId);
    }
  }, [defaultTab]);

  const handleFetchPhotos = useCallback(async () => {
    const result = await fetchPhotos();
    if (result) {
      const updated = result.results.reduce((acc: number, r: any) => acc + r.conversations_updated, 0);
      toast({ title: `Fotos atualizadas: ${updated} conversas` });
    }
  }, [fetchPhotos, toast]);

  const [navigateToPhone, setNavigateToPhone] = useState<string | null>(null);

  const handleNavigateToChat = useCallback((phone: string) => {
    setNavigateToPhone(phone);
    setActiveTab("inbox");
  }, []);

  const isInboxActive = activeTab === "inbox";

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {!isInboxActive && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">WhatsApp CRM</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground capitalize">
            {TABS.find(t => t.id === activeTab)?.label}
          </div>
        </div>
      )}

      <div className="flex gap-1 px-2 py-1.5 border-b border-border/50 bg-muted/30 shrink-0 overflow-x-auto scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                isCurrent
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={handleFetchPhotos}
          disabled={photosLoading}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
          title="Buscar fotos de perfil do WhatsApp"
        >
          <Camera className={cn("w-3.5 h-3.5", photosLoading && "animate-pulse")} />
          <span className="hidden sm:inline">Fotos</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "inbox" && (
          <WhatsAppInboxView
            onBack={onBackToInbox}
            initialPhone={navigateToPhone}
            onChatConsumed={() => setNavigateToPhone(null)}
          />
        )}
        {activeTab === "contacts" && (
          <WhatsAppContactsTab onNavigateToChat={handleNavigateToChat} />
        )}
        {activeTab === "pipeline" && <PipelineContent onOpenChat={handleNavigateToChat} />}
        {activeTab === "broadcasts" && <WhatsAppBroadcastsTab />}
        {activeTab === "templates" && <WhatsAppTemplatesTab />}
        {activeTab === "bot" && <WhatsAppBotSettingsTab />}
        {activeTab === "settings" && <WhatsAppSettingsView userId={user?.id} />}
      </div>
    </div>
  );
}
