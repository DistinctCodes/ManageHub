import { RedisThrottlerStorage } from './redis-throttler.storage';

/**
 * Minimal in-memory stand-in for the subset of ioredis the throttler
 * storage uses. `createClient` hands out one shared store so several
 * storage instances pointed at the same "server" observe the same counters
 * — exactly what two app replicas sharing one Redis do.
 */
interface FakeRedisStore {
  values: Map<string, { value: string; expiresAt: number }>;
}

function createClient(store: FakeRedisStore = { values: new Map() }) {
  const now = () => Date.now();

  const live = (key: string) => {
    const entry = store.values.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt > 0 && entry.expiresAt <= now()) {
      store.values.delete(key);
      return undefined;
    }
    return entry;
  };

  const client = {
    store,
    listeners: new Map<string, ((err: Error) => void)[]>(),
    on(event: string, fn: (err: Error) => void) {
      const fns = this.listeners.get(event) ?? [];
      fns.push(fn);
      this.listeners.set(event, fns);
      return this;
    },
    emit(event: string, err: Error) {
      (this.listeners.get(event) ?? []).forEach((fn) => fn(err));
    },
    async incr(key: string): Promise<number> {
      const entry = live(key);
      if (!entry) {
        store.values.set(key, { value: '1', expiresAt: 0 });
        return 1;
      }
      const next = Number(entry.value) + 1;
      entry.value = String(next);
      return next;
    },
    async pexpire(key: string, ttl: number): Promise<number> {
      const entry = live(key);
      if (!entry) return 0;
      entry.expiresAt = now() + ttl;
      return 1;
    },
    async pttl(key: string): Promise<number> {
      const entry = live(key);
      if (!entry) return -2;
      if (entry.expiresAt <= 0) return -1;
      return entry.expiresAt - now();
    },
    async set(
      key: string,
      value: string,
      ...args: Array<string | number>
    ): Promise<'OK' | null> {
      const pxIndex = args.findIndex((a) => String(a).toUpperCase() === 'PX');
      const ttl = pxIndex >= 0 ? Number(args[pxIndex + 1]) : 0;
      const nx = args.some((a) => String(a).toUpperCase() === 'NX');
      if (nx && live(key)) {
        return null;
      }
      store.values.set(key, { value: String(value), expiresAt: now() + ttl });
      return 'OK';
    },
    async del(...keys: string[]): Promise<number> {
      let removed = 0;
      keys.forEach((key) => {
        if (store.values.delete(key)) removed += 1;
      });
      return removed;
    },
    disconnect() {
      return;
    },
  };

  return client as unknown as import('ioredis').default & typeof client;
}

const TTL = 60_000;
const LIMIT = 3;
const BLOCK = TTL;

describe('RedisThrottlerStorage (issue #1955)', () => {
  it('counts hits up to the limit and reports remaining window time', async () => {
    const storage = new RedisThrottlerStorage(createClient() as never);

    const first = await storage.increment(
      'client-a',
      TTL,
      LIMIT,
      BLOCK,
      'default',
    );
    expect(first).toMatchObject({ totalHits: 1, isBlocked: false });

    const second = await storage.increment(
      'client-a',
      TTL,
      LIMIT,
      BLOCK,
      'default',
    );
    expect(second).toMatchObject({ totalHits: 2, isBlocked: false });
    expect(second.timeToExpire).toBeGreaterThan(0);
  });

  it('blocks once the limit is exceeded and keeps blocking for the block window', async () => {
    const storage = new RedisThrottlerStorage(createClient() as never);

    for (let hit = 1; hit <= LIMIT; hit += 1) {
      const record = await storage.increment(
        'client-b',
        TTL,
        LIMIT,
        BLOCK,
        'default',
      );
      expect(record.isBlocked).toBe(false);
    }

    const overLimit = await storage.increment(
      'client-b',
      TTL,
      LIMIT,
      BLOCK,
      'default',
    );
    expect(overLimit.isBlocked).toBe(true);
    expect(overLimit.totalHits).toBe(LIMIT + 1);

    const blockedAgain = await storage.increment(
      'client-b',
      TTL,
      LIMIT,
      BLOCK,
      'default',
    );
    expect(blockedAgain.isBlocked).toBe(true);
    expect(blockedAgain.timeToBlockExpire).toBeGreaterThan(0);
  });

  it('shares one counter between two storage instances (two replicas, one Redis)', async () => {
    const store = { values: new Map() };
    const replicaA = new RedisThrottlerStorage(createClient(store) as never);
    const replicaB = new RedisThrottlerStorage(createClient(store) as never);

    await replicaA.increment('client-c', TTL, LIMIT, BLOCK, 'default');
    await replicaA.increment('client-c', TTL, LIMIT, BLOCK, 'default');
    // The third hit lands on the other "replica" — it must see the same
    // counter, i.e. the limit is not re-granted per process.
    const hitOnB = await replicaB.increment(
      'client-c',
      TTL,
      LIMIT,
      BLOCK,
      'default',
    );
    expect(hitOnB.totalHits).toBe(3);

    const fourthOnA = await replicaA.increment(
      'client-c',
      TTL,
      LIMIT,
      BLOCK,
      'default',
    );
    expect(fourthOnA.isBlocked).toBe(true);
  });

  it('keys are namespaced per throttler name so counters never collide', async () => {
    const storage = new RedisThrottlerStorage(createClient() as never);

    await storage.increment('same-key', TTL, LIMIT, BLOCK, 'default');
    const other = await storage.increment(
      'same-key',
      TTL,
      LIMIT,
      BLOCK,
      'other',
    );
    expect(other.totalHits).toBe(1);
  });

  it('fails open when Redis errors, without throwing', async () => {
    const client = createClient();
    jest
      .spyOn(client, 'incr')
      .mockRejectedValue(new Error('connection refused'));
    const storage = new RedisThrottlerStorage(client as never);

    const record = await storage.increment(
      'client-d',
      TTL,
      LIMIT,
      BLOCK,
      'default',
    );
    expect(record).toEqual({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('logs the first unavailable warning and stays silent afterwards', () => {
    const client = createClient();
    const storage = new RedisThrottlerStorage(client as never);
    const warn = jest.spyOn(
      (storage as unknown as { logger: { warn: jest.Mock; debug: jest.Mock } })
        .logger,
      'warn',
    );
    const debug = jest.spyOn(
      (storage as unknown as { logger: { warn: jest.Mock; debug: jest.Mock } })
        .logger,
      'debug',
    );

    client.emit('error', new Error('ECONNREFUSED'));
    client.emit('error', new Error('ECONNREFUSED'));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/fails open/);
    expect(debug).toHaveBeenCalledTimes(1);
  });
});
