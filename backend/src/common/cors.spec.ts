import {
  DEFAULT_CORS_METHODS,
  DEVELOPMENT_AND_TEST_CORS_ORIGINS,
  isOriginAllowed,
  parseAllowedOrigins,
  resolveAllowedMethods,
  resolveAllowedOrigins,
} from './cors';

describe('CORS origin helpers', () => {
  it('parses comma-separated origins while trimming and dropping empty entries', () => {
    expect(
      parseAllowedOrigins(
        ' https://app.example.com, ,https://admin.example.com, ',
      ),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('uses the documented local origins for development and test defaults', () => {
    expect(resolveAllowedOrigins({ NODE_ENV: 'development' })).toEqual([
      ...DEVELOPMENT_AND_TEST_CORS_ORIGINS,
    ]);
    expect(resolveAllowedOrigins({ NODE_ENV: 'test' })).toEqual([
      ...DEVELOPMENT_AND_TEST_CORS_ORIGINS,
    ]);
  });

  it('resolves to an empty allowlist in production when configuration is empty', () => {
    expect(resolveAllowedOrigins({ NODE_ENV: 'production' })).toEqual([]);
    expect(
      resolveAllowedOrigins({
        NODE_ENV: 'production',
        CORS_ORIGINS: ' , ',
      }),
    ).toEqual([]);
  });

  it('prefers configured origins over environment defaults', () => {
    expect(
      resolveAllowedOrigins({
        NODE_ENV: 'development',
        CORS_ORIGINS: 'https://app.example.com',
      }),
    ).toEqual(['https://app.example.com']);
  });

  it('allows originless requests but only exact allowlisted origins', () => {
    const allowed = ['https://app.example.com'];

    expect(isOriginAllowed(undefined, allowed)).toBe(true);
    expect(isOriginAllowed('https://app.example.com', allowed)).toBe(true);
    expect(isOriginAllowed('https://app.example.com.evil.test', allowed)).toBe(
      false,
    );
    expect(isOriginAllowed('https://other.example.com', allowed)).toBe(false);
  });

  it('includes DELETE and HEAD in the default allowed CORS methods and honours CORS_METHODS (#2201)', () => {
    const defaults = resolveAllowedMethods({});
    expect(defaults).toEqual([...DEFAULT_CORS_METHODS]);
    expect(defaults).toContain('DELETE');
    expect(defaults).toContain('HEAD');

    expect(
      resolveAllowedMethods({ CORS_METHODS: ' get, delete , head , options ' }),
    ).toEqual(['GET', 'DELETE', 'HEAD', 'OPTIONS']);
  });
});
