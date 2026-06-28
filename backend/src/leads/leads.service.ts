import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { LeadStatus } from './enums/lead-status.enum';
import { LeadSource } from './enums/lead-source.enum';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly repo: Repository<Lead>,
  ) {}

  async create(dto: CreateLeadDto): Promise<Lead> {
    return this.repo.save(this.repo.create(dto));
  }

  async createFromContactForm(name: string, email: string, phone?: string): Promise<Lead> {
    return this.repo.save(this.repo.create({
      name, email, phone: phone ?? null,
      source: LeadSource.CONTACT_FORM,
      status: LeadStatus.NEW,
    }));
  }

  async findAll(query: LeadQueryDto) {
    const { page = 1, limit = 20, status, source, assignedToStaffId } = query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedToStaffId) where.assignedToStaffId = assignedToStaffId;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['assignedToStaff'],
      withDeleted: false,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Lead> {
    const item = await this.repo.findOne({ where: { id }, relations: ['assignedToStaff'] });
    if (!item) throw new NotFoundException(`Lead ${id} not found`);
    return item;
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async convert(id: string): Promise<Lead> {
    const item = await this.findOne(id);
    item.status = LeadStatus.CONVERTED;
    item.convertedAt = new Date();
    return this.repo.save(item);
  }

  async softDelete(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.repo.softDelete(item.id);
  }
}
