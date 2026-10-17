import { InternalServerErrorException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  DEFAULT_KMS_KEY_ID,
  EnvelopeKeyManagementService,
} from './key-management.service';

const MASTER_KEY = randomBytes(32).toString('base64');
const SECOND_KEY = randomBytes(32).toString('base64');

describe('EnvelopeKeyManagementService', () => {
  /**
   * Keyed config stub. The service reads several distinct configuration
   * names, so a `get` that returned one value for every name (as the
   * previous stub did) would make the registry unreadable.
   */
  function makeService(values: Record<string, string | undefined>) {
    const config = {
      get: jest.fn((key: string, def?: unknown) => values[key] ?? def),
    };
    return new EnvelopeKeyManagementService(config as any);
  }

  it('wraps and unwraps a data key back to the original bytes', async () => {
    const service = makeService({ WALLET_KMS_MASTER_KEY: MASTER_KEY });
    const dataKey = randomBytes(32);

    const wrapped = await service.wrapDataKey(dataKey);
    const unwrapped = await service.unwrapDataKey(wrapped);

    expect(wrapped.keyId).toBe(DEFAULT_KMS_KEY_ID);
    expect(unwrapped.equals(dataKey)).toBe(true);
  });

  it('produces ciphertext that does not contain the plaintext data key', async () => {
    const service = makeService({ WALLET_KMS_MASTER_KEY: MASTER_KEY });
    const dataKey = randomBytes(32);

    const wrapped = await service.wrapDataKey(dataKey);

    expect(wrapped.wrapped).not.toContain(dataKey.toString('base64'));
  });

  it('fails to unwrap with a tampered auth tag', async () => {
    const service = makeService({ WALLET_KMS_MASTER_KEY: MASTER_KEY });
    const wrapped = await service.wrapDataKey(randomBytes(32));
    wrapped.tag = randomBytes(16).toString('base64');

    await expect(service.unwrapDataKey(wrapped)).rejects.toThrow();
  });

  it('throws cleanly (no fallback) when no master key is configured', async () => {
    const service = makeService({});

    await expect(service.wrapDataKey(randomBytes(32))).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('wraps under an explicitly named key and unwraps by that key id', async () => {
    const service = makeService({
      WALLET_KMS_MASTER_KEY: MASTER_KEY,
      WALLET_KMS_MASTER_KEYS: JSON.stringify({
        'local-master-key-v2': SECOND_KEY,
      }),
    });
    const dataKey = randomBytes(32);

    const wrapped = await service.wrapDataKey(dataKey, 'local-master-key-v2');
    const unwrapped = await service.unwrapDataKey(wrapped);

    expect(wrapped.keyId).toBe('local-master-key-v2');
    expect(unwrapped.equals(dataKey)).toBe(true);
  });

  it('uses the configured active key id for new writes while still reading the old one', async () => {
    const service = makeService({
      WALLET_KMS_MASTER_KEY: MASTER_KEY,
      WALLET_KMS_ACTIVE_KEY_ID: 'local-master-key-v2',
      WALLET_KMS_MASTER_KEYS: JSON.stringify({
        'local-master-key-v2': SECOND_KEY,
      }),
    });
    const dataKey = randomBytes(32);

    const wrappedOld = await service.wrapDataKey(dataKey);
    // Even with the active id moved, the legacy id is still unwrappable.
    const wrappedLegacy = await service.wrapDataKey(
      dataKey,
      DEFAULT_KMS_KEY_ID,
    );

    expect(wrappedOld.keyId).toBe('local-master-key-v2');
    expect((await service.unwrapDataKey(wrappedLegacy)).equals(dataKey)).toBe(
      true,
    );
    expect(service.getActiveKeyId()).toBe('local-master-key-v2');
    expect(service.getConfiguredKeyIds()).toEqual(
      expect.arrayContaining([DEFAULT_KMS_KEY_ID, 'local-master-key-v2']),
    );
  });

  it('refuses to unwrap a key id it does not have configured', async () => {
    const service = makeService({ WALLET_KMS_MASTER_KEY: MASTER_KEY });
    const wrapped = await service.wrapDataKey(
      randomBytes(32),
      DEFAULT_KMS_KEY_ID,
    );

    await expect(
      service.unwrapDataKey({ ...wrapped, keyId: 'local-master-key-unknown' }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
