/**
 * Type definitions for the Flows runtime.
 *
 * These mirror the Supabase schema for `flows`,
 * `flow_nodes`, `flow_runs`, `flow_run_events` plus the discriminated
 * unions the engine uses to typecheck node configs.
 */

// ============================================================
// Node configs (discriminated union by node_type)
// ============================================================

export interface StartNodeConfig {
  next_node_key: string;
}

export interface SendMessageNodeConfig {
  text: string;
  next_node_key: string;
}

export interface SendButtonsNodeConfig {
  text: string;
  header_text?: string;
  footer_text?: string;
  buttons: Array<{
    reply_id: string;
    title: string;
    next_node_key: string;
  }>;
}

export interface SendListNodeConfig {
  text: string;
  button_label: string;
  header_text?: string;
  footer_text?: string;
  sections: Array<{
    title?: string;
    rows: Array<{
      reply_id: string;
      title: string;
      description?: string;
      next_node_key: string;
    }>;
  }>;
}

export interface SendMediaNodeConfig {
  media_type: "image" | "video" | "document";
  media_url: string;
  caption?: string;
  filename?: string;
  next_node_key: string;
}

export interface HandoffNodeConfig {
  note?: string;
  assign_to?: string;
}

export interface CollectInputNodeConfig {
  prompt_text: string;
  var_key: string;
  validation?: "any" | "email" | "phone" | "regex";
  regex?: string;
  next_node_key: string;
}

export type ConditionOperator =
  | "equals"
  | "contains"
  | "present"
  | "absent";

export type ConditionSubject = "var" | "tag" | "contact_field";

export interface ConditionNodeConfig {
  subject: ConditionSubject;
  subject_key: string;
  operator: ConditionOperator;
  value?: string;
  true_next: string;
  false_next: string;
}

export interface SetTagNodeConfig {
  mode: "add" | "remove";
  tag_id: string;
  next_node_key: string;
}

export type EndNodeConfig = Record<string, never>;

export type FlowNodeConfig =
  | { node_type: "start"; config: StartNodeConfig }
  | { node_type: "send_message"; config: SendMessageNodeConfig }
  | { node_type: "send_buttons"; config: SendButtonsNodeConfig }
  | { node_type: "send_list"; config: SendListNodeConfig }
  | { node_type: "send_media"; config: SendMediaNodeConfig }
  | { node_type: "collect_input"; config: CollectInputNodeConfig }
  | { node_type: "condition"; config: ConditionNodeConfig }
  | { node_type: "set_tag"; config: SetTagNodeConfig }
  | { node_type: "handoff"; config: HandoffNodeConfig }
  | { node_type: "end"; config: EndNodeConfig };

export type FlowNodeType = FlowNodeConfig["node_type"];

// ============================================================
// Triggers
// ============================================================

export interface KeywordTriggerConfig {
  keywords: string[];
  match_type?: "exact" | "contains";
  case_sensitive?: boolean;
}

export type FirstInboundTriggerConfig = Record<string, never>;

export type FlowTriggerConfig =
  | { trigger_type: "keyword"; config: KeywordTriggerConfig }
  | { trigger_type: "first_inbound_message"; config: FirstInboundTriggerConfig }
  | { trigger_type: "manual"; config: Record<string, never> };

// ============================================================
// DB-row shapes
// ============================================================

export interface FlowRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: Record<string, unknown>;
  fallback_policy: Record<string, unknown>;
  is_active: boolean;
  is_template: boolean;
  template_slug: string | null;
  entry_node_key: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface FlowNodeRow {
  id: string;
  flow_id: string;
  node_key: string;
  node_type: FlowNodeType;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface FlowRunRow {
  id: string;
  flow_id: string;
  contact_phone: string;
  current_node_key: string | null;
  status: "active" | "completed" | "cancelled" | "timeout" | "error";
  variables: Record<string, unknown>;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

// ============================================================
// Fallback policy
// ============================================================

export interface FlowFallbackPolicy {
  action: "reprompt" | "handoff" | "end" | "ignore";
  reprompt_limit: number;
  timeout_hours?: number;
}

export const DEFAULT_FALLBACK_POLICY: FlowFallbackPolicy = {
  action: "reprompt",
  reprompt_limit: 2,
  timeout_hours: 24,
};

// ============================================================
// Helpers
// ============================================================

export function assertNever(x: never): never {
  throw new Error(`Unhandled node type: ${JSON.stringify(x)}`);
}
