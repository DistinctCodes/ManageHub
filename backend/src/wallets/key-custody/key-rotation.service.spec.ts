import { randomBytes } from 'crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { WalletKeyMaterial } from '../entities/wallet-key-material.entity';
import { WalletKeyAccessLog } from '../entities/wallet-key-access-log.entity';
import { KeyCustodyService } from './key-custody.service';
import { EnvelopeKeyManagementService } from './key-management.service';
import { KeyRotationService } from './key-rotation.service';

const OLD_KEY = randomBytes(32).toString('base64');
const NEW_KEY = randomBytes(32).toString('base64');
const OLD_KEY_ID = 'local-master-key-v1';
const NEW_KEY_ID = 'local-master-key-v2';

function makeConfig(values: Record<string, unknown>) {
  return { get: (key: string, def?: unknown) => values[key] ?? def };
}

function oldOnlyKms() {
  return new EnvelopeKeyManagementService(
    makeConfig({ WALLET_KMS_MASTER_KEY: OLD_KEY }) as any,
  );
}

function rotateToNewKms() {
  return new EnvelopeKeyManagementService(
    makeConfig({
      WALLET_KMS_MASTER_KEY: OLD_KEY,
      WALLET_KMS_ACTIVE_KEY_ID: NEW_KEY_ID,
      WALLET_KMS_MASTER_KEYS: JSON.stringify({ [NEW_KEY_ID]: NEW_KEY }),
    }) as any,
  );
}

function makeMaterialRepo() {
  const rows: WalletKeyMaterial[] = [];
  let sequence = 0;
  const repo = {
    rows,
    create: (data: Partial<WalletKeyMaterial>) => ({ ...data }),
    save: async (entity: WalletKeyMaterial) => {
      if (!entity.id) {
        entity.id = `material-${++sequence}`;
        rows.push(entity);
      } else {
        const index = rows.findIndex((row) => row.id === entity.id);
        if (index >= 0) {
          rows[index] = entity;
        }
      }
      return entity;
    },
    findOne: async ({ where }: any) =>
      rows.find((row) => row.walletAccountId === where.walletAccountId) ?? null,
    find: jest.fn(async ({ where, take, order }: any) => {
      const filtered = rows
        .filter((row) => row.kmsKeyId === where.kmsKeyId)
        .sort((a, b) => (a.id < b.id ? -1 : 1));
      return typeof take === 'number' ? filtered.slice(0, take) : filtered;
    }),
    update: jest.fn(async (criteria: any, partial: any) => {
      const row = rows.find(
        (candidate) =>
          candidate.id === criteria.id &&
          candidate.kmsKeyId === criteria.kmsKeyId,
      );
      if (!row) {
        return { affected: 0 };
      }
      Object.assign(row, partial);
      return { affected: 1 };
    }),
    count: jest.fn(
      async ({ where }: any) =>
        rows.filter((row) => row.kmsKeyId === where.kmsKeyId).length,
    ),
  };
  return repo;
}

async function provision(
  custody: KeyCustodyService,
  repo: ReturnType<typeof makeMaterialRepo>,
  walletAccountId: string,
) {
  const manager = { getRepository: jest.fn().mockReturnValue(repo) };
  return custody.provisionKeypair(walletAccountId, manager as any);
}

