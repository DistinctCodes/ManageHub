import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { isOriginAllowed, resolveAllowedOrigins } from './cors';

/**
 * Resolves the Socket.IO allowlist at runtime instead of at import time
 * (issue #1943).
 *
 * `@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL ... } })` is
 * evaluated when the gateway file is imported — before `ConfigModule.forRoot`
 * has loaded `.env` — so an `.env`-only `FRONTEND_URL` was silently ignored
 * and a single hard-coded origin was used. This adapter reads the same
 * `CORS_ORIGINS` allowlist the HTTP API uses (via `resolveAllowedOrigins` /
 * `isOriginAllowed`), so both surfaces share one policy and multiple origins
 * are supported. It is installed during application bootstrap, after config
 * has loaded and before gateways are discovered.
 */
export class WsCorsIoAdapter extends IoAdapter {
  private readonly logger = new Logger(WsCorsIoAdapter.name);
  private readonly allowedOrigins: readonly string[];

  constructor(app: INestApplicationContext, config: ConfigService) {
    super(app);
    this.allowedOrigins = resolveAllowedOrigins({
      CORS_ORIGINS: config.get<string>('CORS_ORIGINS'),
      NODE_ENV: config.get<string>('NODE_ENV'),
    });
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: {
        credentials: true,
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (isOriginAllowed(origin, this.allowedOrigins)) {
            callback(null, true);
            return;
          }

          const rejection = `WebSocket CORS origin "${origin}" is not allowlisted`;
          this.logger.warn(rejection);
          callback(new Error(rejection), false);
        },
      },
    });
  }
}
