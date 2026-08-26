"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HEARTBEAT_MS, IDLE_AFTER_MS, type StoredPresence } from "@/lib/presence";
import { isNetworkAbortError, logNetworkError } from "@/utils/errorHandling";

/**
 * PresenceHeartbeat — headless. Mount ONCE per signed-in dashboard tab.
 * Reports this tab's presence to the `member_presence` table via the
 * `touch_presence` RPC roughly every HEARTBEAT_MS.
 *
 * The client only ever reports 'online' or 'away':
 *   - 'away'   when the tab is hidden, or no user input for IDLE_AFTER_MS
 *   - 'online' otherwise
 */
export function PresenceHeartbeat() {
  const { user } = useAuth();

  const lastActivityRef = useRef<number>(0);
  const lastQuotaWarningRef = useRef<number>(0);
  const quotaExceededRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    let lastBeatAt = 0;
    lastActivityRef.current = Date.now();

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const currentStatus = (): StoredPresence => {
      if (typeof document !== "undefined" && document.hidden) return "away";
      if (Date.now() - lastActivityRef.current > IDLE_AFTER_MS) return "away";
      return "online";
    };

    // Check if the RPC exists on first call only; if not, silently disable.
    let rpcAvailable: boolean | null = null;

    const beat = async () => {
      if (cancelled) return;
      const t = Date.now();
      if (t - lastBeatAt < 1_000) return;
      lastBeatAt = t;

      if (rpcAvailable === false) return; // RPC confirmed missing — skip silently
      if (quotaExceededRef.current) {
        // Retry once every 5 minutes in case quota is restored
        if (t - lastQuotaWarningRef.current < 300_000) return;
        quotaExceededRef.current = false;
      }

      const { error } = await supabase.rpc("touch_presence", {
        p_status: currentStatus(),
      });

      if (error) {
        if (isNetworkAbortError(error)) {
          return;
        }
        if (error.code === "PGRST202" || error.message?.includes("function not found")) {
          // RPC doesn't exist in this Supabase instance (migration not applied).
          // Log once, then disable further beats.
          if (rpcAvailable === null) {
            console.info("[PresenceHeartbeat] touch_presence RPC not available — presence tracking disabled.");
          }
          rpcAvailable = false;
          return;
        }
        // 402 Payment Required = quota exceeded (Supabase)
        if (error.code === "402" || error.message?.includes("402") || error.message?.includes("quota") || error.message?.includes("exceed_cached_egress_quota")) {
          if (!quotaExceededRef.current) {
            console.warn("[PresenceHeartbeat] touch_presence unavailable — Supabase quota exceeded. Presence tracking paused.");
          }
          quotaExceededRef.current = true;
          lastQuotaWarningRef.current = t;
          return;
        }
        // 401/403 = not authenticated — silently disable, likely local mode without login
        if (error.status === 401 || error.status === 403 || error.message?.includes("401") || error.message?.includes("403") || error.message?.includes("Not authenticated")) {
          if (rpcAvailable === null) {
            console.info("[PresenceHeartbeat] touch_presence requires authentication — presence tracking disabled in local mode.");
          }
          rpcAvailable = false;
          return;
        }
        // 522 / 504 Cloudflare connection timeout
        if (error.status === 522 || error.message?.includes("522") || error.message?.includes("timed out") || error.message?.includes("Connection timed out")) {
          quotaExceededRef.current = true;
          lastQuotaWarningRef.current = t;
          return;
        }
        // Other unexpected error — throttle to once per minute max
        if (!cancelled) {
          const sinceLastWarn = t - lastQuotaWarningRef.current;
          if (sinceLastWarn > 60_000) {
            logNetworkError("PresenceHeartbeat", error, true);
            lastQuotaWarningRef.current = t;
          }
        }
      } else {
        rpcAvailable = true;
        quotaExceededRef.current = false;
      }
    };

    const activityEvents: (keyof DocumentEventMap)[] = [
      "mousemove",
      "keydown",
      "pointerdown",
      "scroll",
    ];
    activityEvents.forEach((e) =>
      document.addEventListener(e, markActive, { passive: true }),
    );

    const onReturn = () => {
      if (!document.hidden) markActive();
      void beat();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);

    void beat();
    const interval = setInterval(() => void beat(), HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      activityEvents.forEach((e) =>
        document.removeEventListener(e, markActive),
      );
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [user]);

  return null;
}
