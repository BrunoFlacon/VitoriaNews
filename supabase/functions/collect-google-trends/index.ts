// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Coleta tendências de várias regiões
    const regions = ["BR", "US", "GLOBAL"];
    const allTrends: any[] = [];

    for (const geo of regions) {
      try {
        const url = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo === 'GLOBAL' ? 'US' : geo}`;
        const res = await fetch(url);
        const xml = await res.text();

        // Regex simples para extrair itens do RSS (evitando dependências pesadas de XML no Edge)
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        
        for (const item of items) {
          const titleMatch = item.match(/<title>(.*?)<\/title>/);
          const trafficMatch = item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/);
          const descriptionMatch = item.match(/<description>(.*?)<\/description>/);
          const linkMatch = item.match(/<link>(.*?)<\/link>/);
          const pictureMatch = item.match(/<ht:picture>(.*?)<\/ht:picture>/);

          if (titleMatch) {
            const keyword = titleMatch[1];
            const trafficString = trafficMatch ? trafficMatch[1] : "0";
            const score = parseInt(trafficString.replace(/[\+,]/g, "")) || 100;

            allTrends.push({
              keyword,
              source: "google",
              sub_source: geo,
              category: "Tendências",
              score,
              url: linkMatch ? linkMatch[1] : `https://www.google.com/search?q=${encodeURIComponent(keyword)}`,
              thumbnail_url: pictureMatch ? pictureMatch[1] : null,
              description: descriptionMatch ? descriptionMatch[1] : null,
              detected_at: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error(`Erro ao coletar trends para ${geo}:`, err);
      }
    }

    // Salva no banco de dados
    if (allTrends.length > 0) {
      const { error } = await supabase.from("trends" as any).upsert(
        allTrends.map(t => ({
          keyword: t.keyword,
          source: t.source,
          sub_source: t.sub_source,
          category: t.category,
          score: t.score,
          url: t.url,
          thumbnail_url: t.thumbnail_url,
          description: t.description,
          detected_at: t.detected_at
        })),
        { onConflict: "keyword,source" }
      );

      if (error) throw error;
    }

    return new Response(JSON.stringify({
      success: true,
      count: allTrends.length,
      regions: regions
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
