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

async function testMediaQuery() {
  console.log("=== TESTING MEDIA TABLE QUERY ===");
  const testUrl = `${supabaseUrl}/rest/v1/media?select=id,file_url,file_name,file_type&user_id=eq.38cd9720-494e-406a-853d-19d81ae85e99&order=created_at.desc&limit=20`;
  
  const res = await fetch(testUrl, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  console.log("Status:", res.status, res.statusText);
  const data = await res.json();
  console.log("Response Body:", JSON.stringify(data, null, 2));
}

testMediaQuery();
