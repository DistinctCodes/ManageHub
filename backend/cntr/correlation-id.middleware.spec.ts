import { CorrelationIdMiddleware } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  beforeEach(() => { middleware = new CorrelationIdMiddleware(); });

  it('generates a correlation ID when none present', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    middleware.use(req, res, jest.fn());
    expect(req.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', req.headers['x-correlation-id']);
  });

  it('preserves existing correlation ID', () => {
    const req: any = { headers: { 'x-correlation-id': 'existing-id' } };
    const res: any = { setHeader: jest.fn() };
    middleware.use(req, res, jest.fn());
    expect(req.headers['x-correlation-id']).toBe('existing-id');
  });
});