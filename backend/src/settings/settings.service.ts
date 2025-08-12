import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  async create(createSettingDto: CreateSettingDto) {
    const existing = await this.settingRepository.findOne({
      where: { key: createSettingDto.key },
    });
    if (existing) {
      throw new ConflictException('Setting key already exists');
    }
    const setting = this.settingRepository.create(createSettingDto);
    return this.settingRepository.save(setting);
  }

  async findAll() {
    return this.settingRepository.find();
  }

  async findOne(key: string) {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException('Setting not found');
    }
    return setting;
  }

  async update(key: string, updateSettingDto: UpdateSettingDto) {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException('Setting not found');
    }
    Object.assign(setting, updateSettingDto);
    return this.settingRepository.save(setting);
  }

  async remove(key: string) {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException('Setting not found');
    }
    await this.settingRepository.remove(setting);
    return { deleted: true };
  }
}
