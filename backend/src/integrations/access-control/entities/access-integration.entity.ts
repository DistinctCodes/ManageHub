import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccessProvider } from '../enums/access-provider.enum';

/**
 * Singleton row — only one record ever exists.
 * Stores the active door-access provider and its encrypted API key.
 */
@Entity('access_integrations')
export class AccessIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AccessProvider })
  provider: AccessProvider;

  @Column({ type: 'text' })
  apiKey: string; // AES-256-CBC encrypted; format: <iv_hex>:<ciphertext_hex>

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  meta: { doorGroupId?: string } | null;

  @Column({ type: 'timestamptz' })
  configuredAt: Date;
}
