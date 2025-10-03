import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetMaintenance } from './asset-maintenence.entity';
import { CreateMaintenanceDto } from 'src/create-maintenance/create-maintenance.dto';
import { CompleteMaintenanceDto } from 'src/complete-maintenance/complete-maintenance.dto';
import { Asset } from 'src/assets/assets.entity';

@Injectable()
export class AssetMaintenanceService {
  constructor(
    @InjectRepository(AssetMaintenance)
    private readonly maintenanceRepo: Repository<AssetMaintenance>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  async schedule(dto: CreateMaintenanceDto) {
    const asset = await this.assetRepo.findOne({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const maintenance = this.maintenanceRepo.create({
      ...dto,
      asset,
    });
    return this.maintenanceRepo.save(maintenance);
  }

  async markComplete(id: number, dto: CompleteMaintenanceDto) {
    const maintenance = await this.maintenanceRepo.findOne({ where: { id }, relations: ['asset'] });
    if (!maintenance) throw new NotFoundException('Maintenance record not found');

    maintenance.completedDate = dto.completedDate;
    if (dto.notes) maintenance.notes = dto.notes;

    return this.maintenanceRepo.save(maintenance);
  }

  async getHistory(assetId: number) {
    return this.maintenanceRepo.find({
      where: { asset: { id: assetId } },
      relations: ['asset'],
      order: { scheduledDate: 'DESC' },
    });
  }
}
