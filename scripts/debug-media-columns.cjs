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

async function debugMediaColumns() {
  console.log("=== TESTING MEDIA TABLE SELECT * ===");
  const testUrl = `${supabaseUrl}/rest/v1/media?select=*&limit=1`;
  
  const res = await fetch(testUrl, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  console.log("Status:", res.status, res.statusText);
  const data = await res.json();
  console.log("Response Body Keys:", data.length > 0 ? Object.keys(data[0]) : data);
}

debugMediaColumns();
