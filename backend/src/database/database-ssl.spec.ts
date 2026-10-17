import {
  buildDatabaseSslOptions,
  resolveDatabaseSslMode,
} from './database-ssl';

describe('database TLS options (issue #1956)', () => {
  describe('resolveDatabaseSslMode', () => {
    it('defaults to disable outside production when unset', () => {
      expect(resolveDatabaseSslMode({})).toBe('disable');
      expect(resolveDatabaseSslMode({ NODE_ENV: 'development' })).toBe(
        'disable',
      );
      expect(resolveDatabaseSslMode({ NODE_ENV: 'test' })).toBe('disable');
    });

    it('defaults to require in production when unset', () => {
      expect(resolveDatabaseSslMode({ NODE_ENV: 'production' })).toBe(
        'require',
      );
    });

    it('honours an explicit DATABASE_SSL value in any environment', () => {
      expect(
        resolveDatabaseSslMode({
          NODE_ENV: 'production',
          DATABASE_SSL: 'disable',
        }),
      ).toBe('disable');
      expect(
        resolveDatabaseSslMode({
          NODE_ENV: 'test',
          DATABASE_SSL: 'verify-full',
        }),
      ).toBe('verify-full');
    });

    it('is case-insensitive and trims whitespace', () => {
      expect(resolveDatabaseSslMode({ DATABASE_SSL: '  Require \n' })).toBe(
        'require',
      );
    });

    it('treats an empty value as unset', () => {
      expect(resolveDatabaseSslMode({ DATABASE_SSL: '   ' })).toBe('disable');
    });

    it('rejects unknown modes with an actionable error', () => {
      expect(() =>
        resolveDatabaseSslMode({ DATABASE_SSL: 'verify-ca' }),
      ).toThrow(/Invalid DATABASE_SSL value "verify-ca"/);
    });
  });

  describe('buildDatabaseSslOptions', () => {
    it('disables TLS entirely in disable mode', () => {
      expect(buildDatabaseSslOptions({ DATABASE_SSL: 'disable' })).toBe(false);
    });

    it('requires TLS without server verification by default in require mode', () => {
      expect(buildDatabaseSslOptions({ DATABASE_SSL: 'require' })).toEqual({
        rejectUnauthorized: false,
      });
    });

    it('verifies against the supplied CA in require mode', () => {
      const ca = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----';
      expect(
        buildDatabaseSslOptions({
          DATABASE_SSL: 'require',
          DATABASE_SSL_CA: ca,
        }),
      ).toEqual({ rejectUnauthorized: true, ca });
    });

    it('verifies the full chain in verify-full mode', () => {
      expect(buildDatabaseSslOptions({ NODE_ENV: 'production' })).toEqual({
        rejectUnauthorized: false,
      });
      expect(
        buildDatabaseSslOptions({
          DATABASE_SSL: 'verify-full',
        }),
      ).toEqual({ rejectUnauthorized: true });
    });

    it('attaches the CA in verify-full mode', () => {
      const ca = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----';
      expect(
        buildDatabaseSslOptions({
          DATABASE_SSL: 'verify-full',
          DATABASE_SSL_CA: ca,
        }),
      ).toEqual({ rejectUnauthorized: true, ca });
    });

    it('fails fast when DATABASE_SSL_CA is not a PEM document', () => {
      expect(() =>
        buildDatabaseSslOptions({
          DATABASE_SSL: 'verify-full',
          DATABASE_SSL_CA: '/etc/ssl/rds-ca.pem',
        }),
      ).toThrow(/DATABASE_SSL_CA does not look like a PEM certificate/);
    });
  });
});
