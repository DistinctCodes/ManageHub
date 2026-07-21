import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HubSettings } from './entities/hub-settings.entity';
import { UpdateHubSettingsDto } from './dto/update-hub-settings.dto';

@Injectable()
export class HubSettingsService implements OnModuleInit {
  private readonly logger = new Logger(HubSettingsService.name);

  constructor(
    @InjectRepository(HubSettings)
    private readonly repo: Repository<HubSettings>,
  ) {}

  /** Seed a default record on startup if the table is empty. */
  async onModuleInit(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(
        this.repo.create({
          hubName: 'ManageHub',
          timezone: 'Africa/Lagos',
          currency: 'NGN',
          vatRatePercent: 7.5,
          bookingLeadTimeHours: 1,
          maxBookingDaysAhead: 90,
          cancellationPolicyHours: 24,
          businessHours: {
            mon: { open: '09:00', close: '18:00', closed: false },
            tue: { open: '09:00', close: '18:00', closed: false },
            wed: { open: '09:00', close: '18:00', closed: false },
            thu: { open: '09:00', close: '18:00', closed: false },
            fri: { open: '09:00', close: '18:00', closed: false },
            sat: { open: '10:00', close: '15:00', closed: false },
            sun: { closed: true },
          },
        }),
      );
      this.logger.log('Seeded default HubSettings record.');
    }
  }

  /** Returns the singleton settings row. */
  async getSettings(): Promise<HubSettings> {
    const settings = await this.repo.findOne({ where: {} });
    if (!settings) {
      // Fallback: recreate if somehow missing
      await this.onModuleInit();
      return this.repo.findOne({ where: {} });
    }
    return settings;
  }

  /** Partial update — validates IANA timezone if provided. */
  async updateSettings(dto: UpdateHubSettingsDto): Promise<HubSettings> {
    if (dto.timezone) {
      this.validateTimezone(dto.timezone);
    }

    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return this.repo.save(settings);
  }

  private validateTimezone(tz: string): void {
    try {
      // Intl.supportedValuesOf is available in Node 20+
      const supported: string[] = (Intl as any).supportedValuesOf('timeZone');
      if (!supported.includes(tz)) {
        throw new BadRequestException(`"${tz}" is not a valid IANA timezone`);
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      // Fallback: attempt to create a formatter — throws RangeError for invalid tz
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
      } catch {
        throw new BadRequestException(`"${tz}" is not a valid IANA timezone`);
      }
    }
  }
}