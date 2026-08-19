const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envConfig = Object.fromEntries(
  fs.readFileSync('.env', 'utf-8').split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...val] = line.split('=');
      return [key.trim(), val.join('=').trim().replace(/^"|"$|\r/g, '')];
    })
);

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Check Instagram connections
  const { data: igConns } = await supabase
    .from('social_connections')
    .select('id, platform, page_name, profile_image_url, profile_picture, platform_user_id, is_connected')
    .in('platform', ['instagram', 'youtube', 'whatsapp', 'facebook'])
    .eq('is_connected', true);

  console.log("=== Connected accounts ===");
  for (const c of igConns || []) {
    const url = c.profile_image_url || 'NULL';
    const isSupabaseStorage = url.includes('supabase.co/storage/');
    const isCDN = url.includes('fbcdn.net') || url.includes('cdninstagram.com') || url.includes('scontent');
    console.log(`[${c.platform}] ${c.page_name} | puid=${c.platform_user_id}`);
    console.log(`  profile_image_url: ${url.substring(0, 120)}...`);
    console.log(`  isSupabaseStorage=${isSupabaseStorage} isCDN=${isCDN}`);
    console.log(`  profile_picture: ${(c.profile_picture || 'NULL').substring(0, 120)}...`);
    console.log('');
  }

  // Check YouTube
  const { data: ytConns } = await supabase
    .from('social_connections')
    .select('id, platform, page_name, profile_image_url, platform_user_id, is_connected')
    .eq('platform', 'youtube');

  console.log("=== YouTube connections (all) ===");
  for (const c of ytConns || []) {
    console.log(`[youtube] ${c.page_name} | puid=${c.platform_user_id} | connected=${c.is_connected} | img=${(c.profile_image_url || 'NULL').substring(0, 100)}`);
  }
}

run();
