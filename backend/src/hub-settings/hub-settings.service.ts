import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HubSettings } from './entities/hub-settings.entity';
import { UpdateHubSettingsDto } from './dto/update-hub-settings.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class HubSettingsService {
  constructor(
    @InjectRepository(HubSettings)
    private readonly hubSettingsRepository: Repository<HubSettings>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Returns the single hub-settings record.
   * Creates one with default values if none exists yet.
   */
  async getSettings(): Promise<HubSettings> {
    const existing = await this.hubSettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (existing) {
      return existing;
    }

    // Seed a default record on first access
    const defaults = this.hubSettingsRepository.create({
      hubName: 'ManageHub',
      timezone: 'Africa/Lagos',
      taxRate: 0,
      currency: 'NGN',
    });

    return this.hubSettingsRepository.save(defaults);
  }

  /**
   * Upsert pattern: finds the existing record (or creates one) then merges
   * the supplied DTO fields over it. Ensures only one row ever exists.
   */
  async updateSettings(
    updateHubSettingsDto: UpdateHubSettingsDto,
  ): Promise<HubSettings> {
    const settings = await this.getSettings();

    Object.assign(settings, updateHubSettingsDto);

    return this.hubSettingsRepository.save(settings);
  }

  /**
   * Returns only the fields required for frontend white-labeling.
   */
  async getBranding(): Promise<{
    hubName: string;
    logoUrl: string | null;
    primaryColorHex: string | null;
    faviconUrl: string | null;
  }> {
    const settings = await this.getSettings();
    return {
      hubName: settings.hubName,
      logoUrl: settings.logoUrl ?? null,
      primaryColorHex: settings.primaryColorHex ?? null,
      faviconUrl: settings.faviconUrl ?? null,
    };
  }

  /**
   * Uploads a brand asset (logo or favicon) to Cloudinary and returns the URL.
   */
  async uploadBrandAsset(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const result = await this.cloudinaryService.uploadImage(file, folder);
    return (result as any).secure_url as string;
  }
}
