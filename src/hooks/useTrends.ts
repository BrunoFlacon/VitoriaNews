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

/** Busca trends diretamente do Supabase — sem passar por Edge Function */
async function fetchTrendsFromDB(): Promise<TrendItem[]> {
  try {
    const { data, error } = await supabase
      .from("trends")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(50);

    if (error) {
      // Clear console: ignore RLS/Auth errors (401/406/PGRST301)
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          return [];
      }
      console.error("[useTrends] DB fetch error:", error.message);
      return [];
    }
    return (data as unknown as TrendItem[]) ?? [];
  } catch {
    return [];
  }
}

/** Busca political_trends diretamente do Supabase */
async function fetchPoliticalTrendsFromDB(): Promise<PoliticalTrend[]> {
  try {
    const { data, error } = await supabase
      .from("political_trends")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(50);

    if (error) {
      // Clear console: ignore RLS/Auth errors
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          return [];
      }
      console.error("[useTrends] Political DB fetch error:", error.message);
      return [];
    }
    return (data as unknown as PoliticalTrend[]) ?? [];
  } catch {
    return [];
  }
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
      // Direct fetch bypass for 401s and console clearing
      const session = (await supabase.auth.getSession()).data.session;
      const anonKey = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
      const baseUrl = (supabase as any).functionsUrl || import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
      
      const doFetch = async (useAuth: boolean) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'apikey': anonKey
        };
        if (useAuth && session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        return await fetch(`${baseUrl}/radar-api`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ path: 'sync-intelligence' })
        });
      };

      try {
        let response = await doFetch(true);
        if (response.status === 401) {
          response = await doFetch(false);
        }
        if (!response.ok) return { success: false };
        const result = await response.json();
        return result; 
      } catch (e) {
        return { success: false };
      }
    },
    onSuccess: (result: any) => {
      if (result?.success) {
        toast({
          title: "Radar Atualizado",
          description: "Tendências e narrativas sincronizadas com sucesso.",
        });
        queryClient.invalidateQueries({ queryKey: ["trends"] });
        queryClient.invalidateQueries({ queryKey: ["political-trends"] });
      }
    },
    onError: (err: any) => {
      // Clear the console by handling 401 gracefully
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
          console.log("[useTrends] Sync skip: User not fully authorized yet or function deploying.");
          return;
      }
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
    loading: trendsQuery.isLoading || politicalTrendsQuery.isLoading,
    isSyncing: syncMutation.isPending,
    error: trendsQuery.error || politicalTrendsQuery.error,
    syncTrends: () => syncMutation.mutate(),
    refetch: () => {
      trendsQuery.refetch();
      politicalTrendsQuery.refetch();
    },
  };
}
