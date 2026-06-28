// deno-lint-ignore-file
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Access Deno global
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");

    // Service role client for system operations
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let user = null;
    let authError = null;

    if (authHeader) {
      const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data, error } = await authClient.auth.getUser();
      user = data.user;
      authError = error;
    }

    const isSystemAccess = apikeyHeader && (apikeyHeader === Deno.env.get('SUPABASE_ANON_KEY') || apikeyHeader === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    if (!user && !isSystemAccess) {
      return new Response(JSON.stringify({ 
          error: "Unauthorized", 
          details: authError?.message || "No valid session or apikey provided" 
      }), { 
          status: 200, // Return 200 to shield browser console from red errors
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Identify action/path
    const url = new URL(req.url);
    let path = url.pathname.split('/').filter(Boolean).pop();
    
    // Default path to 'intelligence' if we're at the root of radar-api
    if (path === 'radar-api' || !path) {
      path = 'intelligence';
    }

    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
        if (body.path) {
          path = body.path;
        }
      } catch (e) {
        // Silent body parse error
      }
    }

    let data: any = null;
    let error: any = null;

    switch (path) {
      case 'sync-intelligence':
      case 'radar-api': {
          const authHeader = req.headers.get('Authorization') || '';
          const token = authHeader.replace('Bearer ', '');
          
          if (!token) {
              return new Response(JSON.stringify({ error: 'Missing token' }), { 
                  status: 401, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              });
          }

          let targetUserId: string | null = null;
          
          if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
              const { data: firstProfile } = await supabaseClient.from('profiles').select('id').limit(1).maybeSingle();
              targetUserId = firstProfile?.id || null;
              
              if (!targetUserId) {
                  return new Response(JSON.stringify({ error: 'No user found for system sync' }), { 
                      status: 404, 
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                  });
              }
          } else {
              const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
              if (authError || !user) {
                  return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), { 
                      status: 401, 
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                  });
              }
              targetUserId = user.id;
          }

          await discoverTrends(supabaseClient, targetUserId);
          
          const { data: trends, error: fetchError } = await supabaseClient
            .from('trends')
            .select('*')
            .order('detected_at', { ascending: false })
            .limit(50);
            
          if (fetchError) throw fetchError;
          data = trends;

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
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[radar-api] Fatal error:', err.message);
    return new Response(JSON.stringify({ error: err.message, success: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Keep console clean
    });
  }
});
