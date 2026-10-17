import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Default tolerance between a webhook's signed timestamp and "now". */
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Replay protection for payment-webhook.controller.ts (issue #1938).
 *
 * Two independent guards:
 *  - a timestamp tolerance so a captured, validly-signed request cannot be
 *    re-sent once the window has passed; and
 *  - an event-id ledger in Redis (with a TTL) so a duplicate delivery inside
 *    the window is acknowledged without being applied twice.
 *
 * The event ledger is deliberately in Redis rather than an in-process Map so
 * every instance behind a load balancer shares the same replay state.
 */
@Injectable()
export class WebhookReplayService implements OnModuleDestroy {
  private readonly logger = new Logger(WebhookReplayService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis({
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get<string>('REDIS_PASSWORD') || undefined,
        db: this.config.get<number>('REDIS_DB', 0),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
    }
    return this.client;
  }

  /** Configured tolerance in milliseconds (default 5 minutes). */
  toleranceMs(): number {
    const configured = Number(
      this.config.get<number | string>(
        'PAYMENT_WEBHOOK_TOLERANCE_SECONDS',
        DEFAULT_WEBHOOK_TOLERANCE_SECONDS,
      ),
    );
    const seconds =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
    return seconds * 1000;
  }

  isWithinTolerance(timestampMs: number): boolean {
    if (!Number.isFinite(timestampMs)) {
      return false;
    }
    return Math.abs(Date.now() - timestampMs) <= this.toleranceMs();
  }

  /**
   * Atomically records an event id, returning `true` when it had not been
   * seen before (and is now recorded) or `false` for a duplicate inside the
   * TTL window.
   */
  async claimEvent(eventId: string): Promise<boolean> {
    const key = `payment-webhook:seen:${eventId}`;
    const ttlSeconds = Math.max(1, Math.ceil(this.toleranceMs() / 1000));
    try {
      const result = await this.getClient().set(
        key,
        '1',
        'EX',
        ttlSeconds,
        'NX',
      );
      return result === 'OK';
    } catch (error) {
      // Redis is the shared replay ledger. If it is unreachable, fail open
      // rather than drop legitimate webhooks; the timestamp tolerance still
      // bounds how long any captured request stays replayable.
      this.logger.warn(
        `Could not record webhook event id in Redis (${eventId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return true;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // best effort cleanup
      }
      this.client = null;
    }
  }
}
