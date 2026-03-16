const createClient = (await import('https://deno.land/std@0.177.0/http/server.ts')).oe;
// @ts-ignore
const env = typeof Deno !== 'undefined' && Deno.env ? Deno.env : undefined;

import { dispatchPost, PublishPayload } from '../_shared/platforms/dispatcher.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = env?.get('SUPABASE_URL');
    const supabaseKey = env?.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase Environment Variables');
    }

    const { postId, platforms, content, mediaUrls, postType = "post", mediaType: explicitMediaType } = await req.json();

    let mediaType = explicitMediaType;
    if (!mediaType && mediaUrls && mediaUrls.length > 0) {
      const url = mediaUrls[0].toLowerCase();
      if (url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm')) {
        mediaType = 'video';
      } else if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.ogg')) {
        mediaType = 'audio';
      } else {
        mediaType = 'image';
      }
    } else if (!mediaType) {
      mediaType = 'text'; // Maps 'none' to 'text' for generic dispatcher payload
    }

    const results = [];

    // The dispatcher should technically handle fetching connection credentials 
    // or expect them in the payload. Here we simply loop and invoke dispatchPost.
    for (const platform of platforms) {
      try {
        const payload: PublishPayload = {
          platform,
          contentType: mediaType as 'text'|'image'|'video'|'audio'|'carousel'|'story'|'live',
          content,
          mediaUrls,
          options: { postType }
        };

        const result = await dispatchPost(payload);
        results.push({ platform, ...result });

      } catch (err: any) {
         results.push({ platform, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});