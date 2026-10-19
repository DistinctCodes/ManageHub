/* Seeds a deterministic, CI-only admin login after migrations have run. */
const { hash } = require('bcrypt');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USERNAME ?? 'managehub',
    password: process.env.DATABASE_PASSWORD ?? 'managehub',
    database: process.env.DATABASE_NAME ?? 'managehub',
  });

  const email = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@example.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'ManageHub-e2e-Admin-2026';
  const passwordHash = await hash(password, 10);

  await client.connect();
  try {
    await client.query(
      `INSERT INTO users (email, password_hash, role, token_version)
       VALUES ($1, $2, 'admin', 0)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         token_version = 0`,
      [email, passwordHash],
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
