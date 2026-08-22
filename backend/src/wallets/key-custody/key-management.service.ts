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
 */
export interface KeyManagementService {
  wrapDataKey(dataKey: Buffer): Promise<WrappedKey>;
  unwrapDataKey(wrapped: WrappedKey): Promise<Buffer>;
}

const ALGORITHM = 'aes-256-gcm';

@Injectable()
export class EnvelopeKeyManagementService implements KeyManagementService {
  constructor(private readonly config: ConfigService) {}

  async wrapDataKey(dataKey: Buffer): Promise<WrappedKey> {
    const masterKey = this.getMasterKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, masterKey, iv);
    const wrapped = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    return {
      keyId: 'local-master-key-v1',
      wrapped: wrapped.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
    };
  }

  async unwrapDataKey(wrapped: WrappedKey): Promise<Buffer> {
    const masterKey = this.getMasterKey();
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

  private getMasterKey(): Buffer {
    const configured = this.config.get<string>('WALLET_KMS_MASTER_KEY');
    if (!configured) {
      throw new InternalServerErrorException(
        'Wallet key management is unavailable',
      );
    }
    const key = Buffer.from(configured, 'base64');
    if (key.length !== 32) {
      throw new InternalServerErrorException(
        'Wallet key management is unavailable',
      );
    }
    return key;
  }
}
