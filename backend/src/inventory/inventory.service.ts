import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { AssignInventoryItemDto } from './dto/assign-inventory-item.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly repo: Repository<InventoryItem>,
  ) {}

  async create(dto: CreateInventoryItemDto): Promise<InventoryItem> {
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(filters: { category?: string; condition?: string; location?: string; assignedToUserId?: string }) {
    const qb = this.repo.createQueryBuilder('i')
      .leftJoinAndSelect('i.assignedTo', 'user')
      .where('i.isDeleted = :d', { d: false });
    if (filters.category) qb.andWhere('i.category = :c', { c: filters.category });
    if (filters.condition) qb.andWhere('i.condition = :cond', { cond: filters.condition });
    if (filters.location) qb.andWhere('i.location = :l', { l: filters.location });
    if (filters.assignedToUserId) qb.andWhere('i.assignedToUserId = :u', { u: filters.assignedToUserId });
    return qb.orderBy('i.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<InventoryItem> {
    const item = await this.repo.findOne({ where: { id, isDeleted: false }, relations: ['assignedTo'] });
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  async update(id: string, dto: Partial<CreateInventoryItemDto>): Promise<InventoryItem> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async assign(id: string, dto: AssignInventoryItemDto): Promise<InventoryItem> {
    const item = await this.findOne(id);
    if (item.assignedToUserId) throw new BadRequestException('Item already assigned');
    item.assignedToUserId = dto.userId;
    item.assignedAt = new Date();
    return this.repo.save(item);
  }

  async unassign(id: string): Promise<InventoryItem> {
    const item = await this.findOne(id);
    item.assignedToUserId = null;
    item.assignedAt = null;
    return this.repo.save(item);
  }

  async softDelete(id: string): Promise<void> {
    const item = await this.findOne(id);
    if (item.assignedToUserId) throw new BadRequestException('Cannot retire an assigned item');
    item.isDeleted = true;
    await this.repo.save(item);
  }
}
