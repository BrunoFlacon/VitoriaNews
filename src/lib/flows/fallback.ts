/**
 * Fallback-policy resolver.
 */

import { DEFAULT_FALLBACK_POLICY, type FlowFallbackPolicy } from "./types";

export type FallbackAction =
  | { type: "reprompt" }
  | { type: "handoff" }
  | { type: "end" }
  | { type: "ignore" };

export function resolveFallbackPolicy(raw: unknown): FlowFallbackPolicy {
  if (!raw || typeof raw !== "object") return DEFAULT_FALLBACK_POLICY;
  const r = raw as Partial<FlowFallbackPolicy>;
  return {
    action:
      r.action === "handoff" || r.action === "end" || r.action === "ignore" || r.action === "reprompt"
        ? r.action
        : DEFAULT_FALLBACK_POLICY.action,
    reprompt_limit:
      typeof r.reprompt_limit === "number" && r.reprompt_limit >= 0
        ? Math.floor(r.reprompt_limit)
        : DEFAULT_FALLBACK_POLICY.reprompt_limit,
    timeout_hours:
      typeof r.timeout_hours === "number" && r.timeout_hours > 0
        ? r.timeout_hours
        : DEFAULT_FALLBACK_POLICY.timeout_hours,
  };
}

export function decideFallback(args: {
  policy: FlowFallbackPolicy;
  reprompt_count: number;
}): FallbackAction {
  const { policy, reprompt_count } = args;
  if (policy.action === "ignore") return { type: "ignore" };
  if (policy.action === "handoff") return { type: "handoff" };
  if (reprompt_count <= policy.reprompt_limit) {
    return { type: "reprompt" };
  }
  return policy.action === "end" ? { type: "end" } : { type: "handoff" };
}
