import {
  DEVELOPMENT_AND_TEST_CORS_ORIGINS,
  isOriginAllowed,
  parseAllowedOrigins,
  resolveAllowedOrigins,
} from './cors';

describe('CORS origin helpers', () => {
  it('parses comma-separated origins while trimming and dropping empty entries', () => {
    expect(
      parseAllowedOrigins(
        ' https://app.example.com, ,https://admin.example.com, ',
      ),
    ).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
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
});
