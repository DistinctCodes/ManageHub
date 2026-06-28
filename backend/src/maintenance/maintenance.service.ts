import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRequest } from './entities/maintenance-request.entity';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import { MaintenanceStatus } from './enums/maintenance-status.enum';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly repo: Repository<MaintenanceRequest>,
  ) {}

  async create(dto: CreateMaintenanceRequestDto, userId: string): Promise<MaintenanceRequest> {
    const entity = this.repo.create({ ...dto, reportedByUserId: userId });
    return this.repo.save(entity);
  }

  async findMine(userId: string, query: MaintenanceQueryDto) {
    const { page = 1, limit = 20 } = query;
    const [items, total] = await this.repo.findAndCount({
      where: { reportedByUserId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAll(query: MaintenanceQueryDto) {
    const { page = 1, limit = 20, status, category, workspaceId } = query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (workspaceId) where.workspaceId = workspaceId;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['reportedBy'],
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<MaintenanceRequest> {
    const item = await this.repo.findOne({ where: { id }, relations: ['reportedBy', 'workspace'] });
    if (!item) throw new NotFoundException(`Maintenance request ${id} not found`);
    return item;
  }

  async updateStatus(id: string, dto: UpdateMaintenanceStatusDto, staffId: string): Promise<MaintenanceRequest> {
    const item = await this.findOne(id);
    item.status = dto.status;
    if (dto.status === MaintenanceStatus.RESOLVED) {
      item.resolvedAt = new Date();
      item.resolvedByStaffId = staffId;
    }
    return this.repo.save(item);
  }
}
