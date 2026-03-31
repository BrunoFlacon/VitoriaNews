// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
};

const jsonResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

serve(async (req: Request) => {
  // Always handle CORS preflight first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean).pop();

    let data: any = null;
    let error: any = null;

    switch (path) {
      case 'political-trends':
        ({ data, error } = await supabaseClient
          .from('political_trends')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(20));
        break;

      case 'narratives':
        ({ data, error } = await supabaseClient
          .from('narratives')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(20));
        break;

      case 'campaigns':
        ({ data, error } = await supabaseClient
          .from('viral_campaigns')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(20));
        break;

      case 'discover-trends': {
        try {
          const { discoverTrends } = await import('../_shared/automation/trend-discovery.ts');
          data = await discoverTrends(supabaseClient);
        } catch (importErr: any) {
          console.warn('[radar-api] trend-discovery import failed:', importErr.message);
          data = { discovered: 0, message: 'Trend discovery module unavailable.' };
        }
        break;
      }

      default:
        return jsonResponse({ error: `Endpoint '${path}' not found` }, 404);
    }

    if (error) throw error;

    return jsonResponse({ success: true, data });
  } catch (err: any) {
    console.error('[radar-api] error:', err.message);
    return jsonResponse({ error: err.message }, 500);
  }
});
