import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
  ) {}

  async create(dto: CreateAnnouncementDto, authorId: string): Promise<Announcement> {
    const entity = this.repo.create({
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      authorId,
    });
    return this.repo.save(entity);
  }

  async findAll(query: AnnouncementQueryDto) {
    const { page = 1, limit = 20, type, priority, isActive } = query;
    const now = new Date();
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.author', 'author')
      .andWhere('(a.expiresAt IS NULL OR a.expiresAt > :now)', { now })
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type !== undefined) qb.andWhere('a.type = :type', { type });
    if (priority !== undefined) qb.andWhere('a.priority = :priority', { priority });
    if (isActive !== undefined) qb.andWhere('a.isActive = :isActive', { isActive });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Announcement> {
    const item = await this.repo.findOne({ where: { id }, relations: ['author'] });
    if (!item) throw new NotFoundException(`Announcement ${id} not found`);
    return item;
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const item = await this.findOne(id);
    if (dto.title !== undefined) item.title = dto.title;
    if (dto.content !== undefined) item.content = dto.content;
    if (dto.type !== undefined) item.type = dto.type;
    if (dto.priority !== undefined) item.priority = dto.priority;
    if (dto.expiresAt !== undefined) {
      item.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    return this.repo.save(item);
  }

  async softDelete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}