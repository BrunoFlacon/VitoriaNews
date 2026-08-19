const fs = require('fs');

const envConfig = Object.fromEntries(
  fs.readFileSync('.env', 'utf-8').split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...val] = line.split('=');
      return [key.trim(), val.join('=').trim().replace(/^"|"$/g, '')];
    })
);
const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function testSync() {
  console.log("Triggering sync-social-data...");
  const res = await fetch(`${supabaseUrl}/functions/v1/sync-social-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey
    },
    body: JSON.stringify({})
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

testSync();
