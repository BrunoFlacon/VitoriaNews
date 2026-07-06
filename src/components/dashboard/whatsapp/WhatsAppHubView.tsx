"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFetchWhatsAppPhotos } from "@/hooks/useFetchWhatsAppPhotos";
import { cn } from "@/lib/utils";
import { WhatsAppInboxView } from "./WhatsAppInboxView";
import { WhatsAppContactsTab } from "./WhatsAppContactsTab";
import { WhatsAppBroadcastsTab } from "./WhatsAppBroadcastsTab";
import { WhatsAppSettingsView } from "./WhatsAppSettingsView";
import { WhatsAppTemplatesTab } from "../settings/WhatsAppTemplatesTab";
import { WhatsAppQuickRepliesTab } from "./WhatsAppQuickRepliesTab";
import { WhatsAppFlowsTab } from "./WhatsAppFlowsTab";
import { WhatsAppMetricsTab } from "./WhatsAppMetricsTab";
import { PipelineTabContent } from "./pipeline-tab-content";
import {
  MessageCircle, Users, Kanban, Send, Settings,
  Smartphone, FileText, Zap, Workflow, BarChart3, MessageSquare,
  Lock, Search, MessageSquarePlus, ArrowLeft, Camera, Menu,
  Building2, List, Contact, UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AutomationsList } from "@/components/automations/automations-list";
import { AutomationBuilder, toApiSteps, type BuilderInitial, fromServerSteps, type ServerStepNode } from "@/components/automations/automation-builder";
import { AutomationLogs } from "@/components/automations/automation-logs";
import { getTemplate } from "@/lib/automations/templates";
import { BroadcastDetailView } from "@/components/dashboard/whatsapp/broadcasts/broadcast-detail-view";
import { supabase } from "@/integrations/supabase/client";
interface WhatsAppHubViewProps {
  defaultTab?: string;
  onBackToInbox?: () => void;
}

const TABS = [
  { id: "inbox", label: "Inbox", icon: MessageCircle },
  { id: "contacts", label: "Contatos", icon: Users },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "broadcasts", label: "Transmissões", icon: Send },
  { id: "flows", label: "Fluxos", icon: Workflow },
  { id: "metrics", label: "Métricas", icon: BarChart3 },
  { id: "settings", label: "Configurações", icon: Settings },
] as const;

const FLOWS_SUB_TABS = [
  { id: "flows", label: "Fluxos", icon: Workflow },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "quick_replies", label: "Respostas Rápidas", icon: MessageSquare },
  { id: "automations", label: "Automações", icon: Zap },
] as const;

type FlowsSubTabId = typeof FLOWS_SUB_TABS[number]["id"];

