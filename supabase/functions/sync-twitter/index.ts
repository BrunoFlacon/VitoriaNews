// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const uid = user.id;
    console.log(`[SYNC-TWITTER] Starting for user ${uid}`);

    const results: any[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // STRATEGY 1: OAuth-connected accounts in social_connections
    // These have their own access_token and can use /users/me
    // ─────────────────────────────────────────────────────────────────────────
    const { data: oauthConnections } = await adminClient
      .from("social_connections")
      .select("id, access_token, platform_user_id, username, page_name")
      .eq("user_id", uid)
      .eq("platform", "twitter")
      .eq("is_connected", true);

    const oauthAccounts = (oauthConnections || []).filter((c: any) => !!c.access_token);

    if (oauthAccounts.length > 0) {
      console.log(`[SYNC-TWITTER] Found ${oauthAccounts.length} OAuth account(s) in social_connections`);

      for (const conn of oauthAccounts) {
        try {
          const token = decodeURIComponent(conn.access_token);
          const userRes = await fetch(
            "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url,name,username,description,id",
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (userRes.ok) {
            const userData = await userRes.json();
            const u = userData.data || {};
            const m = u.public_metrics || {};

            console.log(`[SYNC-TWITTER] OAuth @${u.username}: followers=${m.followers_count}, tweets=${m.tweet_count}`);

            const profilePic = u.profile_image_url?.replace("_normal", "_400x400") || null;
            const platformUserId = u.id || conn.platform_user_id;

            // Upsert into social_accounts
            await adminClient.from("social_accounts").upsert({
              user_id: uid,
              platform: "twitter",
              platform_user_id: platformUserId,
              username: u.username || conn.username || "",
              page_name: u.name || u.username || "",
              profile_picture: profilePic,
              followers: m.followers_count || 0,
              followers_count: m.followers_count || 0,
              posts_count: m.tweet_count || 0,
              updated_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
            }, { onConflict: "user_id,platform,platform_user_id" });

            // Update social_connections metadata with fresh image & follower count
            await adminClient.from("social_connections")
              .update({
                profile_image_url: profilePic,
                followers_count: m.followers_count || 0,
                metadata: {
                  photo: profilePic,
                  followers: m.followers_count || 0,
                  posts_count: m.tweet_count || 0,
                  last_sync: new Date().toISOString(),
                }
              })
              .eq("id", conn.id);

            // Insert into account_metrics for historical tracking
            const { data: socialAccount } = await adminClient
              .from("social_accounts")
              .select("id")
              .eq("user_id", uid)
              .eq("platform", "twitter")
              .eq("platform_user_id", platformUserId)
              .maybeSingle();

            if (socialAccount?.id) {
              await adminClient.from("account_metrics").insert({
                user_id: uid,
                social_account_id: socialAccount.id,
                platform: "twitter",
                followers: m.followers_count || 0,
                posts_count: m.tweet_count || 0,
                collected_at: new Date().toISOString(),
              }).then(() => {}).catch(() => {}); // Non-blocking
            }

            results.push({
              handle: u.username,
              followers: m.followers_count,
              posts: m.tweet_count,
              name: u.name,
              profile_picture: profilePic,
              source: "oauth",
              ok: true
            });
          } else {
            const errText = await userRes.text();
            console.error(`[SYNC-TWITTER] OAuth /users/me HTTP ${userRes.status}:`, errText.substring(0, 300));
            results.push({ handle: conn.username || conn.platform_user_id, error: `HTTP ${userRes.status}`, detail: errText.substring(0, 200), source: "oauth" });
          }
        } catch (e: any) {
          console.error(`[SYNC-TWITTER] OAuth error for conn ${conn.id}:`, e.message);
          results.push({ handle: conn.username, error: e.message, source: "oauth" });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STRATEGY 2: Manual Bearer Token from api_credentials
    // Used when the account was not connected via OAuth but has a manual API key
    // ─────────────────────────────────────────────────────────────────────────
    const { data: credsRow } = await adminClient
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", uid)
      .eq("platform", "twitter")
      .maybeSingle();

    const creds = credsRow?.credentials as Record<string, string> | null;
    const bearerToken = creds?.access_token || creds?.bearer_token || creds?.token;
    const savedHandle = creds?.platform_user_id || creds?.username;

    if (bearerToken && savedHandle) {
      // Only run manual sync if we haven't already synced this handle via OAuth
      const alreadySynced = results.some(r => r.handle?.toLowerCase() === savedHandle.toLowerCase() && r.ok);
      
      if (!alreadySynced) {
        console.log(`[SYNC-TWITTER] Manual bearer token sync for @${savedHandle}`);
        try {
          const decodedToken = decodeURIComponent(bearerToken);
          const userUrl = /^\d+$/.test(savedHandle)
            ? `https://api.twitter.com/2/users/${savedHandle}?user.fields=public_metrics,profile_image_url,name,username`
            : `https://api.twitter.com/2/users/by/username/${savedHandle}?user.fields=public_metrics,profile_image_url,name,username`;

          console.log(`[SYNC-TWITTER] Fetching: ${userUrl}`);
          const res = await fetch(userUrl, { headers: { Authorization: `Bearer ${decodedToken}` } });

          if (res.ok) {
            const data = await res.json();
            const u = data.data || {};
            const m = u.public_metrics || {};
            const profilePic = u.profile_image_url?.replace("_normal", "_400x400") || null;
            const platformUserId = u.id || savedHandle;

            console.log(`[SYNC-TWITTER] Manual @${u.username}: followers=${m.followers_count}, tweets=${m.tweet_count}`);

            // Upsert into social_accounts
            await adminClient.from("social_accounts").upsert({
              user_id: uid,
              platform: "twitter",
              platform_user_id: platformUserId,
              username: u.username || savedHandle,
              page_name: u.name || u.username || savedHandle,
              profile_picture: profilePic,
              followers: m.followers_count || 0,
              followers_count: m.followers_count || 0,
              posts_count: m.tweet_count || 0,
              updated_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
            }, { onConflict: "user_id,platform,platform_user_id" });

            results.push({
              handle: u.username || savedHandle,
              followers: m.followers_count,
              posts: m.tweet_count,
              name: u.name,
              profile_picture: profilePic,
              source: "manual_bearer",
              ok: true
            });
          } else {
            const errText = await res.text();
            console.error(`[SYNC-TWITTER] Manual HTTP ${res.status} for @${savedHandle}:`, errText.substring(0, 300));
            results.push({ handle: savedHandle, error: `HTTP ${res.status}`, detail: errText.substring(0, 200), source: "manual_bearer" });
          }
        } catch (e: any) {
          console.error(`[SYNC-TWITTER] Manual sync error:`, e.message);
          results.push({ handle: savedHandle, error: e.message, source: "manual_bearer" });
        }
      }
    } else if (!bearerToken && oauthAccounts.length === 0) {
      return new Response(JSON.stringify({
        error: "Nenhum token do Twitter configurado. Conecte sua conta via OAuth ou configure um Bearer Token em Configurações > APIs Sociais > X (Twitter)."
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const success = results.some(r => r.ok);
    console.log(`[SYNC-TWITTER] Done. ${results.filter(r => r.ok).length}/${results.length} accounts synced successfully.`);
    
    return new Response(JSON.stringify({ success, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[SYNC-TWITTER] Fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
