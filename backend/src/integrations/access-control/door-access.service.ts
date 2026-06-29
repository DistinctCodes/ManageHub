import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AccessIntegration } from './entities/access-integration.entity';
import { AccessCredential } from './entities/access-credential.entity';
import { AccessProvider } from './enums/access-provider.enum';
import { ConfigureAccessDto } from './dto/configure-access.dto';
import { AccessLogQueryDto } from './dto/access-log-query.dto';
import { KisiProvider } from './providers/kisi.provider';
import { BrivoProvider } from './providers/brivo.provider';
import { encryptApiKey, decryptApiKey, isEncrypted } from './crypto.util';

@Injectable()
export class DoorAccessService {
  private readonly logger = new Logger(DoorAccessService.name);

  constructor(
    @InjectRepository(AccessIntegration)
    private readonly integrationRepo: Repository<AccessIntegration>,
    @InjectRepository(AccessCredential)
    private readonly credentialRepo: Repository<AccessCredential>,
    private readonly kisiProvider: KisiProvider,
    private readonly brivoProvider: BrivoProvider,
    private readonly configService: ConfigService,
  ) {}

  // ─── helpers ────────────────────────────────────────────────────────────────

  private encryptionKey(): string | null {
    return this.configService.get<string>('ACCESS_ENCRYPTION_KEY') ?? null;
  }

  private encrypt(plaintext: string): string {
    const key = this.encryptionKey();
    if (!key) {
      this.logger.warn('ACCESS_ENCRYPTION_KEY not set — storing API key in plaintext');
      return plaintext;
    }
    return encryptApiKey(plaintext, key);
  }

  private decrypt(stored: string): string {
    const key = this.encryptionKey();
    if (!key || !isEncrypted(stored)) return stored;
    return decryptApiKey(stored, key);
  }

  private async getIntegration(): Promise<AccessIntegration | null> {
    return this.integrationRepo.findOne({ where: {}, order: { configuredAt: 'ASC' } });
  }

  // ─── admin ops ──────────────────────────────────────────────────────────────

  async configure(dto: ConfigureAccessDto): Promise<AccessIntegration> {
    const existing = await this.getIntegration();
    const record = existing ?? this.integrationRepo.create();

    record.provider = dto.provider;
    record.apiKey = this.encrypt(dto.apiKey);
    record.isEnabled = dto.isEnabled ?? true;
    record.meta = dto.doorGroupId ? { doorGroupId: dto.doorGroupId } : (record.meta ?? null);
    record.configuredAt = new Date();

    return this.integrationRepo.save(record);
  }

  async getStatus(): Promise<{
    configured: boolean;
    provider?: AccessProvider;
    isEnabled: boolean;
  }> {
    const integration = await this.getIntegration();
    if (!integration) return { configured: false, isEnabled: false };
    return {
      configured: true,
      provider: integration.provider,
      isEnabled: integration.isEnabled,
    };
  }

  // ─── booking hooks ───────────────────────────────────────────────────────────

  async grantAccess(
    bookingId: string,
    userId: string,
    userEmail: string,
  ): Promise<void> {
    const integration = await this.getIntegration();
    if (!integration?.isEnabled) return;

    const apiKey = this.decrypt(integration.apiKey);
    const doorGroupId = integration.meta?.doorGroupId ?? '';

    let externalCredentialId: string;
    try {
      if (integration.provider === AccessProvider.KISI) {
        externalCredentialId = await this.kisiProvider.grantAccess(
          apiKey,
          userEmail,
          doorGroupId,
        );
      } else {
        externalCredentialId = await this.brivoProvider.grantAccess(
          apiKey,
          userEmail,
          doorGroupId,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to grant ${integration.provider} access for booking ${bookingId}: ${err.message}`,
      );
      return;
    }

    const credential = this.credentialRepo.create({
      userId,
      bookingId,
      externalCredentialId,
      provider: integration.provider,
      isActive: true,
      grantedAt: new Date(),
      revokedAt: null,
    });
    await this.credentialRepo.save(credential);
  }

  async revokeAccess(bookingId: string): Promise<void> {
    const credential = await this.credentialRepo.findOne({
      where: { bookingId, isActive: true },
    });
    if (!credential) return;

    const integration = await this.getIntegration();
    if (!integration) return;

    const apiKey = this.decrypt(integration.apiKey);

    try {
      if (credential.provider === AccessProvider.KISI) {
        await this.kisiProvider.revokeAccess(apiKey, credential.externalCredentialId);
      } else {
        await this.brivoProvider.revokeAccess(apiKey, credential.externalCredentialId);
      }
    } catch (err) {
      this.logger.error(
        `Failed to revoke ${credential.provider} credential ${credential.externalCredentialId}: ${err.message}`,
      );
    }

    credential.isActive = false;
    credential.revokedAt = new Date();
    await this.credentialRepo.save(credential);
  }

  // ─── admin logs ──────────────────────────────────────────────────────────────

  async getLogs(query: AccessLogQueryDto): Promise<{
    data: AccessCredential[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;

    const [data, total] = await this.credentialRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'user')
      .select([
        'c',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
      ])
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
