import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UserRole } from '../users/enums/userRoles.enum';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly repo: Repository<Shift>,
  ) {}

  async create(dto: CreateShiftDto, adminId: string): Promise<Shift> {
    const shift = this.repo.create({
      ...dto,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      createdByAdminId: adminId,
    });
    return this.repo.save(shift);
  }

  async findAll(userId: string, role: UserRole, startDate?: string, endDate?: string): Promise<Shift[]> {
    const where: any = {};
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      where.staffUserId = userId;
    }
    if (startDate && endDate) {
      where.startTime = Between(new Date(startDate), new Date(endDate));
    }
    return this.repo.find({ where, order: { startTime: 'ASC' }, relations: ['staff'] });
  }

  async thisWeek(userId: string, role: UserRole): Promise<Shift[]> {
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return this.findAll(userId, role, mon.toISOString(), sun.toISOString());
  }

  async update(id: string, dto: Partial<CreateShiftDto>): Promise<Shift> {
    const shift = await this.repo.findOne({ where: { id } });
    if (!shift) throw new NotFoundException(`Shift ${id} not found`);
    if (dto.startTime) shift.startTime = new Date(dto.startTime);
    if (dto.endTime) shift.endTime = new Date(dto.endTime);
    if (dto.roleName) shift.roleName = dto.roleName;
    if (dto.notes !== undefined) shift.notes = dto.notes ?? null;
    return this.repo.save(shift);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
