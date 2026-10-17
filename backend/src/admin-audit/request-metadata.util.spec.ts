import { extractRequestMetadata } from './request-metadata.util';

interface FakeRequestOptions {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  remoteAddress?: string;
  trustProxy?: unknown;
}

function makeRequest({
  headers = {},
  ip,
  remoteAddress,
  trustProxy = false,
}: FakeRequestOptions): any {
  return {
    headers,
    ip,
    socket: remoteAddress ? { remoteAddress } : undefined,
    app: {
      get: (key: string) => (key === 'trust proxy' ? trustProxy : undefined),
    },
  };
}

describe('extractRequestMetadata', () => {
  it('trusts X-Forwarded-For when the app is behind a trusted proxy', () => {
    const req = makeRequest({
      headers: { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'jest-agent' },
      remoteAddress: '10.0.0.1',
      trustProxy: true,
    });

    expect(extractRequestMetadata(req)).toEqual({
      ip: '203.0.113.7',
      userAgent: 'jest-agent',
    });
  });

  it('takes the first hop from a multi-value X-Forwarded-For header', () => {
    const req = makeRequest({
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.9, 10.0.0.1' },
      remoteAddress: '10.0.0.1',
      trustProxy: 2,
    });

    expect(extractRequestMetadata(req).ip).toBe('203.0.113.7');
  });

  it('ignores a spoofed X-Forwarded-For when no proxy is trusted', () => {
    const req = makeRequest({
      headers: { 'x-forwarded-for': '203.0.113.7' },
      remoteAddress: '10.0.0.1',
      trustProxy: false,
    });

    expect(extractRequestMetadata(req).ip).toBe('10.0.0.1');
  });

  it("prefers Express's resolved req.ip", () => {
    const req = makeRequest({
      headers: { 'x-forwarded-for': '203.0.113.7' },
      ip: '198.51.100.4',
      remoteAddress: '10.0.0.1',
      trustProxy: true,
    });

    expect(extractRequestMetadata(req).ip).toBe('198.51.100.4');
  });

  it('falls back to the socket peer address', () => {
    const req = makeRequest({ remoteAddress: '10.0.0.1' });
    expect(extractRequestMetadata(req).ip).toBe('10.0.0.1');
  });

  it('returns nulls when nothing is available', () => {
    const req = makeRequest({});
    expect(extractRequestMetadata(req)).toEqual({ ip: null, userAgent: null });
  });

  it('handles an array user-agent header', () => {
    const req = makeRequest({
      headers: { 'user-agent': ['first', 'second'] },
      remoteAddress: '10.0.0.1',
    });

    expect(extractRequestMetadata(req).userAgent).toBe('first');
  });
});
