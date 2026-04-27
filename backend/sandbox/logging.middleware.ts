import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SENSITIVE_PATHS = ['/auth/login', '/auth/refresh'];
const HEALTH_PATHS = ['/health', '/ping'];

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    if (HEALTH_PATHS.some(p => req.path.startsWith(p))) return next();

    const { method, path, ip } = req;
    const start = Date.now();

    if (!SENSITIVE_PATHS.includes(path)) {
      // body available for non-sensitive routes — no action needed here,
      // just ensuring we don't accidentally log it for sensitive ones
    }

    res.on('finish', () => {
      const ms = Date.now() - start;
      this.logger.log(`[HTTP] ${method} ${path} ${res.statusCode} ${ms}ms ${ip}`);
    });

    next();
  }
}

// Apply in your sandbox module:
// export class SandboxModule implements NestModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer.apply(LoggingMiddleware).forRoutes('*');
//   }
// }
