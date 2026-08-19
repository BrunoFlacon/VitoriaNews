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
  console.log("=== TESTING EDGE FUNCTIONS FOR COVER STUDIO ===");

  // 1. Test process-cover-image
  const sampleBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const procRes = await fetch(`${supabaseUrl}/functions/v1/process-cover-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({
      projectId: "test_verification_001",
      title: "Capa de Teste Verificação",
      mediaType: "video",
      aspectRatio: "16:9",
      base64Image: sampleBase64
    })
  });
  const procData = await procRes.json();
  console.log("process-cover-image result:", JSON.stringify(procData, null, 2));

  // 2. Test track-cover-click
  const trackRes = await fetch(`${supabaseUrl}/functions/v1/track-cover-click`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({
      coverId: "test_verification_001",
      platform: "youtube",
      type: "click"
    })
  });
  const trackData = await trackRes.json();
  console.log("track-cover-click result:", JSON.stringify(trackData, null, 2));
}

run();
