// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;
import { dispatchPost, PublishPayload } from '../_shared/platforms/dispatcher.ts';

async function triggerAnalyticsUpdate(userId: string): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    await fetch(`${supabaseUrl}/functions/v1/collect-social-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
  } catch (e) {
    console.error("[publish-post] Error triggering analytics update:", e);
  }
}

// After publishing to Facebook, update the cached posts_count in the DB
async function updateFacebookPostsCount(supabase: any, userId: string, pageIds: string[]): Promise<void> {
  for (const rawTargetId of pageIds) {
    try {
      const { data: conn } = await supabase
        .from("social_connections")
        .select("id, access_token, platform_user_id, page_id")
        .eq("user_id", userId)
        .eq("platform", "facebook")
        .or(`page_id.eq.${rawTargetId},platform_user_id.eq.${rawTargetId}`)
        .maybeSingle();

      if (!conn?.access_token) continue;

      const fbPageId = conn.page_id || conn.platform_user_id;
      if (!fbPageId) continue;

      // Count Facebook posts via /feed (includes shared + own content)
      let count: number | null = null;
      try {
        let total = 0;
        let pages = 0;
        let url: string | null = `https://graph.facebook.com/v21.0/${fbPageId}/feed?fields=id&limit=100&access_token=${conn.access_token}`;
        while (url && pages < 50) {
          const r = await fetch(url);
          if (!r.ok) break;
          const d = await r.json();
          if (d.data) total += d.data.length;
          url = d.paging?.next || null;
          pages++;
        }
        count = total;
      } catch (e) {
        console.error("[publish-post] Error counting Facebook posts:", e);
      }
      if (count !== null) {
        await supabase.from("social_connections")
          .update({ posts_count: count })
          .eq("id", conn.id);
        await supabase.from("social_accounts")
          .update({ posts_count: count })
          .eq("user_id", userId)
          .eq("platform", "facebook")
          .eq("platform_user_id", fbPageId);
      }
    } catch (e) {
      console.error("[publish-post] Error updating Facebook posts_count:", e);
    }
  }
}

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
    const facebookPageIds: string[] = [];

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

        // Track successful Facebook publishes to refresh posts_count
        if (result.success && platform === 'facebook' && targetProfileId) {
          facebookPageIds.push(targetProfileId);
        }

      } catch (err: any) {
         results.push({ platform: rawPlatform, success: false, error: err.message });
      }
    }

    // Auto-refresh posts_count for Facebook pages that received a new post
    if (facebookPageIds.length > 0) {
      // Fire-and-forget — não bloqueia a resposta
      updateFacebookPostsCount(supabase, userId, facebookPageIds);
    }

    // Fire-and-forget — atualiza métricas de todas as plataformas após publicação
    triggerAnalyticsUpdate(userId);

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