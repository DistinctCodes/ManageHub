import { InternalServerErrorException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EnvelopeKeyManagementService } from './key-management.service';

const MASTER_KEY = randomBytes(32).toString('base64');

describe('EnvelopeKeyManagementService', () => {
  function makeService(masterKey: string | undefined = MASTER_KEY) {
    const config = { get: jest.fn().mockReturnValue(masterKey) };
    return new EnvelopeKeyManagementService(config as any);
  }

  it('wraps and unwraps a data key back to the original bytes', async () => {
    const service = makeService();
    const dataKey = randomBytes(32);

    const wrapped = await service.wrapDataKey(dataKey);
    const unwrapped = await service.unwrapDataKey(wrapped);

    expect(unwrapped.equals(dataKey)).toBe(true);
  });

  it('produces ciphertext that does not contain the plaintext data key', async () => {
    const service = makeService();
    const dataKey = randomBytes(32);

    const wrapped = await service.wrapDataKey(dataKey);

    expect(wrapped.wrapped).not.toContain(dataKey.toString('base64'));
  });

  it('fails to unwrap with a tampered auth tag', async () => {
    const service = makeService();
    const wrapped = await service.wrapDataKey(randomBytes(32));
    wrapped.tag = randomBytes(16).toString('base64');

    await expect(service.unwrapDataKey(wrapped)).rejects.toThrow();
  });

  it('throws cleanly (no fallback) when no master key is configured', async () => {
    const service = makeService(undefined);

    await expect(service.wrapDataKey(randomBytes(32))).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
