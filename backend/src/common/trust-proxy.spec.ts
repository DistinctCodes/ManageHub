import { resolveTrustProxy } from './trust-proxy';

describe('resolveTrustProxy (issue #1955)', () => {
  it('defaults to false when unset or empty', () => {
    expect(resolveTrustProxy({})).toBe(false);
    expect(resolveTrustProxy({ TRUST_PROXY: '' })).toBe(false);
    expect(resolveTrustProxy({ TRUST_PROXY: '   ' })).toBe(false);
  });

  it('parses booleans', () => {
    expect(resolveTrustProxy({ TRUST_PROXY: 'true' })).toBe(true);
    expect(resolveTrustProxy({ TRUST_PROXY: 'TRUE' })).toBe(true);
    expect(resolveTrustProxy({ TRUST_PROXY: 'false' })).toBe(false);
  });

  it('parses hop counts', () => {
    expect(resolveTrustProxy({ TRUST_PROXY: '1' })).toBe(1);
    expect(resolveTrustProxy({ TRUST_PROXY: '3' })).toBe(3);
  });

  it('passes Express address formats through verbatim', () => {
    expect(resolveTrustProxy({ TRUST_PROXY: 'loopback' })).toBe('loopback');
    expect(resolveTrustProxy({ TRUST_PROXY: '10.0.0.0/8' })).toBe('10.0.0.0/8');
  });
});
