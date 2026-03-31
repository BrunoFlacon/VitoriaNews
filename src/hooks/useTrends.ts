import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TrendItem {
  id: string;
  keyword: string;
  source: string;
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
  detected_at: string;
}

/** Busca trends diretamente do Supabase — sem passar por Edge Function */
async function fetchTrendsFromDB(): Promise<TrendItem[]> {
  const { data, error } = await supabase
    .from("trends" as any)
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[useTrends] Erro ao buscar trends:", error.message);
    return [];
  }
  return (data as unknown as TrendItem[]) ?? [];
}

/** Busca political_trends diretamente do Supabase */
async function fetchPoliticalTrendsFromDB(): Promise<PoliticalTrend[]> {
  const { data, error } = await supabase
    .from("political_trends" as any)
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[useTrends] Erro ao buscar political_trends:", error.message);
    return [];
  }
  return (data as unknown as PoliticalTrend[]) ?? [];
}

export function useTrends() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const trendsQuery = useQuery<TrendItem[]>({
    queryKey: ["trends-db"],
    queryFn: fetchTrendsFromDB,
    staleTime: 1000 * 60 * 3, // 3 min cache
    retry: 2,
  });

  const politicalTrendsQuery = useQuery<PoliticalTrend[]>({
    queryKey: ["political-trends-db"],
    queryFn: fetchPoliticalTrendsFromDB,
    staleTime: 1000 * 60 * 3,
    retry: 2,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      // supabase.functions.invoke gerencia JWT automaticamente — sem risco de 401
      const { data, error } = await supabase.functions.invoke('automation-api', {
        body: { path: 'discover-trends' },
      });
      if (error) throw new Error(`Falha ao sincronizar tendências: ${error.message}`);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Radar Atualizado",
        description: "Novas tendências e notícias foram capturadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["trends-db"] });
      queryClient.invalidateQueries({ queryKey: ["political-trends-db"] });
    },
    onError: (err: any) => {
      toast({
        title: "Erro no Radar",
        description: err.message || "Não foi possível atualizar o radar agora.",
        variant: "destructive",
      });
    }
  });

  return {
    trends: trendsQuery.data ?? [],
    politicalTrends: politicalTrendsQuery.data ?? [],
    loading: trendsQuery.isLoading || politicalTrendsQuery.isLoading || syncMutation.isPending,
    isSyncing: syncMutation.isPending,
    error: trendsQuery.error || politicalTrendsQuery.error,
    syncTrends: () => syncMutation.mutate(),
    refetch: () => {
      trendsQuery.refetch();
      politicalTrendsQuery.refetch();
    },
  };
}
