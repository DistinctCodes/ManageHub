// maintenance/maintenance.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRequest, MaintenanceStatus } from './entities/maintenance.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly maintenanceRepo: Repository<MaintenanceRequest>,
  ) {}

  async create(createDto: CreateMaintenanceDto): Promise<MaintenanceRequest> {
    const request = this.maintenanceRepo.create(createDto);
    return await this.maintenanceRepo.save(request);
  }

  async findAll(): Promise<MaintenanceRequest[]> {
    return await this.maintenanceRepo.find();
  }

  async findOne(id: string): Promise<MaintenanceRequest> {
    const request = await this.maintenanceRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Maintenance request #${id} not found`);
    return request;
  }

  async update(id: string, updateDto: UpdateMaintenanceDto): Promise<MaintenanceRequest> {
    const request = await this.findOne(id);
    Object.assign(request, updateDto);
    return await this.maintenanceRepo.save(request);
  }

  async remove(id: string): Promise<void> {
    const request = await this.findOne(id);
    await this.maintenanceRepo.remove(request);
  }
}
