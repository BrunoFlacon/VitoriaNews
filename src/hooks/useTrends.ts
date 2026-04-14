import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

/** Busca trends unificadas via Edge Function (evita erros de CORS) */
async function fetchUnifiedTrends(): Promise<TrendItem[]> {
  try {
    // radar-api is the official intelligence source
    const { data, error } = await supabase.functions.invoke('radar-api', {
      body: { path: 'intelligence' }
    });

    if (error || !data) {
      const { data: localData } = await supabase.from('trends' as any).select('*').order('detected_at', { ascending: false }).limit(30);
      return (localData as unknown as TrendItem[]) || [];
    }
    
    return (data?.data as TrendItem[]) ?? [];
  } catch (e) {
    console.error('[useTrends] critically failed, using DB fallback', e);
    const { data: localData } = await supabase.from('trends' as any).select('*').order('detected_at', { ascending: false }).limit(30);
    return (localData as unknown as TrendItem[]) || [];
  }
}

export function useTrends() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const trendsQuery = useQuery<TrendItem[]>({
    queryKey: ["trends-unified"],
    queryFn: fetchUnifiedTrends,
    staleTime: 1000 * 60 * 10, // 10 min cache
    retry: 0,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('radar-api', {
        body: { path: 'sync-intelligence' },
      });

      if (error) throw new Error(`Falha ao sincronizar tendências: ${error.message}`);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Radar Atualizado",
        description: "Novas tendências e notícias foram capturadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["trends-unified"] });
    },
    onError: (err: any) => {
      toast({
        title: "Erro no Radar",
        description: err.message || "Não foi possível atualizar o radar agora.",
        variant: "destructive",
      });
    }
  });

  const rawData = trendsQuery.data ?? [];
  const trends = Array.isArray(rawData) ? rawData : [];

  return {
    trends: trends,
    politicalTrends: Array.isArray(trends) ? trends.filter(t => t.category === 'Política') : [],
    loading: trendsQuery.isLoading || syncMutation.isPending,
    isSyncing: syncMutation.isPending,
    error: trendsQuery.error,
    syncTrends: () => syncMutation.mutate(),
    refetch: () => trendsQuery.refetch(),
  };
}
