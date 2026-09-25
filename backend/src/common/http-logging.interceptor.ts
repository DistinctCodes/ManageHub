import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { currentRequestId } from './request-context';

/**
 * Emits one low-cardinality access-log line for each completed HTTP request.
 *
 * The route is taken from the matched Express route template whenever one
 * is available (`/payments/:id`), rather than from the raw URL. This keeps
 * identifiers and query strings out of logs and prevents one request per
 * resource id from creating a new log-cardinality key. Request and response
 * bodies, authorization headers, cookies, tokens, and query values are
 * deliberately never read or included: access logs are routinely shipped to
 * aggregators and must not become a secondary data-leak surface.
 *
 * 5xx responses are logged at error level, 4xx at warn level, and 2xx/3xx at
 * log level so operators can alert on failures without treating ordinary
 * client mistakes as application outages. `finalize` covers both successful
 * completion and errors; the guard makes the line exactly-once even if an
 * error path is observed by more than one RxJS terminal notification.
 * Non-HTTP Nest contexts pass through untouched because this is an HTTP
 * access log, not a gateway or microservice event logger.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const contextType =
      typeof context.getType === 'function'
        ? context.getType<string>()
        : 'http';
    if (contextType && contextType !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const startedAt = Date.now();
    const route = this.getRoutePattern(request);
    let statusCode = response.statusCode ?? HttpStatus.OK;
    let emitted = false;

    const emitAccessLog = (): void => {
      if (emitted) {
        return;
      }
      emitted = true;

      const durationMs = Date.now() - startedAt;
      const requestId = currentRequestId() ?? 'unknown';
      const message =
        `method=${request.method} route=${route} statusCode=${statusCode} ` +
        `durationMs=${durationMs} requestId=${requestId}`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    };

    let stream!: Observable<unknown>;
    try {
      stream = next.handle();
    } catch (error) {
      statusCode = this.getErrorStatus(error, response, statusCode);
      emitAccessLog();
      return throwError(() => error);
    }

    return stream.pipe(
      tap(() => {
        statusCode = response.statusCode ?? statusCode;
      }),
      catchError((error: unknown) => {
        statusCode = this.getErrorStatus(error, response, statusCode);
        return throwError(() => error);
      }),
      finalize(emitAccessLog),
    );
  }

  private getRoutePattern(request: Request): string {
    // `route` is populated by Express at dispatch time but is not part of the
    // published Request typing, so it is read through a narrow local alias
    // rather than with a bare `any` cast at the call site.
    const matchedRoute = (request as Request & {
      route?: { path?: unknown } | undefined;
    }).route;
    const route = matchedRoute?.path;
    if (typeof route === 'string') {
      const baseUrl =
        request.baseUrl && request.baseUrl !== '/' ? request.baseUrl : '';
      const path = route.startsWith('/') ? route : `/${route}`;
      return `${baseUrl}${path}` || '/';
    }
    if (Array.isArray(route)) {
      return route.join('|');
    }
    if (route instanceof RegExp) {
      return route.toString();
    }
    return 'unmatched';
  }

  private getErrorStatus(
    error: unknown,
    response: Response,
    fallback: number,
  ): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }
    const errorStatus =
      (error as { status?: unknown; statusCode?: unknown })?.status ??
      (error as { statusCode?: unknown })?.statusCode;
    if (
      typeof errorStatus === 'number' &&
      errorStatus >= 400 &&
      errorStatus <= 599
    ) {
      return errorStatus;
    }
    if (response.statusCode >= 400) {
      return response.statusCode;
    }
    return fallback >= 400 ? fallback : HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