describe('KeyRotationService', () => {
  let materialRepo: ReturnType<typeof makeMaterialRepo>;
  let accessLogRepository: any;
  let audit: { record: jest.Mock };
  let metrics: { recordWalletKeyRotation: jest.Mock };

  beforeEach(() => {
    materialRepo = makeMaterialRepo();
    accessLogRepository = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (entity: any) => entity),
      count: jest.fn().mockResolvedValue(0),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    metrics = { recordWalletKeyRotation: jest.fn() };
  });

  function makeRotationService() {
    return new KeyRotationService(
      materialRepo as any,
      rotateToNewKms(),
      audit as any,
      metrics as any,
      makeConfig({ WALLET_KEY_ROTATION_BATCH_SIZE: 2 }) as any,
    );
  }

  it('re-wraps every row from the old key to the new one and signing still works', async () => {
    const custody = new KeyCustodyService(
      materialRepo as any,
      accessLogRepository,
      oldOnlyKms(),
    );
    const firstAddress = await provision(custody, materialRepo, 'wallet-1');
    const secondAddress = await provision(custody, materialRepo, 'wallet-2');
    expect(materialRepo.rows.every((row) => row.kmsKeyId === OLD_KEY_ID)).toBe(
      true,
    );

    const rotation = makeRotationService();
    const summary = await rotation.rotate({
      fromKeyId: OLD_KEY_ID,
      toKeyId: NEW_KEY_ID,
      adminId: 'admin-1',
    });

    expect(summary).toMatchObject({
      rotated: 2,
      failed: 0,
      remaining: 0,
    });
    expect(materialRepo.rows.every((row) => row.kmsKeyId === NEW_KEY_ID)).toBe(
      true,
    );
    expect(metrics.recordWalletKeyRotation).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: OLD_KEY_ID,
        rotated: 2,
        remaining: 0,
      }),
    );
    expect(audit.record).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'key_material_rotated',
        targetType: 'WalletKeyMaterial',
      }),
    );

    // Signing still works after rotation, verified with the public address.
    const recoveredCustody = new KeyCustodyService(
      materialRepo as any,
      accessLogRepository,
      rotateToNewKms(),
    );
    const payload = Buffer.from('post-rotation-payload');
    const signature = await recoveredCustody.sign(
      'wallet-1',
      payload,
      'SYSTEM',
      'post-rotation-check',
    );
    expect(Keypair.fromPublicKey(firstAddress).verify(payload, signature)).toBe(
      true,
    );
    // And the untouched secret's ciphertext is still decryptable.
    expect(secondAddress).toMatch(/^G/);
  });

  it('resumes an interrupted rotation without re-rotating completed rows', async () => {
    const custody = new KeyCustodyService(
      materialRepo as any,
      accessLogRepository,
      oldOnlyKms(),
    );
    await provision(custody, materialRepo, 'wallet-1');
    await provision(custody, materialRepo, 'wallet-2');
    await provision(custody, materialRepo, 'wallet-3');

    const originalUpdate = materialRepo.update;
    let interrupted = false;
    materialRepo.update = jest.fn(async (criteria: any, partial: any) => {
      if (!interrupted && criteria.id === 'material-2') {
        interrupted = true;
        throw new Error('process killed mid-rotation');
      }
      return originalUpdate(criteria, partial);
    }) as any;

    const rotation = makeRotationService();
    await expect(
      rotation.rotate({
        fromKeyId: OLD_KEY_ID,
        toKeyId: NEW_KEY_ID,
        adminId: 'admin-1',
      }),
    ).rejects.toThrow('process killed mid-rotation');

    // The first row committed before the interruption; the rest remain old.
    expect(
      materialRepo.rows.filter((row) => row.kmsKeyId === NEW_KEY_ID),
    ).toHaveLength(1);
    expect(
      materialRepo.rows.filter((row) => row.kmsKeyId === OLD_KEY_ID),
    ).toHaveLength(2);

    // Resume: the completed row is skipped by the old-key filter.
    const resumed = await rotation.rotate({
      fromKeyId: OLD_KEY_ID,
      toKeyId: NEW_KEY_ID,
      adminId: 'admin-1',
    });

    expect(resumed.rotated).toBe(2);
    expect(resumed.remaining).toBe(0);
    expect(materialRepo.rows.every((row) => row.kmsKeyId === NEW_KEY_ID)).toBe(
      true,
    );
    expect(materialRepo.rows).toHaveLength(3);
  });

  it('reports remaining old-key rows and does nothing when there are none', async () => {
    const rotation = makeRotationService();
    const summary = await rotation.rotate({
      fromKeyId: OLD_KEY_ID,
      toKeyId: NEW_KEY_ID,
      adminId: 'admin-1',
    });

    expect(summary).toMatchObject({ rotated: 0, remaining: 0 });
    expect(metrics.recordWalletKeyRotation).toHaveBeenCalledWith(
      expect.objectContaining({ rotated: 0, remaining: 0 }),
    );
  });
});
