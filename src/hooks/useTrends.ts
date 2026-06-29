import { useRef, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TrendItem {
  id: string;
  keyword: string;
  source: string;
  sub_source?: string;
  category: string;
  score: number;
  url?: string;
  thumbnail_url?: string;
  description?: string;
  metadata?: any;
  detected_at: string;
}

export interface PoliticalTrend {
  id: string;
  keyword: string;
  mentions: number;
  sentiment: string;
  velocity: number;
  source?: string;
  category?: string;
  detected_at: string;
}

const POLL_INTERVAL = 1000 * 60;
const SYNC_COOLDOWN = 1000 * 60 * 3;

function sanitizeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http:') ? url.replace('http:', 'https:') : url;
}

async function fetchTrendsFromDB(): Promise<TrendItem[]> {
  try {
    const { data, error } = await supabase
      .from("trends")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          return [];
      }
      return [];
    }
    return ((data as unknown as TrendItem[]) ?? []).map(t => ({
      ...t,
      thumbnail_url: sanitizeImageUrl(t.thumbnail_url) || undefined
    }));
  } catch {
    return [];
  }
}

async function fetchPoliticalTrendsFromDB(): Promise<PoliticalTrend[]> {
  try {
    const { data, error } = await supabase
      .from("political_trends")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          return [];
      }
      return [];
    }
    return (data as unknown as PoliticalTrend[]) ?? [];
  } catch {
    return [];
  }
}

export function useTrends() {
  const { toast } = useToast();

  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [politicalTrends, setPoliticalTrends] = useState<PoliticalTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncInProgress = useRef(false);
  const lastSyncRef = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const [t, pt] = await Promise.all([
        fetchTrendsFromDB(),
        fetchPoliticalTrendsFromDB(),
      ]);
      setTrends(t);
      setPoliticalTrends(pt);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    let interval: ReturnType<typeof setInterval>;
    const onVisible = () => {
      clearInterval(interval);
      if (!document.hidden) {
        interval = setInterval(fetchData, POLL_INTERVAL);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    if (!document.hidden) {
      interval = setInterval(fetchData, POLL_INTERVAL);
    }
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchData]);

  const syncManually = useCallback(async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setIsSyncing(true);
    lastSyncRef.current = Date.now();

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${baseUrl}/functions/v1/radar-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ path: 'sync-intelligence' })
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          response.status === 404
            ? 'Função Radar não encontrada. Execute: supabase functions deploy radar-api'
            : response.status === 401
            ? 'Acesso não autorizado ao Radar.'
            : `Erro ${response.status}: ${text.slice(0, 200)}`
        );
      }

      const result = await response.json();
      if (!result?.success) {
        throw new Error(result?.error || 'Falha ao sincronizar radar.');
      }

      await fetchData();
      const count = result?.data?.length ?? 0;
      toast({
        title: "Radar Atualizado",
        description: `${count} tendências e narrativas sincronizadas.`,
      });
      setSyncError(null);
    } catch (e: any) {
      setSyncError(e.message);
      toast({
        title: "Falha na Sincronização",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [fetchData, toast]);

  useEffect(() => {
    if (loading) return;

    const doSync = () => {
      if (document.hidden) return;
      const now = Date.now();
      if ((now - lastSyncRef.current) > SYNC_COOLDOWN) {
        lastSyncRef.current = now;
        syncManually();
      }
    };

    let interval: ReturnType<typeof setInterval>;
    const onVisible = () => {
      clearInterval(interval);
      if (!document.hidden) {
        doSync();
        interval = setInterval(doSync, SYNC_COOLDOWN);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    if (!document.hidden) {
      doSync();
      interval = setInterval(doSync, SYNC_COOLDOWN);
    }
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loading, syncManually]);

  return {
    trends,
    politicalTrends,
    loading,
    isSyncing,
    error,
    syncError,
    syncTrends: syncManually,
    refetch: fetchData,
  };
}
