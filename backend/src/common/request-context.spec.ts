import {
  currentRequestId,
  currentRequestMetadata,
  outboundRequestHeaders,
  runWithRequestContext,
  withRequestId,
} from './request-context';

describe('request context', () => {
  it('returns both accepted correlation header names inside a request', () => {
    const headers = runWithRequestContext(
      { requestId: 'request-123' },
      () => outboundRequestHeaders(),
    );

    expect(headers).toEqual({
      'x-request-id': 'request-123',
      'x-correlation-id': 'request-123',
    });
  });

  it('returns no headers outside a request context', () => {
    expect(currentRequestId()).toBeUndefined();
    expect(outboundRequestHeaders()).toEqual({});
  });

  it('does not emit a placeholder for an empty request id', () => {
    const headers = runWithRequestContext(
      { requestId: '' },
      () => outboundRequestHeaders(),
    );

    expect(headers).toEqual({});
  });

  it('exposes the captured request metadata inside a request', () => {
    const metadata = runWithRequestContext(
      { requestId: 'request-789', ip: '203.0.113.7', userAgent: 'jest' },
      () => currentRequestMetadata(),
    );

    expect(metadata).toEqual({ ip: '203.0.113.7', userAgent: 'jest' });
  });

  it('returns null metadata outside a request context', () => {
    expect(currentRequestMetadata()).toEqual({ ip: null, userAgent: null });
  });

  it('keeps the request id available to log formatting', () => {
    const message = runWithRequestContext(
      { requestId: 'request-456' },
      () => withRequestId('doing work'),
    );

    expect(message).toBe('[request:request-456] doing work');
  });
});
