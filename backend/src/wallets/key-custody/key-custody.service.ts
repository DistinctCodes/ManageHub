import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { EntityManager, MoreThan, Repository } from 'typeorm';
import { Keypair } from '@stellar/stellar-sdk';
import { WalletKeyMaterial } from '../entities/wallet-key-material.entity';
import { WalletKeyAccessLog } from '../entities/wallet-key-access-log.entity';
import { EnvelopeKeyManagementService } from './key-management.service';

const DATA_KEY_ALGORITHM = 'aes-256-gcm';
const FAILED_SIGN_ALERT_THRESHOLD = 5;
const FAILED_SIGN_ALERT_WINDOW_MS = 10 * 60_000;

/**
 * The only module allowed to touch a decrypted custodial secret key. No
 * other service should ever inject Repository<WalletKeyMaterial> directly.
 * A decrypted key exists only inside a single synchronous stretch of this
 * file and is never returned, logged, or attached to an error.
 */
@Injectable()
export class KeyCustodyService {
  constructor(
    @InjectRepository(WalletKeyMaterial)
    private readonly keyMaterialRepository: Repository<WalletKeyMaterial>,
    @InjectRepository(WalletKeyAccessLog)
    private readonly accessLogRepository: Repository<WalletKeyAccessLog>,
    private readonly kms: EnvelopeKeyManagementService,
  ) {}

  /**
   * Generates a new Stellar keypair, encrypts the secret under a
   * fresh data key (itself wrapped by the KMS), and persists it via the
   * given manager so the insert can share the caller's transaction with
   * the WalletAccount insert. Returns the public address only.
   */
  async provisionKeypair(
    walletAccountId: string,
    manager: EntityManager,
  ): Promise<string> {
    const keypair = Keypair.random();
    const dataKey = randomBytes(32);

    const secretIv = randomBytes(12);
    const secretCipher = createCipheriv(
      DATA_KEY_ALGORITHM,
      dataKey,
      secretIv,
    );
    const encryptedSecret = Buffer.concat([
      secretCipher.update(Buffer.from(keypair.secret(), 'utf8')),
      secretCipher.final(),
    ]);

    const wrappedDataKey = await this.kms.wrapDataKey(dataKey);
    dataKey.fill(0); // best-effort scrub once it's no longer needed

    await manager.getRepository(WalletKeyMaterial).save(
      manager.getRepository(WalletKeyMaterial).create({
        walletAccountId,
        kmsKeyId: wrappedDataKey.keyId,
        wrappedDataKey: wrappedDataKey.wrapped,
        wrappedDataKeyIv: wrappedDataKey.iv,
        wrappedDataKeyTag: wrappedDataKey.tag,
        encryptedSecret: encryptedSecret.toString('base64'),
        encryptedSecretIv: secretIv.toString('base64'),
        encryptedSecretTag: secretCipher.getAuthTag().toString('base64'),
      }),
    );

    return keypair.publicKey();
  }

  /**
   * Decrypts the custodial key just long enough to sign `payload`, logs
   * the access (success or failure), and returns only the signature.
   * Never returns or logs the decrypted secret. If the KMS/decrypt step
   * fails, the caller sees a clean error — there is no insecure fallback.
   */
  async sign(
    walletAccountId: string,
    payload: Buffer,
    actor: string,
    reason: string,
  ): Promise<Buffer> {
    try {
      const signature = await this.decryptAndSign(walletAccountId, payload);
      await this.logAccess(walletAccountId, actor, reason, true);
      return signature;
    } catch {
      await this.logAccess(walletAccountId, actor, reason, false);
      await this.maybeAlertOnRepeatedFailures(walletAccountId);
      throw new InternalServerErrorException(
        'Custodial wallet is unavailable for signing',
      );
    }
  }

  private async decryptAndSign(
    walletAccountId: string,
    payload: Buffer,
  ): Promise<Buffer> {
    const material = await this.keyMaterialRepository.findOne({
      where: { walletAccountId },
    });
    if (!material) {
      throw new Error('No key material for wallet account');
    }

    const dataKey = await this.kms.unwrapDataKey({
      keyId: material.kmsKeyId,
      wrapped: material.wrappedDataKey,
      iv: material.wrappedDataKeyIv,
      tag: material.wrappedDataKeyTag,
    });

    const decipher = createDecipheriv(
      DATA_KEY_ALGORITHM,
      dataKey,
      Buffer.from(material.encryptedSecretIv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(material.encryptedSecretTag, 'base64'));
    const secret = Buffer.concat([
      decipher.update(Buffer.from(material.encryptedSecret, 'base64')),
      decipher.final(),
    ]);
    dataKey.fill(0);

    const keypair = Keypair.fromSecret(secret.toString('utf8'));
    secret.fill(0);

    return keypair.sign(payload);
  }

  private async logAccess(
    walletAccountId: string,
    actor: string,
    reason: string,
    successful: boolean,
  ): Promise<void> {
    await this.accessLogRepository.save(
      this.accessLogRepository.create({
        walletAccountId,
        actor,
        reason,
        successful,
        }),
    );
  }

  private async maybeAlertOnRepeatedFailures(
    walletAccountId: string,
  ): Promise<void> {
    const recentFailures =
      typeof this.accessLogRepository.count === 'function'
        ? await this.accessLogRepository.count({
            where: {
              walletAccountId,
              successful: false,
              occurredAt: MoreThan(
                new Date(Date.now() - FAILED_SIGN_ALERT_WINDOW_MS),
              ),
            },
          })
        : 0;

    if (recentFailures >= FAILED_SIGN_ALERT_THRESHOLD) {
      // The wallet-key audit table already tells us the pattern; the
      // alert is just the visible signal for admins and operators.
      console.warn(
        `Repeated failed signing attempts detected for wallet ${walletAccountId} (${recentFailures} failures in the last 10 minutes)`,
      );
    }
  }
}