export function WhatsAppHubView({ defaultTab, onBackToInbox }: WhatsAppHubViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchPhotos, loading: photosLoading } = useFetchWhatsAppPhotos();
  const [activeTab, setActiveTab] = useState<TabId>((defaultTab as TabId) || "inbox");
  const [activeFlowsSubTab, setActiveFlowsSubTab] = useState<FlowsSubTabId>("flows");
  const [showInboxSearch, setShowInboxSearch] = useState(false);

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

  // Broadcasts sub-navigation
  const [broadcastView, setBroadcastView] = useState<"list" | "detail">("list");
  const [viewingBroadcastId, setViewingBroadcastId] = useState<string | null>(null);

  // Reset broadcasts sub-view when tab changes
  useEffect(() => {
    if (activeTab !== "broadcasts") {
      setBroadcastView("list");
      setViewingBroadcastId(null);
    }
  }, [activeTab]);

  // Automations sub-navigation
  const [automationView, setAutomationView] = useState<"list" | "new" | "edit" | "logs">("list");
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [editingAutomationInitial, setEditingAutomationInitial] = useState<BuilderInitial | null>(null);
  const [loggingAutomationId, setLoggingAutomationId] = useState<string | null>(null);
  const [loggingAutomationName, setLoggingAutomationName] = useState("");

  const handleNavigateToChat = useCallback((phone: string) => {
    setNavigateToPhone(phone);
    setActiveTab("inbox");
  }, []);

  // Load automation data for editing
  useEffect(() => {
    if (activeTab === "automations" && automationView === "edit" && editingAutomationId) {
      let cancelled = false;
      (async () => {
        try {
          // Load automation record
          const { data: auto, error: autoErr } = await supabase
            .from("automations")
            .select("*")
            .eq("id", editingAutomationId)
            .single();
          if (autoErr || !auto) throw autoErr || new Error("Not found");

          // Load steps tree
          const { data: steps } = await supabase
            .from("automation_steps")
            .select("*")
            .eq("automation_id", editingAutomationId)
            .order("position");

          // Build tree from flat steps
          const tree = buildStepTree(steps ?? []);
          const builderSteps = fromServerSteps(tree);

          if (!cancelled) {
            setEditingAutomationInitial({
              id: auto.id,
              name: auto.name || "",
              description: auto.description || "",
              trigger_type: auto.trigger_type,
              trigger_config: auto.trigger_config || {},
              is_active: auto.is_active,
              steps: builderSteps,
            });
          }
        } catch (err: any) {
          if (!cancelled) {
            console.error("Failed to load automation for editing:", err);
            setAutomationView("list");
          }
        }
      })();
      return () => { cancelled = true };
    }
  }, [activeTab, automationView, editingAutomationId]);

  const isInboxActive = activeTab === "inbox";

  // Open automation builder for a template
  const handleCreateFromTemplate = (slug: string) => {
    const tmpl = getTemplate(slug);
    if (!tmpl) return;
    // Expand template seed steps into BuilderStep tree
    const expandedSteps = (tmpl.steps ?? []).filter(s => !s.parent_index && !s.branch).map((seed) => {
      const step: any = {
        cid: `c_${Math.random().toString(36).slice(2)}`,
        step_type: seed.step_type,
        step_config: seed.step_config as Record<string, unknown>,
      };
      // Handle condition branches
      if (seed.step_type === "condition") {
        const children = (tmpl.steps ?? []).filter(s => s.parent_index === tmpl.steps.indexOf(seed));
        step.branches = {
          yes: children.filter(s => s.branch === "yes").map((s) => ({
            cid: `c_${Math.random().toString(36).slice(2)}`,
            step_type: s.step_type,
            step_config: s.step_config as Record<string, unknown>,
          })),
          no: children.filter(s => s.branch === "no").map((s) => ({
            cid: `c_${Math.random().toString(36).slice(2)}`,
            step_type: s.step_type,
            step_config: s.step_config as Record<string, unknown>,
          })),
        };
      }
      return step;
    });

    setEditingAutomationInitial({
      name: tmpl.name,
      description: tmpl.description,
      trigger_type: tmpl.trigger_type,
      trigger_config: tmpl.trigger_config as Record<string, unknown>,
      is_active: false,
      steps: expandedSteps,
    });
    setEditingAutomationId(null);
    setAutomationView("new");
  };

  // Build nested step tree from flat DB rows
  function buildStepTree(rows: any[]): ServerStepNode[] {
    const childrenOf = new Map<string | null, any[]>();
    for (const row of rows) {
      const parent = row.parent_step_id ?? "__root__";
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent)!.push(row);
    }

    function build(parentId: string | null, branch: "yes" | "no" | null = null): ServerStepNode[] {
      const key = parentId ?? "__root__";
      const myChildren = (childrenOf.get(key) ?? [])
        .filter((r) => r.branch === branch || (branch === null && r.branch === null));
      return myChildren.map((row: any) => ({
        id: row.id,
        step_type: row.step_type,
        step_config: row.step_config ?? {},
        branches: row.step_type === "condition"
          ? { yes: build(row.id, "yes"), no: build(row.id, "no") }
          : { yes: [], no: [] },
      }));
    }

    return build(null);
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#111B21]">
      {/* Top header — WhatsApp API + CRM | Tools near logo | Hamburger with tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#1f2c33] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onBackToInbox && (
            <button
              onClick={onBackToInbox}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8696a0] hover:text-white hover:bg-white/5 transition-colors shrink-0"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-white whitespace-nowrap">WhatsApp</span>
          <div className="flex items-center gap-0.5 mr-1 shrink-0">
            <span className="text-[10px] font-bold bg-[#25D366] text-white px-1.5 py-0.5 rounded-sm leading-none">API</span>
            <span className="text-[10px] font-bold text-white/90">+ CRM</span>
          </div>
          {/* 80px gap + tools near the logo */}
          <div className="w-[80px] shrink-0" />
          <div className="flex items-center gap-1">
            <button
              onClick={handleFetchPhotos}
              disabled={photosLoading}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8696a0] hover:text-white hover:bg-white/5 transition-colors"
              title="Buscar fotos de perfil do WhatsApp"
            >
              <Camera className={cn("w-4 h-4", photosLoading && "animate-pulse")} />
            </button>
            <button
              onClick={() => setShowInboxSearch(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8696a0] hover:text-white hover:bg-white/5 transition-colors"
              title="Pesquisar conversas"
            >
              <Search className="w-4 h-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8696a0] hover:text-white hover:bg-white/5 transition-colors"
                  title="Nova conversa"
                >
                  <MessageSquarePlus className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-64 bg-[#202C33] border-white/10">
                <DropdownMenuItem className="cursor-pointer py-2.5 text-white hover:bg-white/5" onClick={() => setActiveTab("inbox")}>
                  <MessageSquarePlus className="w-4 h-4 mr-3 text-[#00A884]" /> Nova conversa
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2.5 text-white hover:bg-white/5" onClick={() => setActiveTab("inbox")}>
                  <Users className="w-4 h-4 mr-3 text-[#00A884]" /> Nova conversa em grupo
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2.5 text-white hover:bg-white/5" onClick={() => setActiveTab("inbox")}>
                  <Building2 className="w-4 h-4 mr-3 text-[#00A884]" /> Criar comunidade
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2.5 text-white hover:bg-white/5" onClick={() => setActiveTab("broadcasts")}>
                  <List className="w-4 h-4 mr-3 text-[#00A884]" /> Lista de transmissão
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2.5 text-white hover:bg-white/5" onClick={() => setActiveTab("inbox")}>
                  <Contact className="w-4 h-4 mr-3 text-[#00A884]" /> Contatos da agenda
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2.5 text-white hover:bg-white/5" onClick={() => setActiveTab("contacts")}>
                  <UserPlus className="w-4 h-4 mr-3 text-[#00A884]" /> Adicionar novo contato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Hamburger Menu — com navegação de abas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8696a0] hover:text-white hover:bg-white/5 transition-colors"
                title="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#202C33] border-white/10">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isCurrent = activeTab === tab.id;
                return (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "cursor-pointer py-2 text-white hover:bg-white/5",
                      isCurrent && "bg-[#00A884]/10 text-[#00A884]"
                    )}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {tab.label}
                    {isCurrent && <span className="ml-auto text-[10px] font-bold text-[#00A884]">ATIVO</span>}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Flows sub-tabs */}
      {activeTab === "flows" && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-white/5 bg-[#1f2c33] shrink-0 overflow-x-auto scrollbar-none">
          {FLOWS_SUB_TABS.map(subTab => {
            const Icon = subTab.icon;
            const isCurrent = activeFlowsSubTab === subTab.id;
            return (
              <button
                key={subTab.id}
                onClick={() => setActiveFlowsSubTab(subTab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                  isCurrent
                    ? "bg-[#00A884]/20 text-[#00A884]"
                    : "text-[#8696a0] hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {subTab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {activeTab === "inbox" && (
          <WhatsAppInboxView
            onBack={onBackToInbox}
            initialPhone={navigateToPhone}
            onChatConsumed={() => setNavigateToPhone(null)}
            onNavigateTab={(tab) => setActiveTab(tab as TabId)}
            showSearch={showInboxSearch}
            onSearchToggle={() => setShowInboxSearch(v => !v)}
          />
        )}
        {activeTab === "contacts" && (
          <WhatsAppContactsTab onNavigateToChat={handleNavigateToChat} />
        )}
        {activeTab === "pipeline" && <PipelineTabContent onOpenChat={handleNavigateToChat} />}
        {activeTab === "broadcasts" && broadcastView === "list" && (
          <WhatsAppBroadcastsTab
            onViewDetail={(id) => {
              setViewingBroadcastId(id);
              setBroadcastView("detail");
            }}
          />
        )}
        {activeTab === "broadcasts" && broadcastView === "detail" && viewingBroadcastId && (
          <BroadcastDetailView
            broadcastId={viewingBroadcastId}
            onBack={() => {
              setBroadcastView("list");
              setViewingBroadcastId(null);
            }}
          />
        )}
        {activeTab === "flows" && activeFlowsSubTab === "flows" && <WhatsAppFlowsTab />}
        {activeTab === "flows" && activeFlowsSubTab === "templates" && <WhatsAppTemplatesTab />}
        {activeTab === "flows" && activeFlowsSubTab === "quick_replies" && <WhatsAppQuickRepliesTab />}
        {activeTab === "flows" && activeFlowsSubTab === "automations" && automationView === "list" && (
          <AutomationsList
            onCreateNew={() => {
              setEditingAutomationInitial({
                name: "",
                description: "",
                trigger_type: "new_message_received",
                trigger_config: {},
                is_active: false,
                steps: [],
              });
              setEditingAutomationId(null);
              setAutomationView("new");
            }}
            onEdit={(id) => {
              setEditingAutomationId(id);
              setAutomationView("edit");
            }}
            onViewLogs={(id) => {
              setLoggingAutomationId(id);
              setAutomationView("logs");
            }}
          />
        )}
        {activeTab === "flows" && activeFlowsSubTab === "automations" && (automationView === "new" || automationView === "edit") && editingAutomationInitial && (
          <AutomationBuilder
            initial={editingAutomationInitial}
            onBack={() => {
              setAutomationView("list");
              setEditingAutomationInitial(null);
              setEditingAutomationId(null);
            }}
            onSaved={() => {
              setAutomationView("list");
              setEditingAutomationInitial(null);
              setEditingAutomationId(null);
            }}
          />
        )}
        {activeTab === "flows" && activeFlowsSubTab === "automations" && automationView === "logs" && loggingAutomationId && (
          <AutomationLogs
            automationId={loggingAutomationId}
            automationName=""
            onBack={() => {
              setAutomationView("list");
              setLoggingAutomationId(null);
            }}
          />
        )}
        {activeTab === "metrics" && <WhatsAppMetricsTab onNavigate={(tab) => setActiveTab(tab as TabId)} />}
        {activeTab === "settings" && <WhatsAppSettingsView userId={user?.id} />}
      </div>

      {/* Footer global do WhatsApp — criptografia */}
      <div className="shrink-0 text-center text-[11px] text-[#667781] px-4 py-3 leading-normal border-t border-[#313D45] bg-[#111B21]">
        <Lock className="w-3 h-3 inline-block align-[-2px] mr-0.5" />
        Suas mensagens pessoais são protegidas com a{' '}
        <a href="#" className="text-[#00A884] no-underline font-medium">criptografia de ponta a ponta</a>
      </div>
    </div>
  );
}