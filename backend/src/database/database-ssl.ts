// Shared TLS options for every Postgres connection the backend opens —
// the TypeORM app configuration in src/app.module.ts and the migration/CLI
// DataSource in src/database/data-source.ts (issue #1956). Most managed
// Postgres services (RDS, Azure, Heroku, Neon, ...) require TLS; connecting
// without it sends credentials and ledger data in cleartext.
export type DatabaseSslMode = 'disable' | 'require' | 'verify-full';

export interface DatabaseSslEnv {
  NODE_ENV?: string;
  DATABASE_SSL?: string;
  DATABASE_SSL_CA?: string;
}

export interface DatabaseSslOptions {
  rejectUnauthorized: boolean;
  ca?: string;
}

/**
 * Resolves the effective TLS mode:
 * - DATABASE_SSL wins when set (disable | require | verify-full);
 * - unset, production defaults to `require` (encrypt the connection);
 * - unset outside production defaults to `disable` (plain local dev).
 */
export function resolveDatabaseSslMode(env: DatabaseSslEnv): DatabaseSslMode {
  const raw = env.DATABASE_SSL?.trim();
  if (!raw) {
    return env.NODE_ENV === 'production' ? 'require' : 'disable';
  }
  const normalized = raw.toLowerCase();
  if (
    normalized !== 'disable' &&
    normalized !== 'require' &&
    normalized !== 'verify-full'
  ) {
    throw new Error(
      `Invalid DATABASE_SSL value "${raw}". Expected one of: ` +
        'disable, require, verify-full.',
    );
  }
  return normalized;
}

/**
 * Builds the `ssl` block for node-postgres (shared by the app and the
 * migration CLI) so a misconfigured CA fails fast at boot / CLI start with a
 * clear error instead of surfacing as a cryptic TLS handshake failure (or —
 * worse — a silently unverified connection) at query time.
 *
 * - disable:     no TLS.
 * - require:     TLS, server certificate not verified unless DATABASE_SSL_CA
 *                is supplied (then it is verified against that CA).
 * - verify-full: TLS with full certificate verification, against
 *                DATABASE_SSL_CA when set or the system trust store otherwise.
 */
export function buildDatabaseSslOptions(
  env: DatabaseSslEnv,
): false | DatabaseSslOptions {
  const mode = resolveDatabaseSslMode(env);
  if (mode === 'disable') {
    return false;
  }

  const ca = env.DATABASE_SSL_CA?.trim();
  if (ca && (!ca.includes('-----BEGIN') || !ca.includes('-----END'))) {
    throw new Error(
      'DATABASE_SSL_CA does not look like a PEM certificate: expected ' +
        '"-----BEGIN ...-----" / "-----END ...-----" markers. Provide the ' +
        'PEM contents itself (not a file path).',
    );
  }

  if (mode === 'require') {
    return ca
      ? { rejectUnauthorized: true, ca }
      : { rejectUnauthorized: false };
  }

  // verify-full
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}
