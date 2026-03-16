import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    let data, error;

    switch (path) {
      case 'political-trends':
        ({ data, error } = await supabaseClient.from('political_trends').select('*').order('detected_at', { ascending: false }).limit(20));
        break;
      case 'narratives':
        ({ data, error } = await supabaseClient.from('narratives').select('*').order('detected_at', { ascending: false }).limit(20));
        break;
      case 'campaigns':
        ({ data, error } = await supabaseClient.from('viral_campaigns').select('*').order('detected_at', { ascending: false }).limit(20));
        break;
      default:
        throw new Error('Invalid endpoint path');
    }

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
