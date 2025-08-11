import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRequest } from './entities/maintenance-request.entity';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly maintenanceRepo: Repository<MaintenanceRequest>,
  ) {}

  async create(dto: CreateMaintenanceRequestDto) {
    const request = this.maintenanceRepo.create(dto);
    return await this.maintenanceRepo.save(request);
  }

  async findAll() {
    return await this.maintenanceRepo.find();
  }

  async findOne(id: string) {
    const request = await this.maintenanceRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Maintenance request not found');
    return request;
  }

  async updateStatus(id: string, dto: UpdateMaintenanceStatusDto) {
    const request = await this.findOne(id);
    request.status = dto.status;
    return await this.maintenanceRepo.save(request);
  }

  async remove(id: string) {
    const request = await this.findOne(id);
    return await this.maintenanceRepo.remove(request);
  }
}
