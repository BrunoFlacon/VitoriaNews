"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HEARTBEAT_MS, IDLE_AFTER_MS, type StoredPresence } from "@/lib/presence";

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

      const { error } = await supabase.rpc("touch_presence", {
        p_status: currentStatus(),
      });

      if (error) {
        if (error.code === "PGRST202" || error.message?.includes("function not found")) {
          // RPC doesn't exist in this Supabase instance (migration not applied).
          // Log once, then disable further beats.
          if (rpcAvailable === null) {
            console.info("[PresenceHeartbeat] touch_presence RPC not available — presence tracking disabled.");
          }
          rpcAvailable = false;
          return;
        }
        // Other unexpected error
        if (!cancelled) {
          console.warn("[PresenceHeartbeat] touch_presence failed:", error.message);
        }
      } else {
        rpcAvailable = true;
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
