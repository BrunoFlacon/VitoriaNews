import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;
import { dispatchPost, PublishPayload } from '../_shared/platforms/dispatcher.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = (Deno as any).env.get('SUPABASE_URL')!;
    const supabaseKey = (Deno as any).env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') || '');
    const userId = user?.id;

    const { 
      postId, 
      platforms, 
      content, 
      mediaUrls, 
      postType = "post", 
      mediaType: explicitMediaType,
      recipientPhone,
      chatId
    } = await req.json();

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
      mediaType = 'text'; 
    }

    const results = [];

    for (const rawPlatform of platforms) {
      try {
        const [platform, targetProfileId] = rawPlatform.split('|');
        
        const payload: PublishPayload = {
          platform,
          contentType: mediaType as any,
          content,
          mediaUrls,
          userId,
          options: { postType, postId, recipientPhone, chatId, targetProfileId }
        };

        const result = await dispatchPost(supabase, payload);
        results.push({ platform: rawPlatform, ...result });

      } catch (err: any) {
         results.push({ platform: rawPlatform, success: false, error: err.message });
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