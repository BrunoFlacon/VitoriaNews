const fs = require('fs');

const envConfig = Object.fromEntries(
  fs.readFileSync('.env', 'utf-8').split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...val] = line.split('=');
      return [key.trim(), val.join('=').trim().replace(/^"|"$/g, '').replace(/\r/g, '')];
    })
);

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const anonKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY;

async function run() {
  const res = await fetch(`${supabaseUrl}/functions/v1/debug-audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({})
  });
  const data = await res.json();
  
  console.log("=== CONNECTIONS ===");
  for (const c of data.connections || []) {
    console.log(`[${c.platform}] ${c.page_name} (puid=${c.platform_user_id})`);
    console.log(`  profile_image_url: storage=${c.profile_image_url_is_storage} cdn=${c.profile_image_url_is_cdn}`);
    console.log(`  profile_picture: storage=${c.profile_picture_is_storage} cdn=${c.profile_picture_is_cdn}`);
    if (c.profile_image_url) console.log(`  img_url: ${c.profile_image_url.substring(0,100)}`);
    if (c.profile_picture) console.log(`  pic_url: ${c.profile_picture.substring(0,100)}`);
    console.log('');
  }
  
  console.log("\n=== YOUTUBE ALL ===");
  for (const y of data.youtube_all || []) {
    console.log(`[youtube] ${y.page_name} puid=${y.platform_user_id} connected=${y.is_connected} img=${(y.profile_image_url||'NULL').substring(0,100)}`);
  }
  
  console.log("\n=== SOCIAL_ACCOUNTS (IG+YT) ===");
  for (const a of data.social_accounts_ig_yt || []) {
    console.log(`[${a.platform}] ${a.username || a.page_name} puid=${a.platform_user_id} pic=${(a.profile_picture||'NULL').substring(0,100)}`);
  }
}

run();
