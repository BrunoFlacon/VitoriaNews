import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  PoliticalTrend, 
  Narrative, 
  ViralCampaign, 
  AttackEvent, 
  RepostSuggestion 
} from "@/lib/social-sdk/types";
import { useEffect } from "react";

export function useIntelligence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const narrativesQuery = useQuery<Narrative[]>({
    queryKey: ["narratives"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).from("narratives")
          .select("*").order("detected_at", { ascending: false });
        if (error) return [];
        return (data || []) as unknown as Narrative[];
      } catch { return []; }
    }
  });

  const campaignsQuery = useQuery<ViralCampaign[]>({
    queryKey: ["viral-campaigns"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).from("viral_campaigns")
          .select("*").order("detected_at", { ascending: false });
        if (error) return [];
        return (data || []) as unknown as ViralCampaign[];
      } catch { return []; }
    }
  });

  const attacksQuery = useQuery<AttackEvent[]>({
    queryKey: ["attack-events"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).from("eventos_de_ataque")
          .select("*").order("criado_em", { ascending: false });
        if (error) return [];
        return (data || []) as unknown as AttackEvent[];
      } catch { return []; }
    }
  });

  const suggestionsQuery = useQuery<RepostSuggestion[]>({
    queryKey: ["repost-suggestions"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).from("repost_suggestions")
          .select("*").eq("status", "pending").order("created_at", { ascending: false });
        if (error) return [];
        return (data || []) as unknown as RepostSuggestion[];
      } catch { return []; }
    }
  });
  
  const competitorsQuery = useQuery<any[]>({
    queryKey: ["competitor-intel"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).from("competitor_intel")
          .select("*").order("last_updated", { ascending: false });
        if (error) return [];
        return data || [];
      } catch { return []; }
    }
  });

  const influenceNodesQuery = useQuery<any[]>({
    queryKey: ["influence-nodes"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).from("influence_nodes")
          .select("*").order("influence_score", { descending: true });
        if (error) return [];
        return data || [];
      } catch { return []; }
    }
  });

  const updateSuggestionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data, error } = await (supabase as any).from("repost_suggestions")
        .update({ status }).eq("id", id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repost-suggestions"] });
    }
  });

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('intelligence-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eventos_de_ataque' }, (payload) => {
        queryClient.setQueryData(['attack-events'], (old: any) => [payload.new, ...(old || [])]);
        toast({
          title: "🚨 Alerta de Ataque Detectado!",
          description: `Novo padrão coordenado: ${payload.new.topico}`,
          variant: "destructive"
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'repost_suggestions' }, (payload) => {
        queryClient.setQueryData(['repost-suggestions'], (old: any) => [payload.new, ...(old || [])]);
        toast({
          title: "💡 Nova Sugestão de Repost",
          description: "O sistema identificou uma oportunidade de republicação.",
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return {
    narratives: narrativesQuery.data || [],
    campaigns: campaignsQuery.data || [],
    attacks: attacksQuery.data || [],
    suggestions: suggestionsQuery.data || [],
    competitors: competitorsQuery.data || [],
    influenceNodes: influenceNodesQuery.data || [],
    loading: narrativesQuery.isLoading || campaignsQuery.isLoading || attacksQuery.isLoading || suggestionsQuery.isLoading || competitorsQuery.isLoading || influenceNodesQuery.isLoading,
    updateSuggestionStatus,
  };
}
