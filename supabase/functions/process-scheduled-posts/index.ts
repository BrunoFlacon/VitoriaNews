// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isSystemAccess as checkSystemAccess } from "../_shared/system-auth.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_PUBLISHING_MS = 5 * 60 * 1000;
const BATCH_SIZE = 10;
const PLATFORM_TIMEOUT_MS = 45_000;

function extractStoragePath(url: string): string | null {
  const signMarker = "/object/sign/media/";
  const publicMarker = "/object/public/media/";
  if (url.includes(signMarker)) {
    const p = decodeURIComponent(url.split(signMarker)[1]?.split("?")[0] ?? "");
    return p.startsWith("/") ? p.slice(1) : p;
  }
  if (url.includes(publicMarker)) {
    const p = decodeURIComponent(url.split(publicMarker)[1]?.split("?")[0] ?? "");
    return p.startsWith("/") ? p.slice(1) : p;
  }
  return null;
}

async function resolveMediaUrls(supabase: any, mediaIds: string[]): Promise<string[]> {
  if (!mediaIds || mediaIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from("media")
    .select("file_url, storage_path, url, cloudinary_url")
    .in("id", mediaIds);
  if (error) throw error;

  const urls: string[] = [];
  const paths: string[] = [];

  for (const m of rows || []) {
    const full = [m.file_url, m.cloudinary_url, m.url].find(Boolean);
    if (!full) continue;

    if (/^https?:\/\//.test(full)) {
      const storagePath = extractStoragePath(full);
      if (storagePath) {
        if (!paths.includes(storagePath)) paths.push(storagePath);
      } else {
        urls.push(full);
      }
    } else if (m.storage_path) {
      if (!paths.includes(m.storage_path)) paths.push(m.storage_path);
    } else if (!paths.includes(full)) {
      paths.push(full);
    }
  }

  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from("media")
      .createSignedUrls(paths, 3600);
    if (!signError) {
      for (const s of signed || []) {
        if (s?.signedUrl) urls.push(s.signedUrl);
      }
    }
  }

  return urls;
}

// Publishes a single post to a single platform via publish-post.
// One invocation per platform keeps each call well under the 60s limit.
async function invokePublishForPlatform(
  supabaseUrl: string,
  serviceKey: string,
  post: any,
  platform: string,
  mediaUrls: string[]
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PLATFORM_TIMEOUT_MS);
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/publish-post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({
        postId: post.id,
        platforms: [platform],
        content: post.content,
        mediaUrls,
        title: post.metadata?.videoTitle || post.metadata?.title || null,
        mediaType: post.media_type,
        userId: post.user_id,
        recipientPhone: post.metadata?.recipientPhone || post.metadata?.recipient_phone || null,
        chatId: post.metadata?.chatId || post.metadata?.chat_id || null,
      }),
      signal: controller.signal,
    });
    try {
      return await response.json();
    } catch {
      return { error: `Non-JSON response (status ${response.status})` };
    }
  } catch (e: any) {
    return { error: String(e?.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const apikey = req.headers.get("apikey");
  const auth = req.headers.get("authorization") || "";

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!(await checkSystemAccess(supabase, apikey, auth))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stale = new Date(Date.now() - STALE_PUBLISHING_MS).toISOString();
    const { data: posts, error } = await supabase
      .from("scheduled_posts")
      .select("id, user_id, content, media_ids, platforms, media_type, status, scheduled_at, updated_at, metadata")
      .lte("scheduled_at", new Date().toISOString())
      .in("status", ["scheduled", "publishing"])
      .or(`status.eq.scheduled,updated_at.lte.${stale}`)
      .order("scheduled_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;

    let published = 0;
    let failed = 0;
    let skipped = 0;

    for (const post of posts || []) {
      const now = new Date().toISOString();

      const { data: claimed } = await supabase
        .from("scheduled_posts")
        .update({ status: "publishing", error_message: null, updated_at: now })
        .eq("id", post.id)
        .in("status", post.status === "publishing" ? ["publishing"] : ["scheduled"])
        .select("id")
        .maybeSingle();

      if (!claimed) {
        skipped++;
        continue;
      }

      try {
        const mediaUrls = await resolveMediaUrls(supabase, post.media_ids || []);

        const platformResults = await Promise.allSettled(
          (post.platforms || []).map((platform: string) =>
            invokePublishForPlatform(supabaseUrl, serviceKey, post, platform, mediaUrls)
          )
        );

        const outcomes = platformResults.map((r) =>
          r.status === "fulfilled" ? r.value : { error: r.reason?.message || "rejected" }
        );

        const anySuccess = outcomes.some((o: any) => {
          const results = o?.results;
          return o?.success === true && Array.isArray(results) && results.some((x: any) => x.success);
        });

        if (anySuccess) {
          await supabase
            .from("scheduled_posts")
            .update({
              status: "published",
              published_at: now,
              error_message: null,
              updated_at: now,
            })
            .eq("id", post.id);
          published++;
        } else {
          const errors: string[] = [];
          for (const o of outcomes) {
            if (o?.success === true && Array.isArray(o?.results) && o.results.some((x: any) => x.success)) continue;
            const platformErrs = Array.isArray(o?.results)
              ? o.results.map((r: any) => r.error).filter(Boolean)
              : [o?.error];
            for (const e of platformErrs) if (e && !errors.includes(e)) errors.push(e);
          }
          const message = errors.slice(0, 5).join(" | ") || "Publish failed";
          await supabase
            .from("scheduled_posts")
            .update({ status: "failed", error_message: message.slice(0, 500), updated_at: now })
            .eq("id", post.id);
          failed++;
        }
      } catch (e: any) {
        await supabase
          .from("scheduled_posts")
          .update({
            status: "failed",
            error_message: String(e?.message || e).slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: (posts || []).length, published, failed, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
