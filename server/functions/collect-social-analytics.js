// Ported from supabase/functions/collect-social-analytics (Deno) → Node/Express local runtime.
// Collects real-time analytics from connected social platform APIs.
import { json } from "../lib/fnShared.js";
import { pool } from "../lib/db.js";

const FETCH_TIMEOUT = 15000;

function fetchWithTimeout(url, options = {}, ms = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function getCredentials(supabase, userId, platform) {
  try {
    const { data } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", platform)
      .maybeSingle();
    return data?.credentials || {};
  } catch {
    return {};
  }
}

async function processPlatform(conn, supabase) {
  try {
    let metrics = null;
    const recentPostsMetrics = [];

    // Skip if synced within last 5 minutes (except WhatsApp)
    if (conn.updated_at && conn.platform !== "whatsapp") {
      const lastSync = new Date(conn.updated_at).getTime();
      if (Date.now() - lastSync < 300000) {
        console.log(`[collect-social-analytics] ${conn.platform}/${conn.page_id || conn.platform_user_id}: skipped (synced ${Math.round((Date.now() - lastSync) / 1000)}s ago)`);
        return;
      }
    }

    switch (conn.platform) {
      // ─── FACEBOOK ────────────────────────────────────────────────
      case "facebook": {
        if (!conn.access_token) break;
        const pageId = conn.page_id || conn.platform_user_id;

        let totalPostsCount = null;
        if (!conn.posts_count || conn.posts_count === 0) {
          try {
            let total = 0;
            let pages = 0;
            let url = `https://graph.facebook.com/v21.0/${pageId}/feed?fields=id&limit=100&access_token=${conn.access_token}`;
            while (url && pages < 50) {
              const r = await fetchWithTimeout(url);
              if (!r.ok) break;
              const d = await r.json();
              if (d.data) total += d.data.length;
              url = d.paging?.next || null;
              pages++;
            }
            totalPostsCount = total;
          } catch (e) {
            console.error("Error fetching Facebook posts count:", e);
          }
        }

        const finalPostsCount = totalPostsCount !== null ? totalPostsCount : (conn.posts_count || 0);
        const fields = "followers_count,fan_count,picture.type(large),posts.limit(5){id,created_time,message}";
        const resp = await fetchWithTimeout(`https://graph.facebook.com/v21.0/${pageId}?fields=${fields}&access_token=${conn.access_token}`);

        if (resp.ok) {
          const data = await resp.json();
          const profilePic = data.picture?.data?.url || conn.profile_image_url || `https://graph.facebook.com/v21.0/${pageId}/picture?type=large`;
          metrics = {
            followers_count: typeof data.followers_count === "number" ? data.followers_count : (data.fan_count || 0),
            media_count: finalPostsCount,
            views_count: 500 + Math.floor(Math.random() * 1000),
            profile_picture: profilePic,
          };
        }
        break;
      }

      // ─── WHATSAPP ────────────────────────────────────────────────
      case "whatsapp": {
        if (!conn.access_token) break;
        let profilePic = "";
        let bizName = conn.page_name || "WhatsApp Business";
        let phoneId = conn.phone_number_id;

        // Clear page_id for known bad connections
        const BAD_CONN_NAMES = [
          "Central News", "Andje Wallace",
          "ADM - Marcha da Família", "ADM - IG. M Vida Eterna",
          "ADM - Tupã Pela Pátria", "ADM - Partido Liberal Tupã",
        ];
        let wasCleared = false;
        if (BAD_CONN_NAMES.some(n => (conn.page_name || '').trim() === n)) {
          wasCleared = true;
          if (conn.page_id) {
            console.log(`[WA-SYNC] ${conn.page_name}: clearing page_id`);
            await supabase.from("social_connections").update({ page_id: null }).eq("id", conn.id);
            conn.page_id = null;
          }
        }
        conn._cleared = wasCleared;

        try {
          if (conn.phone_number_id && conn.profile_image_url && !conn.profile_image_url.includes('fbcdn')) {
            phoneId = conn.phone_number_id;
            profilePic = conn.profile_image_url;
            console.log(`[WA-SYNC] ${conn.page_name}: already has phone_number_id + photo, skipping resolution`);
          } else {
            console.log(`[WA-SYNC] ${conn.page_name}: resolving phone_number_id...`);
            let wabaIds = [];
            let fallbackPhoneId = null;
            let wabaToken = conn.access_token;

            let apiCredData = null;
            try {
              const { data: apiCred } = await supabase
                .from("api_credentials")
                .select("credentials")
                .eq("user_id", conn.user_id)
                .eq("platform", "whatsapp")
                .maybeSingle();
              apiCredData = apiCred;
              if (apiCred?.credentials) {
                if (apiCred.credentials.waba_id) {
                  console.log(`[WA-SYNC] ${conn.page_name}: found waba_id in api_credentials`);
                  wabaIds.push(apiCred.credentials.waba_id);
                }
                if (apiCred.credentials.access_token) {
                  wabaToken = apiCred.credentials.access_token;
                }
                fallbackPhoneId = apiCred.credentials.phone_number_id || null;
              }
            } catch (e) {
              console.error(`[WA-SYNC] Failed to fetch api_credentials:`, e);
            }

            wabaIds = wabaIds.length > 0 ? wabaIds : [conn.platform_user_id].filter(Boolean);
            let matchedPhoneId = null;

            for (const wabaId of wabaIds) {
              try {
                const phoneListResp = await fetchWithTimeout(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${wabaToken}`);
                if (phoneListResp.ok) {
                  const phoneListData = await phoneListResp.json();
                  if (phoneListData.data && phoneListData.data.length > 0) {
                    const connName = (conn.page_name || '').toLowerCase().trim();
                    let bestPhone = null;
                    let nameMatched = false;
                    if (connName) {
                      for (const p of phoneListData.data) {
                        const pName = (p.verified_name || p.display_phone_number || '').toLowerCase().trim();
                        if (pName && (connName.includes(pName) || pName.includes(connName))) {
                          bestPhone = p;
                          nameMatched = true;
                          console.log(`[WA-SYNC] ${conn.page_name}: matched phone "${pName}" by name`);
                          break;
                        }
                      }
                    }
                    if (!nameMatched && phoneListData.data.length === 1) {
                      bestPhone = phoneListData.data[0];
                      console.log(`[WA-SYNC] ${conn.page_name}: fallback to sole phone`);
                    }
                    matchedPhoneId = bestPhone ? bestPhone.id : null;
                    if (bestPhone) {
                      bizName = bestPhone.verified_name || bestPhone.display_phone_number || bizName;
                    }
                    break;
                  }
                } else {
                  const errText = await phoneListResp.text().catch(() => "");
                  console.warn(`[WA-SYNC] ${conn.page_name}: phone_numbers API status ${phoneListResp.status}: ${errText.substring(0, 200)}`);
                }
              } catch (e) {
                console.error(`[WA-SYNC] ${conn.page_name}: phone list fetch error:`, String(e));
              }
            }

            if (matchedPhoneId) {
              phoneId = matchedPhoneId;
              await supabase.from("social_connections")
                .update({ phone_number_id: phoneId, page_name: bizName, waba_id: wabaIds[0] || null })
                .eq("id", conn.id);
              conn.phone_number_id = phoneId;
              conn.page_name = bizName;
            } else if (fallbackPhoneId && (!conn.waba_id || conn.waba_id === (apiCredData?.credentials?.waba_id || ''))) {
              phoneId = fallbackPhoneId;
              await supabase.from("social_connections").update({ phone_number_id: phoneId, waba_id: wabaIds[0] || null }).eq("id", conn.id);
              conn.phone_number_id = phoneId;
            } else if (phoneId) {
              console.log(`[WA-SYNC] ${conn.page_name}: keeping existing phone_number_id=${phoneId}`);
            } else {
              console.warn(`[WA-SYNC] ${conn.page_name}: could not resolve phone_number_id`);
            }

            // Fetch WhatsApp profile photo (skip storage upload in local mode)
            if (!profilePic && phoneId) {
              try {
                const bizUrl = `https://graph.facebook.com/v21.0/${phoneId}/whatsapp_business_profile?fields=profile_picture_url&access_token=${wabaToken}`;
                const bizResp = await fetchWithTimeout(bizUrl);
                if (bizResp.ok) {
                  const bizData = await bizResp.json();
                  profilePic = bizData.data?.[0]?.profile_picture_url || bizData.profile_picture_url || "";
                  console.log(`[WA-PHOTO] ${conn.page_name}: P2 whatsapp_business_profile pic=${profilePic ? 'YES' : 'NO'}`);
                } else {
                  console.warn(`[WA-PHOTO] ${conn.page_name}: P2 failed status ${bizResp.status}`);
                }
              } catch (e) {
                console.error(`[WA-PHOTO] Error fetching whatsapp_business_profile:`, e);
              }
            }

            if (!profilePic && wabaIds.length > 0) {
              for (const wid of wabaIds) {
                try {
                  const phoneResp = await fetchWithTimeout(`https://graph.facebook.com/v21.0/${wid}/phone_numbers?fields=id,display_phone_number,profile_photo_url,verified_name&access_token=${wabaToken}`);
                  if (phoneResp.ok) {
                    const phoneData = await phoneResp.json();
                    if (phoneData.error) {
                      console.warn(`[WA-PHOTO] ${conn.page_name}: P3 error via WABA ${wid}: ${phoneData.error.message}`);
                      continue;
                    }
                    if (phoneData.data && phoneData.data.length > 0) {
                      let phone = phoneData.data[0];
                      const connName = (conn.page_name || '').toLowerCase().trim();
                      if (connName && phoneData.data.length > 1) {
                        for (const p of phoneData.data) {
                          const pName = (p.verified_name || p.display_phone_number || '').toLowerCase().trim();
                          if (pName && (connName.includes(pName) || pName.includes(connName))) {
                            phone = p;
                            break;
                          }
                        }
                      }
                      profilePic = phone.profile_photo_url || "";
                      bizName = phone.verified_name || phone.display_phone_number || bizName;
                      if (!phoneId && phone.id) phoneId = phone.id;
                      if (!conn.phone_number_id && phone.id) {
                        await supabase.from("social_connections").update({ phone_number_id: phone.id, waba_id: wabaIds[0] || null }).eq("id", conn.id);
                        conn.phone_number_id = phone.id;
                      }
                      if (profilePic) break;
                    }
                  }
                } catch (e) {
                  console.warn(`[WA-PHOTO] ${conn.page_name}: P3 error via WABA ${wid}:`, String(e));
                }
              }
            }

            // Fallback: Facebook Page picture (local mode: no storage upload)
            if (!profilePic) {
              const picCandidates = [
                conn.page_id ? `https://graph.facebook.com/v21.0/${conn.page_id}/picture?type=large` : null,
                conn.platform_user_id ? `https://graph.facebook.com/v21.0/${conn.platform_user_id}/picture?type=large` : null,
              ].filter(Boolean);
              for (const picUrl of picCandidates) {
                try {
                  const picResp = await fetchWithTimeout(picUrl);
                  if (picResp.ok && picResp.headers.get("content-type")?.startsWith("image/")) {
                    profilePic = picUrl;
                    console.log(`[WA-PHOTO] ${conn.page_name}: P4 Facebook picture FOUND`);
                    break;
                  }
                } catch (e) {
                  console.warn(`[WA-PHOTO] ${conn.page_name}: P4 error:`, String(e));
                }
              }
            }
          }
        } catch (e) {
          console.error("Error fetching WhatsApp details:", e);
        }

        // In local mode: skip Supabase Storage upload — keep original URL or fallback
        // Only use the URL if it's not a fbcdn URL (expiring)
        if (profilePic && (profilePic.includes('fbcdn') || profilePic.includes('facebook.com'))) {
          profilePic = conn.profile_image_url || "";
        }

        // Count messages
        let botSentCount = 0;
        let botAnsweredCount = 0;
        try {
          // Use pool directly for count queries
          const sentResult = await pool.query(
            `SELECT COUNT(*) as count FROM messages
             WHERE user_id = $1 AND platform = 'whatsapp'
             AND (metadata->>'bot_reply' = 'true' OR status = 'sent')`,
            [conn.user_id]
          );
          const totalSent = parseInt(sentResult.rows[0].count) || 0;

          const receivedResult = await pool.query(
            `SELECT COUNT(*) as count FROM messages
             WHERE user_id = $1 AND platform = 'whatsapp' AND status = 'received'`,
            [conn.user_id]
          );
          const receivedCount = parseInt(receivedResult.rows[0].count) || 0;

          let totalAnswered = 0;
          if (receivedCount > 0) {
            totalAnswered = receivedCount;
          }

          // Divide by number of WhatsApp connections
          const waCountResult = await pool.query(
            `SELECT COUNT(*) as count FROM social_connections
             WHERE user_id = $1 AND platform = 'whatsapp' AND is_connected = true`,
            [conn.user_id]
          );
          const divisor = Math.max(parseInt(waCountResult.rows[0].count) || 1, 1);
          botSentCount = Math.round(totalSent / divisor);
          botAnsweredCount = Math.round(totalAnswered / divisor);
        } catch (e) {
          console.error("[WA-BOT-METRICS] DB query error:", e);
        }

        // Count unique contacts
        let uniqueContacts = 0;
        try {
          const contactResult = await pool.query(
            `SELECT DISTINCT recipient_phone FROM messages
             WHERE user_id = $1 AND platform = 'whatsapp' AND recipient_phone IS NOT NULL`,
            [conn.user_id]
          );
          uniqueContacts = contactResult.rows.length;
        } catch (e) {
          console.warn("[WA-CONTACTS] Error counting unique contacts:", e);
        }

        metrics = {
          followers_count: 0,
          media_count: botSentCount,
          views_count: 0,
          profile_picture: profilePic,
          bot_posts_count: botSentCount,
          bot_answers_count: botAnsweredCount,
          unique_contacts_count: uniqueContacts,
        };
        break;
      }

      // ─── INSTAGRAM ───────────────────────────────────────────────
      case "instagram": {
        if (!conn.access_token) break;
        const igUserId = conn.platform_user_id;
        const fields = "followers_count,media_count,name,username,profile_picture_url,media.limit(10){id,media_type,like_count,comments_count,insights.metric(impressions,reach,engagement),caption,media_url}";
        const resp = await fetchWithTimeout(`https://graph.facebook.com/v21.0/${igUserId}?fields=${fields}&access_token=${conn.access_token}`);
        if (resp.ok) {
          const data = await resp.json();
          let igViews = 0;
          try {
            const igViewsResp = await fetchWithTimeout(`https://graph.facebook.com/v21.0/${igUserId}/insights?metric=profile_views&period=total_over_range&access_token=${conn.access_token}`);
            if (igViewsResp.ok) {
              const igViewsData = await igViewsResp.json();
              if (igViewsData.data?.[0]?.values?.[0]?.value) {
                igViews = igViewsData.data[0].values[0].value;
              }
            }
          } catch (e) {
            console.warn("Could not fetch Instagram profile_views insights:", e);
          }
          metrics = {
            followers_count: data.followers_count || 0,
            media_count: data.media_count || 0,
            views_count: igViews,
            profile_picture: data.profile_picture_url || null,
          };
          if (data.media?.data) {
            for (const media of data.media.data) {
              const insights = media.insights?.data || [];
              const impressions = insights.find(i => i.name === 'impressions')?.values?.[0]?.value || 0;
              const reach = insights.find(i => i.name === 'reach')?.values?.[0]?.value || 0;
              const engagement = insights.find(i => i.name === 'engagement')?.values?.[0]?.value || 0;
              recentPostsMetrics.push({
                external_id: media.id, platform: "instagram",
                impressions: Math.round(impressions || 0),
                likes: Math.round(media.like_count || 0),
                comments: Math.round(media.comments_count || 0),
                reach: Math.round(reach || 0),
                engagement: Math.round(engagement || 0),
                content: media.caption || null,
                media_url: media.media_url || null,
                collected_at: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }

      // ─── YOUTUBE ─────────────────────────────────────────────────
      case "youtube": {
        if (!conn.access_token) break;
        const resp = await fetchWithTimeout(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
          { headers: { Authorization: `Bearer ${conn.access_token}` } }
        );
        if (resp.ok) {
          const data = await resp.json();
          const ch = data.items?.[0];
          if (ch) {
            metrics = {
              followers_count: parseInt(ch.statistics?.subscriberCount || "0"),
              media_count: parseInt(ch.statistics?.videoCount || "0"),
              views_count: parseInt(ch.statistics?.viewCount || "0"),
              profile_picture: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url || null,
            };
          }
        }
        break;
      }

      // ─── THREADS ─────────────────────────────────────────────────
      case "threads": {
        if (!conn.access_token) break;
        const thrUserId = conn.platform_user_id;
        if (thrUserId) {
          const resp = await fetchWithTimeout(
            `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,followers_count&access_token=${conn.access_token}`
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data && !data.error) {
              let mediaCount = 0;
              try {
                const mediaResp = await fetchWithTimeout(
                  `https://graph.threads.net/v1.0/${data.id}/threads?fields=id&limit=1&access_token=${conn.access_token}`
                );
                const mediaData = await mediaResp.json();
                if (mediaData.data) {
                  mediaCount = mediaData.data.length;
                }
              } catch (e) {
                console.warn("Could not fetch Threads media count:", e);
              }
              metrics = {
                followers_count: data.followers_count || 0,
                media_count: mediaCount,
                views_count: 0,
                profile_picture: data.threads_profile_picture_url || null,
              };
            }
          }
        }
        break;
      }

      // ─── TWITTER/X ───────────────────────────────────────────────
      case "twitter": {
        if (conn.platform_user_id && conn.access_token) {
          const res = await fetchWithTimeout(
            `https://api.x.com/2/users/${conn.platform_user_id}?user.fields=profile_image_url,public_metrics`,
            { headers: { Authorization: `Bearer ${conn.access_token}` } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.data) {
              const m = data.data.public_metrics || {};
              metrics = {
                followers_count: m.followers_count || 0,
                media_count: m.tweet_count || 0,
                views_count: Math.floor(m.followers_count * 1.5) || 0,
                profile_picture: data.data.profile_image_url?.replace('_normal', '') || conn.profile_image_url || null,
                likes: 0,
              };
            }
          }
        }
        break;
      }

      // ─── LINKEDIN ────────────────────────────────────────────────
      case "linkedin": {
        if (conn.access_token) {
          const resp = await fetchWithTimeout("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${conn.access_token}` },
          });
          if (resp.ok) {
            const data = await resp.json();
            metrics = {
              followers_count: conn.followers_count || 0,
              media_count: conn.posts_count || 0,
              views_count: 0,
              profile_picture: data.picture || null,
            };
          }
        }
        break;
      }

      // ─── TIKTOK ──────────────────────────────────────────────────
      case "tiktok": {
        if (conn.access_token) {
          const fields = "open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,follower_count,following_count,likes_count,video_count";
          const resp = await fetchWithTimeout(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
            headers: { Authorization: `Bearer ${conn.access_token}` },
          });
          if (resp.ok) {
            const data = await resp.json();
            const user = data?.data?.user;
            if (user) {
              metrics = {
                followers_count: user.follower_count || 0,
                media_count: user.video_count || 0,
                views_count: user.likes_count || 0,
                profile_picture: user.avatar_url_100 || user.avatar_url || user.avatar_large_url || null,
              };
            }
          }
        }
        break;
      }

      // ─── SPOTIFY ─────────────────────────────────────────────────
      case "spotify": {
        if (conn.access_token) {
          const resp = await fetchWithTimeout("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${conn.access_token}` },
          });
          if (resp.ok) {
            const data = await resp.json();
            let albumCount = 0;
            let playlistCount = 0;
            try {
              const albumsResp = await fetchWithTimeout("https://api.spotify.com/v1/me/albums?limit=1", {
                headers: { Authorization: `Bearer ${conn.access_token}` },
              });
              if (albumsResp.ok) {
                const albumsData = await albumsResp.json();
                albumCount = albumsData.total || 0;
              }
            } catch (e) { /* ignore */ }
            try {
              const playlistsResp = await fetchWithTimeout("https://api.spotify.com/v1/me/playlists?limit=1", {
                headers: { Authorization: `Bearer ${conn.access_token}` },
              });
              if (playlistsResp.ok) {
                const playlistsData = await playlistsResp.json();
                playlistCount = playlistsData.total || 0;
              }
            } catch (e) { /* ignore */ }
            metrics = {
              followers_count: data.followers?.total || 0,
              media_count: albumCount + playlistCount,
              views_count: 5000 + Math.floor(Math.random() * 2000),
              profile_picture: data.images?.[0]?.url || null,
            };
          }
        } else {
          metrics = { followers_count: 1200, media_count: 8, views_count: 4500 };
        }
        break;
      }

      // ─── GOOGLE NEWS ─────────────────────────────────────────────
      case "googlenews": {
        const { data: artStats } = await supabase.from("articles").select("status").eq("user_id", conn.user_id);
        metrics = {
          followers_count: 0,
          media_count: artStats?.length || 0,
          views_count: (artStats?.filter(a => a.status === 'published').length || 0) * 150,
        };
        break;
      }

      // ─── TELEGRAM ────────────────────────────────────────────────
      case "telegram": {
        try {
          const channelResult = await pool.query(
            `SELECT COUNT(*) as count FROM messaging_channels WHERE user_id = $1`,
            [conn.user_id]
          );
          const channelCount = parseInt(channelResult.rows[0].count) || 0;

          const msgResult = await pool.query(
            `SELECT COUNT(*) as count FROM messages WHERE user_id = $1`,
            [conn.user_id]
          );
          const msgCount = parseInt(msgResult.rows[0].count) || 0;

          metrics = {
            followers_count: channelCount,
            media_count: msgCount,
            views_count: msgCount * 10,
            profile_picture: conn.profile_image_url || null,
          };
        } catch (e) {
          console.warn("Could not aggregate Telegram metrics:", e);
        }
        break;
      }

      // ─── FALLBACK platforms ──────────────────────────────────────
      case "kwai":
      case "rumble":
      case "gettr":
      case "truthsocial": {
        metrics = {
          followers_count: 1500 + Math.floor(Math.random() * 5000),
          media_count: 10 + Math.floor(Math.random() * 40),
          views_count: 2500 + Math.floor(Math.random() * 10000),
          likes: 400 + Math.floor(Math.random() * 1000),
          shares: 50 + Math.floor(Math.random() * 200),
        };
        break;
      }
    }

    // ─── Save metrics ──────────────────────────────────────────────
      if (metrics) {
        if (!conn.is_virtual) {
          const finalPic = metrics.profile_picture || conn.profile_image_url || "";
          process.stderr.write(`[SAVE] ${conn.platform}/${conn.page_name}: followers=${metrics.followers_count}(${typeof metrics.followers_count}), posts=${metrics.media_count}(${typeof metrics.media_count})\n`);
          await supabase.from("social_connections").update({
          profile_image_url: finalPic,
          profile_picture: finalPic,
          followers_count: typeof metrics.followers_count === "number" ? Math.round(metrics.followers_count) : (Number(conn.followers_count) || 0),
          posts_count: typeof metrics.media_count === "number" ? Math.round(metrics.media_count) : (Number(conn.posts_count) || 0),
        }).eq("id", conn.id);
        conn.profile_image_url = finalPic;
      }

      const finalFollowers = typeof metrics.followers_count === "number" ? Math.round(metrics.followers_count) : (Number(conn.followers_count) || 0);
      const finalPosts = typeof metrics.media_count === "number" ? Math.round(metrics.media_count) : (Number(conn.posts_count) || 0);
      const finalLikes = typeof metrics.likes === "number" ? Math.round(metrics.likes) : Math.round(finalFollowers * 0.1);
      const finalShares = typeof metrics.shares === "number" ? Math.round(metrics.shares) : Math.round(finalFollowers * 0.05);
      const finalComments = typeof metrics.comments === "number" ? Math.round(metrics.comments) : 0;

      const puid = conn.platform === 'whatsapp'
        ? (conn.platform_user_id || `manual_whatsapp_${Date.now()}`)
        : (conn.page_id || conn.platform_user_id || `manual_${conn.platform}_${Date.now()}`);

      console.log(`[UPSERT] ${conn.platform}/${conn.page_name}: fCnt=${JSON.stringify(metrics.followers_count)} fPosts=${JSON.stringify(metrics.media_count)} likes=${JSON.stringify(metrics.likes)} views=${JSON.stringify(metrics.views_count)}`);
      console.log(`[UPSERT] computed: fF=${finalFollowers} fP=${finalPosts} fL=${finalLikes} fS=${finalShares} fC=${finalComments}`);

      const { data: account } = await supabase.from("social_accounts").upsert({
        user_id: conn.user_id,
        platform: conn.platform,
        platform_user_id: puid,
        username: conn.page_name || conn.username || "",
        profile_picture: metrics.profile_picture || conn.profile_image_url || "",
        followers_count: Math.round(finalFollowers),
        total_followers: Math.round(finalFollowers),
        posts_count: Math.round(finalPosts),
        total_posts: Math.round(finalPosts),
        views: Math.round(metrics.views_count || 0),
        likes: finalLikes,
        shares: finalShares,
        comments: finalComments,
        metadata: {
          posts_count: finalPosts,
          is_virtual: conn.is_virtual,
          ...(conn.platform === "whatsapp" ? {
            bot_posts_count: metrics.bot_posts_count ?? 0,
            bot_answers_count: metrics.bot_answers_count ?? 0,
          } : {}),
        },
        is_connected: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,platform,platform_user_id" }).select("id").maybeSingle();

      if (account) {
        // Use raw SQL for upsert — index idx_account_metrics_daily_unique uses (user_id, social_account_id, metric_date)
        const collectedAt = new Date().toISOString();
        const metricDate = new Date().toISOString().split('T')[0];
        await pool.query(
          `INSERT INTO account_metrics
           (user_id, social_account_id, platform, followers, likes, shares, comments,
            posts_count, views, reach, profile_visits, new_followers, engagement_rate,
            messages_sent_count, messages_delivered_count, unique_contacts_count, collected_at, metric_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT (user_id, social_account_id, metric_date)
           DO UPDATE SET
            followers = EXCLUDED.followers,
            likes = EXCLUDED.likes,
            shares = EXCLUDED.shares,
            comments = EXCLUDED.comments,
            posts_count = EXCLUDED.posts_count,
            views = EXCLUDED.views,
            reach = EXCLUDED.reach,
            messages_sent_count = EXCLUDED.messages_sent_count,
            messages_delivered_count = EXCLUDED.messages_delivered_count,
            unique_contacts_count = EXCLUDED.unique_contacts_count`,
          [conn.user_id, account.id, conn.platform, finalFollowers, finalLikes, finalShares, finalComments,
           finalPosts,
           Math.round(metrics.views_count || 0), Math.round(metrics.reach || 0),
           Math.round(metrics.profile_visits || 0), Math.round(metrics.new_followers || 0),
           typeof metrics.engagement_rate === 'number' ? metrics.engagement_rate : null,
           Math.round(metrics.bot_posts_count || metrics.media_count || 0),
           Math.round(metrics.reach || 0),
           Math.round(metrics.unique_contacts_count || 0), collectedAt, metricDate]
        );

        // WhatsApp: also populate messaging_channels
        if (conn.platform === 'whatsapp' && conn.phone_number_id) {
          const phoneId = conn.phone_number_id;
          const finalPic = metrics.profile_picture || conn.profile_image_url || "";
          const { data: existingChannel } = await supabase
            .from("messaging_channels")
            .select("id")
            .eq("user_id", conn.user_id)
            .eq("platform", "whatsapp")
            .eq("channel_id", phoneId)
            .maybeSingle();
          const channelPayload = {
            user_id: conn.user_id,
            platform: "whatsapp",
            channel_id: phoneId,
            channel_name: conn.page_name || "WhatsApp",
            channel_type: "whatsapp",
            profile_picture: finalPic,
            members_count: finalFollowers,
            online_count: 0,
            updated_at: new Date().toISOString(),
          };
          if (existingChannel) {
            await supabase.from("messaging_channels").update(channelPayload).eq("id", existingChannel.id);
          } else {
            await supabase.from("messaging_channels").insert(channelPayload);
          }
        }

        if (recentPostsMetrics.length > 0) {
          for (const postMetric of recentPostsMetrics) {
            await supabase.from("post_metrics").upsert({
              ...postMetric,
              social_account_id: account.id,
              user_id: conn.user_id,
            }, { onConflict: "external_id,platform" });
          }
        }
      }
    }

    return { platform: conn.platform, status: metrics ? "ok" : "skipped", virtual: !!conn.is_virtual, cleared: !!conn._cleared };
  } catch (err) {
    console.error(`[collect-social-analytics] processPlatform error for ${conn.platform}/${conn.page_name || conn.platform_user_id}:`, err.message);
    if (err.stack) process.stderr.write(`[STACK] ${err.stack.split('\n').slice(0,4).join(' | ')}\n`);
    return { platform: conn.platform, status: "error", error: String(err), virtual: !!conn.is_virtual, cleared: false };
  }
}

export default async function collectSocialAnalytics({ body, user, supabase }) {
  const userId = user.id;
  const reqPlatform = body.platform || null;

  // ─── WhatsApp dedup ─────────────────────────────────────────────
  try {
    const { data: allWa } = await supabase
      .from("social_connections")
      .select("id,page_name,page_id,phone_number_id,profile_image_url,waba_id,is_connected,is_primary")
      .eq("platform", "whatsapp");
    const byName = {};
    for (const c of (allWa || [])) {
      const key = (c.page_name || '').trim().toLowerCase();
      if (!byName[key]) byName[key] = [];
      byName[key].push(c);
    }
    let dedupCount = 0;
    for (const [name, group] of Object.entries(byName)) {
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        const scoreA = (a.phone_number_id ? 1 : 0) + (a.profile_image_url ? 1 : 0);
        const scoreB = (b.phone_number_id ? 1 : 0) + (b.profile_image_url ? 1 : 0);
        return scoreB - scoreA;
      });
      const keeper = group[0];
      const duplicates = group.slice(1).filter(d => d.is_connected);
      if (duplicates.length === 0) continue;
      let survivor = keeper;
      let toDeactivate = duplicates.map(d => d.id);
      const primaryDup = duplicates.find(d => d.is_primary);
      if (primaryDup) {
        survivor = primaryDup;
        toDeactivate = [keeper.id, ...duplicates.filter(d => d.id !== primaryDup.id).map(d => d.id)];
      }
      const updateData = { updated_at: new Date().toISOString() };
      if (keeper.profile_image_url && !survivor.profile_image_url) updateData.profile_image_url = keeper.profile_image_url;
      if (keeper.phone_number_id && !survivor.phone_number_id) updateData.phone_number_id = keeper.phone_number_id;
      if (keeper.waba_id && !survivor.waba_id) updateData.waba_id = keeper.waba_id;
      if (Object.keys(updateData).length > 1) {
        await supabase.from("social_connections").update(updateData).eq("id", survivor.id);
      }
      for (const dupId of toDeactivate) {
        await supabase.from("social_connections").update({ is_connected: false, updated_at: new Date().toISOString() }).eq("id", dupId);
      }
      dedupCount += toDeactivate.length;
      console.log(`[DEDUP] ${name}: kept=${survivor.id}, deactivated=${toDeactivate.length} duplicates`);
    }
    if (dedupCount > 0) console.log(`[DEDUP] Merged ${dedupCount} duplicate connections`);
  } catch (e) {
    console.error(`[DEDUP] Failed:`, String(e));
  }

  // ─── Fetch connections ──────────────────────────────────────────
  const { data: connections } = await supabase
    .from("social_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_connected", true);

  // Copy profile_image_url from api_credentials to WhatsApp connections that lack one
  if (connections) {
    try {
      const { data: waCred } = await supabase
        .from("api_credentials")
        .select("credentials")
        .eq("platform", "whatsapp")
        .eq("user_id", userId)
        .maybeSingle();
      if (waCred?.credentials?.profile_image_url) {
        const photoUrl = waCred.credentials.profile_image_url;
        const waConns = connections.filter(c => c.platform === "whatsapp" && !c.profile_image_url);
        if (waConns.length > 0) {
          const ids = waConns.map(c => c.id);
          await supabase.from("social_connections").update({ profile_image_url: photoUrl }).in("id", ids);
          console.log(`[WA-SYNC] Copied profile_image_url from api_credentials to ${waConns.length} WhatsApp connections`);
          for (const c of waConns) c.profile_image_url = photoUrl;
        }
      }
    } catch (e) {
      console.error("[WA-SYNC] Failed to copy photo from api_credentials:", e);
    }
  }

  // ─── Add manual/virtual platforms ──────────────────────────────
  const { data: manualCreds } = await supabase
    .from("api_credentials")
    .select("*");

  const processingQueue = [...(connections || [])];
  const manualOnlyPlatforms = ["kwai", "rumble", "gettr", "truthsocial", "spotify", "googlenews"];

  if (manualCreds) {
    for (const cred of manualCreds) {
      if (manualOnlyPlatforms.includes(cred.platform)) {
        const exists = processingQueue.some(c => c.platform === cred.platform && c.user_id === cred.user_id);
        if (!exists) {
          processingQueue.push({
            user_id: cred.user_id,
            platform: cred.platform,
            is_connected: true,
            platform_user_id: cred.credentials?.username || `user_${cred.platform}`,
            page_name: cred.credentials?.username || cred.platform,
            is_virtual: true,
          });
        }
      }
    }
  }

  let filteredQueue = [...processingQueue];
  if (reqPlatform) {
    filteredQueue = filteredQueue.filter(c => c.platform === reqPlatform);
  }

  if (filteredQueue.length === 0) {
    const waConns = (connections || []).filter(c => c.platform === 'whatsapp');
    const waDiag = waConns.map(c => ({
      name: c.page_name,
      page_id: c.page_id,
      platform_user_id: c.platform_user_id,
      phone_number_id: c.phone_number_id,
      has_page_id: !!c.page_id,
    }));
    return json({ success: true, message: "No accounts to collect", diagnostics: { wa: waDiag } });
  }

  // Process sequentially for debugging
  const results = [];
  for (const conn of filteredQueue) {
    try {
      const r = await processPlatform(conn, supabase);
      results.push(r);
    } catch (e) {
      process.stderr.write(`[FATAL] ${conn.platform}/${conn.page_name}: ${e.message}\n`);
      results.push({ platform: conn.platform, status: "error", error: String(e) });
    }
  }

  // Diagnostics after processing
  const { data: finalConns } = await supabase
    .from("social_connections")
    .select("page_name,page_id,platform_user_id,phone_number_id,profile_image_url")
    .eq("user_id", userId)
    .eq("platform", "whatsapp")
    .eq("is_connected", true);

  const waDiag = (finalConns || []).map(c => ({
    name: c.page_name,
    page_id: c.page_id,
    platform_user_id: c.platform_user_id,
    phone_number_id: c.phone_number_id,
    has_page_id: !!c.page_id,
    profile_image_url: c.profile_image_url || null,
  }));

  return json({ success: true, results, diagnostics: { wa: waDiag }, _v: "v5-local" });
}
