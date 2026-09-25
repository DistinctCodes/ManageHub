import { of, throwError } from 'rxjs';
import { RequestDurationInterceptor } from './request-duration.interceptor';
import { MetricsService } from './metrics.service';

describe('RequestDurationInterceptor (issue #1780)', () => {
  function buildContext(overrides: Partial<Record<string, unknown>> = {}) {
    const request = {
      method: 'GET',
      url: '/wallets/abc-123',
      path: '/wallets/abc-123',
      route: { path: '/wallets/:id' },
      baseUrl: '',
      ...overrides,
    };
    const response = { statusCode: 200 };
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as any;
  }

  it('records the route pattern (not the raw URL) on success', (done) => {
    const recordHttpRequestDuration = jest.fn();
    const metrics = { recordHttpRequestDuration } as unknown as MetricsService;
    const interceptor = new RequestDurationInterceptor(metrics);
    const context = buildContext();

    interceptor.intercept(context, { handle: () => of('ok') }).subscribe(() => {
      expect(recordHttpRequestDuration).toHaveBeenCalledTimes(1);
      const [route, method, statusCode, durationMs] =
        recordHttpRequestDuration.mock.calls[0];
      expect(route).toBe('/wallets/:id');
      expect(method).toBe('GET');
      expect(statusCode).toBe(200);
      expect(typeof durationMs).toBe('number');
      done();
    });
  });

  it('still records duration when the handler throws', (done) => {
    const recordHttpRequestDuration = jest.fn();
    const metrics = { recordHttpRequestDuration } as unknown as MetricsService;
    const interceptor = new RequestDurationInterceptor(metrics);
    const context = buildContext({ route: undefined });

    interceptor
      .intercept(context, { handle: () => throwError(() => new Error('boom')) })
      .subscribe({
        error: () => {
          expect(recordHttpRequestDuration).toHaveBeenCalledTimes(1);
          const [route] = recordHttpRequestDuration.mock.calls[0];
          // Falls back to the raw path when no route pattern was matched.
          expect(route).toBe('/wallets/abc-123');
          done();
        },
      });
  });

  it('skips non-HTTP contexts (e.g. RPC/WS) without recording', () => {
    const recordHttpRequestDuration = jest.fn();
    const metrics = { recordHttpRequestDuration } as unknown as MetricsService;
    const interceptor = new RequestDurationInterceptor(metrics);
    const context = { getType: () => 'rpc' } as any;

    interceptor.intercept(context, { handle: () => of('ok') });

    expect(recordHttpRequestDuration).not.toHaveBeenCalled();
  });
});
