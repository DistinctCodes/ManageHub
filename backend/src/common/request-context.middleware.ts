import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from './request-context';
import { extractRequestMetadata } from '../admin-audit/request-metadata.util';

const REQUEST_ID_REGEX = /^[A-Za-z0-9._-]{8,64}$/;

function isValidRequestId(id: string | undefined | null): id is string {
  if (!id) return false;
  return REQUEST_ID_REGEX.test(id);
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingRequestId = req.header('x-request-id');
    const requestId = isValidRequestId(incomingRequestId)
      ? incomingRequestId
      : randomUUID();

    const { ip, userAgent } = extractRequestMetadata(req);

    res.setHeader('x-request-id', requestId);
    runWithRequestContext({ requestId, ip, userAgent }, () => next());
  }
}
