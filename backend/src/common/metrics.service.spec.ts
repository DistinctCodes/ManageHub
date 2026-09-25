import { MetricsService } from './metrics.service';

describe('MetricsService — per-endpoint latency histogram (issue #1780)', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('renders a histogram type line, buckets, sum and count keyed by route', () => {
    service.recordHttpRequestDuration('/wallets/:id', 'GET', 200, 42);
    service.recordHttpRequestDuration('/wallets/:id', 'GET', 200, 9);

    const output = service.renderPrometheus();

    expect(output).toContain(
      '# TYPE managehub_http_request_duration_seconds histogram',
    );
    expect(output).toContain(
      'managehub_http_request_duration_seconds_count{route="/wallets/:id",method="GET",status_code="200"} 2',
    );
    // 42ms observation falls in the 0.05s bucket and above, not below.
    expect(output).toContain(
      'managehub_http_request_duration_seconds_bucket{route="/wallets/:id",method="GET",status_code="200",le="0.025"} 1',
    );
    expect(output).toContain(
      'managehub_http_request_duration_seconds_bucket{route="/wallets/:id",method="GET",status_code="200",le="0.05"} 2',
    );
    expect(output).toContain(
      'managehub_http_request_duration_seconds_bucket{route="/wallets/:id",method="GET",status_code="200",le="+Inf"} 2',
    );
  });

  it('keeps separate series for different routes', () => {
    service.recordHttpRequestDuration('/wallets/:id', 'GET', 200, 10);
    service.recordHttpRequestDuration('/payments', 'POST', 201, 500);

    const output = service.renderPrometheus();

    expect(output).toContain(
      'managehub_http_request_duration_seconds_count{route="/wallets/:id",method="GET",status_code="200"} 1',
    );
    expect(output).toContain(
      'managehub_http_request_duration_seconds_count{route="/payments",method="POST",status_code="201"} 1',
    );
  });
});
