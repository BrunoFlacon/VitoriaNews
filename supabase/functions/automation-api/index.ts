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
      case 'trends':
        ({ data, error } = await supabaseClient.from('trends').select('*').order('detected_at', { ascending: false }).limit(20));
        break;
      case 'analytics':
        ({ data, error } = await supabaseClient.from('analytics_posts').select('*').order('updated_at', { ascending: false }).limit(20));
        break;
      case 'suggestions':
        ({ data, error } = await supabaseClient.from('repost_suggestions').select('*').order('created_at', { ascending: false }).limit(20));
        break;
      case 'approve-repost':
        if (req.method !== 'POST') throw new Error('Method not allowed');
        const { id } = await req.json();
        // Set suggestion status and queue job
        ({ data, error } = await supabaseClient.from('repost_suggestions').update({ status: 'approved' }).eq('id', id));
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
