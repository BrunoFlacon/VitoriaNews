import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  host: "localhost", port: 5433, database: "ghtkdkauseesambzqfrd",
  user: "postgres", password: "123456",
});

const r = await pool.query(`
  SELECT platform, COUNT(*)::int as total,
    SUM(CASE WHEN profile_picture LIKE '%ghtkdkauseesambzqfrd.supabase.co%' THEN 1 ELSE 0 END)::int as supabase_urls,
    SUM(CASE WHEN profile_picture LIKE '%/api/storage/%' THEN 1 ELSE 0 END)::int as local_storage_urls,
    SUM(CASE WHEN profile_picture IS NULL OR profile_picture = '' THEN 1 ELSE 0 END)::int as null_empty,
    SUM(CASE WHEN profile_picture NOT LIKE '%supabase%' AND profile_picture NOT LIKE '%/api/storage/%' AND profile_picture IS NOT NULL AND profile_picture != '' THEN 1 ELSE 0 END)::int as direct_urls
  FROM social_accounts
  GROUP BY platform ORDER BY platform
`);
console.table(r.rows);

// Also check social_connections
const r2 = await pool.query(`
  SELECT platform, COUNT(*)::int as total,
    SUM(CASE WHEN profile_image_url LIKE '%supabase%' THEN 1 ELSE 0 END)::int as supabase_urls
  FROM social_connections
  GROUP BY platform ORDER BY platform
`);
console.table(r2.rows);

await pool.end();
