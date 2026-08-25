const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:MDenR8Axakd2IX8Nvg8iq5X2GSSjfcfu@167.234.241.44:5432/postgres' });
async function run() {
  await client.connect();
  const oldStr = 'https://ghtkdkauseesambzqfrd.supabase.co';
  const newStr = 'https://supabase.webradiovitoria.com.br';

  const res = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND data_type IN ('text', 'character varying')
  `);
  
  for (const row of res.rows) {
    const query = `
      UPDATE "${row.table_name}"
      SET "${row.column_name}" = REPLACE("${row.column_name}", $1, $2)
      WHERE "${row.column_name}" LIKE $3
    `;
    try {
      const updateRes = await client.query(query, [oldStr, newStr, `%${oldStr}%`]);
      if (updateRes.rowCount > 0) {
        console.log(`Updated ${updateRes.rowCount} rows in ${row.table_name}.${row.column_name}`);
      }
    } catch(e) {
      // some columns might be generated or read-only
    }
  }

  // Also handle json/jsonb columns
  const jsonRes = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND data_type IN ('json', 'jsonb')
  `);
  
  for (const row of jsonRes.rows) {
    const query = `
      UPDATE "${row.table_name}"
      SET "${row.column_name}" = CAST(REPLACE(CAST("${row.column_name}" AS text), $1, $2) AS jsonb)
      WHERE CAST("${row.column_name}" AS text) LIKE $3
    `;
    try {
      const updateRes = await client.query(query, [oldStr, newStr, `%${oldStr}%`]);
      if (updateRes.rowCount > 0) {
        console.log(`Updated ${updateRes.rowCount} rows in ${row.table_name}.${row.column_name} (JSON)`);
      }
    } catch(e) {
      // ignore
    }
  }

  // Also replace 'http://supabase-kong:8000' with new url just in case
  const oldKong = 'http://supabase-kong:8000';
  for (const row of res.rows) {
    const query = `
      UPDATE "${row.table_name}"
      SET "${row.column_name}" = REPLACE("${row.column_name}", $1, $2)
      WHERE "${row.column_name}" LIKE $3
    `;
    try {
      const updateRes = await client.query(query, [oldKong, newStr, `%${oldKong}%`]);
      if (updateRes.rowCount > 0) {
        console.log(`Updated ${updateRes.rowCount} rows in ${row.table_name}.${row.column_name} (Kong)`);
      }
    } catch(e) {}
  }
  for (const row of jsonRes.rows) {
    const query = `
      UPDATE "${row.table_name}"
      SET "${row.column_name}" = CAST(REPLACE(CAST("${row.column_name}" AS text), $1, $2) AS jsonb)
      WHERE CAST("${row.column_name}" AS text) LIKE $3
    `;
    try {
      const updateRes = await client.query(query, [oldKong, newStr, `%${oldKong}%`]);
      if (updateRes.rowCount > 0) {
        console.log(`Updated ${updateRes.rowCount} rows in ${row.table_name}.${row.column_name} (JSON Kong)`);
      }
    } catch(e) {}
  }

  console.log('Finished updating DB');
  await client.end();
}
run();
