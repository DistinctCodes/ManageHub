import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Injection token for the Redis client backing wallet-link idempotency
 * (issue #1947). Kept as an explicit token so the idempotency service can
 * be unit-tested against a small fake, while production wires a real
 * ioredis client built from the same `REDIS_*` variables Bull already uses.
 */
export const WALLET_REDIS_CLIENT = 'WALLET_REDIS_CLIENT';

export const walletRedisClientProvider: Provider = {
  provide: WALLET_REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis =>
    new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      db: config.get<number>('REDIS_DB', 0),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      // A request must not hang on Redis: idempotency is best-effort and
      // falls back to executing the work if the cache is unreachable.
      enableOfflineQueue: false,
    }),
};
