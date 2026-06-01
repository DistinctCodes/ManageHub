import { RequestLoggerMiddleware } from './request-logger.middleware';

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware;

  beforeEach(() => { middleware = new RequestLoggerMiddleware(); });

  it('redacts Authorization header', () => {
    const req: any = { method: 'GET', originalUrl: '/test', headers: { authorization: 'Bearer secret-token' } };
    const res: any = { on: jest.fn() };
    middleware.use(req, res, jest.fn());
    expect(req.headers['authorization']).toBe('Bearer ***');
  });

  it('does not fail when no Authorization header', () => {
    const req: any = { method: 'GET', originalUrl: '/test', headers: {} };
    const res: any = { on: jest.fn() };
    expect(() => middleware.use(req, res, jest.fn())).not.toThrow();
  });
});