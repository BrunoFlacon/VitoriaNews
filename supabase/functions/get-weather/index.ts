import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const { lat, lon } = await req.json();
    if (!lat || !lon) throw new Error("Latitude e longitude são obrigatórias");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max&timezone=auto`;

    console.log(`Buscando clima para: ${lat}, ${lon}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao buscar clima: ${res.status}`);
    
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Erro no proxy de clima:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});

