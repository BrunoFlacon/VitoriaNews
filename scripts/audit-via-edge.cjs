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
const anonKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY;

async function run() {
  // Call debug-ig to check instagram data
  console.log("=== Checking Instagram via debug-ig ===");
  const igRes = await fetch(`${supabaseUrl}/functions/v1/debug-ig`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({})
  });
  const igData = await igRes.json();
  
  for (const r of igData.results || []) {
    const url = r.finalUrl || 'NULL';
    const isSupaStorage = url.includes('supabase.co/storage/');
    console.log(`[IG] ${r.name} | finalUrl storage=${isSupaStorage} | uploadResult=${r.uploadResult?.substring(0,60) || 'N/A'}`);
    if (r.error) console.log(`  ERROR: ${r.error}`);
  }
}

run();
