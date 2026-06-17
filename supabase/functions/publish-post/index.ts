// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;
import { dispatchPost, PublishPayload } from '../_shared/platforms/dispatcher.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = (Deno as any).env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");

    // Service role client for system operations
    const supabase = createClient(supabaseUrl, (Deno as any).env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let user = null;
    let authError = null;

    if (authHeader) {
      const authClient = createClient(supabaseUrl, (Deno as any).env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data, error } = await authClient.auth.getUser();
      user = data.user;
      authError = error;
    }

    const isSystemAccess = apikeyHeader && (apikeyHeader === (Deno as any).env.get('SUPABASE_ANON_KEY') || apikeyHeader === (Deno as any).env.get('SUPABASE_SERVICE_ROLE_KEY'));

    if (!user && !isSystemAccess) {
      return new Response(JSON.stringify({ 
          error: "Unauthorized", 
          details: authError?.message || "No valid session or apikey provided" 
      }), { 
          status: 200, // Clean console
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

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

    const userId = user?.id || "system";
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
    console.error("[publish-post] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Keep console clean
    });
  }
});