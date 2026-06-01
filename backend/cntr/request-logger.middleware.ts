import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, headers } = req;
    const start = Date.now();

    const auth = headers['authorization'];
    if (auth) {
      req.headers['authorization'] = auth.startsWith('Bearer ') ? 'Bearer ***' : '***';
    }

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log(`${method} ${originalUrl} ${res.statusCode} ${duration}ms`);
    });

    next();
  }
}