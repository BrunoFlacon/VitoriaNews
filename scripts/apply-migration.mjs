import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodGtka2F1c2Vlc2FtYnpxZnJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1NTAxNCwiZXhwIjoyMDg5NTMxMDE0fQ.tnh0poAxUBJNHvyg-2xPDcyiN__Dl6y_6FX5YDezN3M';

// Attempt to resolve the actual database host via an HTTP check
// Try multiple connection string formats
const formattedPw = encodeURIComponent(serviceRoleKey);
const formats = [
  // Format 1: project-ref as user (pooler transaction mode)
  `postgresql://postgres.ghtkdkauseesambzqfrd:${formattedPw}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  // Format 2: just postgres (pooler transaction mode)
  `postgresql://postgres:${formattedPw}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  // Format 3: project-ref as user (pooler session mode)
  `postgresql://postgres.ghtkdkauseesambzqfrd:${formattedPw}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
  // Format 4: just postgres (pooler session mode)
  `postgresql://postgres:${formattedPw}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
  // Format 5: direct IPv4 connection to pooler
  `postgresql://postgres.ghtkdkauseesambzqfrd:${formattedPw}@54.177.55.191:6543/postgres`,
  // Format 6: direct with sslmode
  `postgresql://postgres.ghtkdkauseesambzqfrd:${serviceRoleKey}@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require`,
  // Format 7: direct database host (sometimes available)
  `postgresql://postgres:${serviceRoleKey}@db.ghtkdkauseesambzqfrd.supabase.co:5432/postgres`,
];

async function tryConnect() {
  for (let i = 0; i < formats.length; i++) {
    const cs = formats[i];
    console.log(`Trying format ${i + 1}: postgresql://postgres...@${cs.split('@')[1]}`);
    const client = new Client({
      connectionString: cs,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      console.log(`✓ Connected with format ${i + 1}!`);
      return client;
    } catch (err) {
      console.log(`  Format ${i + 1} failed: ${err.message}`);
      try { await client.end(); } catch(_) {}
    }
  }
  throw new Error('All connection formats failed');
}

async function main() {
  try {
    const client = await tryConnect();
    console.log('');

    // Read the migration file
    const sqlPath = path.resolve(__dirname, '..', 'supabase', 'migrations', '20260705000003_fix_touch_presence.sql');
    
    console.log('Reading migration from:', sqlPath);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.log('SQL length:', sql.length, 'chars');

    await client.query(sql);
    console.log('✓ Migration applied successfully!');
    console.log('');
    console.log('This fixed:');
    console.log('  1. touch_presence RPC - removed account_id dependency');
    console.log('  2. member_presence RLS policy');
    console.log('  3. PostgREST schema reload notification');

    await client.end();
    console.log('✓ Connection closed');
  } catch (err) {
    console.error('✗ Error:', err.message);
    if (err.code) console.error('  Code:', err.code);
    if (err.position) console.error('  Position:', err.position);
    setTimeout(() => process.exit(1), 100);
  }
}

main();
