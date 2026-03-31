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
    let path = url.pathname.split('/').filter(Boolean).pop() || '';

    // Permite roteamento via body { path: 'discover-trends' } quando chamado via supabase.functions.invoke()
    if (!path || path === 'automation-api') {
      try {
        const body = await req.clone().json();
        if (body?.path) path = body.path;
      } catch { /* sem body JSON, mantém o path da URL */ }
    }

    let data: any = null;
    let error: any = null;

    switch (path) {
      case 'trends':
        ({ data, error } = await supabaseClient
          .from('trends')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(20));
        break;

      case 'analytics':
        ({ data, error } = await supabaseClient
          .from('analytics_posts')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(20));
        break;

      case 'suggestions':
        ({ data, error } = await supabaseClient
          .from('repost_suggestions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20));
        break;

      case 'approve-repost': {
        if (req.method !== 'POST') throw new Error('Method not allowed');
        const { id } = await req.json();
        ({ data, error } = await supabaseClient
          .from('repost_suggestions')
          .update({ status: 'approved' })
          .eq('id', id));
        break;
      }

      case 'discover-trends': {
        // Returns mock data if trend-discovery module is unavailable
        try {
          const { discoverTrends } = await import('../_shared/automation/trend-discovery.ts');
          data = await discoverTrends(supabaseClient);
        } catch (importErr: any) {
          console.warn('[automation-api] trend-discovery import failed:', importErr.message);
          // Return a graceful empty result so frontend doesn't hard-fail
          data = { discovered: 0, message: 'Trend discovery module unavailable — check shared module.' };
        }
        break;
      }

      default:
        return jsonResponse({ error: `Endpoint '${path}' not found` }, 404);
    }

    if (error) throw error;

    return jsonResponse({ success: true, data });
  } catch (err: any) {
    console.error('[automation-api] error:', err.message);
    return jsonResponse({ error: err.message }, 500);
  }
});
