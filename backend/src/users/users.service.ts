import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HashingProvider } from '../auth/providers/hashing.provider';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly hashing: HashingProvider,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const passwordHash = await this.hashing.hash(dto.password);
    const entity = this.repo.create({
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber ?? null,
      passwordHash,
      role: dto.role,
      companyId: dto.companyId ?? null,
      departmentId: dto.departmentId ?? null,
      branchId: dto.branchId ?? null,
    });
    return this.repo.save(entity);
  }

  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const existing = await this.findOne(id);
    let passwordHash = existing.passwordHash;
    if (dto.password) {
      passwordHash = await this.hashing.hash(dto.password);
    }
    const merged = this.repo.merge(existing, {
      fullName: dto.fullName ?? existing.fullName,
      email: dto.email ?? existing.email,
      phoneNumber: dto.phoneNumber ?? existing.phoneNumber,
      passwordHash,
      role: dto.role ?? existing.role,
      companyId: dto.companyId ?? existing.companyId,
      departmentId: dto.departmentId ?? existing.departmentId,
      branchId: dto.branchId ?? existing.branchId,
    });
    return this.repo.save(merged);
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('User not found');
  }
}