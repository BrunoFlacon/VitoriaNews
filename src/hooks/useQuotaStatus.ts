import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type QuotaState = "ok" | "quota_exceeded" | "checking" | "error";

interface QuotaStatus {
  state: QuotaState;
  lastChecked: number | null;
  errorMessage: string | null;
}

/**
 * useQuotaStatus — verifica periodicamente se o Supabase está respondendo
 * ou se a quota (402 Payment Required) foi excedida.
 *
 * Faz uma chamada leve (REST /select=count) para uma tabela que com certeza
 * existe (`social_connections`). Se retornar 402, sabemos que a quota estourou.
 *
 * Re-verifica a cada 5 minutos para detectar quando a quota voltar.
 */
export function useQuotaStatus(checkIntervalMs = 300_000): QuotaStatus {
  const [status, setStatus] = useState<QuotaState>("checking");
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    try {
      const { error } = await supabase
        .from("social_connections")
        .select("id", { count: "exact", head: true })
        .limit(1);

      if (!mountedRef.current) return;

      if (!error) {
        setStatus("ok");
        setErrorMessage(null);
      } else if (
        error.code === "402" ||
        error.message?.includes("402") ||
        error.message?.includes("quota") ||
        error.message?.includes("Payment Required") ||
        error.message?.includes("exceed_cached_egress_quota")
      ) {
        setStatus("quota_exceeded");
        setErrorMessage(error.message || "Quota excedida");
      } else {
        setStatus("error");
        setErrorMessage(error.message || "Erro de conexão");
      }
      setLastChecked(Date.now());
    } catch (err: any) {
      if (!mountedRef.current) return;
      setStatus("error");
      setErrorMessage(err?.message || "Erro de rede");
      setLastChecked(Date.now());
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    check();

    intervalRef.current = setInterval(check, checkIntervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [check, checkIntervalMs]);

  return { state: status, lastChecked, errorMessage };
}
