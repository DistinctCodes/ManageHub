import { UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  RedisLike,
  WalletLinkIdempotencyService,
} from './wallet-link-idempotency.service';

class FakeRedis implements RedisLike {
  private readonly store = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(
    key: string,
    value: string,
    ...args: Array<string | number>
  ): Promise<unknown> {
    let onlyIfAbsent = false;
    let ttlSeconds: number | null = null;
    for (let index = 0; index < args.length; index += 1) {
      if (args[index] === 'NX') {
        onlyIfAbsent = true;
      }
      if (args[index] === 'EX') {
        ttlSeconds = Number(args[index + 1]);
        index += 1;
      }
    }
    if (onlyIfAbsent && this.store.has(key)) {
      return null;
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity,
    });
    return 'OK';
  }

  async del(key: string): Promise<unknown> {
    this.store.delete(key);
    return 1;
  }
}

function makeConfig(values: Record<string, unknown> = {}) {
  return { get: (key: string, def?: unknown) => values[key] ?? def };
}

describe('WalletLinkIdempotencyService', () => {
  it('runs the work directly when no Idempotency-Key is supplied', async () => {
    const service = new WalletLinkIdempotencyService(
      new FakeRedis(),
      makeConfig() as any,
    );
    const work = jest.fn().mockResolvedValue({ ok: true });

    await expect(service.run('user-1', undefined, {}, work)).resolves.toEqual({
      ok: true,
    });
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('two identical requests with one key yield the same response and run once', async () => {
    const service = new WalletLinkIdempotencyService(
      new FakeRedis(),
      makeConfig() as any,
    );
    const response = { provisioned: true, walletAddress: 'GADDRESS' };
    const work = jest.fn().mockResolvedValue(response);
    const body = { operation: 'link/verify', nonce: 'n-1' };

    const first = await service.run('user-1', 'key-1', body, work);
    const second = await service.run('user-1', 'key-1', body, work);

    expect(first).toEqual(response);
    expect(second).toEqual(response);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('rejects reuse of a key with a different body (422)', async () => {
    const service = new WalletLinkIdempotencyService(
      new FakeRedis(),
      makeConfig() as any,
    );
    const work = jest.fn().mockResolvedValue({ ok: true });

    await service.run('user-1', 'key-1', { nonce: 'n-1' }, work);

    await expect(
      service.run('user-1', 'key-1', { nonce: 'n-2' }, work),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('scopes keys per user so two users may reuse the same key', async () => {
    const service = new WalletLinkIdempotencyService(
      new FakeRedis(),
      makeConfig() as any,
    );
    const work = jest.fn().mockResolvedValue({ ok: true });

    await service.run('user-1', 'shared-key', { nonce: 'n-1' }, work);
    await service.run('user-2', 'shared-key', { nonce: 'n-1' }, work);

    expect(work).toHaveBeenCalledTimes(2);
  });

  it('degrades to executing the work when the cache is unreachable', async () => {
    const failingRedis: RedisLike = {
      get: jest.fn().mockRejectedValue(new Error('redis down')),
      set: jest.fn().mockRejectedValue(new Error('redis down')),
      del: jest.fn().mockRejectedValue(new Error('redis down')),
    };
    const service = new WalletLinkIdempotencyService(
      failingRedis,
      makeConfig() as any,
    );
    const work = jest.fn().mockResolvedValue({ ok: true });

    await expect(
      service.run('user-1', 'key-1', { nonce: 'n-1' }, work),
    ).resolves.toEqual({ ok: true });
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('replays a response already cached under the same key', async () => {
    const redis = new FakeRedis();
    await redis.set(
      'wallet-link-idempotency:user-1:key-1',
      JSON.stringify({
        requestHash: hashOf({ nonce: 'n-1' }),
        response: { ok: true },
      }),
      'EX',
      60,
    );
    const service = new WalletLinkIdempotencyService(
      redis,
      makeConfig() as any,
    );
    const work = jest.fn().mockResolvedValue({ ok: false });

    const result = await service.run('user-1', 'key-1', { nonce: 'n-1' }, work);

    expect(result).toEqual({ ok: true });
    expect(work).not.toHaveBeenCalled();
  });
});

function hashOf(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}
