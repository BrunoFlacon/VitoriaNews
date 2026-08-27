const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost', port: 5433, database: 'vitoria_news',
  user: 'postgres', password: '123456',
});

async function main() {
  const id = crypto.randomUUID();
  const email = 'admin@webradiovitoria.com.br';
  const hashed = await bcrypt.hash('admin123', 10);
  const now = new Date().toISOString();
  const name = 'Admin';

  const existing = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.log('Usuario ja existe:', existing.rows[0].id);
    await pool.end();
    return;
  }

  await pool.query(
    `INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_sent_at) VALUES ($1, $1, $2, $3, $4, $5, $6, $4, $4, 'authenticated', 'authenticated', $4)`,
    [id, email, hashed, now, JSON.stringify({ provider: 'email' }), JSON.stringify({ name })]
  );

  const profileId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO public.profiles (id, user_id, email, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, 'admin_master', $5, $5) ON CONFLICT (user_id) DO UPDATE SET email = $3, name = $4`,
    [profileId, id, email, name, now]
  );

  console.log('Usuario criado:');
  console.log('  Email:', email);
  console.log('  Senha: admin123');
  console.log('  Role:  admin_master');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
