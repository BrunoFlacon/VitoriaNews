"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { MessageSquare, UserPlus, DollarSign, Send } from "lucide-react";

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from "@/lib/dashboard/crm-queries";
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from "@/lib/dashboard/crm-metrics-types";

import { CrmMetricCard } from "@/components/dashboard/crm-metrics/crm-metric-card";
import { CrmSkeletonCard } from "@/components/dashboard/crm-metrics/crm-skeleton";
import { CrmQuickActions } from "@/components/dashboard/crm-metrics/crm-quick-actions";
import { CrmConversationsChart } from "@/components/dashboard/crm-metrics/crm-conversations-chart";
import { CrmPipelineDonut } from "@/components/dashboard/crm-metrics/crm-pipeline-donut";
import { CrmResponseTimeChart } from "@/components/dashboard/crm-metrics/crm-response-time-chart";
import { CrmActivityFeed } from "@/components/dashboard/crm-metrics/crm-activity-feed";

type RangeDays = 7 | 30 | 90;

export function WhatsAppMetricsTab({
  onNavigate,
}: {
  onNavigate?: (tab: string, subTab?: string) => void;
}) {
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [range, setRange] = useState<RangeDays>(30);
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  });
  const [seriesLoading, setSeriesLoading] = useState(true);

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null);
  const [responseTimeLoading, setResponseTimeLoading] = useState(true);

  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const loadAll = useCallback(() => {
    const db = supabase;

    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error("[metrics] metrics failed:", err))
      .finally(() => setMetricsLoading(false));

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error("[metrics] series failed:", err))
      .finally(() => setSeriesLoading(false));

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error("[metrics] pipeline failed:", err))
      .finally(() => setPipelineLoading(false));

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error("[metrics] response time failed:", err))
      .finally(() => setResponseTimeLoading(false));

    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error("[metrics] activity failed:", err))
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r);
      if (series[r] !== null) return;
      setSeriesLoading(true);
      loadConversationsSeries(supabase, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error("[metrics] series failed:", err))
        .finally(() => setSeriesLoading(false));
    },
    [series],
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Description header */}
      <div className="px-6 pt-4 pb-3 border-b border-border/50 bg-card/30 shrink-0">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Métricas e análises do CRM WhatsApp: acompanhe conversas, contatos, negócios,
          mensagens e tempo de resposta em tempo real.
        </p>
      </div>

      <div className="flex-1 p-6 space-y-5">
        {/* Metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metricsLoading || !metrics ? (
            Array.from({ length: 4 }).map((_, i) => <CrmSkeletonCard key={i} />)
          ) : (
            <>
              <CrmMetricCard
                title="Conversas Ativas"
                value={metrics.activeConversations.current.toLocaleString("pt-BR")}
                icon={MessageSquare}
                delta={{
                  sign: metrics.activeConversations.previous,
                  label: deltaLabel(metrics.activeConversations.previous, "novas hoje vs ontem"),
                }}
              />
              <CrmMetricCard
                title="Novos Contatos Hoje"
                value={metrics.newContactsToday.current.toLocaleString("pt-BR")}
                icon={UserPlus}
                delta={{
                  sign: metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  label: deltaLabel(
                    metrics.newContactsToday.current - metrics.newContactsToday.previous,
                    "vs ontem",
                  ),
                }}
              />
              <CrmMetricCard
                title="Valor em Negócios"
                value={formatCurrency(metrics.openDealsValue)}
                icon={DollarSign}
                subtitle={`${metrics.openDealsCount} negócio${metrics.openDealsCount === 1 ? "" : "s"} abertos`}
              />
              <CrmMetricCard
                title="Mensagens Enviadas Hoje"
                value={metrics.messagesSentToday.current.toLocaleString("pt-BR")}
                icon={Send}
                delta={{
                  sign: metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  label: deltaLabel(
                    metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                    "vs ontem",
                  ),
                }}
              />
            </>
          )}
        </div>

        {/* Quick actions */}
        <CrmQuickActions
          onNewContact={() => onNavigate?.("contacts")}
          onNewDeal={() => onNavigate?.("pipeline")}
          onNewBroadcast={() => onNavigate?.("broadcasts")}
          onNewAutomation={() => onNavigate?.("automations")}
        />

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="h-full lg:col-span-3">
            <CrmConversationsChart
              series={series}
              loading={seriesLoading}
              range={range}
              onRangeChange={handleRangeChange}
            />
          </div>
          <div className="h-full lg:col-span-2">
            <CrmPipelineDonut data={pipeline} loading={pipelineLoading} />
          </div>
        </div>

        {/* Response time */}
        <CrmResponseTimeChart data={responseTime} loading={responseTimeLoading} />

        {/* Activity feed */}
        <CrmActivityFeed items={activity} loading={activityLoading} />
      </div>
    </div>
  );
}

function deltaLabel(delta: number, suffix: string): string {
  if (delta === 0) return `Sem alteração ${suffix}`;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("pt-BR")} ${suffix}`;
}
