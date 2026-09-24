import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { HttpLoggingInterceptor } from './http-logging.interceptor';
import { runWithRequestContext } from './request-context';

function makeContext(
  request: Record<string, any>,
  response: Record<string, any>,
) {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('HttpLoggingInterceptor', () => {
  let interceptor: HttpLoggingInterceptor;
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new HttpLoggingInterceptor();
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(
    'emits one structured line with route template, status, duration, and request id',
    async () => {
      const request = {
        method: 'GET',
        url: '/payments/payment-123?access_token=query-secret',
        baseUrl: '',
        route: { path: '/payments/:id' },
        headers: {
          authorization: 'Bearer header-secret',
          cookie: 'accessToken=cookie-secret',
        },
        query: { access_token: 'query-secret' },
        body: { note: 'body-secret' },
      };
      const response = {
        statusCode: 200,
        body: { note: 'response-body-secret' },
      };
      const context = makeContext(request, response);
      const next: CallHandler = {
        handle: jest.fn(() => of({ ok: true }, { ok: false })),
      };

      await runWithRequestContext({ requestId: 'request-123' }, () =>
        lastValueFrom(interceptor.intercept(context, next)),
      );

      expect(log).toHaveBeenCalledTimes(1);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      const line = String(log.mock.calls[0][0]);
      expect(line).toContain('method=GET');
      expect(line).toContain('route=/payments/:id');
      expect(line).toContain('statusCode=200');
      expect(line).toContain('durationMs=');
      expect(line).toContain('requestId=request-123');
      expect(line).not.toContain('payment-123');
      expect(line).not.toContain('query-secret');
      expect(line).not.toContain('header-secret');
      expect(line).not.toContain('cookie-secret');
      expect(line).not.toContain('body-secret');
      expect(line).not.toContain('response-body-secret');
    },
  );

  it(
    'uses warn for 4xx and error for 5xx while still emitting one line',
    async () => {
      const badRequestContext = makeContext(
        {
          method: 'POST',
          baseUrl: '',
          route: { path: '/payments' },
        },
        { statusCode: 200 },
      );
      const badRequestNext: CallHandler = {
        handle: jest.fn(() =>
          throwError(() => new BadRequestException()),
        ),
      };

      await expect(
        lastValueFrom(interceptor.intercept(badRequestContext, badRequestNext)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('statusCode=400');
      expect(log).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();

      warn.mockClear();
      log.mockClear();

      const serverErrorContext = makeContext(
        {
          method: 'GET',
          baseUrl: '',
          route: { path: '/health' },
        },
        { statusCode: 200 },
      );
      const serverErrorNext: CallHandler = {
        handle: jest.fn(() =>
          throwError(() => new InternalServerErrorException()),
        ),
      };

      await expect(
        lastValueFrom(interceptor.intercept(serverErrorContext, serverErrorNext)),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0][0]).toContain('statusCode=500');
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    },
  );
});
