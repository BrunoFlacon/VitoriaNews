// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
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
    const hasBodyUserId = !!body.userId;

    if (!user && !isSystemAccess && !hasBodyUserId) {
      return new Response(JSON.stringify({ 
          error: "Unauthorized", 
          details: authError?.message || "No valid session or apikey" 
      }), { 
          status: 200, // Clean console
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const targetUserId = user?.id || body.userId;
    
    if (!targetUserId) {
        throw new Error("Missing User ID for sync");
    }
    
    const userId = targetUserId;

    // Fetch all connected accounts (filter by user if authenticated)
    let query = supabase
      .from("social_connections")
      .select("id, user_id, platform, access_token, platform_user_id, page_name, page_id, profile_image_url, phone_number_id")
      .eq("user_id", userId) // Safety: always filter by userId
      .eq("is_connected", true);

    if (body.platform) {
      query = query.eq("platform", body.platform);
    }

    const { data: connections, error: connError } = await query;
    if (connError) throw connError;

    const results: any[] = [];

    for (const conn of (connections || [])) {
      try {
        let stats: any = null;

        if (conn.platform === "facebook") {
          const pageId = conn.page_id || conn.platform_user_id;
          
          if (pageId && conn.access_token) {
            // 1. Fetch main page fields (fast, no pagination)
            const fields = "name,fan_count,followers_count,picture.type(large)";
            const res = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${conn.access_token}`
            );
            const data = await res.json();
            
            if (!data.error) {
              const followers = data.followers_count || data.fan_count || 0;
              const profilePic = data.picture?.data?.url || conn.profile_image_url || "";

              // 2. Count Facebook posts via /feed (includes shared + own content)
              let postsCount: number | null = null;
              try {
                let total = 0;
                let pages = 0;
                let url: string | null = `https://graph.facebook.com/v21.0/${pageId}/feed?fields=id&limit=100&access_token=${conn.access_token}`;
                while (url && pages < 50) {
                  const r = await fetch(url);
                  if (!r.ok) break;
                  const d = await r.json();
                  if (d.data) total += d.data.length;
                  url = d.paging?.next || null;
                  pages++;
                }
                postsCount = total;
                console.log(`[FB] ${conn.page_name}: postsCount=${total}`);
              } catch (e) {
                console.error("Error fetching Facebook posts count:", e);
              }

              const finalPostsCount = postsCount !== null ? postsCount : (conn.posts_count || 0);
              console.log(`[FB] ${conn.page_name}: finalPostsCount=${finalPostsCount}, conn.posts_count=${conn.posts_count}`);

              stats = {
                user_id: conn.user_id,
                platform: conn.platform,
                platform_user_id: pageId,
                username: data.name || conn.page_name || "",
                page_name: data.name || conn.page_name || "",
                profile_picture: profilePic,
                followers_count: followers,
                posts_count: finalPostsCount,
                metadata: { posts_count: finalPostsCount },
                views: 0,
                likes: 0,
                shares: 0,
                is_connected: true,
                updated_at: new Date().toISOString(),
              };

              // Update social_connections with latest profile info
              const updateData: any = {};
              if (profilePic) updateData.profile_image_url = profilePic;
              if (followers > 0) updateData.followers_count = followers;
              if (finalPostsCount > 0) updateData.posts_count = finalPostsCount;
              
              if (Object.keys(updateData).length > 0) {
                await supabase.from("social_connections")
                  .update(updateData)
                  .eq("id", conn.id);
              }
            }
          }
        } else if (conn.platform === "instagram") {
          if (conn.access_token) {
            const igUserId = conn.platform_user_id;
            if (igUserId) {
              const fields = "followers_count,media_count,name,username,profile_picture_url,media.limit(1){id}";
              const res = await fetch(
                `https://graph.facebook.com/v21.0/${igUserId}?fields=${fields}&access_token=${conn.access_token}`
              );
              const data = await res.json();
              if (data && !data.error) {
                const profilePic = data.profile_picture_url || conn.profile_image_url || "";
                const followersCount = data.followers_count || 0;
                const postsCount = data.media_count || 0;

                stats = {
                  user_id: conn.user_id, platform: conn.platform, platform_user_id: igUserId,
                  username: data.username || "", page_name: data.name || data.username || conn.page_name || "",
                  profile_picture: profilePic,
                  followers_count: followersCount,
                  posts_count: postsCount,
                  metadata: { posts_count: postsCount },
                  views: 0, likes: 0, shares: 0, is_connected: true, updated_at: new Date().toISOString(),
                };

                // Update social_connections
                const updateData: any = {};
                if (profilePic) updateData.profile_image_url = profilePic;
                if (followersCount > 0) updateData.followers_count = followersCount;
                if (postsCount > 0) updateData.posts_count = postsCount;
                if (Object.keys(updateData).length > 0) {
                  await supabase.from("social_connections").update(updateData).eq("id", conn.id);
                }
              }
            }
          }
        } else if (conn.platform === "whatsapp") {
          if (conn.platform_user_id && conn.access_token) {
            let profilePic = "";
            let bizName = conn.page_name || "WhatsApp Business";
            let phoneId = conn.phone_number_id;

            try {
              // Resolve phone_number_id if null
              if (!phoneId) {
                console.log(`[WA-SYNC] ${conn.page_name || conn.platform_user_id}: phone_number_id is null. Resolving via owned WABAs or direct phone numbers for ID=${conn.platform_user_id}`);
                let wabaIds: string[] = [];
                try {
                  const wabaResp = await fetch(`https://graph.facebook.com/v21.0/${conn.platform_user_id}/owned_whatsapp_business_accounts?access_token=${conn.access_token}`);
                  if (wabaResp.ok) {
                    const wabaData = await wabaResp.json();
                    if (wabaData.data && wabaData.data.length > 0) {
                      wabaIds = wabaData.data.map((w: any) => w.id);
                      console.log(`[WA-SYNC] Found owned WABA accounts: ${wabaIds.join(", ")}`);
                    }
                  }
                } catch (e) {
                  console.error(`[WA-SYNC] Failed to fetch owned WABAs:`, e);
                }

                if (wabaIds.length === 0) {
                  wabaIds.push(conn.platform_user_id);
                }

                for (const wabaId of wabaIds) {
                  try {
                    const phoneListResp = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${conn.access_token}`);
                    if (phoneListResp.ok) {
                      const phoneListData = await phoneListResp.json();
                      if (phoneListData.data && phoneListData.data.length > 0) {
                        let matchedPhone = phoneListData.data[0]; // default fallback
                        let nameMatched = false;
                        const connName = (conn.page_name || '').toLowerCase().trim();
                        
                        if (connName) {
                          for (const p of phoneListData.data) {
                            const pName = (p.verified_name || p.display_phone_number || '').toLowerCase().trim();
                            if (pName && (connName.includes(pName) || pName.includes(connName))) {
                              matchedPhone = p;
                              nameMatched = true;
                              console.log(`[WA-SYNC] ${conn.page_name}: matched phone "${pName}" by name (id=${p.id})`);
                              break;
                            }
                          }
                        }

                        // Only update if it is the correct matched phone, or if there is only 1 phone and names are compatible,
                        // or if this is the main account.
                        const isMainPaloma = connName.includes('banca') || connName.includes('paloma');
                        const phoneNameLower = (matchedPhone.verified_name || '').toLowerCase();
                        const isMatchedPaloma = phoneNameLower.includes('banca') || phoneNameLower.includes('paloma');
                        
                        if (nameMatched || (isMainPaloma === isMatchedPaloma) || phoneListData.data.length === 1) {
                          phoneId = matchedPhone.id;
                          bizName = matchedPhone.verified_name || matchedPhone.display_phone_number || bizName;
                          console.log(`[WA-SYNC] Resolved phone_number_id=${phoneId}, verified_name=${bizName} via WABA=${wabaId}`);
                          
                          await supabase.from("social_connections")
                            .update({ phone_number_id: phoneId, page_name: bizName })
                            .eq("id", conn.id);
                          conn.phone_number_id = phoneId;
                          conn.page_name = bizName;
                          break;
                        } else {
                          console.log(`[WA-SYNC] Skipping unmatched phone ID fallback for ${conn.page_name} to avoid cloning`);
                        }
                      }
                    }
                  } catch (e) {
                    console.error(`[WA-SYNC] Failed to fetch phone numbers for WABA ${wabaId}:`, e);
                  }
                }
              }

              // Fetch WhatsApp custom photo
              if (phoneId) {
                // Priority 1: whatsapp_business_profile
                try {
                  const bizRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/whatsapp_business_profile?fields=profile_picture_url&access_token=${conn.access_token}`);
                  if (bizRes.ok) {
                    const bizData = await bizRes.json();
                    profilePic = bizData.data?.[0]?.profile_picture_url || bizData.profile_picture_url || "";
                    console.log(`[WA-PHOTO] ${conn.page_name}: whatsapp_business_profile returned pic=${profilePic ? 'YES' : 'NO'}`);
                  }
                } catch (e) {
                  console.error(`[WA-PHOTO] Error fetching whatsapp_business_profile:`, e);
                }

                // Priority 2: Direct phone number node
                if (!profilePic) {
                  try {
                    const phoneNodeResp = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,profile_photo_url,verified_name&access_token=${conn.access_token}`);
                    if (phoneNodeResp.ok) {
                      const phoneNodeData = await phoneNodeResp.json();
                      profilePic = phoneNodeData.profile_photo_url || "";
                      bizName = phoneNodeData.verified_name || phoneNodeData.display_phone_number || bizName;
                      console.log(`[WA-PHOTO] ${conn.page_name}: phone node returned pic=${profilePic ? 'YES' : 'NO'}`);
                    }
                  } catch (e) {
                    console.error(`[WA-PHOTO] Error fetching phone node:`, e);
                  }
                }
              }

              // Priority 3: WABA phone_numbers collection
              if (!profilePic) {
                try {
                  const waId = phoneId || conn.page_id || conn.platform_user_id;
                  const phoneResp = await fetch(`https://graph.facebook.com/v21.0/${waId}/phone_numbers?fields=display_phone_number,profile_photo_url,verified_name&access_token=${conn.access_token}`);
                  if (phoneResp.ok) {
                    const phoneData = await phoneResp.json();
                    if (phoneData.data && phoneData.data.length > 0) {
                      const phone = phoneData.data[0];
                      profilePic = phone.profile_photo_url || "";
                      bizName = phone.verified_name || phone.display_phone_number || bizName;
                      console.log(`[WA-PHOTO] ${conn.page_name}: phone_numbers list returned pic=${profilePic ? 'YES' : 'NO'}`);
                      if (!conn.phone_number_id && phone.id) {
                        await supabase.from("social_connections").update({ phone_number_id: phone.id }).eq("id", conn.id);
                        conn.phone_number_id = phone.id;
                      }
                    }
                  }
                } catch (e) {
                  console.error(`[WA-PHOTO] Error fetching phone_numbers list:`, e);
                }
              }

              // Priority 4: Facebook Page fallback
              if (!profilePic) {
                try {
                  const portfolioId = conn.platform_user_id;
                  if (portfolioId) {
                    const pagePicUrl = `https://graph.facebook.com/v21.0/${portfolioId}/picture?redirect=false&type=large&access_token=${conn.access_token}`;
                    const pageResp = await fetch(pagePicUrl);
                    if (pageResp.ok) {
                      const pageData = await pageResp.json();
                      profilePic = pageData.data?.url || "";
                      console.log(`[WA-PHOTO] ${conn.page_name}: fallback page_picture returned pic=${profilePic ? 'YES' : 'NO'}`);
                    }
                  }
                } catch (e) {
                  console.error(`[WA-PHOTO] Error fetching page fallback picture:`, e);
                }
              }

              // Upload profile photo to Supabase Storage for permanent serving
              if (profilePic && profilePic.startsWith("http")) {
                try {
                  const imgResp = await fetch(profilePic, {
                    headers: {
                      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                      "Referer": "https://www.facebook.com/",
                      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                    }
                  });
                  if (imgResp.ok) {
                    const imgBlob = await imgResp.blob();
                    const ct = imgResp.headers.get("content-type") || "image/png";
                    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
                    const fileName = `whatsapp/${conn.platform_user_id || conn.id}.${ext}`;

                    const { error: uploadError } = await supabase.storage
                      .from("profile-photos")
                      .upload(fileName, imgBlob, { contentType: ct, upsert: true });

                    if (!uploadError) {
                      const { data: pubUrl } = supabase.storage
                        .from("profile-photos")
                        .getPublicUrl(fileName);
                      profilePic = pubUrl.publicUrl;
                      console.log(`[WA-PHOTO] ${conn.page_name}: uploaded to storage: ${profilePic}`);
                    } else {
                      console.error(`[WA-PHOTO] ${conn.page_name}: upload failed:`, uploadError.message);
                    }
                  } else {
                    console.error(`[WA-PHOTO] ${conn.page_name}: fetch image failed (${imgResp.status})`);
                  }
                } catch (e) {
                  console.error(`[WA-PHOTO] ${conn.page_name}: image upload error:`, String(e));
                }
              }
            } catch (e) {
              console.error("Error syncing WhatsApp details:", e);
            }

            const waId = conn.platform_user_id;

            stats = {
              user_id: conn.user_id,
              platform: conn.platform,
              platform_user_id: waId,
              username: bizName,
              page_name: bizName,
              profile_picture: profilePic,
              followers_count: 0,
              posts_count: 0,
              metadata: {},
              views: 0,
              likes: 0,
              shares: 0,
              is_connected: true,
              updated_at: new Date().toISOString(),
            };

            const updateData: any = {};
            if (profilePic) {
              updateData.profile_image_url = profilePic;
              updateData.profile_picture = profilePic;
            } else {
              updateData.profile_image_url = null;
              updateData.profile_picture = null;
            }
            if (bizName) updateData.page_name = bizName;
            updateData.posts_count = 0;
            updateData.followers_count = 0;

            await supabase.from("social_connections")
              .update(updateData)
              .eq("id", conn.id);
          }
        } else if (conn.platform === "twitter") {
          if (conn.platform_user_id && conn.access_token) {
            const res = await fetch(
              `https://api.x.com/2/users/${conn.platform_user_id}?user.fields=profile_image_url,public_metrics,name,username`,
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            const data = await res.json();
            if (data.data) {
              const metrics = data.data.public_metrics || {};
              const postsCount = metrics.tweet_count || 0;
              
              // Fetch tweets engagement (limit 10 for basic analytics)
              let likesCount = 0;
              let sharesCount = 0;
              let viewsCount = 0;
              try {
                const tweetsRes = await fetch(
                  `https://api.x.com/2/users/${conn.platform_user_id}/tweets?tweet.fields=public_metrics&max_results=10`,
                  { headers: { Authorization: `Bearer ${conn.access_token}` } }
                );
                const tweetsData = await tweetsRes.json();
                if (tweetsData.data) {
                  tweetsData.data.forEach((t: any) => {
                    if (t.public_metrics) {
                      likesCount += t.public_metrics.like_count || 0;
                      sharesCount += t.public_metrics.retweet_count || 0;
                      viewsCount += t.public_metrics.impression_count || 0;
                    }
                  });
                }
              } catch(e) { }

              const profilePic = data.data.profile_image_url?.replace('_normal', '') || conn.profile_image_url || "";

              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: conn.platform_user_id,
                username: data.data.username || "", page_name: data.data.name || "",
                profile_picture: profilePic,
                followers_count: metrics.followers_count || 0,
                posts_count: postsCount,
                metadata: { posts_count: postsCount },
                views: viewsCount, likes: likesCount, shares: sharesCount, is_connected: true, updated_at: new Date().toISOString(),
              };

              // Update social_connections
              const updateData: any = {};
              if (profilePic) updateData.profile_image_url = profilePic;
              if (metrics.followers_count) updateData.followers_count = metrics.followers_count;
              if (postsCount > 0) updateData.posts_count = postsCount;
              if (Object.keys(updateData).length > 0) {
                await supabase.from("social_connections").update(updateData).eq("id", conn.id);
              }
            }
          }
        } else if (conn.platform === "youtube") {
          if (conn.access_token) {
            const res = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
              { headers: { Authorization: `Bearer ${conn.access_token}` } }
            );
            const data = await res.json();
            const ch = data.items?.[0];
            if (ch) {
              const postsCount = parseInt(ch.statistics?.videoCount || "0");
              const profilePic = ch.snippet?.thumbnails?.high?.url || conn.profile_image_url || "";
              const followersCount = parseInt(ch.statistics?.subscriberCount || "0");

              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: ch.id,
                username: ch.snippet?.title || "", page_name: ch.snippet?.title || "",
                profile_picture: profilePic,
                followers_count: followersCount,
                posts_count: postsCount,
                metadata: { posts_count: postsCount },
                views: parseInt(ch.statistics?.viewCount || "0"),
                likes: 0, shares: 0, is_connected: true, updated_at: new Date().toISOString(),
              };

              // Update social_connections
              const updateData: any = {};
              if (profilePic) updateData.profile_image_url = profilePic;
              if (followersCount > 0) updateData.followers_count = followersCount;
              if (postsCount > 0) updateData.posts_count = postsCount;
              if (Object.keys(updateData).length > 0) {
                await supabase.from("social_connections").update(updateData).eq("id", conn.id);
              }
            }
          }
        } else if (conn.platform === "threads") {
          if (conn.access_token) {
            const res = await fetch(
              `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,followers_count&access_token=${conn.access_token}`
            );
            const data = await res.json();
            if (data && !data.error) {
              const profilePic = data.threads_profile_picture_url || conn.profile_image_url || "";
              const followersCount = data.followers_count || 0;

              // Try to fetch Threads media count
              let mediaCount = 0;
              try {
                const mediaRes = await fetch(
                  `https://graph.threads.net/v1.0/${data.id}/threads?fields=id&limit=1&access_token=${conn.access_token}`
                );
                const mediaData = await mediaRes.json();
                if (mediaData.data) {
                  mediaCount = mediaData.data.length;
                  if (mediaData.paging?.next && mediaData.paging?.cursors?.after) {
                    // If there are more pages, we have at least some posts
                    // Use summary-like approach: count via total_count isn't available for Threads
                    // So we'll track pagination for a more accurate count
                    let cursorAfter = mediaData.paging.cursors.after;
                    while (true) {
                      const nextRes = await fetch(
                        `https://graph.threads.net/v1.0/${data.id}/threads?fields=id&limit=100&after=${cursorAfter}&access_token=${conn.access_token}`
                      );
                      const nextData = await nextRes.json();
                      if (!nextData.data || nextData.data.length === 0) break;
                      mediaCount += nextData.data.length;
                      if (nextData.paging?.next && nextData.paging?.cursors?.after) {
                        cursorAfter = nextData.paging.cursors.after;
                      } else break;
                    }
                  }
                }
              } catch (e) {
                console.error("Error fetching Threads media count:", e);
              }

              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: data.id,
                username: data.username || "", page_name: data.username || conn.page_name || "",
                profile_picture: profilePic,
                followers_count: followersCount,
                posts_count: mediaCount,
                metadata: { posts_count: mediaCount },
                views: 0, likes: 0, shares: 0, is_connected: true, updated_at: new Date().toISOString(),
              };

              // Update social_connections
              const updateData: any = {};
              if (profilePic) updateData.profile_image_url = profilePic;
              if (followersCount > 0) updateData.followers_count = followersCount;
              if (mediaCount > 0) updateData.posts_count = mediaCount;
              if (Object.keys(updateData).length > 0) {
                await supabase.from("social_connections").update(updateData).eq("id", conn.id);
              }
            }
          }
        } else if (conn.platform === "linkedin") {
          if (conn.access_token) {
            const res = await fetch("https://api.linkedin.com/v2/userinfo", {
              headers: { Authorization: `Bearer ${conn.access_token}` }
            });
            const data = await res.json();
            if (data && !data.error) {
              const profilePic = data.picture || conn.profile_image_url || "";
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: data.sub || conn.platform_user_id,
                username: data.name || data.given_name || "", page_name: data.name || data.given_name || conn.page_name || "",
                profile_picture: profilePic,
                followers_count: conn.followers_count || 0,
                posts_count: conn.posts_count || 0,
                metadata: { posts_count: conn.posts_count || 0 },
                views: 0, likes: 0, shares: 0, is_connected: true, updated_at: new Date().toISOString(),
              };
              const updateData: any = {};
              if (profilePic) updateData.profile_image_url = profilePic;
              if (Object.keys(updateData).length > 0) {
                await supabase.from("social_connections").update(updateData).eq("id", conn.id);
              }
            }
          }
        } else if (conn.platform === "tiktok") {
          if (conn.access_token) {
            const fields = "open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,bio,follower_count,following_count,likes_count,video_count";
            const res = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
              headers: { Authorization: `Bearer ${conn.access_token}` }
            });
            const data = await res.json();
            const user = data?.data?.user;
            if (user) {
              const profilePic = user.avatar_url_100 || user.avatar_url || user.avatar_large_url || conn.profile_image_url || "";
              const followersCount = user.follower_count || 0;
              const postsCount = user.video_count || 0;
              stats = {
                user_id: conn.user_id, platform: conn.platform, platform_user_id: user.open_id || user.union_id || conn.platform_user_id,
                username: user.display_name || "", page_name: user.display_name || conn.page_name || "",
                profile_picture: profilePic,
                followers_count: followersCount,
                posts_count: postsCount,
                metadata: { posts_count: postsCount },
                views: user.likes_count || 0, likes: user.likes_count || 0, shares: 0, is_connected: true, updated_at: new Date().toISOString(),
              };
              const updateData: any = {};
              if (profilePic) updateData.profile_image_url = profilePic;
              if (followersCount > 0) updateData.followers_count = followersCount;
              if (postsCount > 0) updateData.posts_count = postsCount;
              if (Object.keys(updateData).length > 0) {
                await supabase.from("social_connections").update(updateData).eq("id", conn.id);
              }
            }
          }
        }

        if (stats) {
          // Upsert into social_accounts
          const { error: upsertErr } = await supabase.from("social_accounts").upsert(stats, {
            onConflict: "user_id,platform,platform_user_id"
          });
          results.push({ platform: conn.platform, page: conn.page_name, status: "synced", followers: stats.followers_count, posts: stats.posts_count });
        } else {
          results.push({ platform: conn.platform, page: conn.page_name, status: "no_data", posts: 0 });
        }
      } catch (err: any) {
        results.push({ platform: conn.platform, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, synced: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[sync-social-data] Fatal error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      success: false
    }), {
      status: 200, // Keep console clean
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
