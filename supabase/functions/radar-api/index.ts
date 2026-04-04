// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Access Deno global
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req: Request) => {
  // 1. Handle CORS Preflight perfectly
  // This must be at the very top and return as fast as possible
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('[radar-api] Critical configuration missing');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Identify action/path
    const url = new URL(req.url);
    let path = url.pathname.split('/').filter(Boolean).pop();
    let body: any = {};

    if (req.method === 'POST') {
      try {
        body = await req.json();
        // If 'path' is in the body, it takes precedence for manual invokes
        if (body.path && (!path || path === 'radar-api')) {
          path = body.path;
        }
      } catch (e) {
        console.warn('[radar-api] Error parsing body');
      }
    }

    let data: any = null;
    let error: any = null;

    switch (path) {
      case 'sync-intelligence': {
          const { discoverTrends } = await import('../_shared/automation/trend-discovery.ts');
          
          const authHeader = req.headers.get('Authorization') || '';
          const token = authHeader.replace('Bearer ', '');
          
          if (!token) {
              return new Response(JSON.stringify({ error: 'Missing token' }), { 
                  status: 401, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              });
          }

          const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
          if (authError || !user) {
              return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), { 
                  status: 401, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              });
          }

          data = await discoverTrends(supabaseClient, user.id);
          break;
      }
      
      case 'detect-attacks': {
          const { detectCoordinatedAttack } = await import('../_shared/radar/attack-detector.ts');
          const posts = body.posts || [];
          await detectCoordinatedAttack(posts);
          data = { message: 'Detection process finished' };
          break;
      }

      case 'narratives':
        ({ data, error } = await supabaseClient.from('narratives').select('*').order('detected_at', { ascending: false }).limit(20));
        break;

      case 'campaigns':
        ({ data, error } = await supabaseClient.from('viral_campaigns').select('*').order('detected_at', { ascending: false }).limit(20));
        break;

      default:
        return new Response(JSON.stringify({ error: `Not found: ${path}` }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    if (error) {
      return new Response(JSON.stringify({ error }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
    });

  } catch (err: any) {
    console.error('[radar-api] Fatal error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
    });
  }
});
