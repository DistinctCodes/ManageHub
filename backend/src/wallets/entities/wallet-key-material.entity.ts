import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Envelope-encrypted custodial secret key. Only KeyCustodyService ever
 * reads this table — no other module should inject this entity's
 * repository. The plaintext secret is never stored, logged, or returned by
 * any API; only `encryptedSecret` (ciphertext) and the wrapped data key
 * live here, both opaque to everything except KeyCustodyService.
 */
@Entity('wallet_key_material')
@Index('uq_wallet_key_material_wallet_account_id', ['walletAccountId'], {
  unique: true,
})
export class WalletKeyMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'wallet_account_id' })
  walletAccountId: string;

  /** Identifies which KEK wrapped the data key — enables key rotation. */
  @Column({ type: 'varchar', name: 'kms_key_id' })
  kmsKeyId: string;

  /** Base64 AES-256-GCM-wrapped data encryption key. */
  @Column({ type: 'text', name: 'wrapped_data_key' })
  wrappedDataKey: string;

  /** Base64 IV used to wrap the data key. */
  @Column({ type: 'varchar', name: 'wrapped_data_key_iv' })
  wrappedDataKeyIv: string;

  /** Base64 GCM auth tag for the wrapped data key. */
  @Column({ type: 'varchar', name: 'wrapped_data_key_tag' })
  wrappedDataKeyTag: string;

  /** Base64 AES-256-GCM ciphertext of the Stellar secret key. */
  @Column({ type: 'text', name: 'encrypted_secret' })
  encryptedSecret: string;

  /** Base64 IV used to encrypt the secret with the data key. */
  @Column({ type: 'varchar', name: 'encrypted_secret_iv' })
  encryptedSecretIv: string;

  /** Base64 GCM auth tag for the encrypted secret. */
  @Column({ type: 'varchar', name: 'encrypted_secret_tag' })
  encryptedSecretTag: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
