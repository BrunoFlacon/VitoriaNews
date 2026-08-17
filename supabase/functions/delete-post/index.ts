// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;
import { deletePlatformPost } from '../_shared/platforms/post-sync.ts';
import { isSystemAccess as checkSystemAccess } from '../_shared/system-auth.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function logSync(supabase: any, entry: {
  userId: string;
  postId: string;
  platform: string;
  operation: "delete";
  platformPostId: string | null;
  status: string;
  message?: string;
  metadata?: any;
}): Promise<void> {
  try {
    await supabase.from("post_sync_log").insert({
      user_id: entry.userId,
      post_id: entry.postId,
      platform: entry.platform,
      operation: entry.operation,
      platform_post_id: entry.platformPostId,
      status: entry.status,
      message: entry.message || null,
      metadata: entry.metadata || null,
    });
  } catch (e) {
    console.error("[delete-post] Error writing post_sync_log:", e);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = (Deno as any).env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");

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

    const isSystemAccess = await checkSystemAccess(supabase, apikeyHeader, authHeader);

    if (!user && !isSystemAccess) {
      return new Response(JSON.stringify({
        error: "Unauthorized",
        details: authError?.message || "No valid session or apikey provided"
      }), {
        status: 200, // Clean console
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { postId, platforms, userId: bodyUserId } = await req.json();

    if (!postId) {
      return new Response(JSON.stringify({ success: false, error: "postId é obrigatório" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = user?.id || bodyUserId || "system";

    // Busca as publicações registradas do post
    let query = supabase
      .from("published_posts")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .neq("status", "deleted");

    if (platforms && Array.isArray(platforms) && platforms.length > 0) {
      query = query.in("platform", platforms.map((p: string) => p.split("|")[0]));
    }

    const { data: rows, error: fetchError } = await query;
    if (fetchError) {
      return new Response(JSON.stringify({ success: false, error: fetchError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Nenhuma publicação encontrada para este post (ou já foi excluída).",
        results: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const results = [];

    for (const row of rows) {
      const result = await deletePlatformPost(supabase, row);
      results.push(result);

      await logSync(supabase, {
        userId,
        postId,
        platform: result.platform,
        operation: "delete",
        platformPostId: result.platformPostId ?? row.platform_post_id,
        status: result.success ? "success" : "error",
        message: result.message || result.error || null,
        metadata: { unsupported: result.unsupported || false }
      });

      if (result.success) {
        await supabase
          .from("published_posts")
          .update({ status: "deleted", deleted_at: new Date().toISOString(), last_sync_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    }

    // Marca o agendamento como excluído quando TODAS as plataformas confirmaram
    if (results.length > 0 && results.every((r: any) => r.success)) {
      try {
        await supabase
          .from("scheduled_posts")
          .update({ status: "deleted", updated_at: new Date().toISOString() })
          .eq("id", postId)
          .eq("user_id", userId);
      } catch (e) {
        console.error("[delete-post] Error updating scheduled post:", e);
      }
    }

    return new Response(JSON.stringify({ success: results.some((r: any) => r.success), results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("[delete-post] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Keep console clean
    });
  }
});
