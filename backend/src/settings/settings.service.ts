import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingsRepo: Repository<Setting>,
  ) {}

  async create(dto: CreateSettingDto): Promise<Setting> {
    const setting = this.settingsRepo.create(dto);
    return this.settingsRepo.save(setting);
  }

  async findAll(): Promise<Setting[]> {
    return this.settingsRepo.find();
  }

  async findOne(id: string): Promise<Setting> {
    const setting = await this.settingsRepo.findOne({ where: { id } });
    if (!setting) throw new NotFoundException(`Setting with id ${id} not found`);
    return setting;
  }

  async update(id: string, dto: UpdateSettingDto): Promise<Setting> {
    const setting = await this.findOne(id);
    Object.assign(setting, dto);
    return this.settingsRepo.save(setting);
  }

  async remove(id: string): Promise<void> {
    const setting = await this.findOne(id);
    await this.settingsRepo.remove(setting);
  }
}
