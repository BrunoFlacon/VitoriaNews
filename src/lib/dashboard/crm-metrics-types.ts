export interface MetricDelta {
  current: number;
  previous: number;
}

export interface MetricsBundle {
  activeConversations: MetricDelta;
  newContactsToday: MetricDelta;
  openDealsValue: number;
  openDealsCount: number;
  messagesSentToday: MetricDelta;
}

export interface ConversationsSeriesPoint {
  day: string;
  incoming: number;
  outgoing: number;
}

export interface PipelineStageSlice {
  id: string;
  name: string;
  color: string;
  dealCount: number;
  totalValue: number;
}

export interface PipelineDonutData {
  stages: PipelineStageSlice[];
  totalValue: number;
}

export interface ResponseTimeBucket {
  dow: number;
  avgMinutes: number | null;
  samples: number;
}

export interface ResponseTimeSummary {
  buckets: ResponseTimeBucket[];
  thisWeekAvg: number | null;
  lastWeekAvg: number | null;
}

export type ActivityKind = "message" | "deal" | "broadcast" | "automation" | "contact";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  text: string;
  at: string;
  href?: string;
}
