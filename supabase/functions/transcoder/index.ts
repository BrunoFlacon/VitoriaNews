import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { videoUrl, resolutions = ['1080p', '720p', '480p'] } = await req.json();

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: 'Video URL required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // console.log(`Transcoding ${videoUrl} to ${resolutions.join(', ')}...`);

    // In a real environment, this would spawn FFMpeg or call an external service like AWS MediaConvert
    const outputs = resolutions.map(res => ({
      resolution: res,
      url: `${videoUrl}_${res}.mp4`,
      status: 'completed'
    }));

    return new Response(JSON.stringify({ success: true, outputs }), {
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
