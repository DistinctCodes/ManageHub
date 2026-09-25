import { Injectable, NestMiddleware } from '@nestjs/common';
import pino from 'pino';
import { NextFunction, Request, Response } from 'express';
import { currentRequestId } from './request-context';

/**
 * Emits one structured record after a response finishes. It only attaches a
 * listener and never writes headers or buffers, so the existing security and
 * request-context middleware remain in control of the response.
 */
@Injectable()
export class StructuredRequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = pino();

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    let logged = false;

    const logCompletedResponse = (): void => {
      if (logged) {
        return;
      }
      logged = true;

      const fields: Record<string, unknown> = {
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      };
      const responseRequestId =
        typeof res.getHeader === 'function'
          ? res.getHeader('x-request-id')
          : undefined;
      const requestId =
        currentRequestId() ??
        (typeof req.header === 'function'
          ? req.header('x-request-id')
          : undefined) ??
        (typeof responseRequestId === 'string' ? responseRequestId : undefined);
      if (requestId) {
        fields.requestId = requestId;
      }

      this.logger.info(fields, 'HTTP request');
    };

    res.on('finish', logCompletedResponse);
    next();
  }
}
