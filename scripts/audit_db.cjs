
const https = require('https');

const URL_HOST = 'ghtkdkauseesambzqfrd.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodGtka2F1c2Vlc2FtYnpxZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTUwMTQsImV4cCI6MjA4OTUzMTAxNH0.X1OeIwLezATvztpzJzDJWMSUgukNXIWNQp2L1rHkLGs';

function request(path, method = 'GET', extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: URL_HOST,
      path: path,
      method: method,
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        ...extraHeaders
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function audit() {
  console.log('--- Auditing Telegram social_accounts ---');
  const resAcc = await request('/rest/v1/social_accounts?select=id,platform,platform_user_id,username,followers,is_connected&limit=15');
  console.log('Accounts:', JSON.stringify(resAcc.data, null, 2));

  console.log('\n--- Auditing account_metrics ---');
  const resMet = await request('/rest/v1/account_metrics?select=id,platform,social_account_id,followers,collected_at&order=collected_at.desc&limit=100');
  console.log('Recent Metrics:', JSON.stringify(resMet.data, null, 2));
}

audit().catch(console.error);

