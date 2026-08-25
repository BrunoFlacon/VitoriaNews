const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:MDenR8Axakd2IX8Nvg8iq5X2GSSjfcfu@167.234.241.44:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  const fs = require('fs');
  fs.writeFileSync('tables.json', JSON.stringify(res.rows.map(r => r.table_name), null, 2));
  await client.end();
}
run();
