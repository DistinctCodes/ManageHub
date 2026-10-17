/**
 * Environment defaults for the backend e2e suite (issue #1953). Loaded two
 * ways — as a Jest `setupFiles` entry (every worker, before the test files
 * import AppModule) and by `global-setup.ts` before it runs migrations.
 *
 * Existing variables always win, so CI can point the suite at its Postgres
 * service simply by setting DATABASE_* at the job level; locally the defaults
 * target the dockerized `mh-postgres` / `mh-redis` from the project docs.
 */
function applyDefault(name: string, value: string): void {
  if (!process.env[name]) {
    process.env[name] = value;
  }
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

applyDefault('DATABASE_HOST', 'localhost');
applyDefault('DATABASE_PORT', '5432');
applyDefault('DATABASE_USERNAME', 'managehub');
applyDefault('DATABASE_PASSWORD', 'managehub');
// Dedicated e2e database so the suite never touches a developer's `managehub`
// (or any other) schema. Create it once with:
//   docker exec mh-postgres createdb -U managehub managehub_e2e
applyDefault('DATABASE_NAME', 'managehub_e2e');

applyDefault('REDIS_HOST', 'localhost');
applyDefault('REDIS_PORT', '6379');
applyDefault('REDIS_DB', '0');

// Auth/JWT and webhook signing secrets are required for the app to boot and
// to sign payloads in the tests; use obvious test-only values.
applyDefault('JWT_SECRET', 'e2e-jwt-secret');
applyDefault('PAYMENT_WEBHOOK_SECRET', 'e2e-payment-webhook-secret');
