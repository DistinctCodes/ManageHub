import { Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
// Not re-exported from the package root in @nestjs/throttler v6.
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

/**
 * Redis-backed throttler storage (issue #1955). ThrottlerModule's default
 * storage keeps counters in per-process memory, so behind two or more
 * replicas the effective rate limit is multiplied and counters reset on
 * every deploy. This implementation stores the same counters in the Redis
 * instance the app already runs Bull on (REDIS_HOST/REDIS_PORT/
 * REDIS_PASSWORD/REDIS_DB), so every replica shares one counter per client.
 *
 * Availability: Redis being unreachable never crashes the app or rejects
 * traffic — every call fails OPEN (the hit is allowed and a warning is
 * logged) so a Redis blip degrades rate limiting, not the API.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private unavailableLogged = false;

  constructor(redis: Redis) {
    this.redis = redis;
    // Without a listener ioredis 'error' events become uncaught exceptions.
    // Log the first one loudly, then stay quiet: reconnection is automatic
    // and per-request failures already fail open below.
    this.redis.on('error', (err: Error) => {
      if (!this.unavailableLogged) {
        this.unavailableLogged = true;
        this.logger.warn(
          `Redis throttler storage unavailable; rate limiting fails open ` +
            `until it recovers (${err.message})`,
        );
      } else {
        this.logger.debug(`Redis throttler storage error: ${err.message}`);
      }
    });
    this.redis.on('ready', () => {
      this.unavailableLogged = false;
    });
  }

  /**
   * Fixed-window counter plus an optional block key:
   * - `INCR` on the window key, expiring `ttl` ms after the first hit;
   * - once the count passes `limit`, a `block` key is set (NX, so the block
   *   window is never extended by later requests) for `blockDuration` ms
   *   and every request in that period is reported as blocked.
   * All state lives in Redis, so any number of app instances observe the
   * same counter.
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const windowKey = `mh:throttler:${throttlerName}:${key}`;
    const blockKey = `${windowKey}:block`;

    try {
      const blockTtl = await this.redis.pttl(blockKey);
      if (blockTtl > 0) {
        return {
          totalHits: limit + 1,
          timeToExpire: Math.ceil(ttl / 1000),
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockTtl / 1000),
        };
      }

      const totalHits = await this.redis.incr(windowKey);
      if (totalHits === 1) {
        await this.redis.pexpire(windowKey, ttl);
      }

      let windowTtl = await this.redis.pttl(windowKey);
      if (windowTtl < 0) {
        // Key lost its TTL in a race (or the clock moved) — re-arm it so a
        // counter can never live forever.
        windowTtl = ttl;
        await this.redis.pexpire(windowKey, ttl);
      }

      let isBlocked = false;
      let timeToBlockExpire = 0;
      if (totalHits > limit) {
        isBlocked = true;
        const safeBlockDuration = Math.max(blockDuration, 1);
        const firstBlocked = await this.redis.set(
          blockKey,
          '1',
          'PX',
          safeBlockDuration,
          'NX',
        );
        if (firstBlocked === 'OK') {
          timeToBlockExpire = Math.ceil(safeBlockDuration / 1000);
        } else {
          const remaining = await this.redis.pttl(blockKey);
          timeToBlockExpire = remaining > 0 ? Math.ceil(remaining / 1000) : 1;
        }
      }

      return {
        totalHits,
        timeToExpire: Math.ceil(windowTtl / 1000),
        isBlocked,
        timeToBlockExpire,
      };
    } catch (error) {
      // Fail open: a storage outage must not become an API outage.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Throttler storage call failed; allowing request (${message})`,
      );
      return {
        totalHits: 1,
        timeToExpire: Math.max(1, Math.ceil(ttl / 1000)),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  onApplicationShutdown(): void {
    this.redis.disconnect();
  }
}

export interface ThrottlerRedisOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

/**
 * Builds the shared throttler Redis client from the same REDIS_* variables
 * Bull uses. `enableOfflineQueue: false` makes commands fail immediately
 * (and thus fail open inside RedisThrottlerStorage) instead of hanging while
 * a down Redis reconnects in the background — app boot is never blocked.
 */
export function createThrottlerRedisClient(
  options: ThrottlerRedisOptions,
): Redis {
  return new Redis({
    host: options.host,
    port: options.port,
    password: options.password || undefined,
    db: options.db ?? 0,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
}
