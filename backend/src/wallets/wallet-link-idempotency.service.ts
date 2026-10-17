import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { WALLET_REDIS_CLIENT } from './redis-client.provider';

/**
 * The subset of the ioredis API this service needs. Declared structurally
 * so unit tests can supply a tiny in-memory fake without importing Redis.
 */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    ...args: Array<string | number>
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

interface StoredIdempotentResponse {
  requestHash: string;
  response: unknown;
}

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_LOCK_TTL_SECONDS = 30;
const POLL_INTERVAL_MS = 25;
const POLL_ATTEMPTS = 40;

/**
 * Redis-backed idempotency for wallet linking and provisioning (issue
 * #1947).
 *
 * A client that times out and retries used to hit an already-consumed
 * challenge and fail even though its first request succeeded. When the
 * caller supplies an `Idempotency-Key` header this service keys the
 * response by (user, key) in Redis with a TTL and replays it for an
 * identical retry, so a retried `link/verify` or `provision` returns the
 * original response and links exactly one wallet. Reusing a key with a
 * different request body is rejected with 422 instead of silently
 * replaying the wrong result.
 *
 * The cache is best-effort: if Redis is unreachable, the work still runs
 * (the DB's unique constraints keep linking/provisioning idempotent) and a
 * warning is logged rather than failing the request.
 */
@Injectable()
export class WalletLinkIdempotencyService {
  private readonly logger = new Logger(WalletLinkIdempotencyService.name);

  constructor(
    @Inject(WALLET_REDIS_CLIENT) private readonly redis: RedisLike,
    private readonly config: ConfigService,
  ) {}

  async run<T>(
    userId: string,
    idempotencyKey: string | undefined,
    body: unknown,
    work: () => Promise<T>,
  ): Promise<T> {
    const key = idempotencyKey?.trim();
    if (!key) {
      return work();
    }

    const redisKey = `wallet-link-idempotency:${userId}:${key}`;
    const requestHash = hashBody(body);
    const ttlSeconds = this.resolvePositiveConfig(
      'WALLET_LINK_IDEMPOTENCY_TTL_SECONDS',
      DEFAULT_TTL_SECONDS,
    );

    const cached = await this.safeGet(redisKey);
    if (cached) {
      return this.replay(cached, requestHash);
    }

    // Take a short lock so two concurrent identical requests don't both
    // execute the work. A missing/failed lock degrades to executing inline.
    const lockKey = `${redisKey}:lock`;
    const lockToken = randomBytes(8).toString('hex');
    const acquired = await this.tryAcquireLock(
      lockKey,
      lockToken,
      this.resolvePositiveConfig(
        'WALLET_LINK_IDEMPOTENCY_LOCK_TTL_SECONDS',
        DEFAULT_LOCK_TTL_SECONDS,
      ),
    );
    if (acquired === false) {
      const settled = await this.pollForResult(redisKey);
      if (settled !== null) {
        return this.replay(settled, requestHash);
      }
      throw new ConflictException(
        'A request with this Idempotency-Key is already in progress',
      );
    }

    const ownedLock = acquired === true;
    try {
      const response = await work();
      await this.safeSet(
        redisKey,
        JSON.stringify({ requestHash, response }),
        'EX',
        ttlSeconds,
      );
      return response;
    } finally {
      if (ownedLock) {
        await this.safeDel(lockKey);
      }
    }
  }

  private replay<T>(cached: string, requestHash: string): T {
    const parsed = JSON.parse(cached) as StoredIdempotentResponse;
    if (parsed.requestHash !== requestHash) {
      throw new UnprocessableEntityException(
        'This Idempotency-Key was already used with a different request body',
      );
    }
    return parsed.response as T;
  }

  private async pollForResult(redisKey: string): Promise<string | null> {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      const cached = await this.safeGet(redisKey);
      if (cached) {
        return cached;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    return null;
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.warn(
        `Wallet link idempotency cache read failed (${describe(error)}); continuing without replay`,
      );
      return null;
    }
  }

  private async tryAcquireLock(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean | null> {
    try {
      const result = await this.redis.set(key, value, 'NX', 'EX', ttlSeconds);
      return result === 'OK' || result === 1 || result === true;
    } catch (error) {
      // A failure here cannot be distinguished from the key already existing,
      // so report it as unknown and let the caller execute the work anyway.
      this.logger.warn(
        `Wallet link idempotency lock write failed (${describe(error)}); continuing without the lock`,
      );
      return null;
    }
  }

  private async safeSet(
    key: string,
    value: string,
    ...args: Array<string | number>
  ): Promise<boolean> {
    try {
      const result = await this.redis.set(key, value, ...args);
      return result === 'OK' || result === 1 || result === true;
    } catch (error) {
      this.logger.warn(
        `Wallet link idempotency cache write failed (${describe(error)}); continuing without caching`,
      );
      return false;
    }
  }

  private async safeDel(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(
        `Wallet link idempotency cache cleanup failed (${describe(error)})`,
      );
    }
  }

  private resolvePositiveConfig(key: string, fallback: number): number {
    const configured = Number(this.config.get<number>(key, fallback));
    return Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : fallback;
  }
}

function hashBody(body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(body ?? null))
    .digest('hex');
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
