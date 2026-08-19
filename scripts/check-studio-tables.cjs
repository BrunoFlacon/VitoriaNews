const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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
  console.log("=== CREATING COVER STUDIO TABLES IN DB ===");
  // Test connection to cover_projects
  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.from('cover_projects').select('id').limit(1);
  if (error) {
    console.log("Table cover_projects status:", error.message);
  } else {
    console.log("Table cover_projects already exists! Records:", data?.length);
  }
}

run();
