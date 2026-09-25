import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Records every HTTP request's duration into the per-route latency
 * histogram (issue #1780). Registered globally in app.module.ts.
 */
@Injectable()
export class RequestDurationInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const start = process.hrtime.bigint();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const record = () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      // Prefer the matched Express route pattern (e.g. "/wallets/:id") over
      // request.url so per-endpoint labels don't explode into one series
      // per distinct path param value.
      const route = request.route?.path
        ? `${request.baseUrl ?? ''}${request.route.path}`
        : (request.path ?? request.url);
      this.metrics.recordHttpRequestDuration(
        route,
        request.method,
        response.statusCode,
        durationMs,
      );
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
