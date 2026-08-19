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
  console.log("=== CALLING FIX-WHATSAPP-PHOTOS / DEBUG ===");
  // Let's call debug-audit to see whatsapp conns
  const res = await fetch(`${supabaseUrl}/functions/v1/debug-audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({})
  });
  const data = await res.json();
  console.log("ALL CONNECTIONS:");
  for (const c of data.connections || []) {
    if (c.platform === 'whatsapp') {
      console.log(JSON.stringify(c, null, 2));
    }
  }
}

run();
