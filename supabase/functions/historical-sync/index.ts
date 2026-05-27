import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const _corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: _corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Pega a conta ativa que ainda tem histórico pra puxar (is_completed = false)
    let { data: states, error: stateErr } = await supabase
      .from('historical_sync_state')
      .select('*, social_accounts(user_id, platform_user_id, api_credentials(*))')
      .eq('is_completed', false)
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(1);

    // MODO DE MANUTENÇÃO (Ongoing Sync): Se o passado inteiro já foi puxado!
    let ongoingMode = false;
    if (stateErr || !states || states.length === 0) {
      // Pega contas que já estão 100% completas mas que não foram checadas nas últimas 1 hora
      const { data: ongoingStates } = await supabase
        .from('historical_sync_state')
        .select('*, social_accounts(user_id, platform_user_id, api_credentials(*))')
        .eq('is_completed', true)
        .lt('last_synced_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('last_synced_at', { ascending: true })
        .limit(1);

      if (!ongoingStates || ongoingStates.length === 0) {
        return new Response(JSON.stringify({ status: 'idle', message: 'Nada pendente e todas as atualizações recentes já feitas.' }), { headers: _corsHeaders });
      }
      states = ongoingStates;
      ongoingMode = true; // Se ativou o modo continuo, nós só rodaremos 1 PÁGINA (a página atual) sem paginação velha!
    }

    const state = states[0];
    const account = Array.isArray(state.social_accounts) ? state.social_accounts[0] : state.social_accounts; 
    const creds = account.api_credentials?.[0];
    
    if (!creds) {
      return new Response(JSON.stringify({ status: 'skipped' }), { headers: _corsHeaders });
    }

    const platform = state.platform.toLowerCase();
    // Se estiver em Ongoing Mode, queremos puxar a Home fresca (cursor null). Se não, puxamos o cursor antigo salvo.
    let nextCursor = ongoingMode ? null : state.next_cursor;
    let isCompleted = ongoingMode ? true : false;
    let allNewPosts: any[] = [];
    
    // VAI RODAR UM LAÇO MODERADO (MÁXIMO 3 PÁGINAS POR CICLO NO MODO HISTÓRICO)
    // No modo "Ongoing" rola apenas 1 página (a home principal com os posts mais novos).
    let pagesProcessed = 0;
    const MAX_PAGES = ongoingMode ? 1 : 3;

    // Função de delay para escalonar as chamadas e não bater nas portas da API tudo num milisegundo
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (pagesProcessed < MAX_PAGES && !isCompleted) {
       let pagePosts = [];
       pagesProcessed++;

       if (pagesProcessed > 1) {
           await delay(1500); // 1.5 segundos de respiro entre páginas para escalonamento
       }

       if (platform === 'youtube') {
           const accessToken = creds.access_token;
           let playlistId = state.metadata?.uploads_playlist_id || account.platform_user_id.replace(/^UC/, 'UU');

           // Limite 50 é o MÁXIMO da API do Youtube por página. O "While" cuida de puxar várias páginas até o fim.
           const ytUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&maxResults=50&playlistId=${playlistId}${nextCursor ? `&pageToken=${nextCursor}` : ''}`;
           const res = await fetch(ytUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
           const data = await res.json();

           if (data.error) throw new Error(data.error.message);

           const videoIds = data.items?.map((item: any) => item.contentDetails.videoId).join(',');
           
           if (videoIds) {
             const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}`;
             const statRes = await fetch(statsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
             const statData = await statRes.json();
             
             (statData.items || []).forEach((vid: any) => {
                const orig = data.items.find((i:any) => i.contentDetails.videoId === vid.id);
                pagePosts.push({
                   user_id: account.user_id,
                   social_account_id: state.social_account_id,
                   post_id: vid.id,
                   platform: 'youtube',
                   post_type: 'video',
                   post_url: `https://youtube.com/watch?v=${vid.id}`,
                   published_at: orig?.snippet?.publishedAt,
                   views: Number(vid.statistics.viewCount || 0),
                   likes: Number(vid.statistics.likeCount || 0),
                   comments: Number(vid.statistics.commentCount || 0)
                });
             });
           }
           nextCursor = data.nextPageToken || null;
           if (!nextCursor) isCompleted = true;
       } 
       
       else if (platform === 'facebook' || platform === 'instagram') {
           // Meta Graph API Pagination LIMIT=100
           const accessToken = creds.access_token;
           const edge = platform === 'facebook' ? 'published_posts' : 'media';
           const fields = platform === 'facebook' ? 'id,created_time,shares,comments.summary(true),likes.summary(true),views' : 'id,timestamp,media_url,like_count,comments_count,media_type';
           const url = `https://graph.facebook.com/v19.0/${account.platform_user_id}/${edge}?fields=${fields}&limit=100${nextCursor ? `&after=${nextCursor}` : ''}&access_token=${accessToken}`;
           
           const res = await fetch(url);
           const data = await res.json();
           
           if (data.error) throw new Error(data.error.message);

           (data.data || []).forEach((item: any) => {
              pagePosts.push({
                  user_id: account.user_id,
                  social_account_id: state.social_account_id,
                  post_id: item.id,
                  platform: platform,
                  post_type: item.media_type || 'post',
                  published_at: item.created_time || item.timestamp,
                  likes: platform === 'facebook' ? (item.likes?.summary?.total_count || 0) : (item.like_count || 0),
                  comments: platform === 'facebook' ? (item.comments?.summary?.total_count || 0) : (item.comments_count || 0),
                  shares: item.shares?.count || 0
              });
           });

           nextCursor = data.paging?.cursors?.after || null;
           if (!nextCursor || data.data.length === 0) isCompleted = true;
       }
       else {
           isCompleted = true; // Placeholder para Twitter/Linkedin futuramente
       }

       allNewPosts = [...allNewPosts, ...pagePosts];
       
       if (isCompleted) break; // Sai do laço se não houver mais páginas antigas do ano de criação
    }

    // Salva a porrada de posts de uma só vez
    if (allNewPosts.length > 0) {
      const { error: insErr } = await supabase.from('post_metrics').upsert(allNewPosts, { onConflict: 'social_account_id,post_id' });
      if (insErr) console.error("Database upsert error:", insErr);
    }

    // Grava onde parou, para o próximo ciclo de 5min puxar mais 1000 posts (se faltar algum)
    await supabase.from('historical_sync_state').update({
       next_cursor: nextCursor,
       is_completed: isCompleted,
       last_synced_at: new Date().toISOString()
    }).eq('id', state.id);

    return new Response(JSON.stringify({ status: 'success', total_posts_archived: allNewPosts.length }), { headers: _corsHeaders })
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: _corsHeaders })
  }
})
