import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HubSettings } from './entities/hub-settings.entity';
import { UpdateHubSettingsDto } from './dto/update-hub-settings.dto';

@Injectable()
export class HubSettingsService {
  constructor(
    @InjectRepository(HubSettings)
    private readonly hubSettingsRepository: Repository<HubSettings>,
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
}
