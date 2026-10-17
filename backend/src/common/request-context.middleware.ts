import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from './request-context';
import { extractRequestMetadata } from '../admin-audit/request-metadata.util';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.header('x-request-id') || req.header('x-correlation-id')) ??
      randomUUID();

    const { ip, userAgent } = extractRequestMetadata(req);

    res.setHeader('x-request-id', requestId);
    runWithRequestContext({ requestId, ip, userAgent }, () => next());
  }
}
