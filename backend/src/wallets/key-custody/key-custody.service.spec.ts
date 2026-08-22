import { randomBytes } from 'crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { KeyCustodyService } from './key-custody.service';
import { EnvelopeKeyManagementService } from './key-management.service';

const STELLAR_SECRET_PATTERN = /^S[A-Z0-9]{55}$/;
const STELLAR_PUBLIC_PATTERN = /^G[A-Z0-9]{55}$/;

function makeManager(materialRepository: any): any {
  return { getRepository: jest.fn().mockReturnValue(materialRepository) };
}

describe('KeyCustodyService', () => {
  let keyMaterialRepository: any;
  let accessLogRepository: any;
  let kms: EnvelopeKeyManagementService;
  let service: KeyCustodyService;
  let stored: any;

  beforeEach(() => {
    stored = null;
    keyMaterialRepository = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn(async (entity) => {
        stored = { id: 'material-1', ...entity };
        return stored;
      }),
      findOne: jest.fn(async () => stored),
    };
    accessLogRepository = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn(async (entity) => ({ id: 'log-1', ...entity })),
    };
    const config = {
      get: jest.fn().mockReturnValue(randomBytes(32).toString('base64')),
    };
    kms = new EnvelopeKeyManagementService(config as any);
    service = new KeyCustodyService(
      keyMaterialRepository,
      accessLogRepository,
      kms,
    );
  });

  describe('provisionKeypair', () => {
    it('returns a valid Stellar public address and persists only ciphertext', async () => {
      const manager = makeManager(keyMaterialRepository);

      const address = await service.provisionKeypair('wallet-1', manager);

      expect(address).toMatch(STELLAR_PUBLIC_PATTERN);
      expect(keyMaterialRepository.save).toHaveBeenCalledTimes(1);
      expect(stored.walletAccountId).toBe('wallet-1');
      expect(stored.encryptedSecret).not.toMatch(STELLAR_SECRET_PATTERN);
      expect(stored.encryptedSecret).not.toContain(address);
    });

    it('never leaves the plaintext secret recoverable from what was persisted', async () => {
      const manager = makeManager(keyMaterialRepository);
      await service.provisionKeypair('wallet-1', manager);

      const persistedJson = JSON.stringify(stored);
      expect(persistedJson).not.toMatch(STELLAR_SECRET_PATTERN);
    });
  });

  describe('sign', () => {
    it('produces a signature that verifies against the provisioned public address, without exposing the secret', async () => {
      const manager = makeManager(keyMaterialRepository);
      const address = await service.provisionKeypair('wallet-1', manager);
      const payload = Buffer.from('some-nonce-or-transaction-hash');

      const signature = await service.sign(
        'wallet-1',
        payload,
        'SYSTEM',
        'test-signing',
      );

      expect(Keypair.fromPublicKey(address).verify(payload, signature)).toBe(
        true,
      );
      expect(accessLogRepository.save).toHaveBeenCalledTimes(1);
      expect(accessLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAccountId: 'wallet-1',
          actor: 'SYSTEM',
          reason: 'test-signing',
          successful: true,
        }),
      );
    });

    it('fails cleanly and logs a failed access when key material is missing (KMS/decrypt unavailable)', async () => {
      keyMaterialRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.sign('missing-wallet', Buffer.from('x'), 'SYSTEM', 'r'),
      ).rejects.toThrow('Custodial wallet is unavailable for signing');

      expect(accessLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ successful: false }),
      );
    });

    it('never includes the secret in a thrown error message', async () => {
      const manager = makeManager(keyMaterialRepository);
      await service.provisionKeypair('wallet-1', manager);
      stored.encryptedSecretTag = 'tampered-tag-not-base64-gcm-tag';

      let caught: unknown;
      try {
        await service.sign('wallet-1', Buffer.from('x'), 'SYSTEM', 'r');
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeDefined();
      expect(String((caught as Error).message)).not.toMatch(
        STELLAR_SECRET_PATTERN,
      );
    });
  });
});
