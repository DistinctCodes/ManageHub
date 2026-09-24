import { Injectable, NestMiddleware } from '@nestjs/common';
import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import { NextFunction, Request, Response } from 'express';
import { getTracer } from './tracing';

/**
 * Creates one server span for each HTTP request. It is registered after
 * RequestContextMiddleware, so the request-id AsyncLocalStorage context is
 * already active when this span is opened and remains active for downstream
 * log prefixes and child spans.
 */
@Injectable()
export class TracingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // req.route is normally unavailable when global middleware runs. Prefer a
    // matched route when a later adapter supplies one, otherwise use the
    // pathname only; query strings are intentionally excluded from the span
    // name and target to avoid accidental high-cardinality or sensitive data.
    const routePath = req.route?.path;
    const target =
      typeof routePath === 'string'
        ? routePath
        : req.path || req.url.split('?')[0] || '/';
    const span = getTracer().startSpan(`HTTP ${req.method} ${target}`, {
      root: true,
      attributes: {
        'http.method': req.method,
        'http.target': target,
      },
    });

    let ended = false;
    const endSpan = (forceError = false): void => {
      if (ended) {
        return;
      }
      ended = true;
      span.setAttribute('http.status_code', res.statusCode);
      span.setStatus({
        code:
          forceError || res.statusCode >= 500
            ? SpanStatusCode.ERROR
            : SpanStatusCode.OK,
      });
      span.end();
    };

    // Express emits finish after headers/body have been flushed. The explicit
    // guard also makes the handler safe if a synchronous error causes an early
    // end and the response later emits finish.
    res.on('finish', () => endSpan());

    try {
      context.with(trace.setSpan(context.active(), span), () => next());
    } catch (error) {
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      endSpan(true);
      throw error;
    }
  }
}
