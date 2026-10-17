import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface WrappedKey {
  keyId: string;
  wrapped: string; // base64
  iv: string; // base64
  tag: string; // base64
}

/**
 * Abstraction over "envelope-encrypt a data key with a KEK". The local
 * implementation below wraps with an AES-256-GCM master key from config;
 * a cloud KMS (AWS KMS, GCP KMS, etc.) implements the same interface as a
 * drop-in replacement — nothing outside this file needs to change, and
 * this whole module is small enough to become a separate deployable later.
 *
 * `wrapDataKey` accepts an optional target `keyId` and `unwrapDataKey`
 * dispatches on `WrappedKey.keyId`, which is what makes the re-wrap
 * rotation job (issue #1945) possible: old rows keep unwrapping with the
 * old master while new writes use the new one.
 */
export interface KeyManagementService {
  wrapDataKey(dataKey: Buffer, keyId?: string): Promise<WrappedKey>;
  unwrapDataKey(wrapped: WrappedKey): Promise<Buffer>;
}

const ALGORITHM = 'aes-256-gcm';

/**
 * The key id the local master key historically hard-coded. Rows written
 * before key rotation existed carry this id, so it stays the default for
 * `WALLET_KMS_MASTER_KEY` and the active key id until an operator names
 * another one.
 */
export const DEFAULT_KMS_KEY_ID = 'local-master-key-v1';

@Injectable()
export class EnvelopeKeyManagementService implements KeyManagementService {
  constructor(private readonly config: ConfigService) {}

  /** Id new data keys are wrapped under when the caller names none. */
  getActiveKeyId(): string {
    return (
      this.config.get<string>('WALLET_KMS_ACTIVE_KEY_ID') || DEFAULT_KMS_KEY_ID
    );
  }

  /** Every key id this instance can currently unwrap (for rotation checks). */
  getConfiguredKeyIds(): string[] {
    return [...this.resolveMasterKeys().keys()];
  }

  async wrapDataKey(dataKey: Buffer, keyId?: string): Promise<WrappedKey> {
    const targetKeyId = keyId ?? this.getActiveKeyId();
    const masterKey = this.getMasterKey(targetKeyId);
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, masterKey, iv);
    const wrapped = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    return {
      keyId: targetKeyId,
      wrapped: wrapped.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
    };
  }

  async unwrapDataKey(wrapped: WrappedKey): Promise<Buffer> {
    const masterKey = this.getMasterKey(wrapped.keyId);
    const decipher = createDecipheriv(
      ALGORITHM,
      masterKey,
      Buffer.from(wrapped.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(wrapped.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(wrapped.wrapped, 'base64')),
      decipher.final(),
    ]);
  }

  /**
   * Key lifecycle policy and the read-old/write-new migration procedure are
   * documented in the [rotation runbook](./README.md). Never edit
   * WALLET_KMS_MASTER_KEY in place: introduce a new kmsKeyId and migrate the
   * wrapped data keys instead.
   *
   * Key sources:
   *  - `WALLET_KMS_MASTER_KEY` — the default/legacy master, registered under
   *    `WALLET_KMS_DEFAULT_KEY_ID` (or `local-master-key-v1`).
   *  - `WALLET_KMS_MASTER_KEYS` — a JSON object `{ "<keyId>": "<base64>" }`
   *    registering additional masters (e.g. during/finished rotation). Old
   *    ids stay listed for as long as rows may reference them.
   */
  private getMasterKey(keyId: string): Buffer {
    const key = this.resolveMasterKeys().get(keyId);
    if (!key || key.length !== 32) {
      throw new InternalServerErrorException(
        'Wallet key management is unavailable',
      );
    }
    return key;
  }

  private resolveMasterKeys(): Map<string, Buffer> {
    const keys = new Map<string, Buffer>();
    const legacy = this.config.get<string>('WALLET_KMS_MASTER_KEY');
    if (legacy) {
      const legacyId =
        this.config.get<string>('WALLET_KMS_DEFAULT_KEY_ID') ||
        DEFAULT_KMS_KEY_ID;
      keys.set(legacyId, Buffer.from(legacy, 'base64'));
    }

    const registry = this.config.get<string>('WALLET_KMS_MASTER_KEYS');
    if (registry) {
      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(registry);
      } catch {
        throw new InternalServerErrorException(
          'Wallet key management is unavailable',
        );
      }
      for (const [id, value] of Object.entries(parsed)) {
        keys.set(id, Buffer.from(value, 'base64'));
      }
    }

    return keys;
  }
}
