import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Locker } from './entities/locker.entity';
import { CreateLockerDto } from './dto/create-locker.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';
import { AssignLockerDto } from './dto/assign-locker.dto';

@Injectable()
export class LockersService {
  constructor(
    @InjectRepository(Locker)
    private readonly repo: Repository<Locker>,
  ) {}

  async create(dto: CreateLockerDto): Promise<Locker> {
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(): Promise<Locker[]> {
    return this.repo.find({ relations: ['assignedTo'], order: { lockerNumber: 'ASC' } });
  }

  async findMine(userId: string): Promise<Locker | null> {
    return this.repo.findOne({ where: { assignedToUserId: userId }, relations: ['assignedTo'] });
  }

  async findOne(id: string): Promise<Locker> {
    const item = await this.repo.findOne({ where: { id }, relations: ['assignedTo'] });
    if (!item) throw new NotFoundException(`Locker ${id} not found`);
    return item;
  }

  async update(id: string, dto: UpdateLockerDto): Promise<Locker> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async assign(id: string, dto: AssignLockerDto): Promise<Locker> {
    const item = await this.findOne(id);
    if (item.assignedToUserId) throw new BadRequestException('Locker is already assigned');
    item.assignedToUserId = dto.userId;
    item.assignedAt = new Date();
    return this.repo.save(item);
  }

  async unassign(id: string): Promise<Locker> {
    const item = await this.findOne(id);
    item.assignedToUserId = null;
    item.assignedAt = null;
    return this.repo.save(item);
  }

  async softDelete(id: string): Promise<void> {
    const item = await this.findOne(id);
    if (item.assignedToUserId) throw new BadRequestException('Cannot delete an assigned locker');
    await this.repo.softDelete(id);
  }
}
